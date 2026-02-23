# react-native-wagmi-charts

> **Beta Release (v3.0.0-beta)** — This is a pre-release version. The API is stable but may receive minor adjustments based on community feedback before the final v3.0.0 release. Please [report any issues](https://github.com/coinjar/react-native-wagmi-charts/issues) you encounter.

A sweet & simple chart library for React Native that will make us feel like **W**e're **A**ll **G**onna **M**ake **I**t

**New to v3?** Read the [Motivation & What's New](./motivation.md) to understand why we rebuilt on Skia and what problems it solves.

## Features

- **Line charts & candlestick charts** with smooth 60fps interactions
- **Interactive price & date/time labels** that update in real-time
- **Built with composability in mind** — mix and match components
- **Highly customizable APIs** — colors, formatters, cursors, tooltips
- **Powered by [@shopify/react-native-skia](https://shopify.github.io/react-native-skia/)** & React Native Reanimated
- **Slick data transition animations** between datasets
- **Interactive tooltips** that follow your cursor

## Documentation

| Document | Description |
|---|---|
| [Motivation & What's New](./motivation.md) | Why we rebuilt on Skia, problems solved, and expected benefits |
| [Line Chart](./line-chart.md) | Guides, examples, and API reference for line charts |
| [Candlestick Chart](./candlestick-chart.md) | Guides, examples, and API reference for candlestick charts |
| [Hooks](./hooks.md) | All available hooks with usage examples |
| [Performance](./performance.md) | Architecture deep-dive, optimization tips, and best practices |
| [Migration Guide (v2 → v3)](./migration-v2-to-v3.md) | Breaking changes and upgrade instructions |

## Install

```bash
npm install react-native-wagmi-charts
```

WAGMI charts depends on a few peer libraries. Install these if you don't already have them:

```bash
npm install @shopify/react-native-skia react-native-reanimated react-native-gesture-handler react-native-worklets
```

> **Note:** v3 uses `@shopify/react-native-skia` for rendering instead of `react-native-svg`. If you are upgrading from v2, see the [Migration Guide](./migration-v2-to-v3.md).

### Compatibility

Minimum supported versions (driven primarily by `react-native-reanimated` v4 and `@shopify/react-native-skia`):

| Dependency | Minimum Version |
|---|---|
| React | 19.0 |
| React Native | 0.78 |
| react-native-reanimated | 4.0.0 |
| react-native-worklets | 0.7.0 |
| @shopify/react-native-skia | 2.0.0 |
| react-native-gesture-handler | 2.x |
| Node.js | 18.0 |

## Quick Start

### Line Chart

```jsx
import { LineChart } from 'react-native-wagmi-charts';

const data = [
  { timestamp: 1625945400000, value: 33575.25 },
  { timestamp: 1625946300000, value: 33545.25 },
  { timestamp: 1625947200000, value: 33510.25 },
  { timestamp: 1625948100000, value: 33215.25 },
];

function MyLineChart() {
  return (
    <LineChart.Provider data={data}>
      <LineChart>
        <LineChart.Path />
      </LineChart>
    </LineChart.Provider>
  );
}
```

Add an interactive cursor and tooltip:

```jsx
function MyInteractiveLineChart() {
  return (
    <LineChart.Provider data={data}>
      <LineChart>
        <LineChart.Path color="blue" />
        <LineChart.CursorCrosshair color="blue">
          <LineChart.Tooltip />
        </LineChart.CursorCrosshair>
      </LineChart>
      <LineChart.PriceText />
      <LineChart.DatetimeText />
    </LineChart.Provider>
  );
}
```

### Candlestick Chart

```jsx
import { CandlestickChart } from 'react-native-wagmi-charts';

const data = [
  { timestamp: 1625945400000, open: 33575.25, high: 33600.52, low: 33475.12, close: 33520.11 },
  { timestamp: 1625946300000, open: 33545.25, high: 33560.52, low: 33510.12, close: 33520.11 },
  { timestamp: 1625947200000, open: 33510.25, high: 33515.52, low: 33250.12, close: 33250.11 },
  { timestamp: 1625948100000, open: 33215.25, high: 33430.52, low: 33215.12, close: 33420.11 },
];

function MyCandlestickChart() {
  return (
    <CandlestickChart.Provider data={data}>
      <CandlestickChart>
        <CandlestickChart.Candles />
        <CandlestickChart.Crosshair>
          <CandlestickChart.Tooltip />
        </CandlestickChart.Crosshair>
      </CandlestickChart>
      <CandlestickChart.PriceText type="open" />
      <CandlestickChart.PriceText type="close" />
      <CandlestickChart.DatetimeText />
    </CandlestickChart.Provider>
  );
}
```

## Web Support

Web support is currently experimental. Path transitions may flicker on Web — disable them with:

```tsx
import { Platform } from 'react-native';

<LineChart.Path
  pathProps={{ isTransitionEnabled: Platform.OS !== 'web' }}
/>
```

## Credits

This library wouldn't be possible if it weren't for:

- [Rainbow's Animated Charts](https://github.com/rainbow-me/react-native-animated-charts)
- @wcandillon and his [Can It Be Done In React Native](https://www.youtube.com/wcandillon) series
