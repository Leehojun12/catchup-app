const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// WatermelonDB requires a development build. In Expo Go we alias @nozbe/*
// to JS stubs so Hermes never parses unsupported syntax from those packages.
const useWatermelon = process.env.EXPO_PUBLIC_USE_WATERMELON === 'true';

const stubPath = path.resolve(__dirname, 'src/db/watermelon/stub.js');
const withObservablesStub = path.resolve(__dirname, 'src/db/watermelon/withObservablesStub.js');
const eventPhaseFix = path.resolve(__dirname, 'src/polyfills/fixEventPhase.js');

const defaultResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (!useWatermelon) {
    if (moduleName === '@nozbe/with-observables') {
      return { filePath: withObservablesStub, type: 'sourceFile' };
    }
    if (moduleName.startsWith('@nozbe/watermelondb')) {
      return { filePath: stubPath, type: 'sourceFile' };
    }
  }

  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

config.serializer = {
  ...config.serializer,
  getModulesRunBeforeMainModule: () => [eventPhaseFix],
};

module.exports = config;
