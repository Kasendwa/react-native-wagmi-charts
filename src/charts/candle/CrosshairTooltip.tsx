import React from 'react';
import type {
  LayoutChangeEvent,
  StyleProp,
  TextStyle,
  ViewProps,
} from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import type { SharedValue, AnimatedStyle } from 'react-native-reanimated';
import { CandlestickChartDimensionsContext } from './Chart';
import { useCandlestickChart } from './useCandlestickChart';
import {
  CandlestickChartPriceText,
  CandlestickChartPriceTextProps,
} from './PriceText';

export type CandlestickChartCrosshairTooltipProps = ViewProps & {
  children?: React.ReactNode;
  xGutter?: number;
  yGutter?: number;
  tooltipTextProps?: CandlestickChartPriceTextProps;
  textStyle?: AnimatedStyle<StyleProp<TextStyle>>;
};

export type CandlestickChartCrosshairTooltipContext = {
  position: SharedValue<'left' | 'right'>;
};

export const CandlestickChartCrosshairTooltipContext =
  React.createContext<CandlestickChartCrosshairTooltipContext>({
    position: {
      value: 'left',
    } as CandlestickChartCrosshairTooltipContext['position'],
  });

export function CandlestickChartCrosshairTooltip({
  children,
  xGutter = 8,
  yGutter = 8,
  tooltipTextProps,
  textStyle,
  ...props
}: CandlestickChartCrosshairTooltipProps) {
  const { width, height } = React.useContext(CandlestickChartDimensionsContext);
  const { currentY } = useCandlestickChart();
  const { position } = React.useContext(
    CandlestickChartCrosshairTooltipContext
  );

  const elementHeight = useSharedValue(0);
  const elementWidth = useSharedValue(0);

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      elementHeight.value = event.nativeEvent.layout.height;
      elementWidth.value = event.nativeEvent.layout.width;
    },
    [elementHeight, elementWidth]
  );

  // Single tooltip that repositions based on crosshair position.
  // Previously rendered 2 tooltips (left + right) and hid one with opacity,
  // which doubled the worklet count (2× useAnimatedStyle + 2× PriceText).
  const tooltipStyle = useAnimatedStyle(
    () => {
      const left = position.value === 'left'
        ? xGutter
        : width - elementWidth.value - xGutter;

      let topOffset = 0;
      if (currentY.value < elementHeight.value / 2 + yGutter) {
        topOffset = currentY.value - (elementHeight.value / 2 + yGutter);
      } else if (currentY.value + elementHeight.value / 2 > height - yGutter) {
        topOffset = currentY.value + elementHeight.value / 2 - height + yGutter;
      }

      return {
        left,
        top: -(elementHeight.value / 2) - topOffset,
      };
    },
    [currentY, elementHeight, elementWidth, height, position, width, xGutter, yGutter]
  );

  return (
    <Animated.View
      onLayout={handleLayout}
      {...props}
      style={[styles.tooltip, tooltipStyle, props.style]}
    >
      {children || (
        <CandlestickChartPriceText
          {...tooltipTextProps}
          style={[styles.text, tooltipTextProps?.style, textStyle]}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    backgroundColor: 'white',
    position: 'absolute',
    display: 'flex',
    padding: 4,
  },
  text: {
    fontSize: 14,
  },
});
