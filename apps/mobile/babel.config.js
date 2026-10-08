module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@features': './src/features',
            '@shared': './src/shared',
            '@components': './src/shared/components',
            '@hooks': './src/shared/hooks',
            '@services': './src/shared/services',
            '@store': './src/shared/store',
            '@theme': './src/shared/theme',
            '@utils': './src/shared/utils',
            '@navigation': './src/shared/navigation',
          },
          extensions: ['.ios.js', '.android.js', '.js', '.jsx', '.ts', '.tsx', '.json'],
        },
      ],
    ],
  };
};
