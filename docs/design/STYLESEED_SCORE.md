# StyleSeed Quality Gate

- Target: `src/app`, `src/shared/ui`
- Design lock: `STYLESEED.md`
- Visual reference: `docs/design/pms-ui-concept-capstone-studio.png` (information rhythm only; the department-wide product lock takes precedence)
- Excluded concepts: earlier green, generic Ink/Cobalt SaaS, and competition-catalogue explorations
- Gate date: 2026-07-14
- Final score: **94 / 100 (A)**
- Result: **PASS** (`>= 80`)

## Evidence score

| Category | Score | Evidence |
| --- | ---: | --- |
| Color discipline | 16 / 16 | `globals.css` defines Ink, Cobalt, cool neutrals, and separate semantic colors; page and shared UI decorative color search has no legacy teal/green palette. |
| Hierarchy & typography | 14 / 16 | Pretendard Variable is self-hosted, desktop body defaults to 16px, and `PageHeader` provides a calm 44–56px focal heading. Compact operational metadata intentionally remains 12–14px. |
| Layout & rhythm | 12 / 12 | White page canvas, 1280px content measure, airy 24–56px spacing, and disciplined divider lists support the full program-to-report flow. |
| Cards & elevation | 10 / 10 | No `box-shadow` or floating elevation remains. Grouping uses flat borders, dividers, tonal form sections, and whitespace. |
| States & a11y | 16 / 18 | Visible focus, 44px controls, disabled/pending/error/empty states, semantic status labels, and mobile 64px navigation are present. Server-rendered data routes do not have dedicated route loading screens. |
| Motion & interaction | 6 / 6 | Snap is locked to 140ms for controls and navigation, payload is not delayed, and reduced motion disables custom transitions and animation. |
| Coherence | 12 / 12 | One accent, one soft radius family, flat/no-shadow elevation, and one icon stroke family are consistent. Semantic colors appear only in matching status and feedback contexts. |
| Distinctiveness | 8 / 10 | Precise project headings, flat work sections, and restrained branding avoid dashboard, competition-site, and icon-chip clichés while retaining conventional operational controls. |

## Gate fixes applied

1. Replaced the green/teal brand surface with Ink `#172033`, Cobalt `#2F5BEA`, and cool neutrals.
2. Removed green from brand, active navigation, progress, links, forms, and decorative timeline markers.
3. Kept green, amber, and red only for semantic success, warning, danger, and corresponding feedback.
4. Unified controls at 44px, soft 8–12px radii, and 140ms Snap interaction timing.
5. Added self-hosted Pretendard Variable and preserved its official SIL OFL license and source metadata.
6. Added global visible focus and reduced-motion handling.
7. Replaced the gray page canvas with white and removed every decorative/elevation shadow.

## Approved concept comparison

| Concept reference | Implementation evidence |
| --- | --- |
| Slim white top navigation | `AppShell` uses a 64px white header with a single bottom divider. |
| Cobalt active underline and CTA | Desktop active links use a 2px Cobalt underline; `.button-primary` is the only filled accent action. |
| White page and flat content lists | `--canvas` and `--surface` are white; program, topic, application, archive, and recruitment screens retain divider-based lists. |
| Flat panels without floating cards | The UI source contains no `box-shadow`, `drop-shadow`, or elevation utility. Empty and grouped panels use border and whitespace only. |
| Restrained cool-gray surfaces | `--surface-subtle` is used only for forms, role selection, login support copy, and workspace input areas. |
| Mobile navigation language | Mobile navigation remains a fixed white 64px bar with gray inactive items and a Cobalt active icon/label. |
| Department-wide framing | Programs, topics, teams, progress, and reports share one structure; capstone, hackathons, competitions, and other projects are content types rather than separate visual identities. |
| Project workflow rhythm | Team workspace keeps milestones, progress logs, discussion, reports, approvals, and deliverables on separate content-led sections instead of a dense multi-panel dashboard. |
| Restrained art direction | Page headings use precise 44–56px typography and asymmetric description alignment; promotional catalogue copy and numbered storytelling are absent. |

The score clears the StyleSeed floor. The remaining deductions cover compact operational metadata, absent dedicated route loading screens, and conventional form controls; they are not blockers.
