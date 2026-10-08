import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export function useDimensions() {
  const [dimensions, setDimensions] = useState<{ window: ScaledSize; screen: ScaledSize }>({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }) => {
      setDimensions({ window, screen });
    });
    return () => subscription.remove();
  }, []);

  return {
    ...dimensions,
    width: dimensions.window.width,
    height: dimensions.window.height,
    isLandscape: dimensions.window.width > dimensions.window.height,
    isPortrait: dimensions.window.height >= dimensions.window.width,
    isTablet: Math.min(dimensions.window.width, dimensions.window.height) >= 768,
    isSmallDevice: Math.min(dimensions.window.width, dimensions.window.height) < 375,
  };
}
