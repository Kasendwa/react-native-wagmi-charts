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

export const CandlestickChartLine = ({
  color = 'gray',
  x,
  y,
  strokeWidth = 2,
  dashWidth = 6,
  dashGap = 6,
}: CandlestickChartLineProps) => {
  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <Line
        p1={vec(0, 0)}
        p2={vec(x, y)}
        strokeWidth={strokeWidth}
        color={color}
        style="stroke"
      >
        <DashPathEffect intervals={[dashWidth, dashGap]} />
      </Line>
    </Canvas>
  );
};
