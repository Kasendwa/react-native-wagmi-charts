import React from 'react';
import {
  SharedValue,
  useAnimatedReaction,
  useDerivedValue,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import type { TContext, TData, TDomain } from './types';
import { getDomain } from './utils';

const EMPTY_CANDLE = { timestamp: -1, low: -1, open: -1, high: -1, close: -1 };

export const CandlestickChartContext = React.createContext<TContext>({
  currentX: { value: -1 } as SharedValue<number>,
  currentY: { value: -1 } as SharedValue<number>,
  currentIndex: { value: -1 } as SharedValue<number>,
  candle: { value: EMPTY_CANDLE } as unknown as TContext['candle'],
  data: [],
  height: 0,
  width: 0,
  domain: [0, 0],
  step: 0,
  setWidth: () => undefined,
  setHeight: () => undefined,
});

type CandlestickChartProviderProps = {
  children: React.ReactNode;
  data: TData;
  valueRangeY?: TDomain;
  onCurrentIndexChange?: (x: number) => void;
};

export function CandlestickChartProvider({
  children,
  data = [],
  valueRangeY,
  onCurrentIndexChange,
}: CandlestickChartProviderProps) {
  const [width, setWidth] = React.useState(0);
  const [height, setHeight] = React.useState(0);
  const currentX = useSharedValue(-1);
  const currentY = useSharedValue(-1);
  const currentIndex = useSharedValue(-1);
  const domain = React.useMemo(
    () => valueRangeY ?? getDomain(data),
    [data, valueRangeY]
  );

  const step = React.useMemo(() => width / data.length, [data.length, width]);

  // Compute current candle once — shared by all PriceText/DatetimeText consumers.
  // Uses currentIndex (not currentX) so it only re-evaluates when the cursor
  // crosses a candle boundary, not on every gesture frame.
  const candle = useDerivedValue(() => {
    const idx = currentIndex.value;
    if (idx === -1 || idx >= data.length) {
      return EMPTY_CANDLE;
    }
    return data[idx] ?? EMPTY_CANDLE;
  }, [currentIndex, data]);

  const contextValue = React.useMemo(
    () => ({
      currentX,
      currentY,
      currentIndex,
      candle,
      data,
      width,
      height,
      domain,
      step,
      setWidth,
      setHeight,
    }),
    [candle, currentIndex, currentX, currentY, data, domain, height, step, width]
  );

  useAnimatedReaction(
    () => currentIndex.value,
    (x, prevX) => {
      if (x !== prevX && onCurrentIndexChange) {
        scheduleOnRN(onCurrentIndexChange, x);
      }
    },
    [currentIndex]
  );

  return (
    <CandlestickChartContext.Provider value={contextValue}>
      {children}
    </CandlestickChartContext.Provider>
  );
}

CandlestickChartProvider.displayName = 'CandlestickChartProvider';
