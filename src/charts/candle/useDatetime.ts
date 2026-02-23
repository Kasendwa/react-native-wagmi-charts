import { useDerivedValue } from 'react-native-reanimated';

import { formatDatetime } from '../../utils';
import type { TFormatterFn } from '../../types';
import { useCandleData } from './useCandleData';
import type { SharedValue } from 'react-native-reanimated';

export function useCandlestickChartDatetime({
  format,
  locale,
  options,
}: {
  format?: TFormatterFn<number>;
  locale?: string;
  options?: { [key: string]: string };
} = {}): {
  value: Readonly<SharedValue<string>>;
  formatted: Readonly<SharedValue<string>>;
} {
  const candle = useCandleData();

  const timestampString = useDerivedValue(() => {
    const ts = candle.value.timestamp;
    if (ts === -1) return '';
    return ts.toString();
  }, [candle]);

  const formatted = useDerivedValue(() => {
    const ts = candle.value.timestamp;
    if (ts === -1) return '';

    const formattedDatetime = formatDatetime({
      value: ts,
      locale,
      options,
    });

    return format
      ? format({ value: ts, formatted: formattedDatetime })
      : formattedDatetime;
  }, [candle, locale, options, format]);

  return { value: timestampString, formatted };
}
