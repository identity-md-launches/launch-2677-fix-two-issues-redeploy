import { createReader, element } from '../lib/chain';

const { nft, core, provider } = createReader();
const status = element('statsStatus');
const retry = element<HTMLButtonElement>('retryStats');
async function loadStats() {
  retry.hidden = true;
  status.textContent = 'Reading Sepolia…';
  try {
    const [state, minted] = await Promise.all([core.state(), nft.totalMinted()]);
    element('statHeight').textContent = Number(state[3]).toLocaleString();
    element('statMinted').textContent = Number(minted).toLocaleString();
    status.textContent = 'Read from Sepolia. Refresh to update.';
  } catch {
    element('statHeight').textContent = 'Unavailable';
    element('statMinted').textContent = 'Unavailable';
    status.textContent = 'Live stats are unavailable. Cards and minting instructions are still accessible.';
    retry.hidden = false;
  }
}
retry.addEventListener('click', loadStats);
window.addEventListener('pagehide', event => { if (!event.persisted) provider.destroy(); });
void loadStats();
