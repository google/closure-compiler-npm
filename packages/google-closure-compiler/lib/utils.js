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
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);

export const getNativeImagePath = () => {
  if (process.platform === 'darwin') {
    try {
      return require('google-closure-compiler-macos').default;
    } catch (e) {
      return;
    }
  }
  if (process.platform === 'win32') {
    try {
      return require('google-closure-compiler-windows').default;
    } catch (e) {
      return;
    }
  }
  if (process.platform === 'linux' && ['x64','x32'].includes(process.arch)) {
    try {
      return require('google-closure-compiler-linux').default;
    } catch (e) {
    }
  }
  if (process.platform === 'linux' && ['arm64'].includes(process.arch)) {
    try {
      return require('google-closure-compiler-linux-arm64').default;
    } catch (e) {
    }
  }
};

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
