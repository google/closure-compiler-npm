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

const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');

// This script should catch and handle all rejected promises.
// If it ever fails to do so, report that and exit immediately.
process.on('unhandledRejection', error => {
  console.error(error);
  process.exit(1);
});

/**
 * Simple function to log out publication process to a file. Standard out doesn't work because lerna
 * swallows it.
 *
 * @param {string} message
 */
function logToFile(message) {
  fs.writeFileSync(path.resolve(__dirname, '..', 'publish-log.txt'), `${message}\n`, {
    flag: 'a'
  });
}

/**
 * Execute a shell command as a promise which resolves to an Array of the form
 *     [standardOut: string, standardError: string, exitCode: number]
 *
 * @param {string} cmd
 * @param {!Array<strings>} args
 * @return {!Promise<!Array<string|number>>}
 */
function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    const externalProcess = spawn(cmd, args, {
      stdio: 'pipe'
    });
    externalProcess.on('error', err => {
      reject([stdout, stderr, -1]);
    });
    externalProcess.on('close', exitCode => {
      if (exitCode != 0) {
        reject([stdout, stderr, exitCode]);
      }
      resolve([stdout, stderr, exitCode]);
    });
    externalProcess.stdout.on('data', data => {
      stdout += data.toString();
    });
    externalProcess.stderr.on('data', data => {
      stderr += data.toString();
    });
  });
}

/**
 * Use the `npm view` command to ensure that a package@version combination
 * has already been published to the registry.
 *
 * @param {string} packageWithVersion as specified in a package.json file "name@version"
 * @return {!Promise<undefined>}
 */
function checkThatVersionExists(packageWithVersion) {
  return runCommand('npm', ['view', packageWithVersion])
      .catch(results => {
        logToFile(results[1]);
        return Promise.reject();
      });
}

/**
 * Publish the package using `npm publish`.
 *
 * Ensure that any dependencies on other packages in this repo have already been published.
 * Allows for the fact that the Graal images are published from separate Travis builds.
 * Whichever run finishes last, publishes the main package.
 *
 * If the publish fails with an error that indicates the package has already been published,
 * resolve the promise.
 *
 * @param {!Object<string, string|!Array|boolean>} packageInfo from the package.json file
 * @return {!Promise<undefined>}
 */
function npmPublish(packageInfo) {
  // Check both the "dependencies" and "optionalDependencies" keys
  const depsInfo = [];
  const depNames = [];
  ['dependencies', 'optionalDependencies'].forEach(depBlock => {
    if (!(depBlock in packageInfo)) {
      return;
    }
    Object.keys(packageInfo[depBlock]).forEach(key => {
      if (/google-closure-compiler/.test(key)) {
        depNames.push(`${key}@${packageInfo[depBlock][key]}`);
        depsInfo.push(checkThatVersionExists(`${key}@${packageInfo[depBlock][key]}`)
            .catch(() => {
              throw new Error('Version does not exist');
            }));
      }
    });
  });

  return Promise.all(depsInfo).then(depsInfoResults => {
    for (let i = 0; i < depsInfoResults.length; i++) {
      if (depsInfoResults[i][0].trim().length === 0) {
        return Promise.reject(new Error(`Version does not exist - ${depNames[i]} - ${depsInfoResults[i][0].trim()}`));
      }
    }
  }).then(() => {
    logToFile(`all dependencies published`);
    return runCommand('npm', process.argv.slice(2))
        .catch(results => {
          if (/You cannot publish over the previously published versions/.test(results[1])) {
            return Promise.resolve();
          }
          return Promise.reject(new Error(`Publish failed ${JSON.stringify(results, null, 2)}`));
        });
  }).catch(err => {
    logToFile(`missing dependencies`);
    return Promise.reject(err || new Error('Missing dependencies'));
  });
}

// Log out what folder we are executing this from and the call arguments
logToFile(`(${path.basename(process.cwd())}) npm ${process.argv.slice(2).join(' ')}`);

// Add logic specific to each pacakge
const pkg = require(path.resolve(process.cwd(), 'package.json'));
switch (pkg.name) {
  case 'google-closure-compiler-linux':
  case 'google-closure-compiler-osx':
    // We only want to publish the linux or osx package from a Travis instance running on the correct os
    if (pkg.name === 'google-closure-compiler-linux' && process.platform !== 'linux' ||
        pkg.name === 'google-closure-compiler-osx' && process.platform !== 'darwin') {
      logToFile(`skipping publication of ${pkg.name} - wrong platform`);
      process.exitCode = 0;
    } else {
      npmPublish(pkg).catch(err => {
        process.exitCode = 1;
        logToFile('publish failed');
        return Promise.reject(err || new Error('Publish failed'));
      });
    }
    break;

  default:
    npmPublish(pkg).catch(err => {
      process.exitCode = 1;
      logToFile('publish failed');
      return Promise.reject(err || new Error('Publish failed'));
    });
    break;
}
