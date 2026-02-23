import React from 'react';
import {
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Skia, usePathInterpolation } from '@shopify/react-native-skia';

import { usePrevious } from '../../utils';

export function useAnimatedPath({
  enabled = true,
  path,
}: {
  enabled?: boolean;
  path: string;
}) {
  const transition = useSharedValue(0);
  const previousPath = usePrevious(path);

  // Parse SVG path strings on the JS thread (not in a worklet)
  const currentSkPath = React.useMemo(
    () => (path ? Skia.Path.MakeFromSVGString(path) : null) ?? Skia.Path.Make(),
    [path]
  );

  const previousSkPath = React.useMemo(
    () =>
      previousPath
        ? Skia.Path.MakeFromSVGString(previousPath) ?? currentSkPath
        : currentSkPath,
    [previousPath, currentSkPath]
  );

  // Check if paths can be interpolated (same structure)
  const canInterpolate = React.useMemo(
    () => enabled && previousSkPath.isInterpolatable(currentSkPath),
    [enabled, previousSkPath, currentSkPath]
  );

  // Trigger transition animation when path changes
  React.useEffect(() => {
    if (canInterpolate) {
      transition.value = 0;
      transition.value = withTiming(1);
    } else {
      // Force a value change to trigger useAnimatedReaction inside usePathInterpolation.
      // Setting 1→1 won't fire the reaction, so briefly go to 0 then snap to 1.
      transition.value = 0;
      transition.value = 1;
    }
  }, [path, canInterpolate, transition]);

  // usePathInterpolation throws if paths aren't interpolatable,
  // so always feed it [currentSkPath, currentSkPath] when they differ in structure.
  // When canInterpolate is true, use the real previous → current pair.
  // When canInterpolate is false, transition is 1 and both paths are identical,
  // so the result is just currentSkPath.
  const startPath = canInterpolate ? previousSkPath : currentSkPath;

  const animatedPath = usePathInterpolation(
    transition,
    [0, 1],
    [startPath, currentSkPath]
  );

  return { animatedPath };
}
