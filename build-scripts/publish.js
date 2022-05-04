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

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');

const packagesDirPath = path.resolve(__dirname, '../packages');
const packages = fs.readdirSync(packagesDirPath);

function isPackageVersionPublished(packageName, version) {
  return fetch(`https://registry.npmjs.org/${encodeURI(packageName)}/${version}`)
      .then((res) => {
        return res.ok
      });
}

async function publishPackagesIfNeeded(packageDir) {
  const pkgJson = JSON.parse(await fsPromises.readFile(`${packageDir}/package.json`));
  const isAlreadyPublished = await isPackageVersionPublished(pkgJson.name, pkgJson.version);
  if (isAlreadyPublished) {
    console.log('Already published', pkgJson.name, pkgJson.version);
  } else {
    console.log('Needs published', pkgJson.name, pkgJson.version);
  }
}

let publicationPromise = Promise.resolve();
packages.forEach((packageName) => {
  const packageJsonPath = `${packagesDirPath}/${packageName}/package.json`;
  try {
    fs.statSync(packageJsonPath); // check if file exists
  } catch {
    return;
  }
  publicationPromise = publicationPromise.then(() => publishPackagesIfNeeded(path.dirname(packageJsonPath)));
});
