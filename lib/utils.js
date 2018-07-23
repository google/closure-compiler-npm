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

/**
 * Parse cli provided flags and create an object
 *
 * @param {!Array<string>} flags
 * @return {!Object<string, (string|boolean|Array<string>)>}
 */
function parseCliFlags(flags) {
  const flagShortcuts = new Map([
    ['-O', 'compilation_level'],
    ['-W', 'warning_level']
  ]);

  const compilerFlags = {};
  let currentFlag;
  const addFlagValue = flagValue => {
    if (!currentFlag) {
      currentFlag = 'js';
    }

    if (flagValue === 'true') {
      flagValue = true;
    } else if (flagValue === 'false') {
      flagValue = false;
    }

    if (compilerFlags[currentFlag] && !Array.isArray(compilerFlags[currentFlag])) {
      compilerFlags[currentFlag] = [compilerFlags[currentFlag], flagValue];
    } else {
      compilerFlags[currentFlag] = flagValue;
    }
    currentFlag = undefined;
  };
  flags.forEach(flagOrValue => {
    let nextFlag;
    let maybeFlag = flagOrValue;
    let eqIndex = flagOrValue.indexOf('=');
    if (eqIndex > 0) {
      maybeFlag = maybeFlag.substr(0, eqIndex);
    }
    if (flagShortcuts.has(maybeFlag)) {
      nextFlag = flagShortcuts.get(maybeFlag);
      if (eqIndex > 0) {
        nextFlag += flagOrValue.substr(eqIndex);
      }
    } else if (/^--/.test(maybeFlag)) {
      nextFlag = flagOrValue.substr(2);
    } else {
      addFlagValue(flagOrValue);
    }
    if (nextFlag) {
      if (currentFlag) {
        addFlagValue(true);
      }

      eqIndex = nextFlag.indexOf('=');
      if (eqIndex > 0) {
        currentFlag = nextFlag.substr(0, eqIndex);
        addFlagValue(nextFlag.substr(eqIndex + 1));
      } else {
        currentFlag = nextFlag;
      }
    }
  });
  if (currentFlag) {
    addFlagValue(true);
  }
  return compilerFlags;
}

module.exports = {
  getNativeImagePath,
  getFirstSupportedPlatform,
  parseCliFlags
};
