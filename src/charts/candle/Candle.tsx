import React from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  useAnimatedReaction,
} from 'react-native-reanimated';
import {
  Line,
  Rect,
} from '@shopify/react-native-skia';

import type { TCandle, TDomain } from './types';
import { getY, getHeight } from './utils';

export type CandlestickChartCandleProps = {
  candle: TCandle;
  domain: TDomain;
  maxHeight: number;
  margin?: number;
  positiveColor?: string;
  negativeColor?: string;
  index: number;
  width: number;
  useAnimations?: boolean;
  renderRect?: (renderRectOptions: {
    x: number;
    y: number;
    width: number;
    height: number;
    color: string;
    useAnimations: boolean;
    candle: TCandle;
  }) => React.ReactNode;
  renderLine?: (renderLineOptions: {
    p1: { x: number; y: number };
    p2: { x: number; y: number };
    color: string;
    strokeWidth: number;
    useAnimations: boolean;
    candle: TCandle;
  }) => React.ReactNode;
};

export const CandlestickChartCandle = ({
  candle,
  maxHeight,
  domain,
  margin = 2,
  positiveColor = '#10b981',
  negativeColor = '#ef4444',
  index,
  width,
  useAnimations = true,
  renderLine,
  renderRect,
}: CandlestickChartCandleProps) => {
  const { close, open, high, low } = candle;
  const isPositive = close > open;
  const fill = isPositive ? positiveColor : negativeColor;
  const x = index * width;
  const max = Math.max(open, close);
  const min = Math.min(open, close);

  // Target values
  const targetLineX = x + width / 2;
  const targetLowY = getY({ maxHeight, value: low, domain });
  const targetHighY = getY({ maxHeight, value: high, domain });
  const targetRectX = x + margin;
  const targetRectY = getY({ maxHeight, value: max, domain });
  const targetRectH = getHeight({ maxHeight, value: max - min, domain });

  // Animated shared values
  const lineX = useSharedValue(targetLineX);
  const lowY = useSharedValue(targetLowY);
  const highY = useSharedValue(targetHighY);
  const animRectX = useSharedValue(targetRectX);
  const animRectY = useSharedValue(targetRectY);
  const animRectH = useSharedValue(targetRectH);

  useAnimatedReaction(
    () => ({
      targetLineX,
      targetLowY,
      targetHighY,
      targetRectX,
      targetRectY,
      targetRectH,
    }),
    (curr) => {
      if (useAnimations) {
        lineX.value = withTiming(curr.targetLineX);
        lowY.value = withTiming(curr.targetLowY);
        highY.value = withTiming(curr.targetHighY);
        animRectX.value = withTiming(curr.targetRectX);
        animRectY.value = withTiming(curr.targetRectY);
        animRectH.value = withTiming(curr.targetRectH);
      } else {
        lineX.value = curr.targetLineX;
        lowY.value = curr.targetLowY;
        highY.value = curr.targetHighY;
        animRectX.value = curr.targetRectX;
        animRectY.value = curr.targetRectY;
        animRectH.value = curr.targetRectH;
      }
    },
    [targetLineX, targetLowY, targetHighY, targetRectX, targetRectY, targetRectH, useAnimations]
  );

  const lineP1 = useDerivedValue(() => ({ x: lineX.value, y: lowY.value }));
  const lineP2 = useDerivedValue(() => ({ x: lineX.value, y: highY.value }));

  if (renderLine || renderRect) {
    const lineProps = {
      p1: { x: targetLineX, y: targetLowY },
      p2: { x: targetLineX, y: targetHighY },
      color: fill,
      strokeWidth: 1,
      useAnimations,
      candle,
    };
    const rectPropsCustom = {
      x: targetRectX,
      y: targetRectY,
      width: width - margin * 2,
      height: targetRectH,
      color: fill,
      useAnimations,
      candle,
    };

    return (
      <>
        {renderLine ? renderLine(lineProps) : (
          <Line p1={lineP1} p2={lineP2} color={fill} strokeWidth={1} style="stroke" />
        )}
        {renderRect ? renderRect(rectPropsCustom) : (
          <Rect x={animRectX} y={animRectY} width={width - margin * 2} height={animRectH} color={fill} />
        )}
      </>
    );
  }

  return (
    <>
      <Line p1={lineP1} p2={lineP2} color={fill} strokeWidth={1} style="stroke" />
      <Rect x={animRectX} y={animRectY} width={width - margin * 2} height={animRectH} color={fill} />
    </>
  );
};
