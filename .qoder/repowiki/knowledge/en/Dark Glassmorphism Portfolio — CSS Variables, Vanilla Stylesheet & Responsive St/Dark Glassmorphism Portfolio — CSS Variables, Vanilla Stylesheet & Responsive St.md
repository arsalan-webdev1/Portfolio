---
kind: frontend_style
name: Dark Glassmorphism Portfolio — CSS Variables, Vanilla Stylesheet & Responsive Strategy
category: frontend_style
scope:
    - '**'
source_files:
    - files/style.css
    - files/arsalan-portfolio-vanilla/site/style.css
---

## What system/approach is used

The portfolio uses **vanilla CSS** (no framework, no preprocessors, no build step). Two parallel style sheets exist:
- `files/style.css` — the production stylesheet (~268 lines) with cinematic welcome intro, scroll-driven reveal animations, glassmorphism cards, ambient background glows, a timeline, and a responsive mobile nav.
- `files/arsalan-portfolio-vanilla/site/style.css` — a stripped-down variant (~182 lines) that omits the welcome overlay, ambient mood shifts, scroll progress/back-to-top, and advanced 3D tilt effects.

There is no Tailwind, Sass, PostCSS, or component library. Styling lives in plain `.css` files referenced directly from the HTML.

## Key files and packages

- `files/style.css` — primary stylesheet; contains design tokens, layout, sections, animations, reduced-motion, and breakpoints.
- `files/arsalan-portfolio-vanilla/site/style.css` — minimal baseline version of the same design.
- `files/index.html`, `files/script.js` — consume the CSS classes defined above (e.g. `.glass`, `.btn-primary`, `.project`, `.timeline`, `[data-reveal]`).
- `files/arsalan-portfolio-vanilla/site/index.html`, `script.js` — mirror the vanilla variant.

No package manager configuration (`package.json`) or CSS tooling is present.

## Architecture and conventions

### Design tokens via `:root`
All colors, radii, shadows, easing curves, and fonts are centralized at the top of each stylesheet under `/* ===== DESIGN TOKENS — change colours/spacing here ===== */`:
- Colors: `--bg:#05060a`, `--text:#a6adbb`, `--white:#f4f7fb`, `--muted:#6b7385`, `--cyan:#67e8f9`, `--violet:#a78bfa`, `--blue:#38bdf8`.
- Glass: `--glass:rgba(255,255,255,.045)`, `--glass-soft:rgba(255,255,255,.02)`, `--border:rgba(255,255,255,.1)`, `--border-soft:rgba(255,255,255,.06)`.
- Spacing/radius: `--r-lg:32px`, `--r-md:22px`, `--r-sm:14px`.
- Motion: `--ease:cubic-bezier(.22,1,.36,1)`.
- Typography: `--font:'Inter',system-ui,...`, `--mono:ui-monospace,...`.

This token layer is the single source of truth for the dark theme and glassmorphism aesthetic.

### Sectional organization
Styles are grouped by comment-delimited sections: `Welcome interface`, `Portfolio reveal gate`, `Glass + reflection`, `Background glow (mood shifts per section)`, `Type`, `Buttons`, `Navigation`, `Hero`, `About`, `Skills`, `Journey timeline`, `Projects`, `Contact`, `Footer`, `Scroll reveal`, `Scroll progress + back to top`, `Reduced motion`, `Responsive`. This is the de facto file structure convention.

### Glassmorphism pattern
Reusable `.glass` class applies `backdrop-filter:blur(18px)` plus a translucent border and shadow. Cards use a pseudo-element `::before` diagonal light-sweep on hover (`.glass.card::before`, `.project::before`, `.portrait::before`).

### Mood-driven ambient background
The production stylesheet uses `body[data-mood=about|skills|journey|projects|contact]` to swap CSS custom properties `--ga/--gb/--gc` that drive three large blurred orbs (`.g1/.g2/.g3`) inside `.bg-glow`. The vanilla variant has only static `.glow` elements without mood switching.

### Animation model
- Entrance: `.anim` + `body.ready` toggles opacity/translate/scale/filter transitions.
- Scroll reveal: `[data-reveal]` is toggled to `.visible` by JS; staggered via `--d` custom property.
- Timeline: `.t-item.in` drives node scale, connector line `scaleX`, and card slide-in.
- Welcome overlay: `.welcome-overlay.hidden` fades out after ~2.1s.
- Reduced motion: `@media (prefers-reduced-motion:reduce)` disables all animations/transitions and forces revealed states visible.

### Layout strategy
- Grid-based sections: `.hero` (2-col), `.skills-grid` (3-col), `.project` (preview + body), `.contact-cards` (2-col), `.form-row` (2-col).
- Fluid typography via `clamp()` for headings and section padding.
- Container width: `.container{width:min(1120px,100% - 40px);margin-inline:auto}`.

### Responsive breakpoints
Three media queries are shared between both stylesheets:
- `max-width:960px` — collapse skills grid, about, project layouts.
- `max-width:820px` — mobile nav (burger menu, absolute dropdown), hero stacks, timeline becomes single-column left-aligned.
- `max-width:560px` — contact cards and form rows stack, footer stacks, actions full-width.

### Class naming
BEM-like flat class names (no nesting): `.nav-wrap`, `.nav-links`, `.nav-ind`, `.hero-visual`, `.portrait-img`, `.skill .pills li`, `.t-item`, `.t-card`, `.project-list`, `.p-body`, `.p-tags`, `.c-card`, etc. Modifier classes like `.current`, `.explore`, `.now`, `.next`, `.open`, `.visible`, `.hidden` are appended to base classes.

## Conventions and constraints

- All colors, radii, easing, and fonts go through CSS custom properties in `:root`; hard-coded color literals are avoided outside token definitions.
- Glass panels consistently use the `.glass` class plus `backdrop-filter:blur(...)` and `border:1px solid var(--border)`.
- Hover interactions on cards/projects/portraits use a diagonal `::before` light sweep with `skewX(-14deg)` and translate animation.
- Interactive elements expose focus styles via `:focus-visible{outline:2px solid var(--cyan);outline-offset:3px;border-radius:6px}`.
- Animations respect accessibility: `@media (prefers-reduced-motion:reduce)` is present in both stylesheets and forces all animated elements to their final state.
- Responsive behavior follows the three breakpoints 960px / 820px / 560px consistently across both CSS files.
- The production sheet adds features absent from the vanilla variant: welcome overlay, ambient mood glows, scroll progress bar, back-to-top button, 3D perspective tilt on portrait/project, and staggered pill animations — indicating the vanilla sheet is a simplified reference implementation.