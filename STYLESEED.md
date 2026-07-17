# StyleSeed — Design Lock

<!-- Locked design decisions. Re-read and obey before every UI change. -->

- App domain: Department-wide project program management
- Surface: desktop-web with responsive mobile surfaces
- Skin: modern department project portal · restrained editorial typography
- Mood: scholarly · calm · precise · collaborative · spacious
- Focal point: the current program, topic, team task, or report decision
- Primary: PNU Cobalt `#2F5BEA` — navigation, links, selections, focus, and the single primary action
- Accent: Editorial Berry `#A13D5D` — one focal cue per screen at most, such as the page rule, eyebrow, unread marker, or timeline point
- Structural ink: Ink navy `#172033` — typography and brand structure, not a second accent
- Canvas: White `#FFFFFF`; cool gray is restricted to inputs, selections, and secondary tonal sections
- Semantic resolve: success, warning, and danger colors are reserved for matching states only; never use them decoratively or as brand accents
- Type: self-hosted Pretendard Variable with system sans fallback
- Radius personality: soft · 8–12px; nested radius remains smaller than its container
- Elevation: flat · no shadows · no floating or elevated cards
- Motion seed: Snap · fast and precise controls, with a restrained Silk entrance for routes, dialogs, and toasts; never animate or delay the payload itself
- Reduced motion: every custom transition and animation must honor `prefers-reduced-motion`
- Density: operational information remains complete and scannable, with calm academic rhythm instead of dashboard density
- Composition: precise typography, intentional white space, disciplined alignment, slim top navigation; the project discovery home may use a three-column bordered card grid, while operational pages remain flat lists
- Card rule: discovery cards stay attached to the page with thin borders and no shadows, elevation, glossy gradients, or floating treatment
- Work priority: professor–student collaboration, milestones, progress records, reports, approvals, and deliverables are the protagonists
- Color expression: Cobalt communicates action and location; Berry supplies one editorial focal point and never competes with the primary action or semantic states
- Product framing: department-wide project management; capstone is a major default program while hackathons, competitions, and other projects use the same structure without visual hierarchy
- Copy restraint: no exhibition, catalogue, promotional, contest-first, or numbered 01/02 storytelling language
- Locked: 2026-07-14
