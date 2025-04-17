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
/**
 * @fileoverview
 *
 * Check to see if the graal native image for this platform should be built
 */

import fs from 'node:fs';
import path from 'node:path';
import chalk from 'chalk';
import runCommand from '../../build-scripts/run-command.js';

const dimWhite = (text) => chalk.dim(chalk.white(text));

// The windows sdk set env command messes with colors, so reset the console back to default
process.stdout.write(reset(''));

if (fs.existsSync(path.resolve(__dirname, 'compiler'))) {
  process.stdout.write(dimWhite(`  google-closure-compiler-windows binary already exists\n`));
  process.exit(0);
} else if (process.platform !== 'win32') {
  process.stdout.write(dimWhite(`  google-closure-compiler-windows build wrong platform\n`));
  process.exit(0);
} else {
  process.stdout.write(dimWhite(`  google-closure-compiler-windows building image\n`));
  runCommand('node', ['../../build-scripts/graal.js'])
      .then(({exitCode}) => {
        process.exitCode = exitCode || 0;
      })
      .catch((e) => {
        process.exitCode = e.exitCode || 1;
      });
}
