import * as React from 'react';
import { Group, Path as SkiaPath } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { useAnimatedPath } from './useAnimatedPath';
import { getXPositionForCurve } from './utils/getXPositionForCurve';
import type { Path } from 'react-native-redash';

export type LineChartColorProps = {
  color?: string;
  from: number;
  to: number;
  showInactiveColor?: boolean;
  inactiveColor?: string;
  width?: number;
  /** @internal Injected by ChartPath for foreground clipping */
  _foregroundClip?: SharedValue<{ x: number; y: number; width: number; height: number }>;
  /** @internal Injected by ChartPath */
  _path?: string;
  /** @internal Injected by ChartPath */
  _parsedPath?: Path;
  /** @internal Injected by ChartPath */
  _height?: number;
  /** @internal Injected by ChartPath */
  _isTransitionEnabled?: boolean;
  /** @internal Injected by ChartPath */
  _isInactive?: boolean;
};

LineChartHighlight.displayName = 'LineChartHighlight';

export function LineChartHighlight({
  color = 'black',
  inactiveColor,
  showInactiveColor = true,
  from,
  to,
  width: strokeWidth = 3,
  _foregroundClip,
  _path: path = '',
  _parsedPath: parsedPath,
  _height: height = 0,
  _isTransitionEnabled: isTransitionEnabled = true,
  _isInactive = false,
}: LineChartColorProps) {
  const isInactive = showInactiveColor && _isInactive;

  ////////////////////////////////////////////////

  const { animatedPath } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path,
  });

  ////////////////////////////////////////////////

  const clipStart = parsedPath ? getXPositionForCurve(parsedPath, from) : 0;
  const clipEnd = parsedPath ? getXPositionForCurve(parsedPath, to) : 0;

  const clipRect = useDerivedValue(() => {
    return { x: clipStart, y: 0, width: clipEnd - clipStart, height };
  }, [clipStart, clipEnd, height]);

  const content = (
    <Group clip={clipRect}>
      <SkiaPath
        path={animatedPath}
        style="stroke"
        color={isInactive ? inactiveColor || color : color}
        strokeWidth={strokeWidth}
        opacity={isInactive && !inactiveColor ? 0.5 : 1}
      />
    </Group>
  );

  return _foregroundClip ? <Group clip={_foregroundClip}>{content}</Group> : content;
}
