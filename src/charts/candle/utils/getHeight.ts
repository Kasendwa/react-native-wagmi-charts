import { interpolate, Extrapolation } from 'react-native-reanimated';

import type { TDomain } from '../types';

export function getHeight(
  maxHeight: number,
  value: number,
  domain: TDomain,
) {
  'worklet';
  const domainMin = domain[0] < domain[1] ? domain[0] : domain[1];
  const domainMax = domain[0] > domain[1] ? domain[0] : domain[1];
  return interpolate(
    value,
    [0, domainMax - domainMin],
    [0, maxHeight],
    Extrapolation.CLAMP
  );
}
