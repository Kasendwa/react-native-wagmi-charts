const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const pak = require('../package.json');

const root = path.resolve(__dirname, '..');
const modules = Object.keys({ ...pak.peerDependencies });

const config = getDefaultConfig(__dirname);

// 1. Watch all files within the monorepo
config.watchFolders = [root];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(root, 'node_modules'),
];

// 3. Force peer dependency resolutions to the example's copies.
// This ensures only one copy of react, react-native, reanimated, etc. is loaded.
config.resolver.extraNodeModules = modules.reduce((acc, name) => {
  acc[name] = path.join(__dirname, 'node_modules', name);
  return acc;
}, {});

// 4. Intercept resolution so that any package (including those in the pnpm store)
// resolves peer deps to the example's single copy.
// We must pass the absolute path, not the bare module name, because bare names
// resolve relative to the requester's location (which may be deep in .pnpm store).
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (modules.includes(moduleName)) {
    const exampleModulePath = path.join(__dirname, 'node_modules', moduleName);
    return context.resolveRequest(
      { ...context, resolveRequest: undefined },
      exampleModulePath,
      platform
    );
  }
  return context.resolveRequest(
    { ...context, resolveRequest: undefined },
    moduleName,
    platform
  );
};

config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
