import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  vite: { base: './', plugins: [tailwindcss()] },
});
