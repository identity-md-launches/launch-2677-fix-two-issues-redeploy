// Tests the committed export. All RPC/wallet data below are explicit interaction
// fixtures intercepted in the test browser; no keys or real transactions are used.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, extname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const require = createRequire(join(resolve(process.argv[2] || here), 'package.json'));
const { chromium, webkit } = require('playwright');
const AxeBuilder = require('@axe-core/playwright').default;
const { Interface } = require('ethers');
const prefix = '/ipfs/export-check/';
const out = join(root, 'test/scratch/interactions');
await mkdir(out, { recursive: true });
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' };
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (!url.pathname.startsWith(prefix)) throw Error('Outside subpath');
    let file = resolve(root, 'dist', decodeURIComponent(url.pathname.slice(prefix.length)) || 'index.html');
    const dist = join(root, 'dist');
    if (!file.startsWith(dist + sep)) throw Error('Invalid path');
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'text/plain' });
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end('Not found'); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const base = origin + prefix;
const results = [];
const limitations = [];
async function test(name, fn) {
  try { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (e) { results.push({ name, passed: false, error: e.message }); console.log(`FAIL ${name}: ${e.message}`); }
}
const nft = new Interface(['function totalMinted() view returns (uint256)', 'function blockMinted(uint256) view returns (bool)', 'function tokenURI(uint256) view returns (string)']);
const core = new Interface(['function state() view returns (uint64,uint64,uint96,uint64,uint96,uint32,uint256,bool)']);
const fixtureImage = `data:image/svg+xml;base64,${Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#111122"/><text x="20" y="50" fill="white">Interaction test fixture</text></svg>').toString('base64')}`;
const fixtureMetadata = `data:application/json;base64,${Buffer.from(JSON.stringify({ image: fixtureImage, attributes: [{ trait_type: 'Rarity', value: 'Legendary' }] })).toString('base64')}`;
function rpcResponse(payload, state) {
  if (state.fail) return { jsonrpc: '2.0', id: payload.id, error: { code: -32000, message: 'Deliberate test RPC failure' } };
  const { method, params = [] } = payload;
  let result;
  if (method === 'eth_chainId') result = '0xaa36a7';
  else if (method === 'eth_call') {
    const data = params[0].data;
    if (data.startsWith(core.getFunction('state').selector)) result = core.encodeFunctionResult('state', [1, 5, 10, 200, 0, 0, 0, false]);
    else {
      const call = nft.parseTransaction({ data });
      if (call.name === 'totalMinted') result = nft.encodeFunctionResult(call.name, [state.empty ? 0 : 2]);
      if (call.name === 'blockMinted') result = nft.encodeFunctionResult(call.name, [!state.empty && [1, 51].includes(Number(call.args[0]))]);
      if (call.name === 'tokenURI') result = nft.encodeFunctionResult(call.name, [fixtureMetadata]);
    }
  } else throw Error(`Unexpected RPC ${method}`);
  return { jsonrpc: '2.0', id: payload.id, result };
}
async function makeContext(browser, state = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const requests = [], failures = [], errors = [];
  await context.route('**/*', async route => {
    const request = route.request(); const url = new URL(request.url());
    requests.push({ url: url.href, type: request.resourceType() });
    if (url.origin === origin) return route.continue();
    if (url.hostname === 'ethereum-sepolia-rpc.publicnode.com') {
      if (state.offline) return route.abort();
      const payload = request.postDataJSON();
      const body = Array.isArray(payload) ? payload.map(p => rpcResponse(p, state)) : rpcResponse(payload, state);
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
    }
    return route.abort();
  });
  context.on('page', p => {
    p.on('pageerror', e => errors.push(e.message));
    p.on('response', r => { if (r.url().startsWith(origin) && r.status() >= 400) failures.push(`${r.status()} ${r.url()}`); });
  });
  return { context, requests, failures, errors };
}
async function hasText(page, selector, text) {
  await page.waitForFunction(({ selector, text }) => document.querySelector(selector)?.textContent?.includes(text), { selector, text }, { timeout: 15000 });
}
async function installWallet(context) {
  await context.addInitScript(() => {
    const address = '0x531497ddc70d634342020b1111C8b1A92873e669';
    const listeners = {};
    window.walletFixture = { chain: '0x1', accounts: [address], rejectConnect: false, rejectSwitch: false, unknownChain: false, calls: [] };
    const provider = {
      on(event, fn) { (listeners[event] ||= []).push(fn); },
      removeListener(event, fn) { listeners[event] = (listeners[event] || []).filter(x => x !== fn); },
      async request({ method, params }) {
        const s = window.walletFixture; s.calls.push({ method, params });
        if (method === 'eth_requestAccounts') { if (s.rejectConnect) throw { code: 4001 }; return s.accounts; }
        if (method === 'eth_accounts') return s.accounts;
        if (method === 'eth_chainId') return s.chain;
        if (method === 'wallet_switchEthereumChain') {
          if (s.rejectSwitch) throw { code: 4001 };
          if (s.unknownChain) { s.unknownChain = false; throw { code: 4902 }; }
          s.chain = params[0].chainId; (listeners.chainChanged || []).forEach(fn => fn(s.chain)); return null;
        }
        if (method === 'wallet_addEthereumChain') return null;
        if (method === 'eth_sendTransaction') throw { code: 4001, message: 'Simulated wallet rejection; no transaction sent' };
        if (method === 'eth_estimateGas') return '0x186a0';
        if (method === 'eth_blockNumber') return '0x64';
        if (method === 'eth_getTransactionCount') return '0x0';
        throw Error(`Unexpected wallet method ${method}`);
      },
    };
    window.fixtureEmit = (event, value) => (listeners[event] || []).forEach(fn => fn(value));
    // EIP-6963 discovery is exercised instead of a legacy window.ethereum shim.
    const detail = { info: { uuid: 'interaction-fixture', name: 'Test browser wallet', icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>' }, provider };
    window.addEventListener('eip6963:requestProvider', () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail })));
  });
}
async function connectWallet(page) {
  await page.locator('#connectBtn').click();
  await page.getByRole('button', { name: 'Test browser wallet', exact: true }).click();
}

try {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const harness = await makeContext(browser);
  const { context, requests, failures, errors } = harness;
  const page = await context.newPage();
  await test('All four pages, footers, metadata, assets and 320/390/768/1440 reflow', async () => {
    for (const name of ['index', 'mint', 'gallery', 'about']) {
      await page.goto(`${base}${name}.html`);
      if (name === 'index') await hasText(page, '#statHeight', '200');
      if (name === 'gallery') await hasText(page, '#galleryStatus', '1 minted card shown');
      assert.match(await page.locator('footer').innerText(), /This is a community project\. We are not affiliated with SqueekChain/);
      assert.equal(await page.locator('h1').count(), 1);
      assert.doesNotMatch(await page.locator('body').innerText(), /\bofficial\b/i);
      for (const selector of ['title', 'meta[name="description"]', 'meta[property="og:title"]', 'meta[property="og:image"]', 'link[rel="icon"]']) assert.equal(await page.locator(selector).count(), 1, `${name}: ${selector}`);
      for (const selector of ['meta[property="og:image"]', 'link[rel="icon"]']) {
        const attr = selector.startsWith('meta') ? 'content' : 'href';
        const response = await fetch(new URL(await page.locator(selector).getAttribute(attr), page.url()));
        assert.equal(response.status, 200);
      }
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth), `${name} overflow at ${width}`);
      }
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      assert.deepEqual(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })), [], `${name} accessibility`);
    }
    assert.deepEqual(failures, []); assert.deepEqual(errors, []);
    assert.equal(requests.filter(r => r.type === 'script' && !r.url.startsWith(base)).length, 0);
    assert.equal(requests.filter(r => ['font', 'stylesheet', 'image'].includes(r.type) && !r.url.startsWith(base) && !r.url.startsWith('data:')).length, 0);
  });
  await test('First 390px screen exposes product, mint action and original SVG card', async () => {
    await page.setViewportSize({ width: 390, height: 844 }); await page.goto(base);
    assert.ok(await page.locator('h1').isVisible());
    for (const selector of ['a.primary', '#sampleCards svg']) {
      const box = await page.locator(selector).first().boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= 844, selector);
    }
    assert.equal(await page.locator('#sampleCards svg').count(), 4);
    await page.screenshot({ path: join(out, 'home-390.png') });
  });
  await test('Navigation and sample links stay inside the IPFS subpath', async () => {
    for (const name of ['Mint', 'Gallery', 'About', 'Home']) {
      await page.getByRole('navigation').getByRole('link', { name, exact: true }).click();
      assert.ok(page.url().startsWith(base));
      assert.equal(await page.locator('nav [aria-current="page"]').innerText(), name);
    }
    await page.locator('#sampleCards a').nth(1).click();
    assert.equal(new URL(page.url()).searchParams.get('block'), '100');
    await page.waitForFunction(() => document.getElementById('blockNum')?.value === '100');
  });
  await test('No-wallet picker, Escape, focus restoration and disabled mint', async () => {
    await page.goto(`${base}mint.html`);
    assert.equal(await page.locator('#mintBtn').isDisabled(), true);
    await page.locator('#connectBtn').click();
    assert.equal(await page.locator('#walletDialog').isVisible(), true);
    await hasText(page, '#walletDialogStatus', 'No browser wallet found');
    const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
    assert.equal(audit.violations.length, 0);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#walletDialog').isVisible(), false);
    assert.equal(await page.locator('#connectBtn').evaluate(e => document.activeElement === e), true);
  });
  await test('Preview validation, unminted state and safe on-chain card rendering', async () => {
    await page.goto(`${base}mint.html`);
    for (const invalid of ['0', '10001', '1.5', '']) {
      await page.locator('#blockNum').fill(invalid); await page.locator('#previewBtn').click();
      await hasText(page, '#mintStatus', 'whole block number');
      assert.equal(await page.locator('#blockNum').getAttribute('aria-invalid'), 'true');
    }
    await page.locator('#blockNum').fill('2'); await page.locator('#previewBtn').click();
    await hasText(page, '#mintStatus', 'has not been minted');
    await page.locator('#blockNum').fill('1'); await page.locator('#previewBtn').click();
    await hasText(page, '#mintStatus', 'Showing the on-chain card');
    assert.equal(await page.locator('#tokenSection img').getAttribute('src'), fixtureImage);
  });
  await test('Gallery ranges include block 51, full-size dialog and deep link', async () => {
    await page.goto(`${base}gallery.html`); await hasText(page, '#galleryStatus', '1 minted card shown');
    await page.locator('#nextRange').click(); await hasText(page, '#galleryStatus', 'Blocks 51–100');
    await page.getByRole('button', { name: 'View block 51, Legendary', exact: true }).click();
    assert.equal(await page.locator('#cardDialog').isVisible(), true);
    assert.equal(await page.locator('#fullCard img').getAttribute('src'), fixtureImage);
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button', { name: 'View block 51, Legendary', exact: true }).evaluate(e => document.activeElement === e), true);
    await page.locator('#previousRange').click(); await hasText(page, '#galleryStatus', 'Blocks 1–50');
    await page.getByRole('button', { name: 'View block 1, Legendary', exact: true }).click();
    await page.locator('#viewBlock').click();
    await page.waitForFunction(() => document.getElementById('blockNum')?.value === '1');
  });
  await test('Keyboard skip link and enlarged-text/RTL reflow', async () => {
    await page.goto(`${base}about.html`); await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('link', { name: 'Skip to content' }).evaluate(e => e === document.activeElement), true);
    await page.keyboard.press('Enter'); assert.equal(await page.locator('main').evaluate(e => e === document.activeElement), true);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => { document.documentElement.dir = 'rtl'; document.documentElement.style.fontSize = '200%'; });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  });
  await context.close();

  const offline = { offline: true };
  const off = await makeContext(browser, offline); const offPage = await off.context.newPage();
  await test('Blocked external network: all pages/scripts load, errors recover with retry', async () => {
    for (const name of ['index', 'mint', 'gallery', 'about']) {
      await offPage.goto(`${base}${name}.html`);
      if (name === 'index') { await hasText(offPage, '#statsStatus', 'unavailable'); assert.ok(await offPage.locator('#retryStats').isVisible()); }
      if (name === 'mint') { await hasText(offPage, '#chainStatus', 'unavailable'); assert.ok(await offPage.locator('#connectBtn').isEnabled()); }
      if (name === 'gallery') { await hasText(offPage, '#galleryStatus', 'could not reach'); assert.ok(await offPage.locator('#retryGallery').isVisible()); }
    }
    assert.deepEqual(off.failures, []); assert.deepEqual(off.errors, []);
    assert.equal(off.requests.filter(r => r.type === 'script' && !r.url.startsWith(base)).length, 0);
    await offPage.goto(`${base}index.html`); await hasText(offPage, '#statsStatus', 'unavailable');
    offline.offline = false;
    await offPage.locator('#retryStats').click(); await hasText(offPage, '#statMinted', '2');
    offline.offline = true;
    await offPage.goto(`${base}mint.html`); await hasText(offPage, '#chainStatus', 'unavailable');
    offline.offline = false;
    await offPage.locator('#retryChain').click(); await hasText(offPage, '#chainHeight', '200');
    offline.offline = true;
    await offPage.goto(`${base}gallery.html`); await hasText(offPage, '#galleryStatus', 'could not reach');
    offline.offline = false;
    await offPage.locator('#retryGallery').click(); await hasText(offPage, '#galleryStatus', '1 minted card shown');
  });
  await off.context.close();
  const empty = await makeContext(browser, { empty: true }); const emptyPage = await empty.context.newPage();
  await test('Gallery empty state is distinct from RPC failure', async () => {
    await emptyPage.goto(`${base}gallery.html`); await hasText(emptyPage, '#galleryStatus', 'No blocks have been minted yet');
    assert.equal(await emptyPage.locator('#retryGallery').isVisible(), false);
  });
  await empty.context.close();
  const wallet = await makeContext(browser); await installWallet(wallet.context); const wp = await wallet.context.newPage();
  await test('EIP-6963 wallet rejection returns picker to idle', async () => {
    await wp.goto(`${base}mint.html`); await wp.evaluate(() => { window.walletFixture.rejectConnect = true; });
    await connectWallet(wp); await hasText(wp, '#walletDialogStatus', 'declined');
    assert.ok(await wp.getByRole('button', { name: 'Test browser wallet', exact: true }).isEnabled());
    await wp.keyboard.press('Escape');
  });
  await test('Wrong-network rejection keeps mint disabled; retry switches Sepolia', async () => {
    await wp.evaluate(() => { window.walletFixture.rejectConnect = false; window.walletFixture.rejectSwitch = true; });
    await connectWallet(wp); await hasText(wp, '#walletStatus', 'declined');
    assert.equal(await wp.locator('#mintBtn').isDisabled(), true);
    assert.equal(await wp.locator('#connectBtn').innerText(), 'Switch to Sepolia');
    await wp.evaluate(() => { window.walletFixture.rejectSwitch = false; window.walletFixture.unknownChain = true; });
    await wp.locator('#connectBtn').click(); await hasText(wp, '#walletStatus', 'Connected to Sepolia');
    assert.ok(await wp.locator('#mintBtn').isEnabled());
    const calls = await wp.evaluate(() => window.walletFixture.calls);
    assert.ok(calls.some(c => c.method === 'wallet_addEthereumChain' && c.params[0].chainId === '0xaa36a7'));
  });
  await test('Mint checks duplicate and unmined blocks before asking for a transaction', async () => {
    await wp.locator('#blockNum').fill('1'); await wp.locator('#mintBtn').click(); await hasText(wp, '#mintStatus', 'already minted');
    await wp.locator('#blockNum').fill('201'); await wp.locator('#mintBtn').click(); await hasText(wp, '#mintStatus', 'not been mined yet');
    assert.equal(await wp.evaluate(() => window.walletFixture.calls.filter(c => c.method === 'eth_sendTransaction').length), 0);
  });
  await test('Mint wallet cancellation is recoverable and never reports success', async () => {
    await wp.locator('#blockNum').fill('2'); await wp.locator('#mintBtn').click(); await hasText(wp, '#mintStatus', 'declined');
    assert.ok(await wp.locator('#mintBtn').isEnabled());
    const calls = await wp.evaluate(() => window.walletFixture.calls);
    const tx = calls.find(c => c.method === 'eth_sendTransaction');
    assert.ok(tx, 'mint reached the wallet transaction request');
    assert.equal(tx.params[0].to.toLowerCase(), '0x531497ddc70d634342020b1111c8b1a92873e669');
    assert.equal(BigInt(`0x${tx.params[0].data.slice(-64)}`), 2n);
    assert.equal(await wp.locator('#transactionLink').isVisible(), false);
  });
  await test('Account/network changes and disconnect immediately disable mint', async () => {
    await wp.evaluate(() => { window.walletFixture.chain = '0x1'; window.fixtureEmit('chainChanged', '0x1'); });
    await hasText(wp, '#walletStatus', 'Wrong network'); assert.ok(await wp.locator('#mintBtn').isDisabled());
    await wp.locator('#connectBtn').click(); await hasText(wp, '#walletStatus', 'Connected to Sepolia');
    await wp.evaluate(() => { window.walletFixture.accounts = []; window.fixtureEmit('accountsChanged', []); });
    await hasText(wp, '#walletStatus', 'disconnected'); assert.ok(await wp.locator('#mintBtn').isDisabled());
    await wp.evaluate(() => { window.walletFixture.accounts = ['0x531497ddc70d634342020b1111C8b1A92873e669']; });
    await connectWallet(wp); await hasText(wp, '#walletStatus', 'Connected to Sepolia');
    await wp.locator('#disconnectBtn').click(); assert.ok(await wp.locator('#mintBtn').isDisabled());
  });
  assert.deepEqual(wallet.errors, []);
  await wallet.context.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile' });
  await mobile.route('https://ethereum-sepolia-rpc.publicnode.com/**', r => r.abort());
  const mp = await mobile.newPage();
  await test('Mobile no-wallet picker links to this gateway URL inside wallet browsers', async () => {
    await mp.goto(`${base}mint.html`); await mp.locator('#connectBtn').click();
    for (const name of ['MetaMask', 'Coinbase Wallet', 'Rabby', 'Phantom']) {
      const link = mp.getByRole('link', { name: `Open in ${name}`, exact: true }); assert.ok(await link.isVisible());
      assert.ok(decodeURIComponent(await link.getAttribute('href')).includes('/ipfs/export-check/mint.html'));
    }
  });
  await mobile.close();
  const nojs = await browser.newContext({ javaScriptEnabled: false }); const njp = await nojs.newPage();
  await test('Without JavaScript the four sample SVGs, pages, primary links and disclaimer remain usable', async () => {
    await njp.goto(base); assert.equal(await njp.locator('#sampleCards svg').count(), 4);
    await njp.locator('a.primary').click(); assert.ok(njp.url().endsWith('/mint.html'));
    await njp.locator('noscript p').waitFor({ state: 'visible' });
    assert.match(await njp.locator('body').innerText(), /Enable JavaScript to connect a wallet, load cards, and mint/);
  });
  await nojs.close(); await browser.close();
  try {
    const safari = await webkit.launch({ headless: true });
    const wk = await makeContext(safari); const sp = await wk.context.newPage();
    await test('WebKit: mobile first screen, navigation and no-wallet interaction', async () => {
      await sp.goto(base); assert.ok(await sp.locator('a.primary').isVisible());
      await sp.locator('a.primary').click(); await sp.locator('#connectBtn').click(); assert.ok(await sp.locator('#walletDialog').isVisible());
      await sp.keyboard.press('Escape'); assert.equal(await sp.locator('#walletDialog').isVisible(), false);
    });
    await safari.close();
  } catch (e) { limitations.push(`WebKit not run: ${e.message.split('\n').filter(Boolean).slice(0, 5).join(' ')}`); console.log('LIMITATION WebKit unavailable (missing host libraries).'); }
} finally {
  server.closeAllConnections(); await new Promise(r => server.close(r));
  await writeFile(join(out, 'results.json'), JSON.stringify({ results, limitations }, null, 2));
}
console.log(`${results.filter(r => r.passed).length}/${results.length} checks passed.`);
if (results.some(r => !r.passed)) process.exitCode = 1;
