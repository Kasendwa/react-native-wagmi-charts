import React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Line, DashPathEffect, vec } from '@shopify/react-native-skia';

export type CandlestickChartLineProps = {
  color?: string;
  x: number;
  y: number;
  strokeWidth?: number;
  dashWidth?: number;
  dashGap?: number;
};

const ORIGIN = vec(0, 0);

export const CandlestickChartLine = React.memo(({
  color = 'gray',
  x,
  y,
  strokeWidth = 2,
  dashWidth = 6,
  dashGap = 6,
}: CandlestickChartLineProps) => {
  const p2 = React.useMemo(() => vec(x, y), [x, y]);
  const intervals = React.useMemo(() => [dashWidth, dashGap], [dashWidth, dashGap]);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Line
        p1={ORIGIN}
        p2={p2}
        strokeWidth={strokeWidth}
        color={color}
        style="stroke"
      >
        <DashPathEffect intervals={intervals} />
      </Line>
    </Canvas>
  );
});
