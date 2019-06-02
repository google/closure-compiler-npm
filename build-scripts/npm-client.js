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
 * @fileoverview Custom npm client for lerna publication on Travis.
 *
 * This actually uses `npm publish` to do the actual publish, but special cases specific behaviors.
 *
 * Modifies standard npm publication in 2 ways:
 *   1. Checks that all the dependencies from the target package have their dependencies
 *       already published before publishing.
 *   2. Publishes still succeed in the case that they were already published.
 *       Allows Travis to publish on every commit.
 */

const fs = require('fs');
const path = require('path');
const runCommand = require('./run-command');

// This script should catch and handle all rejected promises.
// If it ever fails to do so, report that and exit immediately.
process.on('unhandledRejection', error => {
  console.error(error);
  process.exit(1);
});

const logMessageQueue = [];

/**
 * Simple function to log out publication process to a file. Standard out doesn't work because lerna
 * swallows it.
 *
 * @param {string} message
 */
function logToFile(message) {
  fs.writeFileSync(path.resolve(__dirname, '..', 'publish-log.txt'), `${message}\n`, {
    flag: 'a' // Append to file
  });
}

/**
 * Publish the package using `npm publish`.
 *
 * If the publish fails with an error that indicates the package has already been published,
 * resolve the promise.
 *
 * @param {!Object<string, string|!Array|boolean>} packageInfo from the package.json file
 * @return {!Promise<undefined>}
 */
function npmPublish(packageInfo) {
  return runCommand('npm', process.argv.slice(2))
      .catch(results => {
        if (!/You cannot publish over the previously published versions/.test(results.stderr)) {
          return Promise.reject(new Error(`Publish failed ${JSON.stringify(results, null, 2)}`));
        }
      });
}

// Log out what folder we are executing this from and the call arguments
logMessageQueue.push(`Publishing ${path.basename(process.cwd())}`);

// Add logic specific to each pacakge
const pkg = require(path.resolve(process.cwd(), 'package.json'));
switch (pkg.name) {
  case 'google-closure-compiler-linux':
  case 'google-closure-compiler-osx':
    // We only want to publish the linux or osx package from a Travis instance running on the correct os
    if (pkg.name === 'google-closure-compiler-linux' && process.platform !== 'linux' ||
        pkg.name === 'google-closure-compiler-osx' && process.platform !== 'darwin') {
      logMessageQueue.push(`    skipping publication of ${pkg.name} - wrong platform`);
      process.exitCode = 0;
    } else {
      npmPublish(pkg)
          .then(() => {
            logMessageQueue.push('  ✅ publish succeeded');
            logToFile(logMessageQueue.join('\n'));
          })
          .catch(err => {
            process.exitCode = 1;
            logMessageQueue.push('   ❌ publish failed');
            logToFile(logMessageQueue.join('\n'));
            return Promise.reject(err);
          });
    }
    break;

  default:
    npmPublish(pkg)
        .then(() => {
          logMessageQueue.push('  ✅ publish succeeded');
          logToFile(logMessageQueue.join('\n'));
        })
        .catch(err => {
          process.exitCode = 1;
          logMessageQueue.push('   ❌ publish failed');
          logToFile(logMessageQueue.join('\n'));
          return Promise.reject(err);
        });
    break;
}
