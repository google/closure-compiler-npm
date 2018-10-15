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

const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');
const nativeImagePath = require('./');
const ESC = '\u001B';
const COLOR_END = ESC + '[0m';
const COLOR_RED = ESC + '[91m';
const COLOR_GREEN = ESC + '[92m';
const COLOR_DIM = ESC + '[2m';

process.stdout.write('google-closure-compiler-osx\n');
if (process.platform !== 'darwin') {
  process.stdout.write(`  ${COLOR_DIM}skipping tests - incorrect platform${COLOR_END}\n`);
} else if (fs.existsSync(nativeImagePath)) {
  process.stdout.write(`  ${COLOR_GREEN}✓${COLOR_END} ${COLOR_DIM}compiler binary exists${COLOR_END}\n`);
  new Promise((resolve, reject) => {
    const compilerTest = spawn(
        path.resolve(__dirname, 'compiler'),
        ['--version'],
        {stdio: 'inherit'});
    compilerTest.on('error', err => {
      reject(err);
    });
    compilerTest.on('close', exitCode => {
      if (exitCode != 0) {
        return reject('non zero exit code');
      }
      process.stdout.write(
          `  ${COLOR_GREEN}✓${COLOR_END} ${COLOR_DIM}compiler version successfully reported${COLOR_END}\n`);
      resolve();
    });
  })
  .then(() => new Promise((resolve, reject) => {
    const compilerTest = spawn(
        path.resolve(__dirname, 'compiler'),
        ['--help'],
        {stdio: 'inherit'});
    compilerTest.on('error', err => {
      reject(err);
    });
    compilerTest.on('close', exitCode => {
      if (exitCode != 0) {
        return reject('non zero exit code');
      }
      process.stdout.write(
          `  ${COLOR_GREEN}✓${COLOR_END} ${COLOR_DIM}compiler help successfully reported${COLOR_END}\n`);
      resolve();
    });
  }))
  .catch(err => {
    process.stderr.write((err || '').toString() + '\n');
    process.stdout.write(`  ${COLOR_RED}compiler execution tests failed${COLOR_END}\n`);
    process.exitCode = 1;
  });
} else {
  process.stdout.write(`  ${COLOR_RED}compiler binary does not exist${COLOR_END}\n`);
  process.exitCode = 1;
}
