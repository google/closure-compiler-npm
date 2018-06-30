'use strict';

function getNativeImagePath() {
  if (process.platform === 'darwin') {
    try {
      return require('google-closure-compiler-osx');
    } catch (e) {
      return;
    }
  }
  try {
    return require('google-closure-compiler-linux');
  } catch (e) {
  }
}

function getFirstSupportedPlatform(platforms) {
  const platform = platforms.find((platform, index) => {
    switch (platform.toLowerCase()) {
      case "java":
        if (index === platforms.length - 1) {
          return true;
        }
        return process.env.JAVA_HOME;

      case "javascript":
        return true;

      case "native":
        if (getNativeImagePath()) {
          return true;
        }
    }
  });
  if (!platform) {
    throw new Error('No supported platform for closure-compiler found.');
  }
  return platform;
}

module.exports = {
  getNativeImagePath,
  getFirstSupportedPlatform
};
