# StyleSeed Quality Gate

- Target: `src/app`, `src/shared/ui`
- Design lock: `STYLESEED.md`
- Visual reference: `docs/design/pms-ui-concept-capstone-studio.png` (information rhythm only; the department-wide product lock takes precedence)
- Excluded concepts: earlier green, generic Ink/Cobalt SaaS, and competition-catalogue explorations
- Gate date: 2026-07-17
- Final score: **95 / 100 (A)**
- Result: **PASS** (`>= 80`)

## Evidence score

| Category | Score | Evidence |
| --- | ---: | --- |
| Color discipline | 16 / 16 | `globals.css` defines Ink, Cobalt, cool neutrals, and separate semantic colors; page and shared UI decorative color search has no legacy teal/green palette. |
| Hierarchy & typography | 14 / 16 | Pretendard Variable is self-hosted, desktop body defaults to 16px, and `PageHeader` provides a calm 44–56px focal heading. Compact operational metadata intentionally remains 12–14px. |
| Layout & rhythm | 12 / 12 | White page canvas, 1280px content measure, airy 24–56px spacing, and disciplined divider lists support the full program-to-report flow. |
| Cards & elevation | 10 / 10 | No `box-shadow` or floating elevation remains. Grouping uses flat borders, dividers, tonal form sections, and whitespace. |
| States & a11y | 17 / 18 | Visible focus, 44px controls, disabled/pending/error/empty states, semantic status labels, global route loading feedback, and mobile 64px navigation are present. One point remains reserved until every authenticated state is visually exercised. |
| Motion & interaction | 6 / 6 | Snap is locked to 140ms for controls and navigation, payload is not delayed, and reduced motion disables custom transitions and animation. |
| Coherence | 12 / 12 | One accent, one soft radius family, flat/no-shadow elevation, and one icon stroke family are consistent. Semantic colors appear only in matching status and feedback contexts. |
| Distinctiveness | 8 / 10 | Precise project headings, flat work sections, and restrained branding avoid dashboard, competition-site, and icon-chip clichés while retaining conventional operational controls. |

## Gate fixes applied

1. Replaced the green/teal brand surface with Ink `#172033`, Cobalt `#2F5BEA`, Campus Gold `#D58A00`, and cool neutrals.
2. Removed green from brand, active navigation, progress, links, forms, and decorative timeline markers.
3. Reserved Campus Gold for one decorative focal cue per screen and kept semantic green, darker warning amber, and red tied to matching states and feedback.
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
| Restrained cool-gray surfaces | `--surface-subtle` is limited to form sections, neutral status labels, loading skeletons, and hover feedback; the login canvas and support copy remain white. |
| Mobile navigation language | Mobile navigation remains a fixed white 64px bar with gray inactive items and a Cobalt active icon/label. |
| Department-wide framing | Programs, topics, teams, progress, and reports share one structure; capstone, hackathons, competitions, and other projects are content types rather than separate visual identities. |
| Program-to-topic integration | `topics/page.tsx` presents open programs as a horizontal 44px tag filter and immediately follows it with the filtered topic list; the retired `/programs` route redirects here. |
| Complete topic comparison | Topic rows keep the full translated description and expose recruitment, execution, and submission periods without assuming the periods are disjoint. |
| Complete student history | The student-only history section includes pending, accepted, rejected, and closed-topic applications with application and decision timestamps. |
| Past-project archive | The archive uses 44px academic-year tags, one search action, complete descriptions, skill references, and flat result rows without dashboard metrics or floating cards. |
| Project workflow rhythm | The project space keeps milestones, progress logs, discussion, reports, approvals, and deliverables on separate content-led sections instead of a dense multi-panel dashboard. |
| Restrained art direction | Page headings use precise 44–56px typography and asymmetric description alignment; promotional catalogue copy and numbered storytelling are absent. |

The score clears the StyleSeed floor. The remaining deductions cover compact operational metadata and conventional form controls; they are not blockers.

## Operations surfaces gate · 2026-07-17

- Target: `src/app/notifications/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/audit/page.tsx`
- Final score: **94 / 100 (A)**
- Result: **PASS** (`>= 80`)

| Category | Score | Evidence |
| --- | ---: | --- |
| Color discipline | 16 / 16 | Cobalt marks unread notification focus only; inactive accounts use danger and ordinary active accounts remain neutral. Audit warnings are limited to revocation, deactivation, and revision requests. |
| Hierarchy & typography | 14 / 16 | One page title leads each surface, while counts, timestamps, roles, and email addresses stay secondary. |
| Layout & rhythm | 12 / 12 | All three screens use full-width divider lists and aligned metadata instead of metric cards or floating panels. |
| Cards & elevation | 10 / 10 | No shadows or card grids are introduced; search and result groups use border rules and whitespace. |
| States & a11y | 18 / 18 | Search labels, semantic headings and lists, explicit empty states, 44px actions, visible focus, confirmation flows, and text labels independent of color are present. |
| Motion & interaction | 6 / 6 | The locked 140ms Snap transitions and reduced-motion override apply without decorative animation. |
| Coherence | 12 / 12 | Shared `PageHeader`, `StatusBadge`, controls, spacing, and responsive list patterns remain consistent with the rest of the product. |
| Distinctiveness | 6 / 10 | Copy and metadata are specific to project operations, though the administrative controls intentionally remain conventional. |

The operations surfaces pass the static StyleSeed gate. Rendered desktop and mobile verification remains a separate final visual gate.

## Project explorer gate · 2026-07-17

- Target: `src/app/topics/page.tsx`, `src/app/topics/active-projects-view.tsx`, `src/app/topics/project-portal-chrome.tsx`, `src/app/globals.css`
- Final score: **96 / 100 (A)**
- Result: **PASS** (`>= 80`)
- Visual verification: authenticated desktop render at `1280 × 720`, including program selection, filtered topic cards, application modal, and application summary

| Category | Score | Evidence |
| --- | ---: | --- |
| Color discipline | 16 / 16 | Cobalt carries selection and action, Campus Gold is limited to the hero sparkle and support cue, and semantic green/amber/red remain tied to real states. Gold text uses the darker `--accent-ink` token. |
| Hierarchy & typography | 15 / 16 | One large project-discovery heading dominates the first viewport; program names and topic titles form the second tier, while counts, dates, and labels stay compact metadata. |
| Layout & rhythm | 12 / 12 | The first viewport follows a clear hero → program choice → filter toolbar sequence, followed by a three-column discovery grid and a single application summary. |
| Cards & elevation | 10 / 10 | Discovery cards use the explicitly locked flat border treatment with no shadow, floating offset, glossy gradient, or elevated panel stack. |
| States & a11y | 17 / 18 | Empty results, selected checkmarks plus `aria-current`, semantic status labels, 44px controls, visible focus, and a modal that leaves document height unchanged were verified. One point remains for a dedicated route-level loading state. |
| Motion & interaction | 6 / 6 | Snap controls and restrained Silk entrances use the locked timing; reduced motion disables the custom transitions and animations. |
| Coherence | 12 / 12 | Pretendard, one radius family, one Cobalt primary, one Gold accent, flat elevation, and one SVG stroke language remain consistent across the screen. |
| Distinctiveness | 8 / 10 | The PNU campus collaboration illustration, real program selector, topic-specific metadata, and support summary make the surface product-specific; familiar discovery cards intentionally preserve scanning speed. |

Gate fix: separated decorative Gold from accessible Gold text, increased topic-description body copy to 16px, and verified that program selection preserves URL state while topic application opens without extending page height.

## Application policy and team consent gate · 2026-07-17

- Target: `src/app/professor/topics/topic-form.tsx`, `src/app/topics/apply-topic-form.tsx`, `src/app/topics/applications/page.tsx`, `src/app/professor/applications/received-application-detail.tsx`
- Final score: **88 / 100 (B)**
- Result: **PASS** (`>= 80`)
- Visual verification: real app CSS at desktop width and `390 × 844`; individual/team selection, team email entry, custom questions, internal modal scrolling, and professor team review were rendered

| Category | Score | Evidence |
| --- | ---: | --- |
| Color discipline | 16 / 16 | Cobalt is limited to selected support mode and the primary action. Campus Gold appears once on the professor support-policy legend, while invitation and decision colors remain semantic. |
| Hierarchy & typography | 14 / 16 | The project or support policy remains the focal heading; question labels, constraints, participant roles, and dates form clear secondary tiers. Compact form guidance remains 12–14px. |
| Layout & rhythm | 11 / 12 | Professor configuration uses one continuous white form with section rules; student application stays in an internally scrolling modal and never increases the discovery page height. |
| Cards & elevation | 10 / 10 | Support-mode choices use the locked flat bordered treatment with no shadows or floating cards. The large gray form panel found during the visual pass was removed. |
| States & a11y | 16 / 18 | Required/optional copy, live character counts, pending labels, explicit invitation outcomes, empty states, confirmations, focus treatment, and 44px controls are present. Authenticated error-state pixel capture remains outstanding. |
| Motion & interaction | 6 / 6 | Existing Snap controls, dialog/toast transitions, and reduced-motion fallback apply without delaying content. |
| Coherence | 11 / 12 | White canvas, one soft radius family, flat elevation, Cobalt primary, and one Gold focal cue remain consistent. Native radio rendering differs slightly by browser. |
| Distinctiveness | 4 / 10 | The team-consent progression and professor-defined form are product-specific, while the long administrative form intentionally favors conventional controls over decorative identity. |

Gate fix: removed the gray full-form background, retained one Gold support-policy cue, and verified that switching to team support reveals only the PNU email invitation field plus the professor-defined questions.
