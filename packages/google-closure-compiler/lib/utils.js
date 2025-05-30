/*
 * Copyright 2018 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

/** @type {!Map<string, string>} */
const platformLookup = new Map([
  ['darwin', 'macos'],
  ['win32', 'windows'],
  ['linux', 'linux'],
]);

/** @return {string|undefined} */
export const getNativeImagePath = () => {
  let platform = platformLookup.get(process.platform);
  let binarySuffix = '';
  if (!platform) {
    return;
  } else if (platform === 'linux' && process.arch === 'arm64') {
    platform += '-arm64';
  } else if (platform === 'windows') {
    binarySuffix = '.exe';
  }
  const compilerPath = `google-closure-compiler-${platform}/compiler${binarySuffix}`;
  try {
    return require.resolve(compilerPath);
  } catch {}
};

/**
 * @param {!Array<string>} platforms
 * @return {string}
 */
export const getFirstSupportedPlatform = (platforms) => {
  const platform = platforms.find((platform, index) => {
    switch (platform.toLowerCase()) {
      case 'java':
        if (index === platforms.length - 1) {
          return true;
        }
        return process.env.JAVA_HOME;

      case 'native':
        if (getNativeImagePath()) {
          return true;
        }
    }
  });
  if (!platform) {
    throw new Error('No supported platform for closure-compiler found.');
  }
  return platform;
};
