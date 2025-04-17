/*
 * Copyright 2015 The Closure Compiler Authors.
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

/**
 * @fileoverview Nodejs plugins and build tools for Google Closure Compiler
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';
export {default as JAR_PATH} from 'google-closure-compiler-java';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
export const CONTRIB_PATH = path.resolve(__dirname, './contrib');
export const EXTERNS_PATH = path.resolve(__dirname, './externs');

export {default as grunt} from './lib/grunt/index.js';
export {default as gulp} from './lib/gulp/index.js';
export {
  default as compiler,
  default,
  javaPath,
} from './lib/node/index.js';
