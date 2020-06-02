#!/usr/bin/env node
/*
 * Copyright 2019 The Closure Compiler Authors.
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
/**
 * @fileoverview
 *
 * Check to see if the graal native image for this platform should be built
 */

const fs = require('fs');
const path = require('path');
const {DIM, RESET} = require('../../build-scripts/colors');
const runCommand = require('../../build-scripts/run-command');

// The windows sdk set env command messes with colors, so reset the console back to default
process.stdout.write(RESET);

if (fs.existsSync(path.resolve(__dirname, 'compiler'))) {
  process.stdout.write(`  ${DIM}google-closure-compiler-windows binary already exists${RESET}\n`);
  process.exit(0);
} else if (process.platform !== 'win32') {
  process.stdout.write(`  ${DIM}google-closure-compiler-windows build wrong platform${RESET}\n`);
  process.exit(0);
}
process.stdout.write(`  ${DIM}google-closure-compiler-windows building image${RESET}\n`);

const setEnvCmd = fs.readFileSync(
    'C:\\Program Files (x86)\\Microsoft Visual Studio\\2019\\Community\\Common7\\Tools\\VsDevCmd.bat', 'utf8');
try {
  fs.mkdirSync('..\\..\\temp');
} catch (e) {}
fs.writeFileSync('..\\..\\temp\\build-image.cmd', `${setEnvCmd}

node ${path.resolve(__dirname, '..', '..', 'build-scripts', 'graal.js')}
`, {
  encoding: 'utf8',
  mode: fs.constants.IRWXO // Add execute permissions
});

runCommand('..\\..\\temp\\build-image.cmd')
  .catch(e => {
    console.error(e);
    process.exit(e.exitCode || 1);
  });
