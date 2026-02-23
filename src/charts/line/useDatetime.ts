import { useDerivedValue } from 'react-native-reanimated';

import { formatDatetime } from '../../utils';
import type { TFormatterFn } from '../../types';
import { useLineChart } from './useLineChart';

export function useLineChartDatetime({
  format,
  locale,
  options,
}: {
  format?: TFormatterFn<number>;
  locale?: string;
  options?: Intl.DateTimeFormatOptions;
} = {}) {
  const { currentIndex, data } = useLineChart();

  const value = useDerivedValue(() => {
    if (
      !data ||
      typeof currentIndex.value === 'undefined' ||
      currentIndex.value === -1
    ) {
      return -1;
    }
    return data[currentIndex.value]?.timestamp ?? -1;
  }, [currentIndex, data]);

  const formatted = useDerivedValue(() => {
    if (value.value === -1) return '';
    const formattedDatetime = formatDatetime({
      value: value.value,
      locale,
      options,
    });
    return format
      ? format({
          value: value.value,
          formatted: formattedDatetime,
        })
      : formattedDatetime;
  }, [format, locale, options, value]);

  return { value, formatted };
}
