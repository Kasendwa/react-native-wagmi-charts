import React from 'react';
import { StyleSheet, type TextStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { Canvas, Line, DashPathEffect } from '@shopify/react-native-skia';

import type { TFormatterFn } from '../../types';
import { AnimatedText } from '../../components/AnimatedText';
import { LineChartDimensionsContext } from './Chart';
import { LineChartCursor, type LineChartCursorProps } from './Cursor';
import { useCurrentY } from './useCurrentY';
import { useLineChartDatetime } from './useDatetime';
import { useLineChart } from './useLineChart';
import { useLineChartPrice } from './usePrice';

type LineChartCursorLineProps = {
  children?: React.ReactNode;
  color?: string;
  strokeWidth?: number;
  dashWidth?: number;
  dashGap?: number;
  format?: TFormatterFn<string | number>;
  textStyle?: TextStyle;
  persistOnEnd?: boolean;
} & Omit<LineChartCursorProps, 'type' | 'children'>;

LineChartCursorLine.displayName = 'LineChartCursorLine';

const TEXT_CONSTANTS = {
  DEFAULT_COLOR: '#1A1E27',
  DEFAULT_FONT_SIZE: 12,
  CHAR_WIDTH_RATIO: 0.6,
  MIN_WIDTH: 25,
  MAX_WIDTH: 150,
  INPUT_PADDING: 4,
} as const;

const SPACING = {
  VERTICAL_TEXT_OFFSET: 40,
  HORIZONTAL_TEXT_MARGIN: 8,
  HORIZONTAL_RIGHT_MARGIN: 16,
  BASE_LINE_GAP: 8,
  X_AXIS_LABEL_RESERVED_HEIGHT: 40, // Reserved space at bottom for x-axis labels
} as const;

export function LineChartCursorLine({
  children,
  color = 'gray',
  strokeWidth = 2,
  dashWidth = 3,
  dashGap = 3,
  format,
  textStyle,
  ...cursorProps
}: LineChartCursorLineProps) {
  const isHorizontal = cursorProps?.orientation === 'horizontal';
  const { height, width } = React.useContext(LineChartDimensionsContext);
  const { currentX, isActive } = useLineChart();
  const currentY = useCurrentY();

  const price = useLineChartPrice({
    format: isHorizontal ? (format as TFormatterFn<string>) : undefined,
    precision: 2,
  });

  const datetime = useLineChartDatetime({
    format: !isHorizontal ? (format as TFormatterFn<number>) : undefined,
  });

  const displayText = isHorizontal ? price.formatted : datetime.formatted;

  const calculateTextWidth = (text: string, fontSize: number) => {
    'worklet';
    const charWidth = fontSize * TEXT_CONSTANTS.CHAR_WIDTH_RATIO;
    const calculatedWidth = text.length * charWidth;
    return Math.max(
      TEXT_CONSTANTS.MIN_WIDTH,
      Math.min(TEXT_CONSTANTS.MAX_WIDTH, calculatedWidth)
    );
  };

  const textWidth = useDerivedValue(() => {
    const text = displayText.value;
    if (!text) return TEXT_CONSTANTS.MIN_WIDTH;

    const fontSize = textStyle?.fontSize || TEXT_CONSTANTS.DEFAULT_FONT_SIZE;
    return calculateTextWidth(text, fontSize);
  }, [displayText, textStyle?.fontSize]);

  const lineEnd = useDerivedValue(() => {
    if (isHorizontal) {
      const fontSize = textStyle?.fontSize || TEXT_CONSTANTS.DEFAULT_FONT_SIZE;
      const gap = Math.max(SPACING.BASE_LINE_GAP, fontSize * 0.5);
      return {
        x: width -
          textWidth.value -
          gap -
          TEXT_CONSTANTS.INPUT_PADDING -
          SPACING.HORIZONTAL_RIGHT_MARGIN,
        y: 0,
      };
    }
    // For vertical cursor, extend line to the chart area (excluding reserved label space)
    return { x: 0, y: height - SPACING.X_AXIS_LABEL_RESERVED_HEIGHT };
  });

  const containerStyle = useAnimatedStyle(() => ({
    opacity: isActive.value ? 1 : 0,
    height: '100%',
    transform: isHorizontal
      ? [{ translateY: currentY.value }]
      : [{ translateX: currentX.value }],
  }));

  // Pre-compute all static style properties outside the worklet
  const fontSize = textStyle?.fontSize || TEXT_CONSTANTS.DEFAULT_FONT_SIZE;
  const lineHeight = textStyle?.lineHeight || fontSize * 1.2;
  const textColor = textStyle?.color || TEXT_CONSTANTS.DEFAULT_COLOR;

  const staticBaseStyle = React.useMemo(
    () => ({
      position: 'absolute' as const,
      fontSize,
      lineHeight,
      color: textColor,
      ...textStyle,
    }),
    [fontSize, lineHeight, textColor, textStyle]
  );

  // Pre-compute static values for horizontal layout
  const horizontalTextCenterOffset = React.useMemo(() => {
    const fontSizeAdjustment = Math.max(0.6, Math.min(0.8, 0.7 + (fontSize - 12) * 0.01));
    return -(lineHeight * fontSizeAdjustment);
  }, [fontSize, lineHeight]);

  // Pre-compute static value for vertical layout
  const verticalLabelTop = height - SPACING.X_AXIS_LABEL_RESERVED_HEIGHT + SPACING.HORIZONTAL_TEXT_MARGIN;

  const textPositionStyle = useAnimatedStyle(() => {
    if (isHorizontal) {
      return {
        ...staticBaseStyle,
        width: textWidth.value,
        left:
          width -
          textWidth.value -
          SPACING.HORIZONTAL_RIGHT_MARGIN +
          TEXT_CONSTANTS.INPUT_PADDING,
        top: horizontalTextCenterOffset,
        textAlign: 'right' as const,
        paddingLeft: 0,
        paddingRight: 0,
      };
    }

    // For vertical cursor (x-axis label)
    const halfTextWidth = textWidth.value / 2;
    const containerX = currentX.value;

    let labelLeft = -halfTextWidth;
    if (containerX + labelLeft < 0) {
      labelLeft = -containerX;
    }
    if (containerX + labelLeft + textWidth.value > width) {
      labelLeft = width - containerX - textWidth.value;
    }

    return {
      ...staticBaseStyle,
      width: textWidth.value,
      left: labelLeft,
      top: verticalLabelTop,
      textAlign: 'center' as const,
    };
  });

  const lineStart = useSharedValue({ x: 0, y: 0 });

  return (
    <LineChartCursor {...cursorProps} type="line">
      <Animated.View style={containerStyle}>
        <Canvas style={styles.canvas}>
          <Line
            p1={lineStart}
            p2={lineEnd}
            strokeWidth={strokeWidth}
            color={color}
            style="stroke"
          >
            <DashPathEffect intervals={[dashWidth, dashGap]} />
          </Line>
        </Canvas>
        <AnimatedText text={displayText} style={textPositionStyle} />
      </Animated.View>
      {children}
    </LineChartCursor>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    height: '100%',
  },
});
