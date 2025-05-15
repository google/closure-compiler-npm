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
import {spawn} from 'node:child_process';

/**
 * Execute a shell command as a promise which resolves to an Array of the form
 *     [standardOut: string, standardError: string, exitCode: number]
 *
 * @param {string} cmd
 * @param {(Array<strings>|Object)=} args if undefined, the cmd argument is assumed to contain
 *   arguments and will be split on whitespace
 * @param {Object=} spawnOpts
 * @return {!Promise<!{stdout: string, stderr: string, exitCode: number}>}
 */
export default function(cmd, args, spawnOpts) {
  if (!spawnOpts && args && !Array.isArray(args)) {
    spawnOpts = args;
    args = undefined;
  }
  if (!args || !Array.isArray(args)) {
    // TODO(ChadKillingsworth): Not really safe in general, since this could split in the middle of quoted strings.
    // This is good enough for the purposes of this script.
    const commandParts = cmd.split(/\s+/);
    cmd = commandParts[0];
    args = commandParts.slice(1);
  }
  // child process should inherit stdin/out/err from this process unless spawnOpts says otherwise
  spawnOpts = {
    stdio: 'inherit',
    ...spawnOpts,
  };

  let externalProcess;
  const promise = new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';

    externalProcess = spawn(cmd, args, spawnOpts);
    externalProcess.on('error', (err) => {
      if (!err) {
        err = new Error(stderr || 'external process error');
      } else if (!(err instanceof Error)) {
        err = new Error(err);
      }
      err.stdout = stdout;
      err.stderr = stderr;
      err.exitCode = 1;
      reject(err);
    });
    externalProcess.on('close', (exitCode) => {
      if (exitCode != 0) {
        const err = new Error(`non-zero exit code ${exitCode}`);
        err.stdout = stdout;
        err.stderr = stderr;
        err.exitCode = exitCode;
        reject(err);
      }
      resolve({stdout, stderr, exitCode});
    });
    if (externalProcess.stdout) {
      externalProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }
    if (externalProcess.stderr) {
      externalProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }
  });
  promise.childProcess = externalProcess;
  return promise;
}
