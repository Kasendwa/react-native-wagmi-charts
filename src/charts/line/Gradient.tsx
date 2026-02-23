import * as React from 'react';
import { StyleSheet } from 'react-native';
import { Canvas, Path as SkiaPath, LinearGradient, vec } from '@shopify/react-native-skia';
import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import { useAnimatedPath } from './useAnimatedPath';

export type LineChartGradientProps = {
  color?: string;
  /**
   * Custom gradient colors array. Each element should be a color string.
   * If not provided, a default gradient based on the path color is used.
   */
  colors?: string[];
  /**
   * Gradient stop positions (0 to 1). Must match the length of `colors`.
   */
  positions?: number[];
};

LineChartGradient.displayName = 'LineChartGradient';

export function LineChartGradient({
  color: overrideColor = undefined,
  colors: customColors,
  positions: customPositions,
}: LineChartGradientProps) {
  const { area, height } = React.useContext(LineChartDimensionsContext);
  const { color: contextColor, isTransitionEnabled } =
    React.useContext(LineChartPathContext);
  const color = overrideColor || contextColor;

  ////////////////////////////////////////////////

  const { animatedPath } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path: area,
  });

  ////////////////////////////////////////////////

  const colors = React.useMemo(
    () => customColors || [
      `${color}26`, // ~15% opacity at 20%
      `${color}0D`, // ~5% opacity at 40%
      `${color}00`, // 0% opacity at 100%
    ],
    [customColors, color]
  );

  const positions = React.useMemo(
    () => customPositions || [0.2, 0.4, 1.0],
    [customPositions]
  );

  const start = React.useMemo(() => vec(0, 0), []);
  const end = React.useMemo(() => vec(0, height), [height]);

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      <SkiaPath path={animatedPath}>
        <LinearGradient
          start={start}
          end={end}
          colors={colors}
          positions={positions}
        />
      </SkiaPath>
    </Canvas>
  );
}
