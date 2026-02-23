import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Canvas, Group } from '@shopify/react-native-skia';
import {
  useDerivedValue,
  useSharedValue,
  withTiming,
  WithTimingConfig,
} from 'react-native-reanimated';
import flattenChildren from 'react-keyed-flatten-children';

import { LineChartDimensionsContext } from './Chart';
import { LineChartPathContext } from './LineChartPathContext';
import { LineChartPath, LineChartPathProps } from './Path';
import { useLineChart } from './useLineChart';

const BACKGROUND_COMPONENTS = [
  'LineChartHighlight',
  'LineChartHorizontalLine',
  'LineChartGradient',
  'LineChartDot',
  'LineChartTooltip',
];
const FOREGROUND_COMPONENTS = ['LineChartHighlight', 'LineChartDot'];

type ReactElementWithDisplayName = React.ReactElement & {
  type?: {
    displayName?: string;
  };
};

type LineChartPathWrapperProps = {
  animationDuration?: number;
  animationProps?: Omit<Partial<WithTimingConfig>, 'duration'>;
  children?: React.ReactNode;
  color?: string;
  inactiveColor?: string;
  width?: number;
  widthOffset?: number;
  pathProps?: Partial<LineChartPathProps>;
  showInactivePath?: boolean;
  animateOnMount?: 'foreground';
  mountAnimationDuration?: number;
  mountAnimationProps?: Partial<WithTimingConfig>;
};

LineChartPathWrapper.displayName = 'LineChartPathWrapper';

export function LineChartPathWrapper({
  animationDuration = 300,
  animationProps = {},
  children,
  color = 'black',
  inactiveColor,
  width: strokeWidth = 3,
  widthOffset = 20,
  pathProps = {},
  showInactivePath = true,
  animateOnMount,
  mountAnimationDuration = animationDuration,
  mountAnimationProps = animationProps,
}: LineChartPathWrapperProps) {
  const { height, pathWidth, width, path: svgPath } = React.useContext(
    LineChartDimensionsContext
  );
  const { currentX, isActive } = useLineChart();
  const isMounted = useSharedValue(false);
  const hasMountedAnimation = useSharedValue(false);

  React.useEffect(() => {
    isMounted.value = true;
    return () => {
      isMounted.value = false;
    };
  }, []);

  ////////////////////////////////////////////////

  const clipWidth = useDerivedValue(() => {
    const shouldAnimateOnMount = animateOnMount === 'foreground';
    const inactiveWidth =
      !isMounted.value && shouldAnimateOnMount ? 0 : pathWidth;

    let duration =
      shouldAnimateOnMount && !hasMountedAnimation.value
        ? mountAnimationDuration
        : animationDuration;
    const props =
      shouldAnimateOnMount && !hasMountedAnimation.value
        ? mountAnimationProps
        : animationProps;

    if (isActive.value) {
      duration = 0;
    }

    return withTiming(
      isActive.value
        ? Math.max(currentX.value, 0)
        : inactiveWidth + widthOffset,
      Object.assign({ duration }, props),
      () => {
        hasMountedAnimation.value = true;
      }
    );
  }, [
    animateOnMount,
    animationDuration,
    animationProps,
    currentX,
    hasMountedAnimation,
    isActive,
    isMounted,
    mountAnimationDuration,
    mountAnimationProps,
    pathWidth,
    widthOffset,
  ]);

  const foregroundClip = useDerivedValue(() => {
    return { x: 0, y: 0, width: clipWidth.value, height };
  }, [clipWidth, height]);

  const viewSize = React.useMemo(() => ({ width, height }), [width, height]);

  ////////////////////////////////////////////////

  const { backgroundChildren, foregroundChildren } = React.useMemo(() => {
    if (!children) return { backgroundChildren: [] as React.ReactNode[], foregroundChildren: [] as React.ReactNode[] };
    const iterableChildren = flattenChildren(children);
    return {
      backgroundChildren: iterableChildren.filter((child) =>
        BACKGROUND_COMPONENTS.includes(
          (child as ReactElementWithDisplayName)?.type?.displayName || ''
        )
      ),
      foregroundChildren: iterableChildren.filter((child) =>
        FOREGROUND_COMPONENTS.includes(
          (child as ReactElementWithDisplayName)?.type?.displayName || ''
        )
      ),
    };
  }, [children]);

  ////////////////////////////////////////////////
  // Skia Canvas uses a separate reconciler, so React context doesn't propagate
  // into Canvas children. Each child component (Highlight, Gradient, Dot, etc.)
  // renders its own <Canvas> internally, so it can read React context normally.
  // Foreground children receive the clip rect as a prop for clipping.

  const isTransitionEnabled = pathProps.isTransitionEnabled ?? true;

  const bgContextValue = React.useMemo(
    () => ({ color, isInactive: showInactivePath, isTransitionEnabled }),
    [color, showInactivePath, isTransitionEnabled]
  );

  const fgContextValue = React.useMemo(
    () => ({ color, isInactive: false, isTransitionEnabled }),
    [color, isTransitionEnabled]
  );

  const clippedForegroundChildren = React.useMemo(
    () =>
      foregroundChildren.map((child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              key: i,
              _foregroundClip: foregroundClip,
            })
          : child
      ),
    [foregroundChildren, foregroundClip]
  );

  return (
    <>
      <LineChartPathContext.Provider value={bgContextValue}>
        <View style={viewSize}>
          <Canvas style={viewSize}>
            <LineChartPath
              color={color}
              inactiveColor={inactiveColor}
              width={strokeWidth}
              isInactive={showInactivePath}
              isTransitionEnabled={pathProps.isTransitionEnabled ?? true}
              pathData={svgPath}
              {...pathProps}
            />
          </Canvas>
          {backgroundChildren}
        </View>
      </LineChartPathContext.Provider>
      <LineChartPathContext.Provider value={fgContextValue}>
        <View style={StyleSheet.absoluteFill}>
          <Canvas style={viewSize}>
            <Group clip={foregroundClip}>
              <LineChartPath
                color={color}
                width={strokeWidth}
                isInactive={false}
                isTransitionEnabled={pathProps.isTransitionEnabled ?? true}
                pathData={svgPath}
                {...pathProps}
              />
            </Group>
          </Canvas>
          {clippedForegroundChildren}
        </View>
      </LineChartPathContext.Provider>
    </>
  );
}
