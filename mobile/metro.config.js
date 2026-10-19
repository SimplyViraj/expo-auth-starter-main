const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Only public shared configuration is watched outside the mobile project.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../shared')];
const existing = config.resolver.blockList;
config.resolver.blockList = [
  ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
  /[\\/]backend[\\/]/,
];
module.exports = config;
