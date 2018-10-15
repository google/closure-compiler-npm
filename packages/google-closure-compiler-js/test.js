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

const ESC = '\u001B';
const COLOR_END = ESC + '[0m';
const COLOR_RED = ESC + '[91m';
const COLOR_GREEN = ESC + '[92m';
const COLOR_DIM = ESC + '[2m';

process.stdout.write('google-closure-compiler-js\n');
try {
  require('./');
  process.stdout.write(`  ${COLOR_GREEN}✓${COLOR_END} ${COLOR_DIM}jscomp exists${COLOR_END}\n`);
} catch (e) {
  process.stdout.write(`  ${COLOR_RED}jscomp does not exist${COLOR_END}\n`);
  process.exitCode = 1;
}
