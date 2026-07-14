# StyleSeed Quality Gate

- Target: `src/app`, `src/shared/ui`
- Design lock: `STYLESEED.md`
- Gate date: 2026-07-14
- Final score: **90 / 100 (A)**
- Result: **PASS** (`>= 80`)

## Evidence score

| Category | Score | Evidence |
| --- | ---: | --- |
| Color discipline | 16 / 16 | `globals.css` defines Ink, Cobalt, cool neutrals, and separate semantic colors; page and shared UI decorative color search has no legacy teal/green palette. |
| Hierarchy & typography | 14 / 16 | Pretendard Variable is self-hosted, desktop body defaults to 16px, and `PageHeader` provides a clear 36px focal heading. Compact operational metadata intentionally remains 12–14px. |
| Layout & rhythm | 11 / 12 | Content is constrained to 1180px with airy 24–56px spacing and editorial lists. Some operational screens repeat divider-list structures. |
| Cards & elevation | 8 / 10 | Cards are reserved for grouped/empty content and use a 4% shadow. Some forms still use hairline borders as deliberate structural separation. |
| States & a11y | 16 / 18 | Visible focus, 44px controls, disabled/pending/error/empty states, semantic status labels, and mobile 64px navigation are present. Server-rendered data routes do not have dedicated route loading screens. |
| Motion & interaction | 6 / 6 | Snap is locked to 140ms for controls and navigation, payload is not delayed, and reduced motion disables custom transitions and animation. |
| Coherence | 11 / 12 | One accent, one soft radius family, one subtle elevation language, and one icon stroke family are consistent. A few semantic success/error messages still use Tailwind semantic utilities instead of CSS tokens. |
| Distinctiveness | 8 / 10 | Content-centered navigation, editorial lists, and restrained branding avoid dashboard and icon-chip clichés. The landing workflow uses a familiar numbered-step treatment. |

## Gate fixes applied

1. Replaced the green/teal brand surface with Ink `#172033`, Cobalt `#2F5BEA`, and cool neutrals.
2. Removed green from brand, active navigation, progress, links, forms, and decorative timeline markers.
3. Kept green, amber, and red only for semantic success, warning, danger, and corresponding feedback.
4. Unified controls at 44px, soft 8–12px radii, and 140ms Snap interaction timing.
5. Added self-hosted Pretendard Variable and preserved its official SIL OFL license and source metadata.
6. Added global visible focus and reduced-motion handling.

The score clears the StyleSeed floor. The remaining deductions are deliberate tradeoffs for compact operational metadata and content-led divider lists, not blockers.
