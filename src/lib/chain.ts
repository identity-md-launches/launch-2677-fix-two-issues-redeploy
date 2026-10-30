import { Contract, FetchRequest, JsonRpcProvider } from 'ethers';

// Existing Sepolia deployment: this update does not deploy or change contracts.
export const NFT_ADDRESS = '0x531497ddc70d634342020b1111C8b1A92873e669';
export const CORE_ADDRESS = '0x74665dAecA35A2303e767E76a2FF1FB6F93e119f';
export const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';
export const CHAIN_ID = '0xaa36a7';
export const MAX_SUPPLY = 10_000;
export const NFT_ABI = [
  'function mint(uint256 b) external',
  'function tokenURI(uint256 b) view returns (string)',
  'function blockMinted(uint256) view returns (bool)',
  'function totalMinted() view returns (uint256)',
];
export const CORE_ABI = ['function state() view returns (uint64,uint64,uint96,uint64,uint96,uint32,uint256,bool)'];

export function createReader() {
  const request = new FetchRequest(RPC_URL);
  request.timeout = 15_000;
  const provider = new JsonRpcProvider(request, { chainId: 11155111, name: 'sepolia' }, { staticNetwork: true, batchMaxCount: 1 });
  return {
    provider,
    nft: new Contract(NFT_ADDRESS, NFT_ABI, provider),
    core: new Contract(CORE_ADDRESS, CORE_ABI, provider),
  };
}

export function element<T extends HTMLElement = HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element: ${id}`);
  return node as T;
}

export function errorMessage(error: unknown): string {
  const e = error as { code?: string | number; shortMessage?: string; reason?: string; message?: string };
  if (e.code === 4001 || e.code === 'ACTION_REJECTED') return 'Request declined in your wallet. You can try again.';
  if (e.code === -32002) return 'A wallet request is already open. Check your wallet to continue.';
  if (e.code === 'INSUFFICIENT_FUNDS') return 'You need Sepolia ETH for gas. Use the testnet faucet linked above.';
  if (e.code === 'NETWORK_ERROR' || e.code === 'TIMEOUT' || e.code === 'SERVER_ERROR' || e.code === 'BAD_DATA') {
    return 'Sepolia could not be reached. Check your connection and try again.';
  }
  return e.reason || e.shortMessage || 'The request failed. Check your wallet and connection, then try again.';
}

export interface CardMetadata {
  image: string;
  rarity: string;
}

export async function readCard(nft: Contract, block: number): Promise<CardMetadata> {
  const uri: string = await nft.tokenURI(block);
  const prefix = 'data:application/json;base64,';
  if (!uri.startsWith(prefix)) throw new Error('Unsupported token metadata');
  const data = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(uri.slice(prefix.length)), c => c.charCodeAt(0))));
  // Keep on-chain art self-contained; never turn arbitrary metadata into HTML.
  if (typeof data.image !== 'string' || !/^data:image\/(svg\+xml|png|jpeg|webp)(;base64|;utf8|;charset=utf-8)?,/i.test(data.image)) {
    throw new Error('Unsupported card image');
  }
  const rarity = Array.isArray(data.attributes)
    ? data.attributes.find((a: { trait_type?: string }) => a.trait_type === 'Rarity')?.value
    : undefined;
  return { image: data.image, rarity: typeof rarity === 'string' ? rarity : 'Unknown rarity' };
}

export function cardImage(card: CardMetadata, block: number) {
  const img = document.createElement('img');
  img.src = card.image;
  img.alt = `Block #${block}, ${card.rarity}. On-chain SVG card showing round and work.`;
  img.width = 400;
  img.height = 300;
  img.className = 'block-art';
  return img;
}
