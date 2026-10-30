# SqueekBlockNFT

Community-made SVG block data cards for SqueekChain on Ethereum Sepolia. This project is not affiliated with SqueekChain. Minting has no mint fee; a wallet pays Sepolia gas.

This update retains Home, Mint, Gallery, About, the dark terminal styling, and the original SVG block card artwork. The shared footer carries the community disclaimer on every page. JavaScript, fonts, styles and share assets are bundled locally; there are no CDN script imports.

## Install, check, rebuild and preview

Use Node 24 (tested with 24.21.0) and npm. From the repository root:

```sh
cd web
npm ci
npm run typecheck
npm run build
npm run preview
```

Open `http://localhost:4321/preview/`. Stop the preview with Ctrl+C. To choose another port, use `npm run preview -- 4322`.

The existing root `package.json` and `astro.config.mjs` are preserved. They describe the previous Vercel server build. The **static/IPFS build is the separate, locked toolchain in `web/`**. Its manifest and `package-lock.json` are included. `web/build.mjs` copies `src/` and `public/` into a temporary directory, uses `web/astro.config.mjs`, bundles ethers, then writes the finished `dist/`. Temporary build files are removed. Root dependencies and build configuration are not rewritten.

The export contains explicit sibling pages:

| Page | Export |
| --- | --- |
| Home | `dist/index.html` |
| Mint | `dist/mint.html` |
| Gallery | `dist/gallery.html` |
| About | `dist/about.html` |

Links, scripts, stylesheet URLs, fonts, favicon and share image resolve relative to these files. No server rewrites are required. The preview intentionally serves only beneath `/preview/`, so origin-root asset mistakes produce a 404 instead of being hidden.

For a worker that installs dependencies outside the checkout, copy `web/package.json` and `web/package-lock.json` to an empty temporary directory, run `npm ci` there, then use `node web/build.mjs build /absolute/path/to/that/directory` (or `check`). The optional argument to `web/validate.mjs` works the same way.

## Interaction validation

After building, from `web/`:

```sh
npx playwright install chromium
npm run validate
```

`web/validate.mjs` starts and closes its own strict static server under an IPFS-like subpath. Its RPC and wallet fixtures are confined to the test browser: they never enter `dist/`. It checks all four pages at 320, 390, 768 and 1440 pixels, navigation, metadata assets, local-only scripts/fonts/styles/images, accessibility, the mobile first screen, wallet discovery and rejection, network switching, account changes, invalid inputs, mint preflight, transaction cancellation, card previews, gallery ranges, empty/error states, blocked external network, keyboard focus, enlarged text/RTL reflow, and JavaScript-disabled navigation.

Results and temporary screenshots are written only to `test/scratch/interactions/`. WebKit is attempted when available and reported separately when host libraries are missing. No private key is used and no real transaction is sent. This is interaction validation, not a contract audit.

## Actual results for this revision

- Clean `npm ci` from the new manifest and lockfile succeeded in a separate temporary directory.
- Production static build succeeded: four pages, all runtime assets included.
- Astro strict typecheck: **0 errors, 0 warnings, 0 hints** across 14 files. Build/preview/validation scripts also passed `node --check`.
- Chromium: **16/16 interaction checks passed**; automated WCAG A/AA checks found no violations on the four pages or the no-wallet dialog in tested states. No missing local resources or uncaught application errors were observed in the fixture suite.
- Pinned taste@1: **15/16 checks passed**. The remaining flag is the existing monospace prose style, intentionally retained as part of the site's terminal design. Layout, contrast, targets, first-screen copy, metadata and rendering passed.
- Live Sepolia reads succeeded: deployed NFT bytecode, core state, total minted, and a real gallery card were read. No real wallet signature or mint was attempted.
- WebKit could not launch because required system libraries are absent. Native screen-reader, physical phone, wallet-app deep-link handoff, passkey wallet and native browser zoom checks were not performed. A 200% root-font/RTL reflow check was performed; it is not native browser zoom.

See [artifacts/validation.md](artifacts/validation.md) for six-domain review coverage, findings, evidence and limitations, and [DESIGN.md](DESIGN.md) for the final design system.

## Runtime and collection

The browser reads `https://ethereum-sepolia-rpc.publicnode.com`. Rendering and navigation do not need that service; live stats, the gallery and mint preflight do. Failures show a retry or recovery instruction. A wallet is needed only to mint. The existing injected-wallet signing path is retained, with EIP-6963 discovery, legacy browser-wallet fallback, and links to open the current page in mobile wallet browsers. No remote wallet SDK or relay is loaded.

The NFT deployment remains [`0x531497ddc70d634342020b1111C8b1A92873e669`](https://sepolia.etherscan.io/address/0x531497ddc70d634342020b1111C8b1A92873e669). The core remains `0x74665dAecA35A2303e767E76a2FF1FB6F93e119f`. Addresses, chain ID, ABI and RPC are centralized in `src/lib/chain.ts`; no contract is redeployed.

Blocks #1–#10 are Legendary, #11–#100 Epic, #101–#1,000 Rare; subsequent thousandth blocks are Milestone, hundredth blocks Notable, and the rest Common. Samples on Home are labeled examples, not availability claims. Gallery checks every block in the selected 50-block range, with previous/next and an arbitrary starting block; it does not claim a partial scan is the whole collection. Select a gallery card for a larger preview, or open it on Mint. Mint checks block range, live height and duplicate status before asking the wallet to send a transaction.

The card metadata and SVG art live on-chain. **The website is a separate static export for IPFS.** These are distinct hosting arrangements.

## IPFS handoff

`dist/` is the complete publishing payload and is included in the submission alongside the source and lockfile. The contributor platform pins that export after submission. No publisher command was run here, and this checkout does not claim a new pinned CID or live gateway URL. Serve the directory at a gateway's CID root with a trailing slash; internal links use the explicit `.html` files.

## Submission budget

No dependency directories, package-manager caches, archives or Git submodules are included. The existing root ignore rules are retained, with a narrow, size-budgeted allowlist for the validation reports, license notice and screenshots. The new `web/.gitignore` includes its new lockfile and excludes generated content. The explicit conservative path budget is:

| Paths | Maximum submitted bytes |
| --- | ---: |
| `dist/**` | 1,048,576 |
| `src/**` | 262,144 |
| `public/**` | 131,072 |
| `web/package-lock.json` | 262,144 |
| `web/package.json` | 2,048 |
| `web/*.mjs` combined | 65,536 |
| `web/.gitignore` | 1,024 |
| Root `.gitignore` | 2,048 |
| `artifacts/**` | 1,572,864 |
| `README.md` and `DESIGN.md` combined | 65,536 |
| Dependencies, caches, package archives, other added paths | 0 |

This budget is below the assignment's 8,388,608-byte limit. Actual final sizes are recorded in the validation report.

## Licenses and design references

Project license: [LICENSE](LICENSE). Runtime license notices ship in `public/licenses/` and `dist/licenses/` for ethers, its dependencies and the locally served JetBrains Mono font (OFL).

Design review used the supplied Better Interface guide, adapted from [Jakub Krehel's Better Interface](https://github.com/jakubkrehel/skills/tree/267330e1adfc66a718fb65fa6918c1f06d0a689e/skills/better-interface) (MIT). The documentation method is adapted from [Paul Bakaus's Impeccable](https://github.com/pbakaus/impeccable/blob/9d715cc4f5564a990ca8345abfdd5df6dc9b41c8/skill/reference/document.md) (Apache-2.0). The supplied license texts are retained in [artifacts/design-guidance-LICENSE.txt](artifacts/design-guidance-LICENSE.txt).
