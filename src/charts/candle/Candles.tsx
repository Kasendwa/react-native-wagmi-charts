import React from 'react';
import { Canvas, Line, Rect, vec } from '@shopify/react-native-skia';

import { CandlestickChartDimensionsContext } from './Chart';
import { CandlestickChartCandle, CandlestickChartCandleProps } from './Candle';
import { useCandlestickChart } from './useCandlestickChart';
import { getY, getHeight } from './utils';
import type { TDomain } from './types';

type CandleGeometry = {
  p1: { x: number; y: number };
  p2: { x: number; y: number };
  rectX: number;
  rectY: number;
  rectW: number;
  rectH: number;
  fill: string;
};

function computeCandles(
  data: CandlestickChartCandleProps['candle'][],
  step: number,
  maxHeight: number,
  domain: TDomain,
  margin: number,
  positiveColor: string,
  negativeColor: string,
): CandleGeometry[] {
  const result: CandleGeometry[] = new Array(data.length);
  for (let i = 0; i < data.length; i++) {
    const { close, open, high, low } = data[i]!;
    const isPositive = close > open;
    const x = i * step;
    const lineX = x + step / 2;
    const max = open > close ? open : close;
    const min = open < close ? open : close;
    result[i] = {
      p1: vec(lineX, getY(maxHeight, low, domain)),
      p2: vec(lineX, getY(maxHeight, high, domain)),
      rectX: x + margin,
      rectY: getY(maxHeight, max, domain),
      rectW: step - margin * 2,
      rectH: getHeight(maxHeight, max - min, domain),
      fill: isPositive ? positiveColor : negativeColor,
    };
  }
  return result;
}

type CandlestickChartCandlesProps = {
  margin?: CandlestickChartCandleProps['margin'];
  positiveColor?: CandlestickChartCandleProps['positiveColor'];
  negativeColor?: CandlestickChartCandleProps['negativeColor'];
  renderRect?: CandlestickChartCandleProps['renderRect'];
  renderLine?: CandlestickChartCandleProps['renderLine'];
  candleProps?: Partial<CandlestickChartCandleProps>;
  useAnimations?: boolean;
};

export function CandlestickChartCandles({
  positiveColor = '#10b981',
  negativeColor = '#ef4444',
  margin = 2,
  useAnimations = true,
  renderRect,
  renderLine,
  candleProps,
}: CandlestickChartCandlesProps) {
  const { width, height } = React.useContext(CandlestickChartDimensionsContext);
  const { data, domain, step } = useCandlestickChart();

  const hasCustomRenderers = !!(renderRect || renderLine);

  // Pre-compute all candle geometry + vec objects in a single pass.
  // The returned array is stable (memoized) and contains only plain objects —
  // no hooks, no components, no shared values. This means Skia's reconciler
  // only sees host elements (Line, Rect) with static props, so the Canvas
  // picture is recorded once and never re-recorded during gesture interaction.
  const candles = React.useMemo(() => {
    if (step <= 0 || data.length === 0 || hasCustomRenderers) return [];
    return computeCandles(data, step, height, domain, margin, positiveColor, negativeColor);
  }, [data, step, height, domain, margin, positiveColor, negativeColor, hasCustomRenderers]);

  const canvasStyle = React.useMemo(() => ({ width, height }), [width, height]);

  // Custom renderer fallback — uses per-candle components (slower but flexible)
  if (hasCustomRenderers) {
    return (
      <Canvas style={canvasStyle} opaque>
        {step > 0 &&
          data.map((candle, index) => (
            <CandlestickChartCandle
              key={index as React.Key}
              domain={domain}
              margin={margin}
              maxHeight={height}
              width={step}
              positiveColor={positiveColor}
              negativeColor={negativeColor}
              renderRect={renderRect}
              renderLine={renderLine}
              useAnimations={useAnimations}
              candle={candle}
              index={index}
              {...candleProps}
            />
          ))}
      </Canvas>
    );
  }

  // Fast path: render raw Skia host elements directly — no wrapper components,
  // no hooks inside Skia's reconciler. Each candle is 2 host elements (Line + Rect).
  return (
    <Canvas style={canvasStyle} opaque>
      {candles.map((c, i) => (
        <React.Fragment key={i}>
          <Line p1={c.p1} p2={c.p2} color={c.fill} strokeWidth={1} style="stroke" />
          <Rect x={c.rectX} y={c.rectY} width={c.rectW} height={c.rectH} color={c.fill} />
        </React.Fragment>
      ))}
    </Canvas>
  );
}
