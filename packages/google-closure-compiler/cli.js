#!/usr/bin/env node
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
'use strict';
const {getNativeImagePath, getFirstSupportedPlatform} = require('./lib/utils');
const parseArgs = require('minimist');

const compilerFlags = parseArgs(process.argv.slice(2));

// The platform flag is only used by this cli script - it is not natively supported by any compiler version.
// If it exists, use the value, but then delete it so that it's not actually passed to the compiler.
let platform;
if (compilerFlags.hasOwnProperty('platform')) {
  platform = getFirstSupportedPlatform(compilerFlags.platform.split(','));
  delete compilerFlags.platform;
} else {
  platform = getFirstSupportedPlatform(['native', 'java']);
}

// The compiler treats default arguments as if they were --js args.
// Minimist parses default arguments and puts them under the '_' key.
// Move the '_' key to the 'js' key.
if (compilerFlags.hasOwnProperty('_') && compilerFlags['_'].length > 0) {
  let existingJsFlags = [];
  if (compilerFlags.js) {
    if (Array.isArray(compilerFlags.js)) {
      existingJsFlags = compilerFlags.js;
    } else {
      existingJsFlags = [compilerFlags.js];
    }
  }
  compilerFlags.js = existingJsFlags.concat(compilerFlags['_']);
  delete compilerFlags['_'];
} else {
  delete compilerFlags['_'];
}

// Boolean arguments can in some cases be parsed as strings.
// Since its highly unlikely that an argument actually needs to be the strings 'true' or 'false',
// convert them to true booleans.
Object.keys(compilerFlags).forEach((flag) => {
  if (compilerFlags[flag] === 'true') {
    compilerFlags[flag] = true;
  } else if (compilerFlags[flag] === 'false') {
    compilerFlags[flag] = false;
  }
});

const Compiler = require('./lib/node/closure-compiler');
let args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (/^--platform/.test(args[i])) {
    let delCount = 1;
    if (args[i].indexOf('=') < 0 && args.length > i + 1) {
      delCount++;
    }
    args.splice(i, delCount);
    break;
  }
}

const compiler = new Compiler(args);

compiler.spawnOptions = {stdio: 'inherit'};
if (platform === 'native') {
  compiler.JAR_PATH = null;
  compiler.javaPath = getNativeImagePath();
}

compiler.run((exitCode) => {
  process.exitCode = exitCode;
});
