import { createReader, element, readCard, cardImage, MAX_SUPPLY, type CardMetadata } from '../lib/chain';

const { nft, core, provider } = createReader();
const grid = element('galleryGrid');
const status = element('galleryStatus');
const input = element<HTMLInputElement>('rangeStart');
const load = element<HTMLButtonElement>('loadRange');
const previous = element<HTMLButtonElement>('previousRange');
const next = element<HTMLButtonElement>('nextRange');
const retry = element<HTMLButtonElement>('retryGallery');
const dialog = element<HTMLDialogElement>('cardDialog');
const PAGE_SIZE = 50;
let start = 1;
let height = 0;
let busy = false;
let lastCard: HTMLButtonElement | undefined;

function renderCard(block: number, card: CardMetadata) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'term-box sample-card text-sm cursor-pointer';
  button.setAttribute('aria-label', `View block ${block}, ${card.rarity}`);
  button.append(cardImage(card, block));
  const caption = document.createElement('span');
  caption.textContent = `#${block} · ${card.rarity}`;
  caption.className = 'block mt-2';
  button.append(caption);
  button.addEventListener('click', () => {
    lastCard = button;
    element('cardHeading').textContent = `Block #${block}`;
    element('cardRarity').textContent = `${card.rarity} · Sepolia testnet`;
    element('fullCard').replaceChildren(cardImage(card, block));
    element<HTMLAnchorElement>('viewBlock').href = `./mint.html?block=${block}`;
    dialog.showModal();
  });
  return button;
}
function updateControls() {
  load.disabled = busy;
  input.disabled = busy;
  retry.disabled = busy;
  previous.disabled = busy || start <= 1;
  next.disabled = busy || start + PAGE_SIZE > height;
  grid.setAttribute('aria-busy', String(busy));
}
async function loadRange(requested: number) {
  if (busy) return;
  busy = true;
  start = requested;
  retry.hidden = true;
  grid.replaceChildren();
  status.textContent = 'Reading Sepolia…';
  updateControls();
  try {
    const [state, total] = await Promise.all([core.state(), nft.totalMinted()]);
    height = Math.min(Number(state[3]), MAX_SUPPLY);
    start = Math.min(requested, Math.max(1, height));
    input.value = String(start);
    const end = Math.min(start + PAGE_SIZE - 1, height);
    if (!height || Number(total) === 0) {
      status.textContent = 'No blocks have been minted yet. Mint a block to start the collection.';
      return;
    }
    status.textContent = `Checking blocks ${start.toLocaleString()}–${end.toLocaleString()}…`;
    const cards: { block: number; card: CardMetadata }[] = [];
    let cursor = start;
    let failures = 0;
    // A bounded pool checks every block in this range, without a sparse scan.
    await Promise.all(Array.from({ length: 6 }, async () => {
      while (cursor <= end) {
        const block = cursor++;
        try { if (await nft.blockMinted(block)) cards.push({ block, card: await readCard(nft, block) }); }
        catch { failures++; }
      }
    }));
    cards.sort((a, b) => a.block - b.block);
    grid.replaceChildren(...cards.map(({ block, card }) => renderCard(block, card)));
    const range = `Blocks ${start.toLocaleString()}–${end.toLocaleString()} of ${height.toLocaleString()}`;
    status.textContent = failures
      ? `${range}. ${cards.length} cards loaded; ${failures} block reads failed. Retry this range to check the missing cards.`
      : cards.length ? `${range}. ${cards.length} minted ${cards.length === 1 ? 'card' : 'cards'} shown.`
      : `${range}. No minted cards in this range. Try the next range or enter a starting block.`;
    retry.hidden = failures === 0;
  } catch {
    status.textContent = 'The gallery could not reach Sepolia. Check your connection, then retry.';
    retry.hidden = false;
  } finally { busy = false; updateControls(); }
}
const form = element<HTMLFormElement>('rangeForm');
form.addEventListener('submit', event => {
  event.preventDefault();
  const requested = input.valueAsNumber;
  if (!Number.isSafeInteger(requested) || requested < 1 || requested > MAX_SUPPLY) {
    input.setAttribute('aria-invalid', 'true');
    status.textContent = 'Enter a whole starting block from 1 to 10,000.';
    input.focus();
    return;
  }
  input.removeAttribute('aria-invalid');
  void loadRange(requested);
});
previous.addEventListener('click', () => void loadRange(Math.max(1, start - PAGE_SIZE)));
next.addEventListener('click', () => void loadRange(start + PAGE_SIZE));
retry.addEventListener('click', () => void loadRange(start));
element('closeCard').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});
dialog.addEventListener('close', () => lastCard?.focus());
window.addEventListener('pagehide', event => { if (!event.persisted) provider.destroy(); });
void loadRange(start);
