import React from 'react';
import { StyleSheet, ViewProps } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureStateChangeEvent,
  LongPressGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  AnimatedProps,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { clamp } from 'react-native-redash';

import { CandlestickChartDimensionsContext } from './Chart';
import { CandlestickChartLine, CandlestickChartLineProps } from './Line';
import { useCandlestickChart } from './useCandlestickChart';
import { CandlestickChartCrosshairTooltipContext } from './CrosshairTooltip';

/**
 * Threshold in pixels from the left edge of the chart. When the cursor is
 * within this distance, the tooltip will be positioned on the right side.
 */
const TOOLTIP_POSITION_THRESHOLD = 100;

type CandlestickChartCrosshairProps = {
  color?: string;
  children?: React.ReactNode;
  onCurrentXChange?: (value: number) => unknown;
  horizontalCrosshairProps?: AnimatedProps<ViewProps>;
  verticalCrosshairProps?: AnimatedProps<ViewProps>;
  lineProps?: Partial<CandlestickChartLineProps>;
  minDurationMs?: number;
};

const EMPTY_ANIMATED_PROPS = {};
const EMPTY_LINE_PROPS = {};

export function CandlestickChartCrosshair({
  color,
  onCurrentXChange,
  children,
  horizontalCrosshairProps = EMPTY_ANIMATED_PROPS,
  verticalCrosshairProps = EMPTY_ANIMATED_PROPS,
  lineProps = EMPTY_LINE_PROPS,
  minDurationMs = 0,
}: CandlestickChartCrosshairProps) {
  const { width, height } = React.useContext(CandlestickChartDimensionsContext);
  const { currentX, currentY, currentIndex, step } = useCandlestickChart();
  const tooltipPosition = useSharedValue<'left' | 'right'>('left');
  const opacity = useSharedValue(0);

  // Memoize gesture to prevent re-registration on every render
  const longPressGesture = React.useMemo(
    () =>
      Gesture.LongPress()
        .minDuration(minDurationMs)
        .maxDistance(999999)
        .onStart(
          (event: GestureStateChangeEvent<LongPressGestureHandlerEventPayload>) => {
            'worklet';
            opacity.value = 1;
            const boundedX = event.x <= width - 1 ? event.x : width - 1;
            const newPos = boundedX < TOOLTIP_POSITION_THRESHOLD ? 'right' : 'left';
            if (tooltipPosition.value !== newPos) {
              tooltipPosition.value = newPos;
            }
            const newY = clamp(event.y, 0, height);
            if (currentY.value !== newY) currentY.value = newY;
            const newX = boundedX - (boundedX % step) + step / 2;
            if (currentX.value !== newX) currentX.value = newX;
            const newIdx = Math.floor(boundedX / step);
            if (currentIndex.value !== newIdx) currentIndex.value = newIdx;
          }
        )
        .onTouchesMove((event) => {
          'worklet';
          if (
            opacity.value === 1 &&
            event.allTouches.length > 0 &&
            event.allTouches[0]
          ) {
            const x = event.allTouches[0].x;
            const y = event.allTouches[0].y;
            const boundedX = x <= width - 1 ? x : width - 1;
            const newPos = boundedX < TOOLTIP_POSITION_THRESHOLD ? 'right' : 'left';
            if (tooltipPosition.value !== newPos) {
              tooltipPosition.value = newPos;
            }
            const newY = clamp(y, 0, height);
            if (currentY.value !== newY) currentY.value = newY;
            const newX = boundedX - (boundedX % step) + step / 2;
            if (currentX.value !== newX) currentX.value = newX;
            const newIdx = Math.floor(boundedX / step);
            if (currentIndex.value !== newIdx) currentIndex.value = newIdx;
          }
        })
        .onEnd(() => {
          'worklet';
          opacity.value = 0;
          currentY.value = -1;
          currentX.value = -1;
          currentIndex.value = -1;
        }),
    [minDurationMs, width, height, step, currentX, currentY, currentIndex, opacity, tooltipPosition]
  );

  const horizontal = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
      transform: [{ translateY: currentY.value }],
    }),
    [opacity, currentY]
  );

  const vertical = useAnimatedStyle(
    () => ({
      opacity: opacity.value,
      transform: [{ translateX: currentX.value }],
    }),
    [opacity, currentX]
  );

  // Fire onCurrentXChange only when the cursor crosses a candle boundary
  // (currentIndex change), not on every currentX pixel change. This prevents
  // scheduleOnRN from bouncing to JS thread ~60×/sec for haptic feedback etc.
  useAnimatedReaction(
    () => currentIndex.value,
    (idx, prevIdx) => {
      if (idx !== -1 && idx !== prevIdx && onCurrentXChange) {
        scheduleOnRN(onCurrentXChange, currentX.value);
      }
    },
    [currentIndex, currentX]
  );

  // Memoize context value to prevent re-renders of tooltip children
  const tooltipContextValue = React.useMemo(
    () => ({ position: tooltipPosition }),
    [tooltipPosition]
  );

  return (
    <GestureDetector gesture={longPressGesture}>
      <Animated.View style={StyleSheet.absoluteFill}>
        <Animated.View
          style={[StyleSheet.absoluteFill, vertical]}
          {...verticalCrosshairProps}
        >
          <CandlestickChartLine color={color} x={0} y={height} {...lineProps} />
        </Animated.View>
        <Animated.View
          style={[StyleSheet.absoluteFill, horizontal]}
          {...horizontalCrosshairProps}
        >
          <CandlestickChartLine color={color} x={width} y={0} {...lineProps} />
          <CandlestickChartCrosshairTooltipContext.Provider
            value={tooltipContextValue}
          >
            {children}
          </CandlestickChartCrosshairTooltipContext.Provider>
        </Animated.View>
      </Animated.View>
    </GestureDetector>
  );
}
