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

// Which Skia children appear in the background vs foreground Canvas
const BACKGROUND_SKIA = [
  'LineChartHighlight',
  'LineChartHorizontalLine',
  'LineChartGradient',
  'LineChartDot',
];
const FOREGROUND_SKIA = ['LineChartHighlight', 'LineChartDot'];
// Components that remain outside Canvas (they use React Native views)
const NON_SKIA_CHILDREN = ['LineChartTooltip'];

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
  const { height, pathWidth, width, path: svgPath, area, parsedPath, gutter } = React.useContext(
    LineChartDimensionsContext
  );
  const { currentX, isActive, yDomain } = useLineChart();
  const isMounted = useSharedValue(false);
  const hasMountedAnimation = useSharedValue(false);

  React.useEffect(() => {
    isMounted.value = true;
    return () => {
      isMounted.value = false;
    };
  }, []);

  ////////////////////////////////////////////////

  const shouldAnimateOnMount = animateOnMount === 'foreground';

  // Pre-compute timing configs outside the worklet to avoid per-frame allocation
  const mountTimingConfig = React.useMemo(
    () => ({ duration: mountAnimationDuration, ...mountAnimationProps }),
    [mountAnimationDuration, mountAnimationProps]
  );
  const defaultTimingConfig = React.useMemo(
    () => ({ duration: animationDuration, ...animationProps }),
    [animationDuration, animationProps]
  );

  const clipWidth = useDerivedValue(() => {
    // During active cursor interaction, snap directly — no animation overhead
    if (isActive.value) {
      return Math.max(currentX.value, 0);
    }

    const inactiveWidth =
      !isMounted.value && shouldAnimateOnMount ? 0 : pathWidth;
    const targetWidth = inactiveWidth + widthOffset;

    const config =
      shouldAnimateOnMount && !hasMountedAnimation.value
        ? mountTimingConfig
        : defaultTimingConfig;

    return withTiming(targetWidth, config, () => {
      hasMountedAnimation.value = true;
    });
  }, [
    currentX,
    defaultTimingConfig,
    hasMountedAnimation,
    isActive,
    isMounted,
    mountTimingConfig,
    pathWidth,
    shouldAnimateOnMount,
    widthOffset,
  ]);

  const foregroundClip = useDerivedValue(() => {
    return { x: 0, y: 0, width: clipWidth.value, height };
  }, [clipWidth, height]);

  const viewSize = React.useMemo(() => ({ width, height }), [width, height]);

  ////////////////////////////////////////////////

  ////////////////////////////////////////////////
  // Skia Canvas uses a separate React reconciler. Child components that were
  // previously rendered outside Canvas (each with their own Canvas) are now
  // rendered INSIDE ChartPath's Canvas instances. This is possible because:
  // - Skia's reconciler IS a full React reconciler (handles hooks, state, etc.)
  // - The only thing that breaks is useContext (no providers in Skia's fiber tree)
  // - We eliminate useContext by injecting all needed data as props via cloneElement
  // This reduces 5-7 native Canvas surfaces down to just 2.

  const isTransitionEnabled = pathProps.isTransitionEnabled ?? true;

  // Shared internal props injected into all Skia children
  const internalProps = React.useMemo(() => ({
    _path: svgPath,
    _area: area,
    _parsedPath: parsedPath,
    _height: height,
    _width: width,
    _gutter: gutter,
    _color: color,
    _isTransitionEnabled: isTransitionEnabled,
    _isActive: isActive,
    _yDomain: yDomain,
  }), [svgPath, area, parsedPath, height, width, gutter, color, isTransitionEnabled, isActive, yDomain]);

  const { bgSkiaChildren, fgSkiaChildren, nonSkiaChildren } = React.useMemo(() => {
    if (!children) return { bgSkiaChildren: [] as React.ReactNode[], fgSkiaChildren: [] as React.ReactNode[], nonSkiaChildren: [] as React.ReactNode[] };
    const iterableChildren = flattenChildren(children);

    const getDisplayName = (child: React.ReactNode) =>
      (child as ReactElementWithDisplayName)?.type?.displayName || '';

    const bgSkia: React.ReactNode[] = [];
    const fgSkia: React.ReactNode[] = [];
    const nonSkia: React.ReactNode[] = [];

    for (const child of iterableChildren) {
      const name = getDisplayName(child);
      if (BACKGROUND_SKIA.includes(name)) bgSkia.push(child);
      if (FOREGROUND_SKIA.includes(name)) fgSkia.push(child);
      if (NON_SKIA_CHILDREN.includes(name)) nonSkia.push(child);
    }

    return { bgSkiaChildren: bgSkia, fgSkiaChildren: fgSkia, nonSkiaChildren: nonSkia };
  }, [children]);

  // Inject internal props into background Skia children (isInactive = showInactivePath)
  const bgChildrenWithProps = React.useMemo(
    () =>
      bgSkiaChildren.map((child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              key: i,
              ...internalProps,
              _isInactive: showInactivePath,
            })
          : child
      ),
    [bgSkiaChildren, internalProps, showInactivePath]
  );

  // Inject internal props into foreground Skia children (isInactive = false, with clip)
  const fgChildrenWithProps = React.useMemo(
    () =>
      fgSkiaChildren.map((child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              key: i,
              ...internalProps,
              _isInactive: false,
              _foregroundClip: foregroundClip,
            })
          : child
      ),
    [fgSkiaChildren, internalProps, foregroundClip]
  );

  // Non-Skia children (Tooltip) still need context — keep providers for them
  const bgContextValue = React.useMemo(
    () => ({ color, isInactive: showInactivePath, isTransitionEnabled }),
    [color, showInactivePath, isTransitionEnabled]
  );

  const fgContextValue = React.useMemo(
    () => ({ color, isInactive: false, isTransitionEnabled }),
    [color, isTransitionEnabled]
  );

  // Inject foregroundClip into non-Skia foreground children (Tooltip)
  const nonSkiaWithClip = React.useMemo(
    () =>
      nonSkiaChildren.map((child, i) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<Record<string, unknown>>, {
              key: i,
              _foregroundClip: foregroundClip,
            })
          : child
      ),
    [nonSkiaChildren, foregroundClip]
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
            {bgChildrenWithProps}
          </Canvas>
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
              {fgChildrenWithProps}
            </Group>
          </Canvas>
          {nonSkiaWithClip}
        </View>
      </LineChartPathContext.Provider>
    </>
  );
}
