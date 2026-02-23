import * as React from 'react';
import { Path as SkiaPath } from '@shopify/react-native-skia';
import { useAnimatedPath } from './useAnimatedPath';

export type LineChartPathProps = {
  color?: string;
  inactiveColor?: string;
  width?: number;
  isInactive?: boolean;
  /**
   * Default: `true`.
   *
   * If `false`, changes in the chart's path will not animate.
   *
   * While this use case is rare, it may be useful on web, where animations might not work as well.
   *
   ***Example**
   *
   * ```tsx
   * <LineChart.Path
   *   pathProps={{ isTransitionEnabled: Platform.OS !== 'web' }}
   * />
   * ```
   */
  isTransitionEnabled?: boolean;
  /** SVG path string — passed as prop since Skia Canvas doesn't propagate React context */
  pathData?: string;
};

LineChartPath.displayName = 'LineChartPath';

export function LineChartPath({
  color = 'black',
  inactiveColor,
  width: strokeWidth = 3,
  isInactive: isInactiveProp,
  isTransitionEnabled: isTransitionEnabledProp = true,
  pathData = '',
}: LineChartPathProps) {
  const isInactive = isInactiveProp ?? false;
  const isTransitionEnabled = isTransitionEnabledProp;

  const { animatedPath } = useAnimatedPath({
    enabled: isTransitionEnabled,
    path: pathData,
  });

  const strokeColor = isInactive ? inactiveColor || color : color;
  const strokeOpacity = isInactive && !inactiveColor ? 0.2 : 1;

  return (
    <SkiaPath
      path={animatedPath}
      style="stroke"
      color={strokeColor}
      opacity={strokeOpacity}
      strokeWidth={strokeWidth}
    />
  );
}
