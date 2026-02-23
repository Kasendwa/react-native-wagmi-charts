# Motivation & What's New in v3

> **Beta (v3.0.0-beta)** — API is stable but may receive minor adjustments before final release.

This document explains why we rebuilt react-native-wagmi-charts on Skia, what problems existed in v2, and what improvements v3 delivers.

## Table of Contents

- [Why the Switch to Skia?](#why-the-switch-to-skia)
- [Problems in v2](#problems-in-v2)
  - [SVG Rendering Overhead](#svg-rendering-overhead)
  - [Per-Candle Component Overhead](#per-candle-component-overhead)
  - [Unguarded Shared Value Writes](#unguarded-shared-value-writes)
  - [Redundant Computations](#redundant-computations)
- [What v3 Solves](#what-v3-solves)
  - [Skia: GPU-Accelerated Rendering](#skia-gpu-accelerated-rendering)
  - [Single-Pass Geometry Computation](#single-pass-geometry-computation)
  - [Shared Value Architecture](#shared-value-architecture)
  - [Equality-Guarded Writes](#equality-guarded-writes)
  - [Reduced Mapper Count](#reduced-mapper-count)
  - [Throttled Callbacks](#throttled-callbacks)
- [Expected Benefits](#expected-benefits)
- [Trade-offs](#trade-offs)

---

## Why the Switch to Skia?

v2 used `react-native-svg` for all chart rendering. While SVG is familiar and works well for static graphics, it has limitations for interactive charts:

- **SVG elements are native views** — each `<Rect>` and `<Line>` is a real native view in the hierarchy, with layout and compositing overhead
- **No direct SharedValue integration** — SVG elements can't read Reanimated `SharedValue` props natively; v2 used `Animated.createAnimatedComponent(Rect)` and `useAnimatedProps` to bridge this gap
- **Heavy for large datasets** — each candle requires 2 native SVG views (1 Rect + 1 Line), so N candles means 2N native views in the hierarchy

Skia, by contrast, is a **GPU-accelerated 2D graphics engine** (the same one Chrome and Android use). `@shopify/react-native-skia` renders into a single GPU texture via its own React reconciler, bypassing the native view hierarchy.

**If your app already uses `@shopify/react-native-skia`** (e.g. for other Skia-based libraries), v3 lets you drop `react-native-svg` as a dependency entirely — one fewer native module to install, link, and maintain.

---

## Problems in v2

### SVG Rendering Overhead

Every candlestick was rendered as individual SVG `<Rect>` and `<Line>` elements wrapped with `Animated.createAnimatedComponent()`. For N candles, that's:

- **2N native SVG views** in the hierarchy (1 Rect + 1 Line per candle)
- **2N `useAnimatedProps` mappers** — one per `AnimatedRect` and one per `AnimatedLine`, used for `withTiming` data transition animations
- **N React component instances** in the fiber tree

While these `useAnimatedProps` mappers were primarily for data transitions (not gesture interaction), they still represent registered overhead in Reanimated's mapper system.

### Per-Candle Component Overhead

In v2, each candle was its own `CandlestickChartCandle` React component:

```jsx
// v2: Each candle is a separate component with 2 useAnimatedProps hooks
{data.map((candle, index) => (
  <CandlestickChartCandle
    key={index}
    candle={candle}
    domain={domain}
    maxHeight={height}
    width={step}
    index={index}
  />
))}
```

Each component called `useAnimatedProps` twice (for `AnimatedRect` and `AnimatedLine`) and `React.useMemo` twice (for static line/rect props). That's 4 hook calls per candle, scaling to 4N hooks for N candles. Even though candles are static during gesture interaction, React's reconciler still visits each component during re-renders to determine if updates are needed.

### Unguarded Shared Value Writes

A critical discovery during the v3 optimization work: **Reanimated's `SharedValue._value` setter does not perform an equality check before notifying listeners.** Every `sv.value = x` triggers all dependent mappers, even if `x === sv.value`.

In v2, the crosshair gesture handler wrote to shared values on every touch move without equality guards:

```js
// v2 Crosshair.tsx — updatePosition called on every onTouchesMove
currentY.value = clamp(y, 0, height);
currentX.value = boundedX - (boundedX % step) + step / 2;
currentIndex.value = Math.floor(boundedX / step);
```

When the finger moves within the same candle, `currentX` and `currentIndex` don't actually change — but the writes still fire all downstream mappers (`useAnimatedStyle` for crosshair position, `useAnimatedReaction` for callbacks, etc.).

### Redundant Computations

In v2, each `PriceText` and `DatetimeText` component independently computed its values from the raw shared values. There was no shared intermediate computation — each consumer did its own lookup into the data array.

---

## What v3 Solves

### Skia: GPU-Accelerated Rendering

All chart rendering now uses `@shopify/react-native-skia`:

- **Single Canvas** — all candles render into one GPU texture, not 2N native views
- **SharedValue props** — Skia detects `SharedValue` objects passed as props and reads their `.value` at draw time on the UI thread, enabling smooth animations without React reconciliation
- **`opaque` Canvas** — skips alpha compositing for the candlestick canvas, reducing GPU work

```jsx
// v3: Raw Skia elements — no wrapper components, no hooks per candle
<Canvas style={canvasStyle} opaque>
  {candles.map((c, i) => (
    <React.Fragment key={i}>
      <Line p1={c.p1} p2={c.p2} color={c.fill} strokeWidth={1} style="stroke" />
      <Rect x={c.rectX} y={c.rectY} width={c.rectW} height={c.rectH} color={c.fill} />
    </React.Fragment>
  ))}
</Canvas>
```

### Single-Pass Geometry Computation

All candle geometry (positions, sizes, colors) is pre-computed in a single `useMemo` pass:

```js
const candles = React.useMemo(() => {
  return computeCandles(data, step, height, domain, margin, positiveColor, negativeColor);
}, [data, step, height, domain, margin, positiveColor, negativeColor]);
```

This replaces 100 per-candle components with a single array of plain objects. The computation runs once when data changes, and the result is stable across gesture frames.

### Shared Value Architecture

Common computations are done once and shared via context:

- **`candle` shared value** — the OHLC data of the candle under the crosshair is computed once in the `Provider` using `useDerivedValue`. All `PriceText` and `DatetimeText` consumers read from this single shared value instead of each computing independently.
- **`currentIndex`-based updates** — the shared candle depends on `currentIndex` (which only changes when crossing a candle boundary), not `currentX`. This means OHLC lookups only re-evaluate when the crosshair moves to a different candle.

### Equality-Guarded Writes

All shared value writes in gesture handlers are now guarded:

```js
// Only fires mappers when the value actually changes
if (currentX.value !== newX) currentX.value = newX;
if (currentIndex.value !== newIdx) currentIndex.value = newIdx;
```

This prevents unnecessary mapper cascades when the user's finger moves within the same candle or data point — a common scenario since candles are wider than individual pixels.

### Reduced Mapper Count

v3 reduces the number of Reanimated mappers (the unit of per-frame work on the UI thread):

| Optimization | Impact |
|---|---|
| Shared candle in context instead of per-consumer `useDerivedValue` | -(N-1) mappers (N = number of PriceText/DatetimeText) |
| Split crosshair/OHLC price hooks | OHLC mappers don't fire every gesture frame |
| Eliminated redundant `useDerivedValue` chain in line chart `useDatetime` | -1 mapper per DatetimeText |
| Raw Skia elements instead of per-candle `useAnimatedProps` | Eliminates 200 mappers for 100 candles |

### Throttled Callbacks

In v2, `onCurrentXChange` tracked `currentX.value` via `useAnimatedReaction`. Since `currentX` is snapped to candle centers, it changed on each candle boundary crossing. In v3, the reaction tracks `currentIndex` instead, which is semantically clearer and avoids any edge cases where `currentX` might change without a real candle change:

```js
useAnimatedReaction(
  () => currentIndex.value,
  (idx, prevIdx) => {
    if (idx !== -1 && idx !== prevIdx && onCurrentXChange) {
      scheduleOnRN(onCurrentXChange, currentX.value);
    }
  },
);
```

---

## Expected Benefits

### Performance

| Metric | v2 | v3 |
|---|---|---|
| Registered mappers (N candles) | 2N (per-candle `useAnimatedProps`) | **0** (pre-computed geometry) |
| Native views (N candles) | 2N SVG elements | **1 Canvas** |
| React components (N candles) | N `CandlestickChartCandle` | **0** (raw Skia elements) |
| Shared value writes per gesture frame | Unguarded (always writes) | **Guarded** (skips if unchanged) |
| OHLC price computation | Per-consumer | **Shared** (1 `useDerivedValue` in context) |

### Developer Experience

- **Same composable API** — the component tree structure is identical to v2. Most apps can upgrade by changing dependencies and fixing a few prop names (see [Migration Guide](./migration-v2-to-v3.md)).
- **Fewer moving parts** — fewer mappers and shared values make it easier to trace performance issues.
- **Future-proof** — Skia is actively maintained by Shopify and is the rendering engine behind many high-performance React Native apps.

### For Apps Already Using Skia

If your app already depends on `@shopify/react-native-skia` (for other charting, image processing, or custom drawing), v3 means:

- **You can drop `react-native-svg`** as a dependency if this library was the only reason you had it. That's one fewer native module to install, link, build, and maintain across iOS and Android.
- **No additional native binary size** — Skia is already in your app, so wagmi-charts adds zero native overhead.
- **Consistent rendering stack** — your entire app uses one graphics engine instead of two.

---

## Trade-offs

### New Dependency

v3 requires `@shopify/react-native-skia` and `react-native-worklets` as peer dependencies. If your app doesn't already use Skia, this adds a new native dependency. See the [Compatibility table](./README.md#compatibility) for minimum versions.

### Custom Renderers Are Slower

The `renderRect`/`renderLine` props on `CandlestickChart.Candles` still work but use per-candle React components (the slow path). The default rendering uses pre-computed geometry (the fast path). If you need custom drawing, be aware of the performance difference.

### SVG Interop

If you have custom chart overlays built with `react-native-svg`, they won't render inside a Skia `Canvas`. You'll need to either:

- Convert them to Skia primitives
- Render them in a separate layer outside the Canvas

### AnimatedTextInput Scaling

Each `PriceText`/`DatetimeText` component uses an `AnimatedTextInput` under the hood. Reanimated's `updateProps` for native text updates has a fixed per-call cost. With many text components (10+), this becomes the bottleneck — not the chart itself. This is a Reanimated limitation, not specific to this library. In production, 1–3 text components is the sweet spot.
