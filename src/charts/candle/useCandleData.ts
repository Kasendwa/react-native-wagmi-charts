import type { TCandle } from './types';
import type { SharedValue } from 'react-native-reanimated';
import { useCandlestickChart } from './useCandlestickChart';

export function useCandleData(): Readonly<SharedValue<TCandle>> {
  // Use the shared candle computed once in the provider — no per-consumer worklet
  const { candle } = useCandlestickChart();
  return candle;
}
