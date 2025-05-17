#!/usr/bin/env node
/*
 * Copyright 2025 The Closure Compiler Authors.
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
 * @fileoverview
 *
 * Execute jasmine with the arguments in the correct order.
 * Extra arguments passed to test specs must be preceded by an '--' argument.
 * We want to keep the arguments in the same order, but arguments for the jasmine runner itself must
 * come first followed by a '--' argument and then finally by any extra arguments.
 */

import {spawn} from 'node:child_process';
import parseArgs from 'minimist';

const supportedJasmineFlags = new Set([
  'parallel',
  'no-color',
  'color',
  'filter',
  'helper',
  'require',
  'fail-fast',
  'config',
  'reporter',
  'verbose',
]);

const cliFlags = parseArgs(process.argv.slice(2));
const jasmineFlags = [];
const extraFlags = [];
for (const [name, value] of Object.entries(cliFlags)) {
  const normalizedValues = Array.isArray(value) ? value : [value];
  if (name === '_') {
    jasmineFlags.push(...value);
  } else if (supportedJasmineFlags.has(name)) {
    for (const normalizedValue of normalizedValues) {
      jasmineFlags.push(`--${name}${typeof normalizedValue === 'boolean' ? '' : `=${normalizedValue}`}`);
    }
  } else {
    for (const normalizedValue of normalizedValues) {
      extraFlags.push(`--${name}${typeof normalizedValue === 'boolean' ? '' : `=${normalizedValue}`}`);
    }
  }
}

const flagName = (flag) => {
  if (flag.startsWith('--')) {
    const valStart = flag.indexOf('=', 2);
    return flag.slice(0, valStart > 0 ? valStart : flag.length);
  }
  return flag;
}
const flagSorter = (a, b) => {
  const aFlagName = flagName(a);
  const bFlagName = flagName(b);
  const aIndex = process.argv.findIndex((arg) => arg === aFlagName || arg.startsWith(`${aFlagName}=`));
  const bIndex = process.argv.findIndex((arg) => arg === bFlagName || arg.startsWith(`${bFlagName}=`));
  return aIndex - bIndex;
};
jasmineFlags.sort(flagSorter);
extraFlags.sort(flagSorter);
if (extraFlags.length > 0) {
  jasmineFlags.push('--', ...extraFlags);
}

const jasmineProcess = spawn(
    'jasmine',
    jasmineFlags,
    {
      stdio: 'inherit',
    },
);

jasmineProcess.on('close', (exitCode) => {
  process.exitCode = exitCode;
});
