# SqueekBlockNFT design system

## Overview

This is a community collection of SqueekChain block data cards for Sepolia users. It retains the project's dark terminal appearance: JetBrains Mono, amber product identity, green controls and headings, flat outlined surfaces, and the original 400 × 300 SVG cards. All four pages use the same navigation, document layout and disclaimer footer.

Home places its product name, a plain description, mint/gallery actions and the actual sample cards before live chain data. Mint exposes the connect control and block form without requiring a successful RPC read. Gallery describes the exact range being checked. This ordering is specific to these tasks, not a requirement to add a hero to every page.

## Colors

Canonical tokens are in `src/styles/global.css`, using the existing hex notation and Tailwind `@theme` system.

| Token | Value | Implemented role |
| --- | --- | --- |
| `--color-bg` | `#0a0a14` | Page, input and SVG background |
| `--color-surface` | `#111122` | Cards, form panel, dialogs |
| `--color-border` | `#35354f` | Structural outlines and header/footer separators |
| `--color-text` | `#e0e0e0` | Main copy and data |
| `--color-muted` | `#9999aa` | Descriptions, labels, secondary copy |
| `--color-amber` | `#f5a623` | Product heading, primary action, Legendary caption |
| `--color-green` | `#00ff41` | Secondary actions, section headings, positive status |
| `--color-red` | `#ff8197` | Error messages and invalid fields |
| `--color-epic` | `#bd8cfa` | Epic tier in About |
| `--color-rare` | `#70ace9` | Rare tier in About |
| `--color-focus` | `#f5a623` | Keyboard focus perimeter |

The previous unused `--color-green-dim` declaration remains for compatibility; components do not use it for text. Do not use it as a substitute for the green text token.

Primary hover fill is `#ffc261`; secondary hover fill is `#163a27`. Artwork preserves its own original palette, including the green settled badge, muted labels, lavender data and red rarity text. The live on-chain art is displayed without editing it. Illustration lettering is not treated as ordinary interface typography by the review probe.

There is one dark theme. Status always has words as well as color. Active navigation is underlined and exposes `aria-current="page"`. Inline prose links are underlined. Measured interface contrast evidence and the artwork limitation are in `artifacts/validation.md`.

## Typography

`--font-mono` is `'JetBrains Mono', 'Fira Code', monospace`. The first face is loaded locally from `src/assets/fonts/jetbrains-mono-latin.woff2` through a variable `@font-face` declaration for normal weights 400–700 and `font-display: swap`. The interface uses 400 and 700. There are no remote font requests. Font licensing is in `public/licenses/jetbrains-mono-OFL.txt`.

The terminal font remains intentional throughout, including prose. This is the one deliberate exception to taste@1's preference against monospace paragraphs; it preserves the existing site's visual character.

| Role | Size | Treatment |
| --- | --- | --- |
| Body/interface copy, labels, buttons, nav, captions | 14px (`text-sm` or `.term-btn`) | Regular; UI copy usually 20px line height |
| Numeric input | 16px | Avoids small-input zoom on phones |
| Section headings, stats, dialog titles | 18px (`text-lg`/`.section-title`) | Bold |
| Page title | 24px (`text-2xl`) | Bold, amber |

The body line height is 1.6. Headings use 1.3, balanced wrapping and overflow wrapping. Descriptions use pretty wrapping. Tailwind's text utilities set their own associated line height. No tracked capitals, custom letter spacing or synthetic additional weights are introduced. The SVG's fixed internal art sizes are independent of this UI scale.

Long addresses wrap with `.break-address`; they are not clipped or abbreviated in the contract details. The connected wallet label is deliberately abbreviated for scanning, with the full address available as its title. Normal text stays selectable. A page has one `h1`, subordinate `h2` sections and a single main landmark.

## Layout

The existing Tailwind 4px spacing step is retained. Common gaps are 8/12px within a group, 16/20px panel padding, and 24/32px between groups. Content has 16px side padding at the normal root font size.

- Shared header and Gallery: maximum width 56rem (`max-w-4xl`).
- Home: maximum width 48rem (`max-w-3xl`).
- Mint/About: maximum width 42rem (`max-w-2xl`).
- Home description: maximum width 32rem.
- Dialog: maximum width 420px, with 16px viewport gutters and 20px inner padding.

At 40rem and below, navigation moves beneath the brand and distributes across the width. It can wrap further when text is enlarged. Mobile dialogs align near the bottom. At 48rem, sample cards expand from two to four columns, home instructions from one to three, collection explanations from one to two, stats from two to four, and Gallery from two to three. At 64rem, Gallery uses four columns.

Card artwork retains a 4:3 aspect ratio. A full-card preview is at most 400px wide. Gallery controls sit before the grid; range navigation follows it. Flexible form rows wrap instead of clipping. Inputs use `min-width: 0`. Logical inline padding is used for navigation and the ordered list; addresses can wrap anywhere. Content stays in normal document flow, with no sticky controls obscuring it.

The actual export was tested at 320, 390, 768 and 1440 pixels. The About page was also tested with a 200% root font and RTL direction. This is reflow evidence, not a native zoom or localization certification.

## Elevation & Depth

The design is deliberately flat. `.term-box` uses a tonal surface and one structural border, without shadows. Stats share one surface rather than stacking cards inside cards. Dialogs use a `#000b` backdrop. A low-opacity white outline (`#ffffff1a`) separates sample art from the surrounding surface. Focus uses a distinct outline rather than changing the structural border.

## Shapes

Panels and cards have an 8px radius; buttons and inputs 6px; artwork 4px; dialogs 12px. Artwork content is not cropped. Input and button height is at least 44px. Wallet rows are at least 48px with 28px provider icons when the discovered extension supplies a data-URI mark. Navigation targets are at least 44px tall. Inline prose links retain their text-flow exception to large targets.

## Components

| Source | Reuse and behavior |
| --- | --- |
| `src/layouts/Layout.astro` | Shared document, metadata, favicon/share image, skip link, main landmark, Nav/Footer. Props: `title`, `description`, `current`. All routes are explicit sibling HTML files. |
| `src/components/Nav.astro` | Brand links home; four relative links; active route has an underline and `aria-current`. Keeps the existing hamster brand mark. |
| `src/components/Footer.astro` | Contract explorer link and the full community/non-affiliation disclaimer on every page. |
| `src/components/BlockCard.astro` | Build-time sample SVG. Props: `block`, `round`, `work`. Uses the original artwork and rarity precedence. A real anchor opens `mint.html?block=…`; artwork and link have accessible names. |
| `.term-box`, `.term-btn`, `.term-input` in `src/styles/global.css` | Panel, outline action, filled amber `.primary`, and numeric field. Visible hover/focus/pressed/disabled and invalid states; all share the same tokens. |
| `src/pages/mint/index.astro` / `src/scripts/mint.ts` | Labeled block form, wallet picker, availability/error/status text, preview, explorer transaction link. Explicit discovery/connect/switch/disconnect states. Mint disables while submitting; validation focuses the input; RPC and rejection errors explain recovery. |
| `src/pages/gallery/index.astro` / `src/scripts/gallery.ts` | Exact 50-block range, bounded read pool, retry, empty state, range controls, native card-preview dialog and mint-page deep link. |
| `src/scripts/home.ts` | Live statistics with truthful loading/unavailable states and a retry button. The sample cards themselves do not require JavaScript. |
| `src/lib/chain.ts` | Existing deployment constants, local ethers imports, RPC timeout, safe data-URI metadata handling and image creation. No HTML is interpolated from token metadata. |

Native dialogs provide modal keyboard containment and Escape dismissal. Both dialogs have close buttons, backdrop dismissal and focus restoration. Live regions are present before messages update. The mint field binds help/errors with `aria-describedby` and marks validation failures with `aria-invalid`. The first keyboard target is “Skip to content”; focus has a 2px amber outline offset by 4px, with a system-color override in forced-colors mode.

There are no entrance animations, looping effects or theme transitions. Buttons transition only background color and transform for 120ms, gated by `prefers-reduced-motion: no-preference`; press scale is 0.96. Hover colors are gated by `hover: hover`. Busy states also change their text or disabled state, so motion is never the sole cue.

## Do's and Don'ts

Start another page with `Layout` and an existing width/padding primitive. Set its own title/description and `current` route; keep links relative to sibling `.html` files and reuse the shared disclaimer. Reuse the four text roles and existing hex tokens. Put one amber primary action beside neutral/green peers. Show chain failures as unavailable with recovery text, never as zero or fabricated data.

Keep the SVG card composition and the community identity. Do not replace the collection contracts, import remote scripts, add external font/CDN requests, hide important values with clipping, or turn sample cards into claims of available tokens. Keep build dependencies outside `dist/`; rebuild and check relative paths after source changes.

Design reference attribution and licenses are recorded in README and `artifacts/design-guidance-LICENSE.txt`.
