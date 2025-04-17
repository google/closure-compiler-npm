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

import {spawn} from 'node:child_process';
import fs from 'node:fs';
import chalk from 'chalk';
import nativeImagePath from './index.js';

const dimWhite = (text) => chalk.dim(chalk.white(text));

process.stdout.write('google-closure-compiler-linux-arm64\n');
if (process.platform !== 'linux' || process.arch !== 'arm64') {
  process.stdout.write(dimWhite(`  skipping tests - incorrect platform\n`));
} else if (fs.existsSync(nativeImagePath)) {
  process.stdout.write(`  ${chalk.greenBright('✓')} ${dimWhite('compiler binary exists')}\n`);
  new Promise(
      (resolve, reject) => {
        const compilerTest = spawn(
            nativeImagePath,
            ['--version'],
            {stdio: 'inherit'});
        compilerTest.on('error', (err) => {
          reject(err);
        });
        compilerTest.on('close', (exitCode) => {
          if (exitCode != 0) {
            return reject('non zero exit code');
          }
          process.stdout.write(
              `  ${chalk.greenBright('✓')} ${dimWhite('compiler version successfully reported')}\n`);
          resolve();
        });
      })
      .then(() => new Promise((resolve, reject) => {
        const compilerTest = spawn(
            nativeImagePath,
            ['--help'],
            {stdio: 'inherit'});
        compilerTest.on('error', (err) => {
          reject(err);
        });
        compilerTest.on('close', (exitCode) => {
          if (exitCode != 0) {
            return reject('non zero exit code');
          }
          process.stdout.write(
              `  ${chalk.greenBright('✓')} ${dimWhite('compiler help successfully reported')}\n`);
          resolve();
        });
      }))
      .catch((err) => {
        process.stderr.write((err || '').toString() + '\n');
        process.stdout.write(`  ${chalk.red('compiler execution tests failed')}\n`);
        process.exitCode = 1;
      });
} else {
  process.stdout.write(`  ${chalk.red('compiler binary does not exist')}\n`);
  process.exitCode = 1;
}
