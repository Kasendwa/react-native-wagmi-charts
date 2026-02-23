# Candlestick Chart

> **Beta (v3.0.0-beta)** — API is stable but may receive minor adjustments before final release.

The candlestick chart renders OHLC (Open, High, Low, Close) financial data with interactive crosshairs, tooltips, and price/datetime labels.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Guides](#guides)
  - [Interactive Crosshair](#interactive-crosshair)
  - [Interactive Labels](#interactive-labels)
  - [Interactive Tooltips](#interactive-tooltips)
  - [Haptic Feedback](#haptic-feedback)
  - [Colors](#colors)
  - [Customizing Labels](#customizing-labels)
  - [Custom Candle Renderers](#custom-candle-renderers)
- [Component API](#component-api)
  - [CandlestickChart.Provider](#candlestickchartprovider)
  - [CandlestickChart](#candlestickchart)
  - [CandlestickChart.Candles](#candlestickchartcandles)
  - [CandlestickChart.Crosshair](#candlestickchartcrosshair)
  - [CandlestickChart.Tooltip](#candlestickcharttooltip)
  - [CandlestickChart.PriceText](#candlestickchartpricetext)
  - [CandlestickChart.DatetimeText](#candlestickchartdatetimetext)

---

## Basic Usage

```jsx
import { CandlestickChart } from 'react-native-wagmi-charts';

const data = [
  { timestamp: 1625945400000, open: 33575.25, high: 33600.52, low: 33475.12, close: 33520.11 },
  { timestamp: 1625946300000, open: 33545.25, high: 33560.52, low: 33510.12, close: 33520.11 },
  { timestamp: 1625947200000, open: 33510.25, high: 33515.52, low: 33250.12, close: 33250.11 },
  { timestamp: 1625948100000, open: 33215.25, high: 33430.52, low: 33215.12, close: 33420.11 },
];

function MyChart() {
  return (
    <CandlestickChart.Provider data={data}>
      <CandlestickChart>
        <CandlestickChart.Candles />
      </CandlestickChart>
    </CandlestickChart.Provider>
  );
}
```

The three core components:

- **`CandlestickChart.Provider`** — sets up data context, computes domain and shared values
- **`CandlestickChart`** — composes chart elements and measures dimensions
- **`CandlestickChart.Candles`** — renders the candlestick bars

---

## Guides

### Interactive Crosshair

Add a crosshair that follows your finger with horizontal and vertical lines:

```jsx
<CandlestickChart.Provider data={data}>
  <CandlestickChart>
    <CandlestickChart.Candles />
    <CandlestickChart.Crosshair />
  </CandlestickChart>
</CandlestickChart.Provider>
```

---

### Interactive Labels

Place `PriceText` and `DatetimeText` anywhere inside the `Provider`. The `type` prop controls which OHLC value is displayed:

```jsx
<CandlestickChart.Provider data={data}>
  <CandlestickChart>
    <CandlestickChart.Candles />
    <CandlestickChart.Crosshair />
  </CandlestickChart>

  {/* Crosshair price (interpolated from Y position) */}
  <CandlestickChart.PriceText />

  {/* OHLC values from the candle under the crosshair */}
  <CandlestickChart.PriceText type="open" />
  <CandlestickChart.PriceText type="high" />
  <CandlestickChart.PriceText type="low" />
  <CandlestickChart.PriceText type="close" />

  {/* Timestamp of the candle under the crosshair */}
  <CandlestickChart.DatetimeText />
</CandlestickChart.Provider>
```

**Performance note:** The default `type` is `"crosshair"`, which updates every gesture frame (interpolated from Y position). The OHLC types (`"open"`, `"high"`, `"low"`, `"close"`) only update when the crosshair crosses a candle boundary, making them much cheaper. See the [Performance Guide](./performance.md) for details.

---

### Interactive Tooltips

Nest a `Tooltip` inside the `Crosshair` to show a floating price label:

```jsx
<CandlestickChart.Provider data={data}>
  <CandlestickChart>
    <CandlestickChart.Candles />
    <CandlestickChart.Crosshair>
      <CandlestickChart.Tooltip />
    </CandlestickChart.Crosshair>
  </CandlestickChart>
</CandlestickChart.Provider>
```

The tooltip automatically repositions to the left or right side to stay visible.

---

### Haptic Feedback

Use `onCurrentXChange` on the `Crosshair` for haptic feedback. This fires when the crosshair crosses a candle boundary (not every pixel), so haptics feel natural:

```jsx
import * as haptics from 'expo-haptics';

function invokeHaptic() {
  haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
}

<CandlestickChart.Crosshair onCurrentXChange={invokeHaptic}>
  <CandlestickChart.Tooltip />
</CandlestickChart.Crosshair>
```

You can also use `onCurrentIndexChange` on the Provider:

```jsx
<CandlestickChart.Provider data={data} onCurrentIndexChange={invokeHaptic}>
  {/* ... */}
</CandlestickChart.Provider>
```

---

### Colors

#### Candle Colors

```jsx
<CandlestickChart.Candles positiveColor="hotpink" negativeColor="black" />
```

#### Crosshair Color

```jsx
<CandlestickChart.Crosshair color="hotpink" />
```

---

### Customizing Labels

#### Price Precision

```jsx
<CandlestickChart.PriceText precision={4} />
```

#### Custom Price Format

```jsx
<CandlestickChart.PriceText
  format={({ value, formatted }) => {
    'worklet';
    return `$${formatted} AUD`;
  }}
/>
```

#### Datetime Options

```jsx
<CandlestickChart.DatetimeText
  locale="en-AU"
  options={{
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }}
/>
```

#### Custom Datetime Format

```jsx
<CandlestickChart.DatetimeText
  format={({ value, formatted }) => {
    'worklet';
    return `Date: ${formatted}`;
  }}
/>
```

---

### Custom Candle Renderers

For full control over how each candle is drawn, use `renderRect` and `renderLine`:

```jsx
<CandlestickChart.Candles
  renderRect={({ x, y, width, height, color }) => (
    <Rect x={x} y={y} width={width} height={height} color={color} />
  )}
  renderLine={({ p1, p2, color, strokeWidth }) => (
    <Line p1={p1} p2={p2} color={color} strokeWidth={strokeWidth} style="stroke" />
  )}
/>
```

> **Note:** Custom renderers use per-candle components, which is slower than the default fast path. Only use them when you need custom drawing logic. See the [Performance Guide](./performance.md) for details.

---

## Component API

### CandlestickChart.Provider

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `TCandle[]` | *required* | Array of `{ timestamp, open, high, low, close }` |
| `valueRangeY` | `[number, number]` | | Custom y-axis domain `[min, max]` |
| `onCurrentIndexChange` | `(index: number) => void` | | Callback when the active candle index changes |

### CandlestickChart

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | Screen width | Chart width |
| `height` | `number` | Screen height | Chart height |
| `...props` | `ViewProps` | | Inherits React Native `View` props |

### CandlestickChart.Candles

| Prop | Type | Default | Description |
|---|---|---|---|
| `positiveColor` | `string` | `"#10b981"` | Color for bullish candles (close > open) |
| `negativeColor` | `string` | `"#ef4444"` | Color for bearish candles (close < open) |
| `margin` | `number` | `2` | Horizontal margin between candles |
| `useAnimations` | `boolean` | `true` | Animate candle transitions |
| `renderRect` | `(props) => ReactNode` | | Custom body renderer (Skia elements) |
| `renderLine` | `(props) => ReactNode` | | Custom wick renderer (Skia elements) |
| `candleProps` | `Partial<CandleProps>` | | Additional props for each candle |

### CandlestickChart.Crosshair

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `"black"` | Crosshair line color |
| `onCurrentXChange` | `(value: number) => void` | | Fires when crosshair crosses a candle boundary |
| `minDurationMs` | `number` | `0` | Minimum long-press duration before activation |
| `horizontalCrosshairProps` | `AnimatedProps<ViewProps>` | | Props for the horizontal line wrapper |
| `verticalCrosshairProps` | `AnimatedProps<ViewProps>` | | Props for the vertical line wrapper |
| `lineProps` | `Partial<LineProps>` | | Props passed to both crosshair lines |

### CandlestickChart.Tooltip

| Prop | Type | Default | Description |
|---|---|---|---|
| `xGutter` | `number` | `8` | X-axis edge padding |
| `yGutter` | `number` | `8` | Y-axis edge padding |
| `tooltipTextProps` | `PriceTextProps` | | Props for the inner PriceText |
| `textStyle` | `AnimatedStyle<TextStyle>` | | Tooltip text style |

### CandlestickChart.PriceText

| Prop | Type | Default | Description |
|---|---|---|---|
| `type` | `"crosshair" \| "open" \| "high" \| "low" \| "close"` | `"crosshair"` | Which price to display |
| `format` | `({ value, formatted }) => string` | | Custom format worklet |
| `precision` | `number` | `2` | Decimal places |
| `variant` | `"formatted" \| "value"` | `"formatted"` | Display variant |
| `style` | `StyleProp<TextStyle>` | | Text style |

### CandlestickChart.DatetimeText

| Prop | Type | Default | Description |
|---|---|---|---|
| `format` | `({ value, formatted }) => string` | | Custom format worklet |
| `locale` | `string` | `"en-US"` | Locale for `toLocaleString()` |
| `options` | `Intl.DateTimeFormatOptions` | | Options for `toLocaleString()` |
| `variant` | `"formatted" \| "value"` | `"formatted"` | Display variant |
| `style` | `StyleProp<TextStyle>` | | Text style |
