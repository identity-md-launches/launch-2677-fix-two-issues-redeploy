import { BrowserProvider, Contract, type Eip1193Provider } from 'ethers';
import { NFT_ADDRESS, NFT_ABI, RPC_URL, CHAIN_ID, MAX_SUPPLY, createReader, element, errorMessage, readCard, cardImage } from '../lib/chain';

interface WalletProvider extends Eip1193Provider {
  on?: (event: string, listener: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, listener: (...args: unknown[]) => void) => void;
}
interface Wallet { provider: WalletProvider; info: { uuid: string; name: string; icon: string }; }
declare global { interface Window { ethereum?: WalletProvider; } }

const reader = createReader();
const connect = element<HTMLButtonElement>('connectBtn');
const disconnect = element<HTMLButtonElement>('disconnectBtn');
const mint = element<HTMLButtonElement>('mintBtn');
const preview = element<HTMLButtonElement>('previewBtn');
const input = element<HTMLInputElement>('blockNum');
const dialog = element<HTMLDialogElement>('walletDialog');
const walletStatus = element('walletStatus');
const status = element('mintStatus');
const retry = element<HTMLButtonElement>('retryChain');
const wallets = new Map<string, Wallet>();
let selected: WalletProvider | undefined;
let account = '';
let correctChain = false;
let busy = false;
let browser: BrowserProvider | undefined;
let previewRequest = 0;
const requested = Number(new URLSearchParams(location.search).get('block'));
if (Number.isSafeInteger(requested) && requested >= 1 && requested <= MAX_SUPPLY) input.value = String(requested);

function report(message: string, state = '') {
  status.textContent = message;
  status.dataset.state = state;
}
function updateControls() {
  mint.disabled = !account || !correctChain || busy;
  input.disabled = busy;
  preview.disabled = busy;
  disconnect.hidden = !account;
  disconnect.disabled = busy;
  connect.disabled = busy;
  connect.textContent = account ? (correctChain ? 'Wallet connected' : 'Switch to Sepolia') : 'Connect wallet';
  connect.hidden = Boolean(account && correctChain);
  const address = element('walletAddr');
  address.hidden = !account;
  address.textContent = account ? `${account.slice(0, 6)}…${account.slice(-4)}` : '';
  address.title = account;
}
function validateBlock() {
  const block = input.valueAsNumber;
  const valid = Number.isSafeInteger(block) && block >= 1 && block <= MAX_SUPPLY;
  input.setAttribute('aria-invalid', String(!valid));
  if (!valid) { report('Enter a whole block number from 1 to 10,000.', 'error'); input.focus(); return undefined; }
  return block;
}
async function refreshChain() {
  retry.hidden = true;
  element('chainStatus').textContent = 'Reading Sepolia…';
  try {
    const [state, total] = await Promise.all([reader.core.state(), reader.nft.totalMinted()]);
    element('chainHeight').textContent = Number(state[3]).toLocaleString();
    element('chainMinted').textContent = Number(total).toLocaleString();
    element('chainStatus').textContent = 'Block availability is checked again before minting.';
  } catch {
    element('chainHeight').textContent = 'Unavailable';
    element('chainMinted').textContent = 'Unavailable';
    element('chainStatus').textContent = 'Chain data is unavailable. Retry when your connection is ready.';
    retry.hidden = false;
  }
}
retry.addEventListener('click', refreshChain);

function renderWallets() {
  const list = element('walletList');
  list.replaceChildren();
  const options = [...wallets.values()];
  if (!options.length && window.ethereum) options.push({ provider: window.ethereum, info: { uuid: 'browser', name: 'Browser wallet', icon: '' } });
  for (const wallet of options) {
    const button = document.createElement('button');
    button.className = 'term-btn wallet-row';
    if (/^data:image\//.test(wallet.info.icon)) {
      const icon = document.createElement('img'); icon.src = wallet.info.icon; icon.alt = ''; button.append(icon);
    }
    button.append(document.createTextNode(wallet.info.name));
    button.addEventListener('click', () => void connectWallet(wallet.provider));
    list.append(button);
  }
  element('walletDialogStatus').textContent = options.length ? 'Choose a wallet. Connecting does not send a transaction.' : 'No browser wallet found. Open this page in your wallet’s browser, or enable a wallet extension and try again.';
  if (!options.length && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
    const destinations = [
      ['MetaMask', `https://link.metamask.io/dapp/${location.href.replace(/^https?:\/\//, '')}`],
      ['Coinbase Wallet', `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(location.href)}`],
      ['Rabby', `https://go.rabby.io/mobile/?dappUrl=${encodeURIComponent(location.href)}`],
      ['Phantom', `https://phantom.app/ul/browse/${encodeURIComponent(location.href)}?ref=${encodeURIComponent(location.origin)}`],
    ];
    for (const [name, href] of destinations) {
      const link = document.createElement('a'); link.className = 'term-btn wallet-row'; link.textContent = `Open in ${name}`; link.href = href; list.append(link);
    }
  }
}
window.addEventListener('eip6963:announceProvider', event => {
  const wallet = (event as CustomEvent<Wallet>).detail;
  if (!wallet?.info?.uuid || !wallet.info.name || !wallet.provider?.request) return;
  wallets.set(wallet.info.uuid, wallet);
  if (dialog.open) renderWallets();
});
window.dispatchEvent(new Event('eip6963:requestProvider'));

async function syncWallet() {
  if (!selected) return;
  const [accounts, chain] = await Promise.all([
    selected.request({ method: 'eth_accounts' }) as Promise<string[]>,
    selected.request({ method: 'eth_chainId' }) as Promise<string>,
  ]);
  account = accounts[0] || '';
  correctChain = chain.toLowerCase() === CHAIN_ID;
  walletStatus.textContent = !account ? 'Wallet disconnected. Connect to mint.' : correctChain ? 'Connected to Sepolia. Only a confirmed mint sends a transaction.' : 'Wrong network. Switch to Sepolia before minting.';
  updateControls();
}
const onWalletChange = () => { void syncWallet().catch(() => { walletStatus.textContent = 'Wallet connection changed. Disconnect and reconnect to continue.'; account = ''; updateControls(); }); };
function detach() {
  selected?.removeListener?.('accountsChanged', onWalletChange);
  selected?.removeListener?.('chainChanged', onWalletChange);
  selected?.removeListener?.('disconnect', onWalletDisconnect);
  browser?.destroy(); browser = undefined;
}
function onWalletDisconnect() {
  detach(); selected = undefined; account = ''; correctChain = false;
  walletStatus.textContent = 'Wallet disconnected. You can reconnect to mint.';
  updateControls();
}
async function switchChain() {
  if (!selected) return;
  try { await selected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID }] }); }
  catch (e) {
    if ((e as { code?: number }).code !== 4902) throw e;
    await selected.request({ method: 'wallet_addEthereumChain', params: [{ chainId: CHAIN_ID, chainName: 'Sepolia Testnet', rpcUrls: [RPC_URL], nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, blockExplorerUrls: ['https://sepolia.etherscan.io'] }] });
    await selected.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: CHAIN_ID }] });
  }
  await syncWallet();
}
async function connectWallet(provider: WalletProvider) {
  const rows = dialog.querySelectorAll<HTMLButtonElement>('button');
  rows.forEach(row => { row.disabled = true; });
  element('walletDialogStatus').textContent = 'Opening your wallet…';
  try {
    await provider.request({ method: 'eth_requestAccounts' });
    detach(); selected = provider;
    selected.on?.('accountsChanged', onWalletChange); selected.on?.('chainChanged', onWalletChange); selected.on?.('disconnect', onWalletDisconnect);
    await syncWallet(); dialog.close();
    if (!correctChain) await switchChain();
  } catch (error) {
    const message = errorMessage(error); element('walletDialogStatus').textContent = message; walletStatus.textContent = message;
  } finally { rows.forEach(row => { row.disabled = false; }); updateControls(); }
}
connect.addEventListener('click', () => {
  if (account && !correctChain) { connect.disabled = true; void switchChain().catch(e => { walletStatus.textContent = errorMessage(e); }).finally(updateControls); }
  else { renderWallets(); dialog.showModal(); }
});
disconnect.addEventListener('click', onWalletDisconnect);
element('closeWallet').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('close', () => { if (!connect.hidden) connect.focus(); else disconnect.focus(); });

async function showToken(block: number) {
  const request = ++previewRequest;
  const card = await readCard(reader.nft, block);
  if (request !== previewRequest) return;
  element('tokenDisplay').replaceChildren(cardImage(card, block));
  element('tokenCaption').textContent = `Block #${block} · ${card.rarity} · Sepolia`;
  element('tokenSection').hidden = false;
}
preview.addEventListener('click', async () => {
  const block = validateBlock(); if (!block) return;
  preview.disabled = true; element('tokenSection').hidden = true; report(`Loading block #${block}…`);
  try {
    if (!await reader.nft.blockMinted(block)) { report(`Block #${block} has not been minted. Connect your wallet to check availability and mint.`); return; }
    await showToken(block); report(`Showing the on-chain card for block #${block}.`, 'success');
  } catch (e) { report(errorMessage(e), 'error'); }
  finally { preview.disabled = busy; }
});
element<HTMLFormElement>('mintForm').addEventListener('submit', async event => {
  event.preventDefault(); if (busy) return;
  const block = validateBlock(); if (!block) return;
  if (!selected || !account || !correctChain) { report('Connect your wallet on Sepolia before minting.', 'error'); return; }
  busy = true; updateControls();
  const transactionLink = element<HTMLAnchorElement>('transactionLink'); transactionLink.hidden = true;
  report(`Checking block #${block}…`);
  let confirmed = false;
  try {
    await syncWallet();
    if (!account || !correctChain) throw new Error('Wallet changed');
    const [state, minted] = await Promise.all([reader.core.state(), reader.nft.blockMinted(block)]);
    if (block > Number(state[3])) { report(`Block #${block} has not been mined yet. Current height: ${Number(state[3]).toLocaleString()}. Choose a lower block.`, 'error'); return; }
    if (minted) { report(`Block #${block} was already minted. Preview it or choose another block.`, 'error'); return; }
    browser?.destroy(); browser = new BrowserProvider(selected);
    const signer = await browser.getSigner(account);
    const nft = new Contract(NFT_ADDRESS, NFT_ABI, signer);
    report('Confirm the mint in your wallet. You will pay Sepolia gas.');
    const tx = await nft.mint(block);
    transactionLink.href = `https://sepolia.etherscan.io/tx/${tx.hash}`; transactionLink.hidden = false;
    report(`Transaction submitted for block #${block}. Waiting for confirmation…`);
    const receipt = await tx.wait(1, 120_000);
    if (!receipt || receipt.status !== 1) throw new Error('Transaction not confirmed');
    confirmed = true; report(`Block #${block} minted. Your transaction is confirmed.`, 'success');
    try { await showToken(block); }
    catch { report(`Block #${block} minted and confirmed. Card preview is temporarily unavailable; try Preview card.`, 'success'); }
    await refreshChain();
  } catch (e) {
    if (!confirmed) {
      if ((e as { code?: string }).code === 'TIMEOUT' && !transactionLink.hidden) report('Confirmation is taking longer than expected. Check the transaction on Etherscan before trying again.', 'error');
      else report(errorMessage(e), 'error');
    }
  } finally { busy = false; updateControls(); }
});
input.addEventListener('input', () => { input.removeAttribute('aria-invalid'); element('tokenSection').hidden = true; previewRequest++; });
window.addEventListener('pagehide', event => { if (!event.persisted) { reader.provider.destroy(); detach(); } });
void refreshChain();
