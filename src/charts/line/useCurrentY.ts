import { useContext } from 'react';
import { useDerivedValue } from 'react-native-reanimated';
import { getYForX } from 'react-native-redash';
import { LineChartContext } from './Context';
import { LineChartDimensionsContext } from './Chart';

export function useCurrentY() {
  const { parsedPath, width } = useContext(LineChartDimensionsContext);
  const { currentX } = useContext(LineChartContext);

  const currentY = useDerivedValue(() => {
    if (!parsedPath) {
      return -1;
    }
    const boundedX = Math.min(width, currentX.value);
    return getYForX(parsedPath, boundedX) || 0;
  }, [parsedPath, width, currentX]);

  return currentY;
}
