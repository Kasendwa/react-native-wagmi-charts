# Motivation & What's New in v3

> **Beta (v3.0.0-beta)** — API is stable but may receive minor adjustments before final release.

This document explains why we rebuilt react-native-wagmi-charts on Skia, what problems existed in v2, and what improvements v3 delivers.

## Table of Contents

- [Why the Switch to Skia?](#why-the-switch-to-skia)
- [Problems in v2](#problems-in-v2)
  - [SVG Rendering Bottleneck](#svg-rendering-bottleneck)
  - [Per-Candle Component Overhead](#per-candle-component-overhead)
  - [Excessive Worklet Execution](#excessive-worklet-execution)
  - [Redundant Computations](#redundant-computations)
  - [Multiple Native Surfaces](#multiple-native-surfaces)
  - [Unnecessary JS Thread Bouncing](#unnecessary-js-thread-bouncing)
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

v2 used `react-native-svg` for all chart rendering. While SVG is familiar and works well for static graphics, it has fundamental limitations for interactive, high-frequency chart updates:

- **SVG is DOM-based** — every element is a native view in the hierarchy, and updates go through React reconciliation + native view mutation
- **No shared value integration** — SVG elements can't read Reanimated `SharedValue` props directly, requiring animated wrappers
- **Heavy for large datasets** — 100+ candles means 200+ native SVG elements, each with its own layout and drawing overhead

Skia, by contrast, is a **GPU-accelerated 2D graphics engine** (the same one Chrome and Android use). It draws directly to a GPU texture, bypassing the native view hierarchy entirely.

---

## Problems in v2

### SVG Rendering Bottleneck

Every candlestick was rendered as individual SVG `<Rect>` and `<Line>` elements. With 100 candles, that's 200+ native views in the hierarchy. Each view update during gesture interaction required:

1. React reconciliation (diffing the component tree)
2. Native view property updates (bridge calls)
3. Layout recalculation
4. Compositing by the OS

This created visible frame drops during gesture interaction, especially on Android.

### Per-Candle Component Overhead

Each candle was a separate React component with its own hooks (`useDerivedValue`, `useAnimatedStyle`). For 100 candles:

- **100 component instances** in React's fiber tree
- **200+ Reanimated mappers** (one per `useDerivedValue`/`useAnimatedStyle`)
- **100 hook registrations** inside the reconciler

Even though most candles don't change during interaction, the React reconciler still had to visit each component to determine if it needed updating.

### Excessive Worklet Execution

A critical discovery during the v3 optimization work: **Reanimated's `SharedValue._value` setter does not perform an equality check before notifying listeners.** This means:

```js
// This fires ALL dependent mappers, even if currentX hasn't changed
currentX.value = sameValueAsBeforeX;
```

In v2, gesture handlers wrote to shared values on every touch move event (~60 times/sec) without checking if the value actually changed. This triggered cascading mapper execution across all dependent `useDerivedValue`, `useAnimatedStyle`, and `useAnimatedProps` hooks — even when the computed output was identical.

### Redundant Computations

Multiple `PriceText` components each independently computed the same values:

- Each crosshair `PriceText` ran its own `getPrice()` interpolation from the Y position
- Each OHLC `PriceText` independently looked up `data[currentIndex]` to get the candle
- Each `DatetimeText` independently looked up the timestamp

With the full example app showing 13 `PriceText` + 3 `DatetimeText` components, this meant 16 independent computations of overlapping data on every gesture frame.

### Multiple Native Surfaces

v2's architecture used separate `Canvas`/`View` instances for different chart layers (background path, foreground path, crosshair lines, cursor dot, tooltip). Each native surface requires:

- Its own GPU texture allocation
- OS-level compositing to blend them together
- Synchronization overhead between surfaces

### Unnecessary JS Thread Bouncing

The `onCurrentXChange` callback fired on every pixel of cursor movement, using `scheduleOnRN` to bounce to the JS thread ~60 times/sec. This was typically used for haptic feedback, which only needs to fire when crossing a data point boundary — not on every pixel.

---

## What v3 Solves

### Skia: GPU-Accelerated Rendering

All chart rendering now uses `@shopify/react-native-skia`:

- **Single Canvas** — all candles render into one GPU texture, not 200+ native views
- **Picture recording** — Skia records drawing commands once and replays them. Static content (candles) is recorded once and never re-recorded during interaction
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
- **`currentIndex`-based updates** — the shared candle depends on `currentIndex` (which only changes when crossing a candle boundary), not `currentX` (which changes every pixel). This means OHLC lookups only fire ~10 times during a swipe, not ~60 times/sec.

### Equality-Guarded Writes

All shared value writes in gesture handlers are now guarded:

```js
// Only fires mappers when the value actually changes
if (currentX.value !== newX) currentX.value = newX;
if (currentIndex.value !== newIdx) currentIndex.value = newIdx;
```

This prevents unnecessary mapper cascades when the user's finger moves within the same candle or data point.

### Reduced Mapper Count

v3 significantly reduces the number of Reanimated mappers (the unit of per-frame work on the UI thread):

| Optimization | Impact |
|---|---|
| Single tooltip instead of 2 (was left + right with opacity toggle) | -2 mappers |
| Shared candle in context instead of per-consumer `useDerivedValue` | -(N-1) mappers |
| Split crosshair/OHLC price hooks | OHLC mappers don't fire every frame |
| Eliminated redundant `useDerivedValue` chain in line chart `useDatetime` | -1 mapper per DatetimeText |
| Raw Skia elements instead of per-candle components | -200+ mappers for 100 candles |

### Throttled Callbacks

`onCurrentXChange` now fires only when the crosshair crosses a candle boundary (via `currentIndex` change), not on every pixel:

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

This reduces JS thread bouncing from ~60 calls/sec to ~5-10 calls/sec during a typical swipe.

---

## Expected Benefits

### Performance

| Metric | v2 | v3 |
|---|---|---|
| UI FPS during gesture (chart only) | 30–45 fps | **60 fps** |
| UI FPS with tooltip | 30–40 fps | **60 fps** |
| UI FPS with 6 PriceText | 25–35 fps | **57–60 fps** |
| JS thread during gesture | Occasional drops | **Solid 60 fps** |
| Mapper count (100 candles) | 200+ | **~10** |
| Native views (100 candles) | 200+ SVG elements | **1 Canvas** |

### Developer Experience

- **Same composable API** — the component tree structure is identical to v2. Most apps can upgrade by changing dependencies and fixing a few prop names (see [Migration Guide](./migration-v2-to-v3.md)).
- **Better debugging** — fewer mappers and shared values make it easier to trace performance issues.
- **Future-proof** — Skia is actively maintained by Shopify and is the rendering engine behind many high-performance React Native apps.

### Bundle Size

- `react-native-svg` is no longer a dependency (though you can keep it for other parts of your app)
- `@shopify/react-native-skia` is likely already in your app if you use other Skia-based libraries

---

## Trade-offs

### New Dependency

v3 requires `@shopify/react-native-skia` and `react-native-worklets` as peer dependencies. If your app doesn't already use Skia, this adds to your native binary size.

### Custom Renderers Are Slower

The `renderRect`/`renderLine` props on `CandlestickChart.Candles` still work but use per-candle React components (the slow path). The default rendering uses pre-computed geometry (the fast path). If you need custom drawing, be aware of the performance difference.

### SVG Interop

If you have custom chart overlays built with `react-native-svg`, they won't render inside a Skia `Canvas`. You'll need to either:

- Convert them to Skia primitives
- Render them in a separate layer outside the Canvas

### AnimatedTextInput Scaling

Each `PriceText`/`DatetimeText` component uses an `AnimatedTextInput` under the hood. Reanimated's `updateProps` for native text updates has a fixed per-call cost. With many text components (10+), this becomes the bottleneck — not the chart itself. This is a Reanimated platform limitation, not specific to this library. In production, 1–3 text components is the sweet spot.
