// Default Expo Metro config. tsconfig "paths" (the @/* alias) are resolved
// automatically by expo/metro-config.
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

module.exports = config;
