import {
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { Line, DashPathEffect } from '@shopify/react-native-skia';

import React from 'react';
import { getXPositionForCurve } from './utils/getXPositionForCurve';
import { getYForX } from 'react-native-redash';
import type { Path } from 'react-native-redash';
import type { YDomain } from './types';

type HorizontalLineProps = {
  color?: string;
  strokeWidth?: number;
  dashWidth?: number;
  dashGap?: number;
  offsetY?: number;
  /**
   * (Optional) A pixel value to nudge the line up or down.
   *
   * This may be useful to customize the line's position based on the thickness of your cursor or chart path.
   *
   * ```tsx
   * <LineChart.HorizontalLine at={{ index: 3 }} />
   *
   * // or
   *
   * <LineChart.HorizontalLine at={{ value: 320.32 }} />
   * ```
   */
  at?:
    | {
        index: number;
        value?: never;
      }
    | {
        index?: never;
        value: number;
      }
    | number;
  /** @internal Injected by ChartPath */
  _width?: number;
  /** @internal Injected by ChartPath */
  _parsedPath?: Path;
  /** @internal Injected by ChartPath */
  _height?: number;
  /** @internal Injected by ChartPath */
  _gutter?: number;
  /** @internal Injected by ChartPath */
  _yDomain?: YDomain;
};

LineChartHorizontalLine.displayName = 'LineChartHorizontalLine';

export function LineChartHorizontalLine({
  color = 'gray',
  strokeWidth = 2,
  dashWidth = 3,
  dashGap = 3,
  at = { index: 0 },
  offsetY = 0,
  _width: width = 0,
  _parsedPath: parsedPath,
  _height: height = 0,
  _gutter: gutter = 0,
  _yDomain: yDomain = { min: 0, max: 0 },
}: HorizontalLineProps) {

  const y = useDerivedValue(() => {
    if (!parsedPath) return 0;
    if (typeof at === 'number' || at.index != null) {
      const index = typeof at === 'number' ? at : at.index;
      const yForX =
        getYForX(parsedPath, getXPositionForCurve(parsedPath, index)) || 0;
      return withTiming(yForX + offsetY);
    }
    /**
     * <gutter>
     * | ---------- | <- yDomain.max  |
     * |            |                 | offsetTop
     * |            | <- value        |
     * |            |
     * |            | <- yDomain.min
     * <gutter>
     */

    const offsetTop = yDomain.max - at.value;
    const percentageOffsetTop = offsetTop / (yDomain.max - yDomain.min);
    const heightBetweenGutters = height - gutter * 2;
    const offsetTopPixels = gutter + percentageOffsetTop * heightBetweenGutters;

    return withTiming(offsetTopPixels + offsetY);
  }, [at, gutter, height, offsetY, parsedPath, yDomain.max, yDomain.min]);

  const p1 = useDerivedValue(() => ({ x: 0, y: y.value }), [y]);
  const p2 = useDerivedValue(() => ({ x: width, y: y.value }), [y, width]);

  return (
    <Line
      p1={p1}
      p2={p2}
      strokeWidth={strokeWidth}
      color={color}
      style="stroke"
    >
      <DashPathEffect intervals={[dashWidth, dashGap]} />
    </Line>
  );
}
