# Hooks

> **Beta (v3.0.0-beta)** — API is stable but may receive minor adjustments before final release.

All hooks must be used inside their respective `Provider` component.

## Table of Contents

- [Line Chart Hooks](#line-chart-hooks)
  - [LineChart.useChart](#linechartusechart)
  - [LineChart.usePrice](#linechartuseprice)
  - [LineChart.useDatetime](#linechartusedatetime)
- [Candlestick Chart Hooks](#candlestick-chart-hooks)
  - [CandlestickChart.useChart](#candlestickchartusechart)
  - [CandlestickChart.useCandleData](#candlestickchartusecandledata)
  - [CandlestickChart.usePrice](#candlestickchartuseprice)
  - [CandlestickChart.useDatetime](#candlestickchartusedatetime)

---

## Line Chart Hooks

### LineChart.useChart

Returns the current state of the line chart. Useful for building custom components that react to cursor movement.

```jsx
import { LineChart } from 'react-native-wagmi-charts';

function MyCustomComponent() {
  const { currentX, currentIndex, isActive, data, domain, yDomain } =
    LineChart.useChart();

  // currentX, currentIndex, isActive are SharedValues —
  // use them in worklets or useAnimatedStyle/useDerivedValue
  return null;
}
```

#### Returns

| Variable | Type | Description |
|---|---|---|
| `currentX` | `SharedValue<number>` | Current x pixel position of the cursor |
| `currentIndex` | `SharedValue<number>` | Index of the active data point (`-1` when inactive) |
| `isActive` | `SharedValue<boolean>` | Whether the cursor is active |
| `data` | `TLineChartData` | The chart data array |
| `domain` | `[number, number]` | Y-axis domain `[min, max]` |
| `yDomain` | `{ min: number, max: number }` | Y-axis domain with explicit min/max |
| `xDomain` | `[number, number] \| undefined` | X-axis domain (if time-scaled) |
| `xLength` | `number` | Total x-axis length |

#### Example: Custom active indicator

```jsx
function ActiveIndicator() {
  const { isActive } = LineChart.useChart();

  const style = useAnimatedStyle(() => ({
    backgroundColor: isActive.value ? 'green' : 'gray',
    width: 12,
    height: 12,
    borderRadius: 6,
  }));

  return <Animated.View style={style} />;
}
```

---

### LineChart.usePrice

Returns the current price as shared values. Useful for building custom price displays.

```jsx
const { value, formatted } = LineChart.usePrice({
  precision: 2,
  format: ({ value, formatted }) => {
    'worklet';
    return `$${formatted}`;
  },
});
```

#### Arguments

| Argument | Type | Default | Description |
|---|---|---|---|
| `precision` | `number` | `2` | Decimal places |
| `format` | `({ value, formatted }) => string` | | Custom format worklet |
| `index` | `number` | | Get price for a specific data index |

#### Returns

| Variable | Type | Description |
|---|---|---|
| `value` | `SharedValue<string>` | Raw price string (e.g. `"33575.25"`) |
| `formatted` | `SharedValue<string>` | Formatted price string (e.g. `"$33,575.25"`) |

#### Example: Custom price display with Animated.Text

```jsx
import Animated, { useAnimatedProps } from 'react-native-reanimated';
import { TextInput } from 'react-native';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

function CustomPrice() {
  const { formatted } = LineChart.usePrice({ precision: 4 });

  const animatedProps = useAnimatedProps(() => ({
    text: formatted.value,
    defaultValue: '',
  }));

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={animatedProps}
      style={{ fontSize: 24, fontWeight: 'bold' }}
    />
  );
}
```

---

### LineChart.useDatetime

Returns the current timestamp as shared values.

```jsx
const { value, formatted } = LineChart.useDatetime({
  locale: 'en-US',
  options: { month: 'short', day: 'numeric' },
});
```

#### Arguments

| Argument | Type | Default | Description |
|---|---|---|---|
| `format` | `({ value, formatted }) => string` | | Custom format worklet |
| `locale` | `string` | `"en-US"` | Locale for `toLocaleString()` |
| `options` | `Intl.DateTimeFormatOptions` | | Options for `toLocaleString()` |

#### Returns

| Variable | Type | Description |
|---|---|---|
| `value` | `SharedValue<number>` | Timestamp in milliseconds |
| `formatted` | `SharedValue<string>` | Formatted datetime string |

---

## Candlestick Chart Hooks

### CandlestickChart.useChart

Returns the current state of the candlestick chart.

```jsx
import { CandlestickChart } from 'react-native-wagmi-charts';

function MyCustomComponent() {
  const { currentX, currentY, currentIndex, data, domain, step, candle } =
    CandlestickChart.useChart();

  return null;
}
```

#### Returns

| Variable | Type | Description |
|---|---|---|
| `currentX` | `SharedValue<number>` | Current x pixel position |
| `currentY` | `SharedValue<number>` | Current y pixel position |
| `currentIndex` | `SharedValue<number>` | Index of the active candle (`-1` when inactive) |
| `candle` | `SharedValue<TCandle>` | The active candle's OHLC data (shared, computed once) |
| `data` | `TCandle[]` | The chart data array |
| `domain` | `[number, number]` | Y-axis domain `[min, max]` |
| `step` | `number` | Width of each candle in pixels |
| `width` | `number` | Chart width |
| `height` | `number` | Chart height |

#### Example: Custom candle info panel

```jsx
function CandleInfo() {
  const { candle } = CandlestickChart.useChart();

  const textProps = useAnimatedProps(() => ({
    text: candle.value.close !== -1
      ? `O: ${candle.value.open.toFixed(2)}  C: ${candle.value.close.toFixed(2)}`
      : 'Tap a candle',
    defaultValue: 'Tap a candle',
  }));

  return <AnimatedTextInput editable={false} animatedProps={textProps} />;
}
```

---

### CandlestickChart.useCandleData

Returns the current candle under the crosshair as a `SharedValue<TCandle>`. This is the same `candle` from `useChart`, but as a standalone hook for convenience.

```jsx
const candle = CandlestickChart.useCandleData();
// candle is a SharedValue — access fields via candle.value.open, candle.value.close, etc.
// Use in worklets or useDerivedValue/useAnimatedStyle:
const style = useAnimatedStyle(() => ({
  opacity: candle.value.close === -1 ? 0 : 1,
}));
```

The candle shared value only updates when the crosshair crosses a candle boundary — not on every gesture frame. This makes it efficient for building custom displays.

#### Returns

| Type | Description |
|---|---|
| `SharedValue<TCandle>` | `{ timestamp, open, high, low, close }` — all `-1` when inactive |

#### Example: Bullish/bearish indicator

```jsx
function BullBearIndicator() {
  const candle = CandlestickChart.useCandleData();

  const style = useAnimatedStyle(() => {
    const isBullish = candle.value.close > candle.value.open;
    return {
      backgroundColor: candle.value.close === -1
        ? 'gray'
        : isBullish ? '#10b981' : '#ef4444',
      width: 20,
      height: 20,
      borderRadius: 10,
    };
  });

  return <Animated.View style={style} />;
}
```

---

### CandlestickChart.usePrice

Returns the current price as shared values. The `type` prop determines which value is returned.

```jsx
// Crosshair price (interpolated from Y position — updates every frame)
const { value, formatted } = CandlestickChart.usePrice();

// OHLC price (from candle data — updates on boundary crossing only)
const { value, formatted } = CandlestickChart.usePrice({ type: 'close' });
```

#### Arguments

| Argument | Type | Default | Description |
|---|---|---|---|
| `type` | `"crosshair" \| "open" \| "high" \| "low" \| "close"` | `"crosshair"` | Which price to return |
| `precision` | `number` | `2` | Decimal places |
| `format` | `({ value, formatted }) => string` | | Custom format worklet |

#### Returns

| Variable | Type | Description |
|---|---|---|
| `value` | `SharedValue<string>` | Raw price string |
| `formatted` | `SharedValue<string>` | Formatted price string |

#### Performance

- **`type="crosshair"`** — depends on `currentY`, which changes every gesture frame. Each instance runs `getPrice()` to interpolate the Y position to a price value.
- **`type="open"` / `"high"` / `"low"` / `"close"`** — depends on the shared `candle` value, which only changes when the crosshair crosses a candle boundary. Much cheaper.

See the [Performance Guide](./performance.md) for optimization tips.

---

### CandlestickChart.useDatetime

Returns the timestamp of the candle under the crosshair.

```jsx
const { value, formatted } = CandlestickChart.useDatetime({
  locale: 'en-AU',
  options: { year: 'numeric', month: 'short', day: 'numeric' },
});
```

#### Arguments

| Argument | Type | Default | Description |
|---|---|---|---|
| `format` | `({ value, formatted }) => string` | | Custom format worklet |
| `locale` | `string` | `"en-US"` | Locale for `toLocaleString()` |
| `options` | `Intl.DateTimeFormatOptions` | | Options for `toLocaleString()` |

#### Returns

| Variable | Type | Description |
|---|---|---|
| `value` | `SharedValue<string>` | Timestamp as string |
| `formatted` | `SharedValue<string>` | Formatted datetime string |

This hook depends on the shared `candle` value, so it only re-evaluates when the crosshair crosses a candle boundary.
