# Phase 13: Glassmorphic Design System — Context

## Vision
Transform the app's visual identity from functional to premium. The design system should make the app feel like a polished, paid fitness product — not a side project. Every surface, card, and interactive element should convey depth, quality, and intentionality through a glassmorphic design language.

## How It Works

### Theme Modes (Dark + Light)
Full dual-theme support. The glassmorphic styling adapts to both dark and light modes — frosted glass over deep, rich backgrounds in dark mode; frosted glass over soft, clean backgrounds in light mode. Both should feel cohesive and premium.

### Glass Effect
Heavy frosted glass — strong blur with high translucency. Cards and surfaces should feel like real frosted glass panels floating over the background. The background gradient peeks through just enough to create depth, but content remains crisp and readable. Think iOS notification center panels.

### Color Palette
Monochrome foundation with a single electric blue accent color. The glass surfaces are grayscale/neutral in both modes. Electric blue is reserved for interactive elements — buttons, links, active states, toggles, selected items. This creates a clean, focused visual hierarchy where the accent color guides the eye to what's actionable.

### Typography & Spacing
Clean, modern type scale with consistent spacing tokens. Text should feel well-spaced and breathable on glass surfaces — never cramped. High contrast between text and glass backgrounds for readability.

### Reusable Components
The phase produces a library of glassmorphic building blocks:
- **GlassCard** — frosted glass container with configurable blur, opacity, and border
- **GlassButton** — primary (accent-filled) and secondary (glass-outlined) variants
- **GlassInput** — text input with glass-styled background
- **GlassModal** — modal overlay with frosted backdrop
- **GlassNavBar** — navigation bar with glass blur effect
- Any other primitives needed to cover the component vocabulary of the existing screens

## What's Essential
- Dark and light theme token sets (colors, shadows, blur values, opacities)
- Typography scale and spacing tokens
- Heavy frosted glass effect that works on both dark and light backgrounds
- Electric blue accent color system (primary, hover/pressed, disabled states)
- Core glass components: GlassCard, GlassButton, GlassInput, GlassModal
- Theme provider / switching infrastructure
- Components must be drop-in ready for phases 14-15 screen redesigns

## Out of Scope
- Existing screen redesigns (phases 14-15 handle that)
- Theme toggle in Settings UI (can come with screen redesigns)
- Complex animations or micro-interactions (phase 17)
- Custom iconography or illustration
- Marketing assets or app store screenshots

## Key Decisions
- **Both dark + light modes**: Not just dark — the glass effect should shine in both contexts
- **Heavy frosted glass**: Bold, immersive translucency — not subtle tinting
- **Monochrome + electric blue**: One accent color keeps the design focused and premium; avoids visual noise
- **Foundation only**: This phase builds the toolkit; no screens are touched until phases 14-15
- **Component library approach**: Glass primitives are built as reusable components, not one-off styles

---
*Captured: 2026-02-28*
