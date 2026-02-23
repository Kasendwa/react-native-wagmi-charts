import * as React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Group, Path as SkiaPath } from '@shopify/react-native-skia';
import { useDerivedValue, type SharedValue } from 'react-native-reanimated';
import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import { useAnimatedPath } from './useAnimatedPath';
import { getXPositionForCurve } from './utils/getXPositionForCurve';

export type LineChartColorProps = {
  color?: string;
  from: number;
  to: number;
  showInactiveColor?: boolean;
  inactiveColor?: string;
  width?: number;
  /** @internal Injected by ChartPath for foreground clipping */
  _foregroundClip?: SharedValue<{ x: number; y: number; width: number; height: number }>;
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
}: LineChartColorProps) {
  const { path, parsedPath, height } = React.useContext(
    LineChartDimensionsContext
  );
  const { isTransitionEnabled, isInactive: _isInactive } =
    React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;

  ////////////////////////////////////////////////

  const { animatedPath } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path,
  });

  ////////////////////////////////////////////////

  const clipStart = getXPositionForCurve(parsedPath, from);
  const clipEnd = getXPositionForCurve(parsedPath, to);

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

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {_foregroundClip ? <Group clip={_foregroundClip}>{content}</Group> : content}
    </Canvas>
  );
}
