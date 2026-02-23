import { interpolate, Extrapolation } from 'react-native-reanimated';

import type { TDomain } from '../types';

export function getY(
  maxHeight: number,
  value: number,
  domain: TDomain,
) {
  'worklet';
  return interpolate(value, domain, [maxHeight, 0], Extrapolation.CLAMP);
}
