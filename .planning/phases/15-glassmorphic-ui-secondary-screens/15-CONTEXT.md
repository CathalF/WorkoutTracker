# Phase 15: Glassmorphic UI — Secondary Screens — Context

## Vision
Complete the glassmorphic transformation across every remaining screen. Phase 14 established the visual language on the four core screens; this phase extends it to the six secondary screens so the entire app feels cohesive and premium. Three screens get extra attention beyond the standard glass pass.

## How It Works

### Standard Glass Pass (3 screens)
**ExercisePickerScreen, ExerciseLibraryScreen, TemplateManagementScreen** receive the same treatment used in phase 14:
- `GradientBackground` replaces solid container backgrounds
- Custom glass header with `BlurView` + `glassElevated` overlay (replaces any native headers)
- List items / cards → `GlassCard` or `glassSurface` + `glassBorder` tokens
- Inputs → glass-styled with `glassSurface` background + `glassBorder` border
- Bottom padding for floating tab bar where applicable
- Consistent use of `useThemeControl()` for dark/light adaptation

### Spotlight: ProgressScreen — Glass + Glowing Accents
The charts screen gets a premium data visualization treatment:
- Charts wrapped in `GlassCard` containers so they float on frosted panels
- Chart lines and area fills use electric blue with a subtle glow effect — data points feel illuminated against the glass
- Stat cards (best weight, total volume, PR counts) as polished glass tiles
- The gradient background peeks through chart glass panels for depth

### Spotlight: SettingsScreen — Premium Control Panel
Settings becomes a high-end control panel:
- Each setting gets its own glass card row — individually polished
- Custom glass header replaces the current native stack header (`headerShown: true` → `headerShown: false` with custom header)
- Theme toggle, weekly goal, notification preferences all presented as premium glass controls
- Clean visual hierarchy within each glass card row

### Spotlight: WorkoutDetailScreen — Polished Recap
Past workout details presented as a clean, premium recap:
- Glass header area with workout summary stats (date, duration, total volume)
- Each exercise rendered as a `GlassCard` with sets/reps laid out cleanly inside
- Clean stat presentation that makes reviewing a past workout feel satisfying

## What's Essential
- All six secondary screens converted to glassmorphic styling
- `GradientBackground` on every screen for visual consistency
- Glass headers replacing any remaining native/opaque headers
- ProgressScreen charts with glowing electric blue accents on glass
- SettingsScreen as individually polished glass card rows
- WorkoutDetailScreen with glass stats header + glass exercise cards
- Dark and light mode working correctly on all screens

## Out of Scope
- New features or functionality changes — this is purely visual
- Animations or transitions beyond existing behavior (phase 17)
- New glass components — use the existing library from phase 13
- Chart library changes — keep react-native-gifted-charts, just style it

## Key Decisions
- **Settings native header → custom glass header**: SettingsScreen switches from `headerShown: true` to a custom BlurView header like the core screens
- **Glow effect on charts**: Electric blue chart lines get a glow/illumination feel against glass — the signature touch for the Progress screen
- **Individual glass card rows for Settings**: Each setting is its own glass card, not grouped sections — premium control panel aesthetic
- **Standard pass for picker/library/templates**: These utility screens get consistent glass treatment without extra design investment

---
*Captured: 2026-03-01*
