---
name: ReviewScope AI
colors:
  surface: '#051424'
  surface-dim: '#051424'
  surface-bright: '#2c3a4c'
  surface-container-lowest: '#010f1f'
  surface-container-low: '#0d1c2d'
  surface-container: '#122131'
  surface-container-high: '#1c2b3c'
  surface-container-highest: '#273647'
  on-surface: '#d4e4fa'
  on-surface-variant: '#d8c3ad'
  inverse-surface: '#d4e4fa'
  inverse-on-surface: '#233143'
  outline: '#a08e7a'
  outline-variant: '#534434'
  surface-tint: '#ffb95f'
  primary: '#ffc174'
  on-primary: '#472a00'
  primary-container: '#f59e0b'
  on-primary-container: '#613b00'
  inverse-primary: '#855300'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffbbbe'
  on-tertiary: '#67001b'
  tertiary-container: '#ff919a'
  on-tertiary-container: '#8c0028'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffddb8'
  primary-fixed-dim: '#ffb95f'
  on-primary-fixed: '#2a1700'
  on-primary-fixed-variant: '#653e00'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#051424'
  on-background: '#d4e4fa'
  surface-variant: '#273647'
typography:
  headline-xl:
    fontFamily: Newsreader
    fontSize: 40px
    fontWeight: '400'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Newsreader
    fontSize: 32px
    fontWeight: '400'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Newsreader
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Newsreader
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 28px
  body-lg:
    fontFamily: Hanken Grotesk
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Hanken Grotesk
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Hanken Grotesk
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  data-mono:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: -0.01em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.25rem
  margin: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.25rem
  space-xl: 2rem
---

## Brand & Style

This design system expresses high-end computational journalism blended with modern executive intelligence. It caters to product strategists, CX executives, and data researchers who evaluate large volumes of qualitative user sentiment. The aesthetic bridges the authority of traditional editorial publishing with the tactical speed of terminal-grade data software. 

The visual style blends **Editorial Modernism** and **Technical Precision**: deep obsidian canvases, hairline mechanical borders, warm amber primary accents, and stark sentiment contrasts. Surfaces feel dense, intentional, and quiet, giving qualitative feedback the gravitas of financial statements.

## Colors

The palette operates on calibrated low-light steps to ensure comfortable extended desktop sessions while processing dense datasets.

- **Background Canvas (`#0C0E14`):** Pure obsidian slate foundation; anchors the application framing and main canvas.
- **Card Surface Level 1 (`#141824`):** Secondary container tone for workbenches, sidebars, and structural modules.
- **Card Surface Level 2 (`#1C2234`):** Tertiary elevated state for highlighted data rows, active filters, dropdown sheets, and modal views.
- **Primary Accent (`#F59E0B`):** Warm burnished gold for executive-level synthesis, AI summaries, primary controls, and batch action highlights.
- **Positive Sentiment (`#10B981`):** Emerald green for favorable satisfaction metrics, net promoter trends, and affirmative confidence scoring.
- **Negative Sentiment (`#F43F5E`):** Rose crimson for critical bug escalations, churn indicators, and urgent negative sentiment vectors.
- **Secondary Neutral Metadata (`#94A3B8`):** Crisp cool slate for tabular data, column definitions, timestamps, and secondary metrics.
- **Structural Outlines (`rgba(255, 255, 255, 0.08)`): Fine, non-distracting hairline rules partitioning data panels without heavy solid fills.

## Typography

The typographical structure pairs an editorial literary voice with dense computational clarity:

- **Executive Editorial Voice (`Newsreader`):** Used strictly for high-level insight narratives, key takeaways, sentiment category titles, and executive quotes. Provides warmth and human authority.
- **System Interface (`Hanken Grotesk`):** Contemporary, low-friction grotesque utilized for body text, general labels, descriptions, and user interaction layers.
- **Precision Data (`JetBrains Mono`):** Applied across tabular cell values, CSV column headers, statistical deviations, radial score readouts, and batch run logs.

## Layout & Spacing

This design system uses a technical fixed-fluid desktop layout structured around a 12-column grid system optimized for high-density monitors (1440px minimum target breakpoint).

- **Grid Architecture:** Columns employ an inner `gutter` of `1.25rem` (20px) flanked by consistent outer canvas margins of `1.5rem` (24px).
- **Workspace Partitioning:** Standard split desktop layout utilizes a 260px fixed navigation sidebar, an interactive 400px CSV column mapping panel, and an expansive 8-to-10 column analytical table and radial dashboard canvas.
- **Rhythm:** Spacing follows compact steps (`0.25rem`, `0.5rem`, `0.75rem`, `1.25rem`, `2rem`) to prioritize maximum visible data density while maintaining structural legibility.

## Elevation & Depth

Visual hierarchy relies on planar layering through calibrated dark values and razor-sharp border definitions rather than diffuse, floating shadows:

- **Canvas Ground (`#0C0E14`):** Sits at the deepest index, unbordered and matte.
- **Level 1 Panels (`#141824`):** Outlined with `1px solid rgba(255, 255, 255, 0.08)`. These contain batch processing lists, summary breakdowns, and primary data tables.
- **Level 2 Elevates & Overlays (`#1C2234`):** Reserved for popovers, flyout row detail trays, batch mapping modals, and hover states. Outlined with `1px solid rgba(255, 255, 255, 0.14)` and cast with an ambient shadow (`0 12px 32px -8px rgba(0, 0, 0, 0.65)`).
- **Backdrop Treatments:** Modal sheets apply a backdrop blur (`12px`) with an ambient `#0C0E14` tint at 80% opacity to preserve dashboard context without visual competition.

## Shapes

The design system maintains a structured, calibrated silhouette profile (Level 1: Soft). 

- **Containers & Panels:** Base card containers and tabular wrappers use `0.25rem` (4px) to `0.5rem` (8px) corners to emphasize high-density enterprise software precision.
- **Badge & Status Overrides:** Sentiment badges, category indicators, and runtime progress counters break the strict grid geometry by using pill forms (`9999px`) to immediately distinguish ephemeral metadata from architectural structural framing.
