import React from 'react';

import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
  AnimatedProps,
} from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { LineChartPriceText, LineChartPriceTextProps } from './PriceText';

import { CursorContext } from './Cursor';
import { LineChartDimensionsContext } from './Chart';
import type { LayoutChangeEvent, ViewProps } from 'react-native';
import { getXPositionForCurve } from './utils/getXPositionForCurve';
import { getYForX } from 'react-native-redash';
import { useCurrentY } from './useCurrentY';
import { useLineChart } from './useLineChart';
import { useMemo } from 'react';
import type { TFormatterFn } from '../../types';

export type LineChartTooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type LineChartTooltipProps = AnimatedProps<ViewProps> & {
  children?: React.ReactNode;
  format?: TFormatterFn<string>;
  xGutter?: number;
  yGutter?: number;
  cursorGutter?: number;
  position?: LineChartTooltipPosition;
  withHorizontalFloating?: boolean;
  textProps?: LineChartPriceTextProps;
  textStyle?: LineChartPriceTextProps['style'];
  /**
   * When specified the tooltip is considered static, and will
   * always be rendered at the given index, unless there is interaction
   * with the chart (like interacting with a cursor).
   *
   * @default undefined
   */
  at?: number;
};

LineChartTooltip.displayName = 'LineChartTooltip';

export function LineChartTooltip({
  children,
  format,
  xGutter = 8,
  yGutter = 8,
  cursorGutter = 48,
  position = 'top',
  withHorizontalFloating = false,
  textProps,
  textStyle,
  at,
  ...props
}: LineChartTooltipProps) {
  const { width, height, parsedPath } = React.useContext(
    LineChartDimensionsContext
  );
  const { type } = React.useContext(CursorContext);
  const { currentX, isActive } = useLineChart();
  const currentY = useCurrentY();

  const elementWidth = useSharedValue(0);
  const elementHeight = useSharedValue(0);

  const handleLayout = React.useCallback(
    (event: LayoutChangeEvent) => {
      elementWidth.value = event.nativeEvent.layout.width;
      elementHeight.value = event.nativeEvent.layout.height;
    },
    [elementHeight, elementWidth]
  );

  // When the user set a `at` index, get the index's y & x positions
  const atXPosition = useMemo(
    () =>
      at !== null && at !== undefined
        ? getXPositionForCurve(parsedPath, at)
        : undefined,
    [at, parsedPath]
  );

  const atYPosition = useDerivedValue(() => {
    return atXPosition == null
      ? undefined
      : getYForX(parsedPath, atXPosition) ?? 0;
  }, [atXPosition]);

  const getInitialTranslateXOffset = React.useCallback(
    (elementWidth: number) => {
      'worklet';
      if (position === 'right') return elementWidth + cursorGutter;
      if (position === 'left') return -cursorGutter;
      return elementWidth / 2;
    },
    [cursorGutter, position]
  );

  /**
   * Helper function to calculate the X translation offset based on position
   * and boundary constraints
   */
  const calculateXTranslateOffset = React.useCallback(
    (
      _position: LineChartTooltipPosition,
      x: number,
      _elementWidth: number,
      _width: number,
      _xGutter: number,
      _cursorGutter: number,
      _withHorizontalFloating: boolean,
    ) => {
      'worklet';
      let translateXOffset = getInitialTranslateXOffset(_elementWidth);
      const elementFullWidth = _elementWidth + _xGutter + _cursorGutter;

      if (_position === 'right') {
        if (x < elementFullWidth) {
          translateXOffset = _withHorizontalFloating
            ? -_cursorGutter
            : translateXOffset - elementFullWidth + x;
        }
      } else if (_position === 'left') {
        if (x > _width - elementFullWidth) {
          translateXOffset = _withHorizontalFloating
            ? _elementWidth + _cursorGutter
            : translateXOffset + (x - (_width - elementFullWidth));
        }
      } else {
        // Center position
        if (x < _elementWidth / 2 + _xGutter) {
          translateXOffset -= _elementWidth / 2 + _xGutter - x;
        }
        if (x > _width - _elementWidth / 2 - _xGutter) {
          translateXOffset += x - (_width - _elementWidth / 2 - _xGutter);
        }
      }

      return translateXOffset;
    },
    [getInitialTranslateXOffset]
  );

  /**
   * Helper function to calculate the Y translation offset based on position and
   * boundary constraints
   */
  const calculateYTranslateOffset = React.useCallback(
    (
      _position: LineChartTooltipPosition,
      y: number,
      _elementHeight: number,
      _height: number,
      _yGutter: number,
      _cursorGutter: number,
    ) => {
      'worklet';
      let translateYOffset = 0;

      if (_position === 'top') {
        translateYOffset = _elementHeight / 2 + _cursorGutter;
        if (y - translateYOffset < _yGutter) {
          translateYOffset = y - _yGutter;
        }
      } else if (_position === 'bottom') {
        translateYOffset = -(_elementHeight / 2) - _cursorGutter / 2;
        if (y - translateYOffset + _elementHeight > _height - _yGutter) {
          translateYOffset = y - (_height - _yGutter) + _elementHeight;
        }
      } else if (_position === 'right' || _position === 'left') {
        translateYOffset = _elementHeight / 2;
      }

      return translateYOffset;
    },
    []
  );

  const animatedCursorStyle = useAnimatedStyle(() => {
    // the tooltip is considered static when the user specified an `at` prop
    const isStatic = atYPosition.value != null;

    // Calculate X position:
    const x = atXPosition ?? currentX.value;
    const translateXOffset = calculateXTranslateOffset(
      position, x, elementWidth.value, width, xGutter, cursorGutter, withHorizontalFloating,
    );
    const translateX = x - translateXOffset;

    // Calculate Y position:
    const y = atYPosition.value ?? currentY.value;
    const translateYOffset = calculateYTranslateOffset(
      position, y, elementHeight.value, height, yGutter, cursorGutter,
    );

    // Determine final translateY value
    let translateY: number;
    if (type === 'crosshair' || isStatic) {
      translateY = y - translateYOffset;
    } else {
      translateY =
        position === 'top' ? yGutter : height - elementHeight.value - yGutter;
    }

    // Calculate opacity
    let opacity = isActive.value ? 1 : 0;
    if (isStatic) {
      // Only show static when there is no active cursor
      opacity = withTiming(isActive.value ? 0 : 1);
    }

    return {
      transform: [{ translateX }, { translateY }],
      opacity: opacity,
    };
  }, [
    atXPosition,
    atYPosition,
    calculateXTranslateOffset,
    calculateYTranslateOffset,
    currentX,
    currentY,
    cursorGutter,
    elementHeight,
    elementWidth,
    height,
    isActive,
    position,
    type,
    width,
    withHorizontalFloating,
    xGutter,
    yGutter,
  ]);

  return (
    <Animated.View
      onLayout={handleLayout}
      {...props}
      style={[styles.tooltip, animatedCursorStyle, props.style]}
    >
      {children || (
        <LineChartPriceText
          format={format}
          index={at}
          style={[textStyle]}
          {...textProps}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  tooltip: {
    position: 'absolute',
    padding: 4,
    alignSelf: 'flex-start',
  },
});
