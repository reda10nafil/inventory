const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');

let withNativeWind;
try {
  withNativeWind = require('nativewind/metro').withNativeWind;
} catch {}

let svgTransformerPath;
try {
  svgTransformerPath = require.resolve('react-native-svg-transformer');
} catch {}

const defaultConfig = getDefaultConfig(__dirname);

let config = defaultConfig;

if (svgTransformerPath) {
  const {transformer, resolver} = defaultConfig;
  config = mergeConfig(defaultConfig, {
    transformer: {
      ...transformer,
      babelTransformerPath: svgTransformerPath,
    },
    resolver: {
      ...resolver,
      assetExts: resolver.assetExts.filter(ext => ext !== 'svg'),
      sourceExts: [...resolver.sourceExts, 'svg'],
    },
  });
}

if (withNativeWind) {
  module.exports = withNativeWind(config, {input: './global.css'});
} else {
  module.exports = config;
}
