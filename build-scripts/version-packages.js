#!/usr/bin/env node
/*
 * Copyright 2022 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
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
 * Create a new version for each package.
 * Update any dependencies on other packages in this project.
 */

import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const newVersion = process.env.npm_package_version;
const packagesDirPath = path.resolve(__dirname, '../packages');
const packages = fs.readdirSync(packagesDirPath);

packages.forEach((packageName) => {
  const packageJsonPath = `${packagesDirPath}/${packageName}/package.json`;
  // Only directories that have package.json files are packages in this project.
  // For instance, the google-closure-compiler-js directory only has a readme for historical purposes and should
  // be excluded.
  try {
    fs.statSync(packageJsonPath); // check if file exists
  } catch {
    return;
  }
  const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath));
  pkgJson.version = newVersion;

  ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']
      .forEach((dependencyType) =>{
        if (!pkgJson[dependencyType]) {
          return;
        }
        Object.keys(pkgJson[dependencyType]).forEach((dependencyName) => {
          if (packages.includes(dependencyName)) {
            pkgJson[dependencyType][dependencyName] = `^${newVersion}`;
          }
        });
      });
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`, 'utf8');
  childProcess.execSync(`git add "${packageJsonPath}"`);
});
