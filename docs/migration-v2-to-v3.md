# Migration Guide: v2 → v3

> **Beta (v3.0.0-beta)** — API is stable but may receive minor adjustments before final release.

v3 replaces `react-native-svg` with `@shopify/react-native-skia` for rendering. Most usage remains identical — this guide covers the breaking changes.

## Table of Contents

- [New Dependencies](#new-dependencies)
- [Breaking Changes](#breaking-changes)
  - [LineChart.Gradient](#linechartgradient)
  - [LineChart.CursorLine](#linechartcursorline)
  - [LineChart.HorizontalLine](#linecharthorizontalline)
  - [LineChart.Dot](#linechartdot)
  - [LineChart.Path / LineChart.Highlight](#linechartpath--linecharthighlight)
  - [CandlestickChart.Candles](#candlestickchartcandles)
- [No Changes Required](#no-changes-required)

---

## New Dependencies

```bash
# npm
npm install react-native-wagmi-charts@3.0.0-beta.1 @shopify/react-native-skia react-native-worklets

# yarn
yarn add react-native-wagmi-charts@3.0.0-beta.1 @shopify/react-native-skia react-native-worklets

# pnpm
pnpm add react-native-wagmi-charts@3.0.0-beta.1 @shopify/react-native-skia react-native-worklets
```

> `react-native-svg` is no longer required by this library. You can keep it if other parts of your app use it.

Update your `babel.config.js` if needed — `react-native-reanimated/plugin` should already be configured from v2.

---

## Breaking Changes

### LineChart.Gradient

The `children` prop (SVG `<Stop>` elements) is replaced with `colors` and `positions` arrays.

**Before (v2):**

```jsx
import { Stop } from 'react-native-svg';

<LineChart.Gradient color="blue">
  <Stop offset="20%" stopColor="blue" stopOpacity={0.15} />
  <Stop offset="40%" stopColor="blue" stopOpacity={0.05} />
  <Stop offset="100%" stopColor="blue" stopOpacity={0} />
</LineChart.Gradient>
```

**After (v3):**

```jsx
<LineChart.Gradient
  color="blue"
  colors={['rgba(0,0,255,0.15)', 'rgba(0,0,255,0.05)', 'rgba(0,0,255,0)']}
  positions={[0.2, 0.4, 1.0]}
/>
```

> **No change needed** if you were using `<LineChart.Gradient />` or `<LineChart.Gradient color="blue" />` without custom stops.

---

### LineChart.CursorLine

`lineProps` (SVG `LineProps`) is replaced with explicit props.

**Before (v2):**

```jsx
<LineChart.CursorLine
  lineProps={{ strokeWidth: 1, strokeDasharray: "4 4" }}
/>
```

**After (v3):**

```jsx
<LineChart.CursorLine
  strokeWidth={1}
  dashWidth={4}
  dashGap={4}
/>
```

---

### LineChart.HorizontalLine

`lineProps` is replaced with explicit `strokeWidth`, `dashWidth`, and `dashGap` props.

**Before (v2):**

```jsx
<LineChart.HorizontalLine
  at={{ index: 0 }}
  lineProps={{ strokeWidth: 1, strokeDasharray: "3 3" }}
/>
```

**After (v3):**

```jsx
<LineChart.HorizontalLine
  at={{ index: 0 }}
  strokeWidth={1}
  dashWidth={3}
  dashGap={3}
/>
```

---

### LineChart.Dot

`dotProps` and `outerDotProps` now accept Skia `CircleProps` instead of SVG `CircleProps`. The prop names are unchanged.

**Before (v2):**

```jsx
<LineChart.Dot
  at={10}
  dotProps={{ fill: 'red', r: 6 }}
/>
```

**After (v3):**

```jsx
<LineChart.Dot
  at={10}
  color="red"
  size={6}
/>
```

---

### LineChart.Path / LineChart.Highlight

The SVG `...props` spread (`AnimatedProps<PathProps>`) is no longer accepted. Only the documented props are supported.

**Before (v2):**

```jsx
<LineChart.Path
  strokeWidth={2}
  strokeLinecap="round"
  fill="none"
/>
```

**After (v3):**

```jsx
<LineChart.Path
  width={2}
  color="black"
/>
```

Supported props: `color`, `inactiveColor`, `width`, `pathProps` (includes `isTransitionEnabled`), `animationDuration`, `animateOnMount`.

---

### CandlestickChart.Candles

- `rectProps` and `lineProps` (SVG-specific overrides) are **removed**
- `renderRect` and `renderLine` custom render functions still work but receive **Skia-compatible props**

**Before (v2):**

```jsx
<CandlestickChart.Candles
  rectProps={{ strokeWidth: 1 }}
  lineProps={{ strokeWidth: 0.5 }}
/>
```

**After (v3):**

```jsx
{/* Default rendering — no props needed for basic styling */}
<CandlestickChart.Candles />

{/* Custom renderers receive Skia-compatible props */}
<CandlestickChart.Candles
  renderRect={({ x, y, width, height, color }) => (
    <Rect x={x} y={y} width={width} height={height} color={color} />
  )}
  renderLine={({ p1, p2, color, strokeWidth }) => (
    <Line p1={p1} p2={p2} color={color} strokeWidth={strokeWidth} style="stroke" />
  )}
/>
```

Key prop changes in custom renderers:

| v2 (SVG) | v3 (Skia) |
|---|---|
| `fill` / `stroke` | `color` |
| `x1`, `y1`, `x2`, `y2` | `p1: { x, y }`, `p2: { x, y }` |
| `strokeWidth` (on line) | `strokeWidth` (unchanged) |

---

## No Changes Required

The following work identically in v2 and v3 — no migration needed:

- **`LineChart.Provider`** — same `data`, `yRange`, `xDomain` props
- **`LineChart`** — same `width`, `height`, `yGutter` props
- **`LineChart.CursorCrosshair`** — same `color`, `size`, `snapToPoint`, `onActivated`, `onEnded` props
- **`LineChart.Tooltip`** — same `position`, `xGutter`, `yGutter`, `cursorGutter`, `textStyle` props
- **`LineChart.PriceText`** / **`LineChart.DatetimeText`** — same `format`, `precision`, `variant`, `locale`, `options` props
- **`CandlestickChart.Provider`** — same `data` prop
- **`CandlestickChart`** — same `width`, `height` props
- **`CandlestickChart.Crosshair`** — same `color`, `onCurrentXChange` props
- **`CandlestickChart.Tooltip`** — same `xGutter`, `yGutter`, `textStyle` props
- **`CandlestickChart.PriceText`** / **`CandlestickChart.DatetimeText`** — same `format`, `precision`, `variant`, `locale`, `options` props
- **All hooks** — `useChart`, `usePrice`, `useDatetime`, `useCandleData` — same API
