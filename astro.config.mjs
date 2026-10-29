import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: { plugins: [tailwindcss()] },
  site: 'https://squeek-nft.vercel.app',
});