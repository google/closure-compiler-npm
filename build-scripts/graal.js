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
'use strict';
/**
 * @fileoverview
 *
 * Build the graal native compiler image for the current OS.
 * Intended to be run with a working directory of the intended package.
 */

const {spawn} = require('child_process');
const fs = require('fs');
const path = require('path');
const ncp = require('ncp');
const {
  GRAAL_OS,
  GRAAL_FOLDER,
  GRAAL_VERSION,
  GRAAL_URL
} = require('./graal-env');
const TEMP_PATH = path.resolve(__dirname, '../temp');

// This script should catch and handle all rejected promises.
// If it ever fails to do so, report that and exit immediately.
process.on('unhandledRejection', error => {
  console.error(error);
  process.exit(1);
});

/**
 * Simple wrapper for the NodeJS spawn command to use promises
 *
 * @param {string} command
 * @param {Object=} spawnOpts
 * @return {!Promise<undefined>}
 */
function runCommand(command, spawnOpts = {}) {
  // log command being executed to stdout for debugging
  process.stdout.write(`${command}\n`);
  return new Promise((resolve, reject) => {
    // TODO(ChadKillingsworth): Not really safe in general, since this could split in the middle of quoted strings.
    // This is good enough for the purposes of this script.
    const commandParts = command.split(/\s+/);
    // child process should inherit stdin/out/err from this process unless spawnOpts says otherwise
    const opts = Object.assign({}, {
      stdio: 'inherit'
    }, spawnOpts);
    const externalProcess = spawn(commandParts[0], commandParts.slice(1), opts);
    externalProcess.on('error', err => {
      process.stderr.write(`${err.toString()}\n`);
      reject(err);
    });
    externalProcess.on('close', exitCode => {
      if (exitCode != 0) {
        process.stderr.write(`non zero exit code ${exitCode}\n`);
        process.exit(1);
        reject();
      }
      resolve();
    });
  });
}

// Build graal from source
if (!fs.existsSync(TEMP_PATH)) {
  fs.mkdirSync(TEMP_PATH);
}

const NATIVE_IMAGE_BUILD_ARGS = [
  '-H:+JNI',
  '--no-server',
  '-H:+ReportUnsupportedElementsAtRuntime',
  '-H:IncludeResourceBundles=com.google.javascript.rhino.Messages',
  '-H:IncludeResourceBundles=org.kohsuke.args4j.Messages',
  '-H:IncludeResourceBundles=org.kohsuke.args4j.spi.Messages',
  '-H:IncludeResourceBundles=com.google.javascript.jscomp.parsing.ParserConfig',
  `-H:ReflectionConfigurationFiles=${path.resolve(__dirname, 'reflection-config.json')}`,
  '-H:IncludeResources=(externs.zip)|(.*(js|txt))',
  '-jar',
  path.resolve(process.cwd(), 'compiler.jar')
];
let buildSteps = Promise.resolve();
// Download Graal
const GRAAL_ARCHIVE_FILE = `${GRAAL_FOLDER}.tar.gz`;
// Build the compiler native image.
const GRAAL_BIN_FOLDER = path.resolve(
    TEMP_PATH,
    `graalvm-ce-${GRAAL_VERSION}`,
    ...(GRAAL_OS === 'darwin' ? ['Contents', 'Home'] : []).concat(['bin']));
if (!fs.existsSync(path.resolve(TEMP_PATH, GRAAL_FOLDER))) {
  const GRAAL_GU_PATH = path.resolve(GRAAL_BIN_FOLDER, 'gu');
  buildSteps = buildSteps
      .then(() => {
        // Download graal and extract the contents
        if (!fs.existsSync(path.resolve(TEMP_PATH, GRAAL_ARCHIVE_FILE))) {
          return runCommand(
              `curl --fail --show-error --location --progress-bar --output ${GRAAL_ARCHIVE_FILE} ${GRAAL_URL}`,
              {cwd: TEMP_PATH});
        }
      })
      .then(() => runCommand(`tar -xzf ${GRAAL_ARCHIVE_FILE}`, {cwd: TEMP_PATH}))
      .then(() => runCommand(`${GRAAL_GU_PATH} install native-image`));
}

// Build the compiler native image.
const GRAAL_NATIVE_IMAGE_PATH = path.resolve(
    GRAAL_BIN_FOLDER,
    'native-image');

// Unlike the mx launched version, the native binary must not have quotes around arguments
buildSteps = buildSteps.then(
    () => runCommand(`${GRAAL_NATIVE_IMAGE_PATH} ${NATIVE_IMAGE_BUILD_ARGS.join(' ')}`));
