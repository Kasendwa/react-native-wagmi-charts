import React from 'react';
import { Canvas } from '@shopify/react-native-skia';

import { CandlestickChartDimensionsContext } from './Chart';
import { CandlestickChartCandle, CandlestickChartCandleProps } from './Candle';
import { useCandlestickChart } from './useCandlestickChart';

type CandlestickChartCandlesProps = {
  margin?: CandlestickChartCandleProps['margin'];
  positiveColor?: CandlestickChartCandleProps['positiveColor'];
  negativeColor?: CandlestickChartCandleProps['negativeColor'];
  renderRect?: CandlestickChartCandleProps['renderRect'];
  renderLine?: CandlestickChartCandleProps['renderLine'];
  candleProps?: Partial<CandlestickChartCandleProps>;
  useAnimations?: boolean;
};

export function CandlestickChartCandles({
  positiveColor,
  negativeColor,
  margin,
  useAnimations = true,
  renderRect,
  renderLine,
  candleProps,
}: CandlestickChartCandlesProps) {
  const { width, height } = React.useContext(CandlestickChartDimensionsContext);
  const { data, domain, step } = useCandlestickChart();

  return (
    <Canvas style={{ width, height }}>
      {step > 0 &&
        data.map((candle, index) => (
          <CandlestickChartCandle
            key={index as React.Key}
            domain={domain}
            margin={margin}
            maxHeight={height}
            width={step}
            positiveColor={positiveColor}
            negativeColor={negativeColor}
            renderRect={renderRect}
            renderLine={renderLine}
            useAnimations={useAnimations}
            candle={candle}
            index={index}
            {...candleProps}
          />
        ))}
    </Canvas>
  );
}
