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
/**
 * @fileoverview
 *
 * Before publication, add OS restrictions to the graal packages.
 * They can't be present before publication as it errors out the installs.
 * Also set correct architectures. In order to execute `yarn install` in the main package, the current architecture
 */

import fs from 'node:fs';
import path from 'node:path';

// Maps of the os marketing name to the platform name used in package.json os restriction fields
const osRestrictions = new Map([
    ['macos', {os: ['darwin'], cpu: ['arm64']}],
    ['linux', {os: ['linux'], cpu: ['x32', 'x64']}],
    ['linux-arm64', {os: ['linux'], cpu: ['arm64']}],
    ['windows', {os: ['win32'], cpu: ['x32', 'x64']}]
]);

// Read the package.json files, add the OS restriction, then write it back.
osRestrictions.forEach((osAndCpu, packageKey) => {
  const packagePath = path.resolve(__dirname, '..', 'packages', `google-closure-compiler-${packageKey}`, 'package.json');
  const packageContents = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  packageContents.os = osAndCpu.os;
  packageContents.cpu = osAndCpu.cpu;
  fs.writeFileSync(packagePath, JSON.stringify(packageContents, null, 2) + '\n', 'utf8');
});
