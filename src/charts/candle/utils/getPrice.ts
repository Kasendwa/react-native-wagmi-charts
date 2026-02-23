import { interpolate, Extrapolation } from 'react-native-reanimated';

import type { TDomain } from '../types';

export function getPrice(
  maxHeight: number,
  y: number,
  domain: TDomain,
) {
  'worklet';
  if (y === -1) return -1;
  // Use [domain[1], domain[0]] instead of domain.reverse() to avoid mutating the original array
  return interpolate(y, [0, maxHeight], [domain[1], domain[0]], Extrapolation.CLAMP);
}
