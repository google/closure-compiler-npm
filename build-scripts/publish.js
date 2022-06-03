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

'use strict';
/**
 * @fileoverview
 *
 * Before publication, add OS restrictions to the graal packages.
 * They can't be present before publication as it errors out the installs.
 */

const fs = require('fs/promises');
const path = require('path');
const runCommand = require('./run-command');

const packagesDirPath = path.resolve(__dirname, '../packages');

function isPackageVersionPublished(packageName, version) {
  return fetch(`https://registry.npmjs.org/${encodeURI(packageName)}/${version}`)
      .then((res) => res.ok);
}

async function isValidPackagePath(packageDir) {
  const packageJsonPath = `${packageDir}/package.json`;
  try {
    await fs.stat(packageJsonPath);
    return true
  } catch {
    return false;
  }
}

async function getPackageInfo(packagePath) {
  return {
    path: packagePath,
    pkg: JSON.parse(await fs.readFile(`${packageDir}/package.json`))
  };
}

async function publishPackagesIfNeeded(packageDir) {
  const packageJsonPath = `${packageDir}/package.json`;
  try {
    await fs.stat(packageJsonPath);
  } catch {
    return;
  }
  const pkgJson = JSON.parse(await fs.readFile(`${packageDir}/package.json`));
  const isAlreadyPublished = await isPackageVersionPublished(pkgJson.name, pkgJson.version);
  if (isAlreadyPublished) {
    console.log('Already published', pkgJson.name, pkgJson.version);
  } else {
    console.log('Publishing', pkgJson.name, pkgJson.version);
    const publishArgs = [];
    if (process.env.COMPILER_NIGHTLY ) {
      publishArgs.push('--npm-tag', 'nightly');
    }
    await runCommand('npm', ['publish'].concat(publishArgs), {
      cwd: packageDir
    });
  }
}

function getPackageInternalDeps(pkgJson) {
  
}

(async () => {
  const packagesDirEntries = await fs.readdir(packagesDirPath);
  const packagesInfo = [];
  for (let i = 0; i < packagesDirEntries.length; i++) {
    const packagePath = `${packagesDirPath}/${packagesDirEntries[i]}`;
    if (await isValidPackagePath(packagePath)) {
      packagesInfo.push(await getPackageInfo(packagePath));
    }
  }
  const packageDeps = new Map([
    packagesInfo.map((info) => [info.name, new Set()])
  ]);
})();
// fs.readdir(packagesDirPath)
//     .then((packages) =>
//         packages.reduce(
//             (prevPublish, packageDir) =>
//                 prevPublish.then(() => publishPackagesIfNeeded(`${packagesDirPath}/${packageDir}`)),
//             Promise.resolve()));
