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
 * @fileoverview Create a nightly version of the package to publish to npm.
 * The compiler in this version will be a snapshot version.
 */

const runCommand = require('./run-command');
const glob = require('glob');
const path = require('path');

const today = new Date();
const month = (today.getMonth() < 9 ? '0' : '') + (today.getMonth() + 1).toString();
const day = (today.getDate() < 10 ? '0' : '') + today.getDate().toString();

// Version number is today's date with a -nightly prerelease suffix.
const nightlyVersion = `${today.getFullYear()}${month}${day}.0.0-nightly`;

(async () => {
  try {
    // Lerna won't release packages on an already release tagged commit or
    // on a disconnected HEAD. Create a branch then commit the os changes for this nightly release.
    await runCommand('git', ['checkout', '-b', `publish-${nightlyVersion}`]);
    await runCommand('git', ['add', 'compiler']);
    await runCommand('git', ['add', 'packages/google-closure-compiler-linux/package.json']);
    await runCommand('git', ['add', 'packages/google-closure-compiler-osx/package.json']);
    await runCommand('git', ['add', 'packages/google-closure-compiler-windows/package.json']);
    await runCommand('git', ['commit', '-m', `Create version for nightly release ${nightlyVersion}`]);
    // Get the list of packages in this repo
    const packages = glob.sync('packages/google-closure-compiler*')
        .map(packagePath => packagePath.replace('packages/', ''));

    // Create a nightly version of all the packages
    await runCommand(
      'node',
      [
        './build-scripts/lerna-publish.js',
        'version',
        nightlyVersion,
        '--push=false', // prevent the version commit from being pushed back to the repo
        `--force-publish=${packages.join(',')}`, // publish every package even though no changes are detected
        '--yes', // don't prompt for confirmation
      ]);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();
