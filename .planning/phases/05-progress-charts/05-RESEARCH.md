# Phase 5 Research: Progress Charts

## Research Goal
Evaluate charting libraries for React Native / Expo SDK 54 to build per-exercise progress visualization (weight over time, volume over time, personal records).

**Project Stack:** Expo SDK 54 · React Native 0.81 · React 19 · expo-sqlite · TypeScript

---

## 1. Library Comparison

### react-native-gifted-charts ★ RECOMMENDED

| Attribute | Detail |
|-----------|--------|
| Version | 1.4.74 (Feb 2026) |
| npm weekly | ~87,000 |
| Maintenance | Active — frequent releases, responsive maintainer |
| Rendering | SVG via react-native-svg |
| Expo Go | Yes — pure JS, no native modules |
| New Architecture | Works (charts render; bar animation warning on Android) |
| Chart types | Line, bar, area, pie, stacked bar, radar, bubble, step, combined |
| Multi-line | Yes — `dataSet` array or `data`/`data2`...`data5` props |
| Performance | Good for <500 points (SVG-based). Fine for workout data volumes. |
| Tooltips | Built-in `pointerConfig` (line) and `renderTooltip` (bar) |
| Touch | `onPress` per data point/bar, `focusBarOnPress`, pointer tracking |
| TypeScript | Written in TS, ships types |
| Bundle size | ~640 KB unpacked (pure JS). Peer deps: react-native-svg + expo-linear-gradient |
| Install | `npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg` |

**Strengths:**
- Simplest integration path — works in Expo Go, no dev build required
- Covers every chart type we need (line, bar, area, multi-line)
- Rich built-in tooltip and interaction support
- Minimal dependency footprint (no Reanimated, no Skia, no Gesture Handler)
- Most actively maintained RN-specific chart library

**Weaknesses:**
- LayoutAnimation broken under New Architecture on Android (bar entry animations only — cosmetic)
- SVG-based rendering less performant than Skia for 1000+ points (irrelevant for our data volumes)
- Tooltip positioning can clip at chart boundaries (workaround: adjust padding)

**Known Issues:**
- [#1133](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/1133) — LayoutAnimation no-op under Fabric (Android bar animation)
- [#1109](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/1109) — Tooltip clipping at chart edges
- [#734](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts/issues/734) — Y-axis label width miscalculation (set explicit `yAxisLabelWidth`)

---

### Victory Native (XL rewrite)

| Attribute | Detail |
|-----------|--------|
| Version | 41.20.2 (Nov 2025) |
| npm weekly | ~290,000 |
| Maintenance | Active — NearForm (acquired Formidable Labs) |
| Rendering | Skia via @shopify/react-native-skia |
| Expo Go | **No** — requires dev build (Skia has native modules) |
| New Architecture | Likely yes (Skia v2 supports it) |
| Chart types | Line, bar, area, stacked bar, scatter, pie/donut |
| Multi-line | Yes — multiple `yKeys` with separate `<Line>` components |
| Performance | Excellent — GPU-accelerated, claims 100+ FPS, handles 1000+ points |
| Tooltips | Manual via `useChartPressState` hook (full control, more work) |
| Touch | Press, pan, zoom via hooks. Native thread gestures. |
| TypeScript | Fully typed, data-shape-aware generics |
| Bundle size | **~6 MB download increase** from Skia native binary |
| Install | `npx expo install victory-native @shopify/react-native-skia react-native-reanimated react-native-gesture-handler` |

**Strengths:**
- Best raw performance (Skia GPU rendering)
- Composable render-function API — maximum flexibility
- Pan/zoom built-in
- Strong TypeScript generics

**Weaknesses:**
- **~6 MB app size increase** from Skia — significant for a simple chart feature
- **No Expo Go** — requires development build workflow
- Tooltips require manual implementation (no built-in tooltip component)
- Skia v2 transition has been bumpy — [#615](https://github.com/FormidableLabs/victory-native-xl/issues/615) reports blank charts in prod builds
- Font loading for axis labels requires Skia's separate font system
- No web support

**Known Issues:**
- [#615](https://github.com/FormidableLabs/victory-native-xl/issues/615) — Charts blank in production builds (significant)
- [#642](https://github.com/FormidableLabs/victory-native-xl/issues/642) — Android touch issues on filled areas
- [#185](https://github.com/FormidableLabs/victory-native-xl/issues/185) — Samsung-specific axis label bug

---

### react-native-chart-kit ✗ NOT RECOMMENDED

| Attribute | Detail |
|-----------|--------|
| Version | 6.12.0 (Feb 2022 — **4 years old**) |
| npm weekly | ~108,000 (inertia from old tutorials) |
| Maintenance | **Abandoned** — no commits since Feb 2022, 426 open issues |
| New Architecture | Untested, no support |
| TypeScript | Typed against React 16 / RN 0.62 — will conflict with React 19 |
| Bundle size | ~399 KB + full lodash dependency (~70 KB) |

**Why not:** Abandoned. 426 open issues. No New Architecture support. Touch interactions broken on SDK 54 Android due to react-native-svg regression. TypeScript types outdated. Full lodash dependency is bloat. SDK 55 will require New Architecture, forcing a replacement.

---

### Other Libraries Evaluated

| Library | Verdict | Reason |
|---------|---------|--------|
| **@wuba/react-native-echarts** | Overkill | Full Apache ECharts engine. Massive bundle. Complex config API. Only justified if needing 20+ chart types. |
| **react-native-wagmi-charts** | Wrong fit | Line + candlestick only. No bar charts. Crypto/finance focused. |
| **react-native-graph (Margelo)** | Avoid | Line only. No releases since Mar 2024. Stalled. |
| **react-native-charts-wrapper** | Bad Expo fit | Wraps native MPAndroidChart/DGCharts. No Expo Go, needs native config. |
| **Custom SVG + D3** | Too expensive | 200-400 lines per chart type. No interactivity for free. Only makes sense for highly custom visualizations. |

---

## 2. Recommendation

**Use `react-native-gifted-charts`** for the following reasons:

1. **Lowest friction** — Works in Expo Go. No dev build required. Install is 3 packages, all pure JS or Expo-native.
2. **Feature-complete for our needs** — Line charts (weight over time), bar charts (volume), area charts, multi-line, built-in tooltips, touch interactions.
3. **Active maintenance** — Regular releases through Feb 2026. Responsive maintainer. Growing adoption.
4. **Right-sized** — No 6 MB Skia binary for charts that display 10-90 data points. SVG performance is more than sufficient.
5. **No workflow disruption** — Project currently uses Expo Go. Victory Native would force a switch to dev builds solely for charting.

Victory Native XL is the better library architecturally, but the cost (6 MB bundle, dev build requirement, manual tooltip work, Skia v2 instability) is not justified for simple workout progress charts.

---

## 3. Architecture Pattern

### Chart Data Flow

```
SQLite → Service Query → Screen Component → Chart Component
  │                           │                    │
  │  getExerciseProgress()    │  useMemo(format)   │  <LineChart data={...} />
  │  getExerciseVolume()      │  time range filter  │  <BarChart data={...} />
  │  getPersonalRecords()     │                    │
```

### Screen Structure

```
Progress Tab
  └── ProgressScreen
       ├── ExerciseSelector (dropdown/picker)
       ├── TimeRangeControls (1M / 3M / 6M / All)
       ├── ChartToggle (Weight / Volume)
       ├── ProgressChart (line or bar chart)
       └── PersonalRecords (highlights card)
```

### Data Queries Needed

Three new service functions to add to `src/database/services.ts`:

**1. Exercise Progress (weight over time)**
```sql
SELECT w.date, MAX(s.weight) as max_weight
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE s.exercise_id = ?
GROUP BY w.id
ORDER BY w.date ASC
```

**2. Exercise Volume (total load per session)**
```sql
SELECT w.date, SUM(s.weight * s.reps) as total_volume
FROM sets s
JOIN workouts w ON s.workout_id = w.id
WHERE s.exercise_id = ?
GROUP BY w.id
ORDER BY w.date ASC
```

**3. Personal Records**
```sql
-- Max weight
SELECT s.weight, s.reps, w.date
FROM sets s JOIN workouts w ON s.workout_id = w.id
WHERE s.exercise_id = ?
ORDER BY s.weight DESC LIMIT 1

-- Max single-session volume
SELECT w.date, SUM(s.weight * s.reps) as volume
FROM sets s JOIN workouts w ON s.workout_id = w.id
WHERE s.exercise_id = ?
GROUP BY w.id ORDER BY volume DESC LIMIT 1
```

### Time Range Filtering
Apply in the query with `WHERE w.date >= ?`:
- 1 month: 30 days back
- 3 months: 90 days back
- 6 months: 180 days back
- All time: no filter

### Data Formatting for gifted-charts
```typescript
// LineChart expects: { value: number, label?: string, dataPointText?: string }
const chartData = progressData.map(d => ({
  value: d.max_weight,
  label: formatDate(d.date),    // "Jan 5"
  dataPointText: `${d.max_weight}`,
}));
```

---

## 4. Common Pitfalls

### Library-Specific (gifted-charts)
1. **Set explicit `yAxisLabelWidth`** — auto-calculation can misalign chart content
2. **Use `overflowTop` padding** — tooltips clip at chart top boundary without it
3. **Wrap chart data in `useMemo`** — avoid re-renders from recreating data arrays
4. **Set `adjustToWidth` or explicit `spacing`** — prevent horizontal overflow on small datasets
5. **LayoutAnimation warning on Android** — cosmetic only, can be ignored or suppressed

### Architecture Pitfalls
1. **Don't fetch all sets and compute in JS** — do aggregation in SQL (GROUP BY + MAX/SUM). SQLite handles this efficiently.
2. **Date formatting** — store as ISO strings (already done), parse consistently. Use `toLocaleDateString()` for labels.
3. **Empty states** — handle exercises with 0 or 1 data point (can't draw a meaningful line with 1 point; show a message instead).
4. **Exercise selection** — need a list of exercises the user has actually logged (not just all exercises). Query: `SELECT DISTINCT exercise_id FROM sets`.
5. **Same-day workouts** — if a user logs the same exercise twice in one day, decide: show both points or aggregate? Recommend: aggregate (take max weight, sum volume).

### What NOT to Hand-Roll
- Chart rendering — use the library, don't build SVG charts manually
- Scale computation — gifted-charts handles Y-axis scale automatically
- Touch handling — use built-in `pointerConfig` / `onPress`, don't implement gesture tracking
- Date math for time ranges — use simple Date arithmetic, no need for date-fns or moment

---

## 5. Existing Data Layer Summary

**Schema supports charts out of the box:**
- `sets` table has `weight` (REAL), `reps` (INTEGER), `exercise_id`, `workout_id`
- `workouts` table has `date` (TEXT) and `created_at` (TEXT timestamp)
- Volume calculation pattern (`weight × reps`) already used in `getWorkouts()`
- Foreign keys and CASCADE deletes are properly configured

**New code needed:**
- 3-4 new service functions in `services.ts`
- New TypeScript types for chart data
- No schema changes required

---

## 6. Install Plan

```bash
npx expo install react-native-gifted-charts expo-linear-gradient react-native-svg
```

**No other dependencies needed.** No native module changes. No dev build migration. No babel config changes.

---

*Researched: 2026-02-16*
*Next step: `gsd:plan-phase 5` to create the execution plan*
