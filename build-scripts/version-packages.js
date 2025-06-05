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
import parseArgs from 'minimist';
import semver from 'semver';

const flags = parseArgs(process.argv.slice(2));
if (!flags['new-version']) {
  process.stderr.write(`No new version specified\n`);
  process.exit();
}
const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootPackageJsonPath = path.resolve(__dirname, '../package.json');
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf-8'));
const currentVersion = semver(rootPackageJson.version);
const newVersion = semver(flags['new-version']);

if (!semver.gt(newVersion, currentVersion)) {
  process.stderr.write(`New version must be greater than current version\n`);
  process.exit();
}

rootPackageJson.version = newVersion.toString();
fs.writeFileSync(rootPackageJsonPath, `${JSON.stringify(rootPackageJson, null, 2)}\n`, 'utf8');
childProcess.execSync(`git add "${rootPackageJsonPath}"`, {stdio: 'inherit'});

const dependencyTypes = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];

const packagesDirPath = path.resolve(__dirname, '../packages');
const packages = fs.readdirSync(packagesDirPath);

for (const packageName of packages) {
  const packageJsonPath = `${packagesDirPath}/${packageName}/package.json`;
  // Only directories that have package.json files are packages in this project.
  // For instance, the google-closure-compiler-js directory only has a readme for historical purposes and should
  // be excluded.
  try {
    fs.statSync(packageJsonPath); // check if file exists
  } catch {
    continue;
  }
  const pkgJson = JSON.parse(fs.readFileSync(packageJsonPath));
  pkgJson.version = newVersion.toString();

  for (const dependencyType of dependencyTypes) {
    for (const dependencyName of Object.keys(pkgJson[dependencyType] || {})) {
      if (packages.includes(dependencyName)) {
        pkgJson[dependencyType][dependencyName] = `^${newVersion.toString()}`;
      }
    }
  }
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(pkgJson, null, 2)}\n`, 'utf8');
  childProcess.execSync(`git add "${packageJsonPath}"`, {stdio: 'inherit'});
}

childProcess.execSync(`yarn install --no-immutable`, {stdio: 'inherit'});
childProcess.execSync(`git add "${path.resolve(__dirname, '../yarn.lock')}"`, {stdio: 'inherit'});
childProcess.execSync(`git commit -m "v${newVersion.toString()}"`, {stdio: 'inherit'});
childProcess.execSync(`git tag -a v${newVersion.toString()} -m "v${newVersion.toString()}"`, {stdio: 'inherit'});
