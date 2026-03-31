# Hero Video + Nav Decisions (2026-03-31)

## Global guardrails

- Push with safe mode to avoid wiping editor content:
  - `shopify theme push --theme 181101723915 --nodelete`
- Keep local push ignore for dynamic settings:
  - `.shopifyignore` includes `config/settings_data.json` and `templates/*.json`

## Hero video

- Hero height remains fixed to `85vh`.
- Hero overlay uses a light tint only (reduced intensity):
  - `rgba(8,12,18,.12)` top
  - `rgba(8,12,18,.06)` middle
  - `rgba(8,12,18,.20)` bottom
- Copy/title behavior:
  - glitch/scramble transitions on slide change
  - in/out animation on copy blocks
- Prev/next behavior:
  - scramble on appear/disappear
  - pulse scramble on each pair change

## Tech frame in hero

- Frame is centered on active `.video-hero__copy-grid` Y axis (dynamic JS alignment).
- Frame style:
  - corners only (no full border)
  - subtle technical background/glitch
  - animated film grain restricted inside the frame
- Main files:
  - `sections/video-hero-slider.liquid`
  - `assets/base.css`
  - `assets/theme.js`

## Side progress bar

- Vertical side progress is tied to hero copy center for clean alignment.
- Side progress is intentionally nudged down for visual centering:
  - desktop offset: `--hero-side-progress-y-offset: 6px`
  - tablet offset: `--hero-side-progress-y-offset: 4px`
- Plus markers are thin custom 1px crosses.
- Position reference:
  - anchored near the external shell frame (left side), not the internal tech frame.
- Current gap target:
  - around 20px from external section frame.

## Header / nav alignment

- Header outer shell must align with the same external frame as sections.
- Implementation:
  - `.site-header` is centered with `left: 50%` + `transform: translateX(-50%)`
  - nav width is locked to section frame logic: `width: calc(100% - (var(--hero-shell-inset) * 2))`
  - `.site-header-shell` uses `width: 100%` inside that fixed-width container
- File:
  - `assets/base.css`

## Collection slider (new section)

- Section reused: `sections/collection-slider.liquid` (now redesigned to match mockup layout).
- Visual rules:
  - section background, product-area background, ticker frame background, product meta background and card separators are now editable from section settings
  - defaults:
    - section/product-area background: `#E9EBEB`
    - ticker frames (left label, controls, right view-all): `#EFF0F0`
    - product meta strip (`collection-slider__meta`): `#EFF0F0`
    - card separator: `#EFF0F0` (editable)
  - `collection-slider__media` no longer has a hardcoded fill background
  - line system (strict):
    - one outer section frame line at 100% white opacity (same section frame dimensions)
    - one horizontal 1px white line between the 2 collection rows at 100% opacity
    - only vertical lines between product cards with `#EFF0F0`
  - no other parasite borders/lines
  - no vertical inset above/below rows; horizontal alignment stays locked to section frame inset
  - product meta strip uses slightly different tone (`#DEE1E2`) like mockup
  - no separator line between media and meta
  - product meta block is inset to show section background around it
  - desktop viewport composition target:
    - 5 visible cards
    - 3 full center cards
    - 2 edge cards cropped to ~50%
  - desktop composition logic:
    - card width base is `viewport / 4` (no shrink factor)
    - initial offset is `0.5` card
    - result: 3 cards full visible + 2 edge cards cropped ~50%
  - desktop product card format:
    - forced `4:5` proportion (width:height) for the full card
    - runtime sizing (JS):
      - card width is computed as `max(card_width_setting, viewport_width / 4)`
      - row height is computed as `max(row_height_setting, (viewport_width / 4) * 5 / 4)`
    - result:
      - never more than 5 visible cards on desktop
      - strict 4:5 card proportion preserved by increasing row height when required
      - current target composition kept: 3 center cards fully visible + 2 edge cards cropped
  - loop strategy:
    - uses first 10 products of each collection
    - renders 2 sequences (10 + 10) and loops infinitely in JS
    - if collection has fewer than 10, placeholders fill missing slots
  - desktop row height is auto-lifted to keep the intended mockup ratio
  - two collection floors (2 blocks max)
  - left and right ticker text areas with slow horizontal marquee
  - top UI (left label + controls + "tout voir") is an overlay above products, not reserved columns
  - products continue across full row width behind the top overlay
  - top-left `+` quick-add button on each product card
  - row controls (`<` / `>`) scroll product rail per-card
- Behavior:
  - per-row horizontal slider loops infinitely (no terminal end state)
  - interaction style inspired by reference recording:
    - card separators/traits are fixed at row level (static overlay grid on each row, not on scrolling content)
    - products move beneath this fixed grid
    - navigation moves by discrete steps ("par accoup")
  - controls and interaction:
    - arrows move exactly one product step
    - desktop arrow block is positioned to the right of the 4th visible case (layout with edge crops)
    - arrows are rendered as two visually separate boxes (not a single merged block)
    - wheel/trackpad triggers step-by-step motion (thresholded, non-continuous)
    - desktop grab/drag is enabled and moves by step increments
  - quick-add marker logic:
    - moving card-level `+` buttons are hidden
    - new larger fixed `+` overlay buttons are pinned to the 5 visible slots
    - each fixed `+` is remapped in JS to the product currently visible underneath
    - fixed `+` buttons remain static while cards slide behind
  - quick add via AJAX (`/cart/add.js`) with success/error feedback state
- Main files:
  - `sections/collection-slider.liquid`
  - `assets/base.css`
  - `assets/theme.js`

## Video hero sticky + parallax (2026-03-31)

- Requested behavior:
  - keep the video hero pinned at top while scrolling
  - let following sections pass above it
  - add a subtle downward parallax on hero content while scrolling
- Implementation:
  - Final working structure:
    - `.video-hero` stays as the scroll container (`position: relative`)
    - section height is extended with a dedicated scroll span:
      - `height: calc(var(--hero-sticky-height) + var(--hero-scroll-span))`
    - `.video-hero__media-frame` is the real sticky element:
      - `position: sticky; top: 0; height: var(--hero-sticky-height)`
  - Following sections stay layered above (`z-index: 2`) so they pass over the hero.
  - The outer hero frame is now attached to `.video-hero__media-frame::before` (not the full section), so the frame remains stable during sticky phase.
  - Hero content parallax:
    - `transform: translate3d(0, var(--hero-content-parallax-y), 0)`
    - JS shift is clamped from `0` to `42px`
    - disabled on `prefers-reduced-motion`
    - updated on `scroll` + `resize`
- Main files:
  - `assets/base.css`
  - `assets/theme.js`

### Sticky fix (clarification)

- User feedback: sticky had to be on the **video hero slider section itself** (not a fake inner sticky span).
- Final approach:
  - remove internal fake sticky span/range
  - restore hero section to strict `85vh`
  - keep parallax on hero copy content
  - apply sticky layering on Shopify section wrappers via JS classes:
    - hero wrapper: `.shopify-section--video-hero-sticky`
    - all following wrappers: `.shopify-section--above-video-hero`
- This guarantees following sections pass over the sticky hero.

## Category sticky showcase (new section)

- New section file:
  - `sections/category-sticky-showcase.liquid`
- Goal:
  - full-screen category visuals (`100vh`)
  - sticky scroll behavior where next category pushes in while current is pinned
  - same visual language as hero: left progress bar (`+` markers), inner technical frame, grain/glitch texture
- Composition:
  - up to 3 category blocks (`max_blocks: 3`)
  - each block supports:
    - text (label)
    - CTA text
    - CTA link
    - desktop image
    - mobile image
  - no blocks fallback provides 2 placeholders
- Scroll behavior:
  - each category item has extended scroll span
  - sticky panel (`position: sticky; top: 0; height: 100vh`) creates the handoff effect to the next category
  - transition length adjustable in section setting:
    - `Distance de transition entre categories (vh)`
- Overlay:
  - adjustable dark overlay setting:
    - `Overlay sombre (%)`
- Styling updates:
  - new `.category-sticky` styles added to `assets/base.css`
  - section added to shared section-frame selectors (outer 1px frame + same spacing system as other homepage sections)
