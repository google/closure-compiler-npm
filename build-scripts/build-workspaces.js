#!/usr/bin/env node
/*
 * Copyright 2019 The Closure Compiler Authors.
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
 * Patch yarn for use with git-bash
 * See https://github.com/yarnpkg/yarn/issues/5349
 */

const runCommand = require('./run-command');

// This script should catch and handle all rejected promises.
// If it ever fails to do so, report that and exit immediately.
process.on('unhandledRejection', error => {
  console.error(error);
  process.exit(1);
});

function buildEachWorkspace(workspaces) {
  if (!workspaces || workspaces.length < 1) {
    return Promise.resolve();
  }
  const workspaceKeys = Object.keys(workspaces);
  if (workspaceKeys.length === 0) {
    return Promise.resolve();
  }
  return runCommand('yarn run build', {cwd: workspaces[workspaceKeys[0]].location})
      .then(() => {
        const remainingKeys = {};
        workspaceKeys.slice(1).forEach(remainingKey => {
          remainingKeys[remainingKey] = workspaces[remainingKey];
        });
        return buildEachWorkspace(remainingKeys);
      })
      .catch(e => {
        console.error(e);
        process.exit(1);
      })
}

runCommand('yarn --json workspaces info', {stdio: 'pipe'})
    .then(({stdout, stderr, exitCode}) => buildEachWorkspace(JSON.parse(JSON.parse(stdout).data)))
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
