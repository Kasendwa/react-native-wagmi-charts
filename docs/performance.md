# Performance Guide

> **Beta (v3.0.0-beta)** — API is stable but may receive minor adjustments before final release.

This document explains the architecture and optimization strategies used in react-native-wagmi-charts v3 to achieve 60fps gesture interactions.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Rendering Pipeline](#rendering-pipeline)
  - [Skia Canvas](#skia-canvas)
  - [Reanimated Shared Values](#reanimated-shared-values)
  - [Gesture Handling](#gesture-handling)
- [Optimization Techniques](#optimization-techniques)
  - [Equality Guards on Shared Value Writes](#equality-guards-on-shared-value-writes)
  - [Shared Candle Computation](#shared-candle-computation)
  - [Split Price Hooks](#split-price-hooks)
  - [Single-Pass Candle Geometry](#single-pass-candle-geometry)
  - [Throttled Callbacks](#throttled-callbacks)
  - [Reduced Mapper Count](#reduced-mapper-count)
- [Best Practices for Consumers](#best-practices-for-consumers)
  - [Minimize AnimatedTextInput Count](#minimize-animatedtextinput-count)
  - [Prefer OHLC Types Over Crosshair](#prefer-ohlc-types-over-crosshair)
  - [Avoid Unnecessary Re-renders](#avoid-unnecessary-re-renders)
- [Understanding Reanimated Mappers](#understanding-reanimated-mappers)
- [Benchmarks](#benchmarks)

---

## Architecture Overview

The library runs on three threads:

1. **JS Thread** — React reconciliation, data processing, path computation
2. **UI Thread** — Reanimated worklets, gesture handlers, shared value updates
3. **Skia Thread** — Canvas drawing (Skia reads shared values at draw time)

During gesture interaction, the hot path is entirely on the **UI thread**:

```
Touch Event → Gesture Handler (UI thread)
  → Update SharedValues (currentX, currentY, currentIndex)
    → Reanimated mappers fire (useDerivedValue, useAnimatedStyle, useAnimatedProps)
      → Native view updates (translateX/Y, text props)
      → Skia reads SharedValues at next draw
```

No JS thread work happens during gesture interaction. This is what enables 60fps.

---

## Rendering Pipeline

### Skia Canvas

Charts are rendered using `@shopify/react-native-skia`'s `Canvas` component. Key properties:

- **Persistent reconciler** — Skia has its own React reconciler. Any React reconciliation in a Canvas tree triggers a full picture re-record.
- **SharedValue props** — Skia detects `SharedValue` objects passed as props and reads their `.value` at draw time on the UI thread, enabling animations without React reconciliation.
- **`opaque` prop** — The candlestick Canvas uses `opaque` to skip alpha compositing, reducing GPU work.

#### Example: Static vs Dynamic Props

```jsx
// GOOD: Static props — Canvas picture recorded once, never re-recorded
<Rect x={100} y={50} width={20} height={80} color="green" />

// GOOD: SharedValue props — Skia reads at draw time, no reconciliation
<Line p1={sharedP1} p2={sharedP2} color="gray" />

// BAD: Inline object — creates new reference every render, triggers re-record
<Rect x={100} y={50} width={20} height={getHeight()} color="green" />
```

### Reanimated Shared Values

All interactive state is stored in `SharedValue` objects:

- `currentX` — cursor X pixel position
- `currentY` — cursor Y pixel position (candlestick only)
- `currentIndex` — index of the active data point
- `candle` — OHLC data of the active candle (candlestick only)
- `isActive` — whether the cursor is active (line chart only)

These are updated on the UI thread by gesture handlers and read by Reanimated mappers (`useDerivedValue`, `useAnimatedStyle`, `useAnimatedProps`).

### Gesture Handling

Both charts use `Gesture.LongPress()` from `react-native-gesture-handler`:

- `.onStart()` — activates the cursor
- `.onTouchesMove()` — updates position on every touch move
- `.onEnd()` — deactivates the cursor

All gesture callbacks run as worklets on the UI thread.

---

## Optimization Techniques

### Equality Guards on Shared Value Writes

**Problem:** Reanimated's `SharedValue._value` setter does **not** check for equality before notifying listeners. Every `sv.value = x` triggers all dependent mappers, even if `x === sv.value`.

**Solution:** Guard every write in hot paths:

```js
// BAD: Fires all mappers even when value hasn't changed
currentX.value = newX;

// GOOD: Only fires mappers when value actually changes
if (currentX.value !== newX) currentX.value = newX;
```

This is applied in both `Crosshair.tsx` (candlestick) and `Cursor.tsx` (line chart) for all shared value writes in `onStart` and `onTouchesMove`.

**Impact:** Prevents unnecessary mapper cascades when the user's finger moves within the same candle or data point.

### Shared Candle Computation

**Problem:** Multiple `PriceText` and `DatetimeText` components each need the current candle's OHLC data. If each computed it independently, that's N redundant lookups.

**Solution:** The `CandlestickChartProvider` computes the current candle once using `useDerivedValue` and shares it via context:

```js
// In Context.tsx — computed once
const candle = useDerivedValue(() => {
  const idx = currentIndex.value;
  if (idx === -1 || idx >= data.length) return EMPTY_CANDLE;
  return data[idx] ?? EMPTY_CANDLE;
}, [currentIndex, data]);
```

All consumers (`useCandleData`, `useCandlePrice`, `useDatetime`) read from this shared value instead of computing independently.

**Key detail:** This depends on `currentIndex` (not `currentX`), so it only re-evaluates when the crosshair crosses a candle boundary — not on every pixel of finger movement.

### Split Price Hooks

**Problem:** A single `usePrice` hook that handles both crosshair and OHLC types would read `currentY.value` in its worklet body. Reanimated tracks all shared values accessed at runtime, so even OHLC instances would be re-evaluated on every `currentY` change.

**Solution:** Two separate internal hooks:

- **`useCrosshairPrice`** — reads `currentY`, runs every gesture frame
- **`useCandlePrice`** — reads `candle` (shared value), runs only on boundary crossings

```js
// Crosshair: depends on currentY (every frame)
function useCrosshairPrice({ format, precision }) {
  const { currentY, domain, height } = useCandlestickChart();
  const float = useDerivedValue(() => {
    const price = getPrice(height, currentY.value, sortedDomain);
    // ...
  });
}

// OHLC: depends on candle (boundary only)
function useCandlePrice({ format, precision, type }) {
  const candle = useCandleData();
  const float = useDerivedValue(() => {
    const price = candle.value[type];
    // ...
  });
}
```

The public `useCandlestickChartPrice` dispatches to the correct hook based on `type`.

### Single-Pass Candle Geometry

**Problem:** Rendering each candle as a React component with hooks creates O(N) components and O(N) hook registrations inside Skia's reconciler.

**Solution:** Pre-compute all candle geometry in a single `useMemo` pass, then render raw Skia host elements:

```jsx
// Single pass: compute all geometry
const candles = React.useMemo(() => {
  return computeCandles(data, step, height, domain, margin, positiveColor, negativeColor);
}, [data, step, height, domain, margin, positiveColor, negativeColor]);

// Render raw Skia elements — no wrapper components, no hooks
<Canvas style={canvasStyle} opaque>
  {candles.map((c, i) => (
    <React.Fragment key={i}>
      <Line p1={c.p1} p2={c.p2} color={c.fill} strokeWidth={1} style="stroke" />
      <Rect x={c.rectX} y={c.rectY} width={c.rectW} height={c.rectH} color={c.fill} />
    </React.Fragment>
  ))}
</Canvas>
```

The `vec()` objects and geometry are pre-computed, so the Canvas picture is recorded once and never changes during interaction.

### Throttled Callbacks

**Problem:** In v2, `onCurrentXChange` tracked `currentX.value` via `useAnimatedReaction`. While `currentX` was snapped to candle centers (not raw pixels), it still changed on each candle boundary crossing and the unguarded writes meant the reaction could fire redundantly.

**Solution:** v3 tracks `currentIndex` instead, which is semantically clearer and avoids edge cases:

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

### Reduced Mapper Count

Each `useDerivedValue`, `useAnimatedStyle`, and `useAnimatedProps` creates a Reanimated "mapper". Mappers are the unit of work on the UI thread. Fewer mappers = less per-frame work.

Key reductions in v3:

| Optimization | Mappers Saved |
|---|---|
| Single tooltip instead of 2 (v2 rendered left + right with opacity toggle, 4 mappers → 1) | 3 mappers |
| Shared candle in context (was per-consumer `useDerivedValue`) | N-1 mappers |
| Split crosshair/OHLC hooks | Prevents OHLC mappers from firing every frame |
| Eliminated redundant `useDerivedValue` chain in line `useDatetime` | 1 mapper per DatetimeText |
| Raw Skia elements instead of per-candle `useAnimatedProps` | 200 mappers for 100 candles |

---

## Best Practices for Consumers

### Minimize AnimatedTextInput Count

Each `PriceText` or `DatetimeText` component creates an `AnimatedTextInput` with a `useAnimatedProps` mapper. Each mapper calls Reanimated's `updateProps` to synchronously update the native `text` property.

The more `AnimatedTextInput` instances you have, the more `updateProps` calls Reanimated makes per frame. Each call has a fixed native overhead.

**Recommendation:** In production, use 1–3 `PriceText`/`DatetimeText` components outside the chart. The example app intentionally uses many more to stress-test.

### Prefer OHLC Types Over Crosshair

```jsx
// CHEAPER: Only updates when crossing a candle boundary
<CandlestickChart.PriceText type="close" />

// MORE EXPENSIVE: Updates every gesture frame
<CandlestickChart.PriceText />  {/* type="crosshair" (default) */}
```

If you only need the price of the candle under the cursor (not the exact Y-interpolated price), use an OHLC type.

### Avoid Unnecessary Re-renders

The `Provider` components memoize their context values. Avoid passing unstable references as props:

```jsx
// BAD: New object every render — forces context update
<LineChart.Provider data={data} yRange={{ min: 0, max: 100 }}>

// GOOD: Stable reference
const yRange = useMemo(() => ({ min: 0, max: 100 }), []);
<LineChart.Provider data={data} yRange={yRange}>
```

---

## Understanding Reanimated Mappers

A "mapper" is Reanimated's internal unit of reactive computation. Understanding how they work helps you reason about performance:

1. **Creation** — Each `useDerivedValue`, `useAnimatedStyle`, `useAnimatedProps` call creates a mapper.
2. **Input tracking** — Reanimated's Babel plugin scans the worklet's closure (`__closure`) to find all `SharedValue` references. These become the mapper's inputs.
3. **Triggering** — When any input `SharedValue` is written to (via `sv.value = x`), all mappers that depend on it are marked dirty.
4. **Execution** — Dirty mappers execute in topological order via `queueMicrotask`.
5. **Output** — `useDerivedValue` always writes to its output `SharedValue`, which can trigger further downstream mappers.

**Critical insight:** The dependency array (`[deps]`) passed to these hooks is primarily for the Babel plugin and web builds. On native, Reanimated tracks dependencies at runtime by scanning the worklet's closure. This means:

- A worklet that reads `currentY.value` will always be triggered when `currentY` changes, regardless of the deps array.
- A worklet that does NOT read `currentY.value` will never be triggered by `currentY` changes.

This is why the split between `useCrosshairPrice` (reads `currentY`) and `useCandlePrice` (reads `candle`) is so important — it's not about the deps array, it's about which shared values the worklet body actually accesses.

---

## Benchmarks

> **Note:** These are observations from development testing, not formal benchmarks. Your results will vary depending on device, React Native version, and app complexity.

During development on a physical iOS device (React Native 0.81, Reanimated 4):

- **Chart + crosshair only** — UI thread stays at 60fps during gesture interaction
- **Adding PriceText/DatetimeText** — each additional `AnimatedTextInput` adds a small per-frame cost. With 1–3 text components, the impact is negligible. With 10+, frame drops become noticeable.
- **JS thread** — stays idle during gesture interaction in all configurations, since all work happens on the UI thread via worklets

The primary bottleneck with many text components is Reanimated's `updateProps` native call, not the chart rendering itself.
