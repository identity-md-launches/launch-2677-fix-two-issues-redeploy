# Validation and design review

Worker self-review, 2026-10-30 UTC. This report records local checks, not independent certification.

| Area | Result |
| --- | --- |
| Requested affiliation and CDN fixes | Implemented and checked in source and export |
| Existing pages and SVG block cards | Four pages and original card composition retained |
| Production build | Pass; four static pages |
| Typecheck | Pass; 14 files, 0 errors/warnings/hints |
| Useful Chromium interaction checks | 16/16 pass |
| Automated accessibility | No violations on the four pages and tested no-wallet dialog |
| Product/main action on first 390px screen | Yes; title, mint/gallery actions and actual sample SVGs visible |
| taste@1 | 15/16; existing monospace prose deliberately retained |
| Share metadata | Title, description, favicon, og:title and local 1200 × 630 og:image |
| WebKit | Attempted; could not launch because host libraries are missing |
| IPFS publication | After submission, by the contributor platform; no pin/CID claimed here |

## Scope and assumptions

The scope is the existing Astro site: Home, Mint, Gallery and About, with shared navigation, layout, footer, styling, bundled scripts and on-chain card reads. The previous dark terminal design and SVG artwork are the visual source of truth. The existing Sepolia NFT/core addresses, network and contract methods remain unchanged. No contract was deployed and no real transaction was sent.

The root dependency manifest and build configuration were preserved. The existing root ignore rules remain, with a narrow, budgeted allowlist so these reports and screenshots are included in the submission. A new static toolchain, configuration, standard npm lockfile, build runner, preview and interaction checker live in `web/`. The submitted export is `dist/`. The new `web/.gitignore` has an explicit path budget in its comments and README; it makes its new lockfile visible while excluding generated dependencies/caches/archives.

Live chain data may fail independently of the website. Samples are explicitly labeled examples. Gallery describes exactly the 50-block range read, rather than claiming a sparse scan represents the entire collection. No simulated stats or test wallet fixtures are shipped in the website. Static pages need no third-party assets; live reads use the pre-existing public Sepolia RPC as data, not as executable code.

## Requirement coverage

| Requirement | Status and evidence |
| --- | --- |
| Remove claims of affiliation | Met: `src/pages/about/index.astro:8` identifies a community collection and disclaims affiliation. Browser checks reject the removed affiliation term on all four pages. |
| Disclaimer in every page footer | Met: `src/components/Footer.astro:3` is included by the shared layout; all four exported footers were asserted and rendered. |
| Replace external CDN JavaScript | Met: `src/lib/chain.ts:1` and the mint script import the installed ethers package; Astro emits only local modules. All observed script requests remain within the static origin/subpath, including when external requests are blocked. |
| Keep existing pages and SVG design | Met: all four sibling HTML pages, four original sample SVG compositions, real token art, and a working larger gallery preview remain. |
| Source, lockfile and complete relative export | Met: `src/`, `public/`, `web/package.json`, `web/package-lock.json` and `dist/` included. Strict gateway-subpath validation found no missing local assets. |
| Build, typecheck and useful interactions | Met: actual commands/results below and `interaction-results.json`. |
| Better Interface, six-domain review and repairs | Met within recorded browser/device limits; coverage and findings below. |
| Mobile first screen and metadata | Met: screenshots, bounding-box assertions and metadata resource checks. |
| DESIGN.md and install/preview/rebuild documentation | Met: repository-root DESIGN.md and README. |
| Deploy to IPFS | Platform handoff: the complete `dist/` is the publishing payload. Pinning follows submission; no publisher command, invented CID or live-URL claim is included. |

The visual idea is a community block-card collection carried by its existing dark terminal palette and SVG data cards.

## Six-domain Better Interface review

The pinned contents/workflow, core principles of all six domains, documentation method, and relevant forms, focus/keyboard, responsive layout, contrast and component-state guidance were read and applied during implementation.

| Domain | Coverage and evidence | Limits |
| --- | --- | --- |
| Accessibility | Checked source semantics, real card anchors, image descriptions, associated labels, field errors, persistent live regions, `aria-current`, skip link, keyboard focus, native dialogs, Escape/focus restoration and target sizes. Axe checks passed on all four pages and the no-wallet dialog. Manual Tab displayed a visible 2px amber perimeter in the real card dialog; Escape restored the card trigger. | No screen-reader session, physical device, native 200% zoom or rendered forced-colors check. Accessibility snapshots are not screen-reader evidence. |
| Layout | All four pages rendered without horizontal overflow at 320/390/768/1440. Actual production screenshots inspected at 390 and 1440; card modal fits its mobile gutters. About reflow passed with 200% root font and RTL direction. Primary product/action are above the fold at 390. | Root-font enlargement is not browser-native zoom. RTL/large-text combination was tested on About, not every page or a translated locale. |
| Writing | Community identity is explicit; no unsupported affiliation or future-art promise. Samples are examples; availability, errors and range results say what was actually read. Buttons describe actions; wallet errors explain recovery. Final probe measured 25 prose words on the first phone screen and 79 on desktop. | No localization review. Contract/network descriptions retain the supplied project's terminology. |
| Typography | Local JetBrains Mono loaded successfully in the real browser (font request 200 and `document.fonts.check` true). UI uses four size roles, two weights, wrapping addresses and clear heading hierarchy. The first-page probe measured 14/18/24px; 16px inputs occur on forms. | Monospace prose is a deliberate retained design exception. Other operating systems/font fallbacks were not physically tested. SVG lettering remains original artwork. |
| Colors | Reviewed declared tokens and measured computed solid foreground/background pairs in Chromium; values below. Probe's measured interface text passed contrast. Active navigation and status carry non-color cues; inline links have persistent underlines. | Original SVG lettering is artwork and excluded from the probe. Disabled controls, every hover pair, artwork contrast and high-contrast system rendering were not exhaustively measured. |
| UI | Flat panels, borders, input/action sizes, responsive native dialogs, loading/empty/failure/retry states, safe metadata images and visible focus checked. Source motion is limited to named 120ms button transitions with reduced-motion gating; the probe found no endless motion. | No 10%-speed Animations-panel review, touch hardware testing or passkey flow. The existing injected-wallet flow is retained; no external Coinbase/passkey SDK or relay was introduced. |

Measured from the rendered mint page's computed colors, using WCAG relative luminance:

| Pair | Actual colors | Contrast |
| --- | --- | ---: |
| Body text / page | `#e0e0e0` / `#0a0a14` | 14.92:1 |
| Muted text / page | `#9999aa` / `#0a0a14` | 7.02:1 |
| Primary action text / fill | `#0a0a14` / `#f5a623` | 9.72:1 |
| Muted text / panel | `#9999aa` / `#111122` | 6.65:1 |
| Focus perimeter / panel | `#f5a623` / `#111122` | 9.19:1 |

## Findings, corrections and rechecks

Locations refer to final source reuse points; the “before” observations came from the supplied source or actual local checks.

| Finding | Location | Before, correction and evidence |
| --- | --- | --- |
| High: misleading affiliation | `src/pages/about/index.astro:8`, `src/components/Footer.astro:3` | About asserted affiliation. Replaced with community/non-affiliation copy and retained the shared disclaimer across all four pages. Four-page text/footer assertions pass; rendered About and full Home screenshots show the final copy. |
| High: external executable dependency | `src/lib/chain.ts:1`, `src/scripts/mint.ts:1` | Three page scripts imported ethers from a remote CDN. Replaced with package imports that Astro bundles locally; the font also became a local WOFF2. The blocked-network suite still loads every page/script and displays recoverable RPC errors. Network inspection showed local scripts/CSS/font and only the public RPC as an external request. |
| High: gateway-relative asset and navigation failures | `src/components/Nav.astro:15`, `web/build.mjs:38`, `web/build.mjs:47` | Initial generated scripts contained a doubled slash and CSS referenced an origin-root font. Normalized HTML and CSS asset URLs and exported sibling `.html` links. A strict server with no origin-root alias now passes asset/navigation checks under an IPFS-like subpath; final taste render check passes. |
| High: hidden errors and inert sample interactions | `src/components/BlockCard.astro:8`, `src/scripts/home.ts:6`, `src/scripts/mint.ts:56`, `src/scripts/gallery.ts:46` | Home swallowed read errors; gallery/mint could remain loading or reject without recovery; samples depended on the failing remote import and used clickable divs. Samples now render at build time as keyboard links; reads have status text and retry controls, with mint connection available independently. Offline, retry and JavaScript-disabled checks pass. |
| Medium: skipped gallery blocks and ineffective preview | `src/scripts/gallery.ts:46`, `src/scripts/gallery.ts:69` | The prior scan skipped nine of every ten later blocks and sent card selection to an unhandled storage value. The gallery now checks every block in a declared 50-block range, supports arbitrary starts/next/previous, and opens a native preview plus a working query link. Fixture block 51 and the real on-chain block 1 were previewed successfully. |
| Medium: form/focus semantics | `src/pages/mint/index.astro:22`, `src/layouts/Layout.astro:31`, `src/styles/global.css:40` | The old input label was unbound and there was no shared keyboard focus treatment/skip link. Bound the label and help/error references, added invalid state and focus, and used native buttons/anchors/dialogs. Axe, keyboard skip, Escape/focus restoration, validation and wallet-state checks pass. |
| Medium: color-only inline link | `src/components/Footer.astro:2`, `src/pages/about/index.astro:47` | Axe reported `link-in-text-block` for the contract link. Added a persistent underline to inline prose links. Four-page and dialog accessibility checks pass after repair. |
| Medium: narrow/enlarged-text overflow | `src/styles/global.css:60`, `src/pages/about/index.astro:35` | The initial navigation was one unwrappable row; long literal faucet domains overflowed the enlarged/RTL test. Navigation now wraps, the ordered list uses logical padding, faucet text is a descriptive link, and full contract addresses wrap. Normal 320/390/768/1440 and About enlarged/RTL rechecks pass. |
| Medium: first-screen clutter and missing share assets | `src/pages/index.astro:14`, `src/layouts/Layout.astro:20` | A long v1/future-art announcement preceded the product; share metadata/favicon were absent. Kept a short product description, moved samples directly under actions, shortened instructions after a 91-word desktop probe failure, and added local favicon/share image. Final copy budgets are 25/79 words, and share checks pass. |
| Retained taste exception: monospace prose | `src/styles/global.css:28` | The existing site uses JetBrains Mono throughout. Preserved that terminal identity instead of introducing a new prose face for this bounded revision. The raw type-faces check remains false; it is not reported as a pass. |

No unresolved required code/export defect was observed in the tested scope. One inline text link is below the 44px comfortable size; it passes the probe's spacing/inline-target rule.

## Commands and actual outcomes

The worker installed into temporary directories, leaving dependency trees and caches outside the Git submission. A fresh copy of the committed `web/package.json` and `web/package-lock.json` was used for the clean install and final build/checks.

| Command | Observed result |
| --- | --- |
| `npm --cache /tmp/squeek-npm-cache ci --prefix /tmp/squeek-repro --no-audit --no-fund` | Exit 0; 294 packages installed from the new lockfile. |
| `node web/build.mjs build /tmp/squeek-repro` | Exit 0; `output: static`, four HTML pages, complete relative export in `dist/`. Run again after the last application source change. |
| `node web/build.mjs check /tmp/squeek-repro` | Exit 0; 14 files, 0 errors, 0 warnings, 0 hints. |
| `node --check web/build.mjs`, `node --check web/preview.mjs`, `node --check web/validate.mjs` | Exit 0. |
| `PLAYWRIGHT_BROWSERS_PATH=/tmp/squeek-browsers node web/validate.mjs /tmp/squeek-repro` | Exit 0; 16/16 checks, including actual retry-button recovery on Home, Mint and Gallery. Raw check outcomes in `interaction-results.json`. |
| `IMD_PLAYWRIGHT=/tmp/squeek-repro/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/tmp/squeek-browsers node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste --offline` | Ran successfully; 15 checks pass and one retained typography flag. Raw check outcomes in `taste-results.json`. |
| `git diff --check` | Exit 0 after removing the trailing blank line. |
| Protected-path diff and export/byte audit | Root package/build files unchanged; original root ignore entries retained with a budgeted evidence allowlist. Relative assets, bundled modules, complete pages, no CDN script references, no dependency/archive/submodule additions and byte budget checked; details in `export-audit.json`. |

Manual browser inspection used the real production export under a strict `/preview/` subpath. Local CSS, scripts, fonts and favicon returned 200; the inspected Home console reported 0 errors and 0 warnings. Real RPC reads returned NFT bytecode (10,328 bytes), total minted 2 and core block height 13,095 at observation time. The live gallery showed one minted card in blocks 1–50, not a claim that the total collection was one card. Counts are observations only and will change.

The original SVG block 1 was opened in the gallery dialog. Keyboard Tab displayed the amber focus perimeter on its mint-page link; Escape closed the dialog and returned focus to its card. The actual no-wallet picker was opened and dismissed. Signed flows use explicit intercepted test providers only: the fixture suite exercised wallet discovery, rejected connect, rejected switch, unknown-chain add/switch, account/network changes, duplicate/unmined preflight and a rejected transaction to the unchanged NFT address with the selected block argument. No real key, funds or signature was used.

Retained production screenshots (real RPC data where visible, no test fixtures):

- `screenshots/home-390.png`: first mobile screen with product/actions and four sample cards.
- `screenshots/home-1440.png`: full desktop page, including shared disclaimer.
- `screenshots/mint-390.png`: connect action, block form and controls within the first screen.
- `screenshots/gallery-390.png`: real range and on-chain card.
- `screenshots/gallery-preview-390.png`: enlarged original card and visible keyboard focus.
- `screenshots/about-390.png`: community description, wrapped contract address and disclaimer.

Temporary probe screenshots and interaction fixtures were written under `test/scratch/`, which is not part of the submission. The last application source edit only removed a blank line at EOF; the subsequent final build and typecheck passed.

## Remaining limitations and completion

WebKit downloaded but could not launch: Playwright reported missing host libraries, including `libgtk-4.so.1` and `libpangocairo-1.0.so.0`. No WebKit/Safari pass is claimed. Physical mobile-wallet handoff, screen readers, native browser zoom, exhaustive high-contrast/hover testing, Coinbase/passkey integration, and a real signed/pending/confirmed/replaced mint were not verified. There is no claim of a contract security audit or full accessibility certification. Live RPC availability remains external to the static website; failure/retry states were checked.

Complete for the bounded implementation, static export and recorded Chromium validation scope. Source, new lockfile, export, design documentation and actual evidence are included. The export is 397,004 bytes before filesystem block overhead; final path/bundle budgets and hashes are recorded in `export-audit.json`. IPFS pinning remains the contributor platform's post-submission step, with no fabricated deployment identifier.
