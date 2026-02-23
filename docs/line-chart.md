# Line Chart

> **Beta (v3.0.0-beta)** — API is stable but may receive minor adjustments before final release.

The line chart renders time-series data as a smooth curve with interactive cursors, tooltips, gradients, dots, and more.

## Table of Contents

- [Basic Usage](#basic-usage)
- [Guides](#guides)
  - [Interactive Cursors](#interactive-cursors)
  - [Interactive Labels](#interactive-labels)
  - [Interactive Tooltips](#interactive-tooltips)
  - [Static Tooltips](#static-tooltips)
  - [Haptic Feedback](#haptic-feedback)
  - [Colors](#colors)
  - [Gradients](#gradients)
  - [Dots](#dots)
  - [Path Highlighting](#path-highlighting)
  - [Horizontal Lines](#horizontal-lines)
  - [Axis](#axis)
  - [Customizing Size](#customizing-size)
  - [Customizing Labels](#customizing-labels)
  - [Customizing Tooltips](#customizing-tooltips)
  - [Hover (Web)](#hover-web)
  - [Multi-Line Charts](#multi-line-charts)
- [Component API](#component-api)
  - [LineChart.Provider](#linechartprovider)
  - [LineChart](#linechart)
  - [LineChart.Path](#linechartpath)
  - [LineChart.CursorCrosshair](#linechartcursorcrosshair)
  - [LineChart.CursorLine](#linechartcursorline)
  - [LineChart.Tooltip](#linecharttooltip)
  - [LineChart.PriceText](#linechartpricetext)
  - [LineChart.DatetimeText](#linechartdatetimetext)
  - [LineChart.Dot](#linechartdot)
  - [LineChart.Highlight](#linecharthighlight)
  - [LineChart.HorizontalLine](#linecharthorizontalline)
  - [LineChart.Gradient](#linechartgradient)
  - [LineChart.Axis](#linechartaxis)
  - [LineChart.HoverTrap](#linecharthovertrap)

---

## Basic Usage

```jsx
import { LineChart } from 'react-native-wagmi-charts';

const data = [
  { timestamp: 1625945400000, value: 33575.25 },
  { timestamp: 1625946300000, value: 33545.25 },
  { timestamp: 1625947200000, value: 33510.25 },
  { timestamp: 1625948100000, value: 33215.25 },
];

function MyChart() {
  return (
    <LineChart.Provider data={data}>
      <LineChart>
        <LineChart.Path />
      </LineChart>
    </LineChart.Provider>
  );
}
```

The three core components:

- **`LineChart.Provider`** — sets up data context
- **`LineChart`** — composes chart elements and measures dimensions
- **`LineChart.Path`** — renders the line

---

## Guides

### Interactive Cursors

#### Crosshair Cursor

A circular dot that follows the data point nearest to your finger:

```jsx
<LineChart.Provider data={data}>
  <LineChart>
    <LineChart.Path />
    <LineChart.CursorCrosshair />
  </LineChart>
</LineChart.Provider>
```

#### Line Cursor

A vertical dashed line with an optional label:

```jsx
<LineChart.Provider data={data}>
  <LineChart>
    <LineChart.Path />
    <LineChart.CursorLine />
  </LineChart>
</LineChart.Provider>
```

#### Snap to Point

Force the cursor to snap to the nearest data point (native only):

```jsx
<LineChart.CursorCrosshair snapToPoint />
```

#### Persist on End

Keep the cursor visible after the gesture ends:

```jsx
<LineChart.CursorCrosshair persistOnEnd />
```

#### Set Cursor Position Programmatically

Use the `at` prop to position the cursor at a specific data index:

```jsx
<LineChart.CursorCrosshair at={Math.floor(data.length / 2)} />
```

---

### Interactive Labels

Place `PriceText` and `DatetimeText` anywhere inside the `Provider` to show live values:

```jsx
<LineChart.Provider data={data}>
  <LineChart>
    <LineChart.Path />
    <LineChart.CursorCrosshair />
  </LineChart>
  <LineChart.PriceText />
  <LineChart.DatetimeText />
</LineChart.Provider>
```

---

### Interactive Tooltips

Nest a `Tooltip` inside a cursor to make it follow the cursor position:

```jsx
<LineChart.Provider data={data}>
  <LineChart>
    <LineChart.Path />
    <LineChart.CursorCrosshair>
      <LineChart.Tooltip />
    </LineChart.CursorCrosshair>
  </LineChart>
</LineChart.Provider>
```

Show both price and datetime tooltips:

```jsx
<LineChart.CursorCrosshair>
  <LineChart.Tooltip position="top" />
  <LineChart.Tooltip position="bottom">
    <LineChart.DatetimeText />
  </LineChart.Tooltip>
</LineChart.CursorCrosshair>
```

---

### Static Tooltips

Render a tooltip at a fixed data index using the `at` prop. It disappears when the user interacts with a cursor:

```jsx
<LineChart.Path>
  <LineChart.Tooltip at={3} />
</LineChart.Path>
```

---

### Haptic Feedback

Use cursor event handlers for haptic feedback on touch down/up:

```jsx
import * as haptics from 'expo-haptics';

function invokeHaptic() {
  haptics.impactAsync(haptics.ImpactFeedbackStyle.Light);
}

<LineChart.CursorCrosshair onActivated={invokeHaptic} onEnded={invokeHaptic}>
  <LineChart.Tooltip />
</LineChart.CursorCrosshair>
```

Or use `onCurrentIndexChange` on the Provider for haptics on every data point change:

```jsx
<LineChart.Provider data={data} onCurrentIndexChange={invokeHaptic}>
  {/* ... */}
</LineChart.Provider>
```

---

### Colors

#### Path Color

```jsx
<LineChart.Path color="hotpink" />
```

#### Cursor Color

```jsx
<LineChart.CursorCrosshair color="hotpink" />
```

---

### Gradients

Add a gradient fill under the path:

```jsx
<LineChart.Path color="red">
  <LineChart.Gradient />
</LineChart.Path>
```

The gradient inherits the path color. Override it:

```jsx
<LineChart.Gradient color="black" />
```

Fully custom gradient:

```jsx
<LineChart.Gradient
  colors={['rgba(255,0,0,0.3)', 'rgba(255,0,0,0.05)', 'rgba(255,0,0,0)']}
  positions={[0.2, 0.5, 1.0]}
/>
```

---

### Dots

Render a dot at a specific data index:

```jsx
<LineChart.Path>
  <LineChart.Dot color="red" at={10} />
</LineChart.Path>
```

Add an animated pulse:

```jsx
<LineChart.Dot color="red" at={10} hasPulse />
```

---

### Path Highlighting

Highlight a section of the path:

```jsx
<LineChart.Path>
  <LineChart.Highlight color="red" from={10} to={15} />
</LineChart.Path>
```

---

### Horizontal Lines

Render a static horizontal line at a data index:

```jsx
<LineChart.Path>
  <LineChart.HorizontalLine at={{ index: 0 }} />
</LineChart.Path>
```

Or at a specific y value:

```jsx
<LineChart.HorizontalLine at={{ value: 3027.84 }} />
```

---

### Axis

```jsx
<LineChart>
  <LineChart.Path />
  <LineChart.Axis position="left" orientation="vertical" />
</LineChart>
```

---

### Customizing Size

```jsx
<LineChart width={150} height={150}>
  <LineChart.Path />
</LineChart>
```

---

### Customizing Labels

#### Price Precision

```jsx
<LineChart.PriceText precision={4} />
```

#### Custom Price Format

```jsx
<LineChart.PriceText
  format={({ value, formatted }) => {
    'worklet';
    return `$${formatted} AUD`;
  }}
/>
```

#### Datetime Options

```jsx
<LineChart.DatetimeText
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
<LineChart.DatetimeText
  format={({ value, formatted }) => {
    'worklet';
    return `Date: ${formatted}`;
  }}
/>
```

---

### Customizing Tooltips

#### Style

```jsx
<LineChart.Tooltip
  textStyle={{
    backgroundColor: 'black',
    borderRadius: 4,
    color: 'white',
    fontSize: 18,
    padding: 4,
  }}
/>
```

#### Gutter

```jsx
<LineChart.Tooltip cursorGutter={60} xGutter={16} yGutter={16} />
```

- `cursorGutter` — spacing between cursor and tooltip
- `xGutter` / `yGutter` — chart edge padding the tooltip won't cross

---

### Hover (Web)

Trigger the cursor on hover (Web only):

```jsx
<LineChart.CursorCrosshair>
  <LineChart.HoverTrap />
</LineChart.CursorCrosshair>
```

---

### Multi-Line Charts

Pass a dictionary of datasets to render multiple lines:

```jsx
const multiData = {
  one: mockData1,
  two: mockData2,
};

<LineChart.Provider data={multiData}>
  <LineChart.Group>
    <LineChart id="one">
      <LineChart.Path color="blue" />
      <LineChart.CursorCrosshair>
        <LineChart.Tooltip />
      </LineChart.CursorCrosshair>
    </LineChart>
    <LineChart id="two">
      <LineChart.Path color="red">
        <LineChart.Gradient color="red" />
      </LineChart.Path>
      <LineChart.CursorCrosshair color="hotpink">
        <LineChart.Tooltip />
      </LineChart.CursorCrosshair>
    </LineChart>
  </LineChart.Group>
</LineChart.Provider>
```

---

## Component API

### LineChart.Provider

| Prop | Type | Default | Description |
|---|---|---|---|
| `data` | `TLineChartDataProp` | *required* | Array of `{ timestamp, value }` or dictionary of named arrays for multi-line |
| `yRange` | `{ min?: number; max?: number }` | | Custom y-axis range |
| `xDomain` | `[number, number]` | | Scale x values proportionate to time (non-uniform spacing) |
| `xLength` | `number` | `data.length` | Total x-axis length (use for partial-day charts) |
| `onCurrentIndexChange` | `(index: number) => void` | | Callback when the active data index changes |

### LineChart

| Prop | Type | Default | Description |
|---|---|---|---|
| `width` | `number` | Screen width | Chart width |
| `height` | `number` | Screen height | Chart height |
| `yGutter` | `number` | `16` | Y-axis padding (data won't exceed this) |
| `shape` | `CurveFactory` | `curveBumpX` | d3-shape curve function |
| `...props` | `ViewProps` | | Inherits React Native `View` props |

### LineChart.Path

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `"black"` | Line color |
| `width` | `number` | `3` | Line stroke width |
| `inactiveColor` | `string` | | Color when chart is inactive |
| `isTransitionEnabled` | `boolean` | `true` | Animate path changes between datasets |
| `animationDuration` | `number` | `300` | Transition animation duration (ms) |
| `animateOnMount` | `"foreground"` | | Animate the path drawing on mount |

### LineChart.CursorCrosshair

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `"black"` | Dot color |
| `size` | `number` | `8` | Inner dot size |
| `outerSize` | `number` | `32` | Outer (faded) dot size |
| `snapToPoint` | `boolean` | `false` | Snap to nearest data point (native only) |
| `persistOnEnd` | `boolean` | `false` | Keep cursor visible after gesture ends |
| `at` | `number` | | Programmatically set cursor to data index |
| `minDurationMs` | `number` | `0` | Minimum long-press duration before activation |
| `onActivated` | `() => void` | | Called when cursor activates |
| `onEnded` | `() => void` | | Called when cursor deactivates |
| `crosshairWrapperProps` | `ViewProps` | | Props for the wrapper view |
| `crosshairProps` | `ViewProps` | | Props for the inner dot |
| `crosshairOuterProps` | `ViewProps` | | Props for the outer dot |

### LineChart.CursorLine

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | `"gray"` | Line color |
| `strokeWidth` | `number` | `2` | Line stroke width |
| `dashWidth` | `number` | `3` | Dash segment width |
| `dashGap` | `number` | `3` | Gap between dashes |
| `format` | `TFormatterFn` | | Label format function |
| `textStyle` | `TextStyle` | | Label text style |
| `orientation` | `"horizontal" \| "vertical"` | `"vertical"` | Line orientation |
| `persistOnEnd` | `boolean` | `false` | Keep cursor visible after gesture ends |

### LineChart.Tooltip

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `"top" \| "bottom" \| "left" \| "right"` | `"top"` | Position relative to cursor |
| `xGutter` | `number` | `8` | X-axis edge padding |
| `yGutter` | `number` | `8` | Y-axis edge padding |
| `cursorGutter` | `number` | `48` | Spacing between cursor and tooltip |
| `withHorizontalFloating` | `boolean` | `false` | Flip left/right when hitting edge |
| `textStyle` | `StyleProp<TextStyle>` | | Tooltip text style |
| `textProps` | `PriceTextProps` | | Props passed to the inner PriceText |
| `at` | `number` | | Show static tooltip at data index |

### LineChart.PriceText

| Prop | Type | Default | Description |
|---|---|---|---|
| `format` | `({ value, formatted }) => string` | | Custom format worklet |
| `precision` | `number` | `2` | Decimal places |
| `variant` | `"formatted" \| "value"` | `"formatted"` | Display variant |
| `index` | `number` | | Show price for a specific data index |
| `style` | `StyleProp<TextStyle>` | | Text style |

### LineChart.DatetimeText

| Prop | Type | Default | Description |
|---|---|---|---|
| `format` | `({ value, formatted }) => string` | | Custom format worklet |
| `locale` | `string` | `"en-US"` | Locale for `toLocaleString()` |
| `options` | `Intl.DateTimeFormatOptions` | | Options for `toLocaleString()` |
| `variant` | `"formatted" \| "value"` | `"formatted"` | Display variant |
| `style` | `StyleProp<TextStyle>` | | Text style |

### LineChart.Dot

| Prop | Type | Default | Description |
|---|---|---|---|
| `at` | `number` | *required* | Data index |
| `color` | `string` | `"black"` | Dot color |
| `size` | `number` | `4` | Dot radius |
| `inactiveColor` | `string` | | Color when inactive |
| `showInactiveColor` | `boolean` | `true` | Show dot when inactive |
| `hasOuterDot` | `boolean` | `false` | Show outer circle |
| `hasPulse` | `boolean` | `false` | Animate a pulse |
| `outerSize` | `number` | `16` | Outer circle radius |
| `pulseBehaviour` | `"while-inactive" \| "always"` | `"while-inactive"` | When to pulse |
| `pulseDurationMs` | `number` | `800` | Pulse animation duration |
| `dotProps` | `CircleProps` | | Skia Circle props for inner dot |
| `outerDotProps` | `CircleProps` | | Skia Circle props for outer dot |

### LineChart.Highlight

| Prop | Type | Default | Description |
|---|---|---|---|
| `from` | `number` | *required* | Start data index |
| `to` | `number` | *required* | End data index |
| `color` | `string` | `"black"` | Highlight color |
| `inactiveColor` | `string` | | Color when inactive |
| `showInactiveColor` | `boolean` | `true` | Show when inactive |
| `width` | `number` | `3` | Stroke width |

### LineChart.HorizontalLine

| Prop | Type | Default | Description |
|---|---|---|---|
| `at` | `number \| { index: number } \| { value: number }` | `0` | Position of the line |
| `color` | `string` | `"gray"` | Line color |
| `strokeWidth` | `number` | `2` | Stroke width |
| `dashWidth` | `number` | `3` | Dash segment width |
| `dashGap` | `number` | `3` | Gap between dashes |
| `offsetY` | `number` | `0` | Pixel offset to nudge up/down |

### LineChart.Gradient

| Prop | Type | Default | Description |
|---|---|---|---|
| `color` | `string` | Path color | Gradient color (inherits from path) |
| `colors` | `string[]` | | Custom gradient color stops |
| `positions` | `number[]` | | Stop positions (0–1), must match `colors` length |

### LineChart.Axis

| Prop | Type | Default | Description |
|---|---|---|---|
| `position` | `"left" \| "right" \| "top" \| "bottom"` | | Axis position |
| `orientation` | `"vertical" \| "horizontal"` | | Axis orientation |
| `color` | `string` | `"#666"` | Line and tick color |
| `strokeWidth` | `number` | | Line stroke width |
| `tickCount` | `number` | `5` | Number of ticks |
| `domain` | `[number, number]` | `[0, 100]` | Axis domain |
| `hideOnInteraction` | `boolean` | `false` | Hide during cursor interaction |
| `format` | `(value: number) => string` | | Tick label formatter |
| `textStyle` | `StyleProp<TextStyle>` | | Tick label style |
| `labelPadding` | `number` | | Padding between labels and axis |

### LineChart.HoverTrap

No props. Place as a child of a cursor to enable hover-based activation on Web.

```jsx
<LineChart.CursorCrosshair>
  <LineChart.HoverTrap />
</LineChart.CursorCrosshair>
```
