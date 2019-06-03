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

if (fs.existsSync(path.resolve(__dirname, 'compiler'))) {
  process.stdout.write(`  ${DIM}google-closure-compiler-windows binary already exists${RESET}\n`);
} else if (process.platform !== 'win32') {
  process.stdout.write(`  ${DIM}google-closure-compiler-windows build wrong platform${RESET}\n`);
} else {
  process.stdout.write(`  ${DIM}google-closure-compiler-windows building image${RESET}\n`);
  runCommand('node ../../build-scripts/graal.js',{stdio: 'inherit'})
      .catch(e => {
        console.error(e);
        process.exit(1);
      });
}
