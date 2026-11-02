git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-9gzilvrq' (errno=Operation not permitted)
git: warning: confstr() failed with code 5: couldn't get path of DARWIN_USER_TEMP_DIR; using /tmp instead
git: error: couldn't create cache file '/tmp/xcrun_db-vQxt8H02' (errno=Operation not permitted)
import { useState, useEffect } from 'react';
import { Dimensions, ScaledSize } from 'react-native';

export function useDimensions() {
  const [dimensions, setDimensions] = useState<{ window: ScaledSize; screen: ScaledSize }>({
    window: Dimensions.get('window'),
    screen: Dimensions.get('screen'),
  });

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window, screen }: {
      window: ScaledSize;
      screen: ScaledSize;
    }) => {
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
