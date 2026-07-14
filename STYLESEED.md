# StyleSeed — Design Lock

<!-- Locked design decisions. Re-read and obey before every UI change. -->

- App domain: Department-wide project program management
- Surface: desktop-web with responsive mobile surfaces
- Skin: custom minimal-mono
- Mood: minimal · airy · precise · trustworthy
- Focal point: one content-led primary action or heading per screen
- Key color (accent): Cobalt `#2F5BEA` — the only decorative and interactive accent
- Structural ink: Ink navy `#172033` — typography and brand structure, not a second accent
- Canvas: Cool canvas `#F7F8FA` with white surfaces
- Semantic resolve: success, warning, and danger colors are reserved for matching states only; never use them decoratively or as brand accents
- Type: self-hosted Pretendard Variable with system sans fallback
- Radius personality: soft · 8–12px; nested radius remains smaller than its container
- Elevation: flat by default · subtle low-opacity shadow only for raised or grouped surfaces
- Motion seed: Snap · fast and precise; never delay content or payload
- Reduced motion: every custom transition and animation must honor `prefers-reduced-motion`
- Density: airy content rhythm with restrained chrome; no dense dashboard grid
- Composition: content-centered, slim top navigation, whitespace-led hierarchy, cards only for true grouping
- Locked: 2026-07-14
