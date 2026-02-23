import React from 'react';
import { StyleSheet } from 'react-native';

import {
  Easing,
  useDerivedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Canvas, Circle, Group, type CircleProps } from '@shopify/react-native-skia';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import { getXPositionForCurve } from './utils/getXPositionForCurve';
import { getYForX } from 'react-native-redash';
import { useLineChart } from './useLineChart';

export type LineChartDotProps = {
  /** Additional props for the inner dot Circle */
  dotProps?: Partial<CircleProps>;
  /** Additional props for the outer dot Circle */
  outerDotProps?: Partial<CircleProps>;
  color?: string;
  inactiveColor?: string;
  showInactiveColor?: boolean;
  at: number;
  size?: number;
  hasPulse?: boolean;
  hasOuterDot?: boolean;
  /** @internal Injected by ChartPath for foreground clipping */
  _foregroundClip?: SharedValue<{ x: number; y: number; width: number; height: number }>;
  /**
   * If `always`, the outer dot will still animate when interaction is active.
   *
   * If `while-inactive`, the outer dot will animate only when the interaction is inactive.
   *
   * Default: `while-inactive`
   */
  pulseBehaviour?: 'always' | 'while-inactive';
  /**
   * Defaults to `size * 4`
   */
  outerSize?: number;
  pulseDurationMs?: number;
};

LineChartDot.displayName = 'LineChartDot';

export function LineChartDot({
  at,
  color: defaultColor = 'black',
  dotProps,
  hasOuterDot: defaultHasOuterDot = false,
  hasPulse = false,
  inactiveColor,
  outerDotProps,
  pulseBehaviour = 'while-inactive',
  pulseDurationMs = 800,
  showInactiveColor = true,
  size = 4,
  outerSize = size * 4,
  _foregroundClip,
}: LineChartDotProps) {
  const { isActive } = useLineChart();
  const { parsedPath } = React.useContext(LineChartDimensionsContext);

  ////////////////////////////////////////////////////////////

  const { isInactive: _isInactive } = React.useContext(LineChartPathContext);
  const isInactive = showInactiveColor && _isInactive;
  const color = isInactive ? inactiveColor || defaultColor : defaultColor;
  const opacity = isInactive && !inactiveColor ? 0.5 : 1;
  const hasOuterDot = defaultHasOuterDot || hasPulse;

  ////////////////////////////////////////////////////////////

  const cx = useDerivedValue(() => {
    return withTiming(getXPositionForCurve(parsedPath, at));
  }, [at, parsedPath]);

  const cy = useDerivedValue(
    () => withTiming(getYForX(parsedPath!, cx.value) || 0),
    [parsedPath, cx]
  );

  ////////////////////////////////////////////////////////////

  const outerR = useDerivedValue(() => {
    if (!hasPulse) {
      return outerSize;
    }

    if (isActive.value && pulseBehaviour === 'while-inactive') {
      return 0;
    }

    const easing = Easing.out(Easing.sin);
    const scale = withRepeat(
      withSequence(
        withTiming(0),
        withTiming(0),
        withTiming(outerSize, {
          duration: pulseDurationMs,
          easing,
        })
      ),
      -1,
      false
    );

    if (pulseBehaviour === 'while-inactive') {
      return isActive.value ? withTiming(0) : scale;
    }
    return scale;
  }, [hasPulse, isActive, outerSize, pulseBehaviour, pulseDurationMs]);

  const outerOpacity = useDerivedValue(() => {
    if (!hasPulse) {
      return 0.1;
    }

    if (isActive.value && pulseBehaviour === 'while-inactive') {
      return 0;
    }

    const easing = Easing.out(Easing.sin);
    const animatedOpacity = withRepeat(
      withSequence(
        withTiming(0),
        withTiming(0.8),
        withTiming(0, {
          duration: pulseDurationMs,
          easing,
        })
      ),
      -1,
      false
    );

    if (pulseBehaviour === 'while-inactive') {
      return isActive.value ? withTiming(0) : animatedOpacity;
    }
    return animatedOpacity;
  }, [hasPulse, isActive, pulseBehaviour, pulseDurationMs]);

  ////////////////////////////////////////////////////////////

  const content = (
    <>
      <Circle
        cx={cx}
        cy={cy}
        r={size}
        color={color}
        opacity={opacity}
        {...dotProps}
      />
      {hasOuterDot && (
        <Circle
          cx={cx}
          cy={cy}
          r={outerR}
          color={color}
          opacity={outerOpacity}
          {...outerDotProps}
        />
      )}
    </>
  );

  return (
    <Canvas style={StyleSheet.absoluteFill}>
      {_foregroundClip ? <Group clip={_foregroundClip}>{content}</Group> : content}
    </Canvas>
  );
}
