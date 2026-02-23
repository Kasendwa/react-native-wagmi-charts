import React from 'react';
import { useDerivedValue } from 'react-native-reanimated';

import { formatPrice } from '../../utils';
import { useCandlestickChart } from './useCandlestickChart';
import { getPrice } from './utils';
import type { TFormatterFn } from '../../types';
import type { TPriceType } from './types';
import { useCandleData } from './useCandleData';
import type { SharedValue } from 'react-native-reanimated';

// Crosshair price — depends on currentY which changes every gesture frame.
function useCrosshairPrice({
  format,
  precision = 2,
}: {
  format?: TFormatterFn<string>;
  precision?: number;
}): {
  value: Readonly<SharedValue<string>>;
  formatted: Readonly<SharedValue<string>>;
} {
  const { currentY, domain, height } = useCandlestickChart();

  const sortedDomain: [number, number] = React.useMemo(
    () => [Math.min(domain[0], domain[1]), Math.max(domain[0], domain[1])],
    [domain]
  );

  const float = useDerivedValue(() => {
    const price = getPrice(height, currentY.value, sortedDomain);
    if (price === -1) return '';
    return price.toFixed(precision).toString();
  }, [currentY, sortedDomain, height, precision]);

  const formatted = useDerivedValue(() => {
    if (!float.value) return '';
    const formattedPrice = formatPrice({ value: float.value });
    return format
      ? format({ value: float.value, formatted: formattedPrice })
      : formattedPrice;
  }, [float, format]);

  return { value: float, formatted };
}

// Non-crosshair price (open/high/low/close) — depends only on candle shared
// value which changes on candle boundary crossings, NOT every gesture frame.
// CRITICAL: this worklet must NEVER read currentY.value, otherwise Reanimated
// will track it and re-evaluate on every frame.
function useCandlePrice({
  format,
  precision = 2,
  type,
}: {
  format?: TFormatterFn<string>;
  precision?: number;
  type: 'open' | 'close' | 'low' | 'high';
}): {
  value: Readonly<SharedValue<string>>;
  formatted: Readonly<SharedValue<string>>;
} {
  const candle = useCandleData();

  const float = useDerivedValue(() => {
    const price = candle.value[type];
    if (price === -1) return '';
    return price.toFixed(precision).toString();
  }, [candle, type, precision]);

  const formatted = useDerivedValue(() => {
    if (!float.value) return '';
    const formattedPrice = formatPrice({ value: float.value });
    return format
      ? format({ value: float.value, formatted: formattedPrice })
      : formattedPrice;
  }, [float, format]);

  return { value: float, formatted };
}

export function useCandlestickChartPrice({
  format,
  precision = 2,
  type = 'crosshair',
}: {
  format?: TFormatterFn<string>;
  precision?: number;
  type?: TPriceType;
} = {}): {
  value: Readonly<SharedValue<string>>;
  formatted: Readonly<SharedValue<string>>;
} {
  // Each PriceText instance has a fixed type prop, so this branch is stable
  // across renders and does not violate rules of hooks.
  if (type === 'crosshair') {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useCrosshairPrice({ format, precision });
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useCandlePrice({ format, precision, type });
}
