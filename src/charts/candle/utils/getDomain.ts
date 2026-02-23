import type { TCandle } from '../types';

export function getDomain(rows: TCandle[]): [min: number, max: number] {
  'worklet';
  if (rows.length === 0) return [0, 0];
  let min = rows[0]!.low;
  let max = rows[0]!.high;
  for (let i = 1; i < rows.length; i++) {
    const { high, low } = rows[i]!;
    if (low < min) min = low;
    if (high > max) max = high;
  }
  const range = max - min;
  return [min - range * 0.025, max + range * 0.025];
}
