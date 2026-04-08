# Collections Trio Showcase (2026-04-01)

## New section

- Added a new homepage section:
  - `sections/collections-trio-showcase.liquid`
- Goal:
  - 3-image collection showcase matching the approved mockup language
  - left large panel + right top/bottom stacked panels
  - scrolling ticker badges, technical corner framing, bracket CTA style

## Layout behavior

- Desktop composition:
  - two-column grid
  - left tile spans full height
  - right side split into top and bottom tiles
- Mobile composition:
  - tiles stack in one column
  - first tile remains visually dominant

## Visual system

- Section keeps the same global shell/frame integration as other homepage sections.
- Each tile includes:
  - image layer + dark overlay
  - subtle animated grain
  - technical corner marks
  - optional ticker
  - title + subtitle + bracket CTA

## Main file updates

- `sections/collections-trio-showcase.liquid`
- `assets/base.css` (new `.collections-trio*` rules + responsive rules)
