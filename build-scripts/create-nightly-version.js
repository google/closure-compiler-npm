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

const today = new Date();
const month = (today.getMonth() < 9 ? '0' : '') + (today.getMonth() + 1).toString();
const day = (today.getDate() < 10 ? '0' : '') + today.getDate().toString();

// Version number is today's date with a -nightly prerelease suffix.
const nightlyVersion = `${today.getFullYear()}${month}${day}.0.0-nightly`;

(async () => {
  try {
    // Create a branch then commit the changes for this nightly release.
    await runCommand('git', ['checkout', '-b', `publish-${nightlyVersion}`]);
    await runCommand('git', ['add', 'compiler']);
    await runCommand(
        'yarn',
        [
            'version',
            '--new-version',
            nightlyVersion,
            '--message',
            `Create version for nightly release ${nightlyVersion}`
        ]
    );
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();
