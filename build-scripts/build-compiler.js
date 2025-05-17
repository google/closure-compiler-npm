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
 * @fileoverview Build the compiler java jar from source.
 *
 * Invoked as part of the package build process:
 *
 *     yarn run build
 *
 * For pull requests and pushes to master, the compiler submodule is expected to be pointed at the tagged commit
 * that matches the package major version.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';
import ncp from 'ncp';
import semver from 'semver';
import runCommand from './run-command.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

/**
 * The compiler version that will be built.
 *
 * For release builds, this is of the form: "vYYYYMMDD"
 *
 * @type {string}
 */
const compilerVersion = `v${semver.major(packageInfo.version)}`;

const compilerTargetName = 'compiler_uberjar_deploy.jar';
const compilerJavaBinaryPath = `./compiler/bazel-bin/${compilerTargetName}`;

async function main() {
  console.log(process.platform, process.arch, compilerVersion);

  const { exitCode } = await runCommand(
    'bazelisk',
    [
      'build',
      '--color=yes',
      `//:${compilerTargetName}`,
      `--define=COMPILER_VERSION=${compilerVersion}`,
    ],
    { cwd: './compiler' }
  );
  if (exitCode !== 0) {
    throw new Error(exitCode);
  }

  return Promise.all([
    copy(
      compilerJavaBinaryPath,
      './packages/google-closure-compiler-java/compiler.jar'
    ),
    copy(
      compilerJavaBinaryPath,
      './packages/google-closure-compiler-linux/compiler.jar'
    ),
    copy(
        compilerJavaBinaryPath,
        './packages/google-closure-compiler-linux/compiler-arm64.jar'
    ),
    copy(
      compilerJavaBinaryPath,
      './packages/google-closure-compiler-macos/compiler.jar'
    ),
    copy(
      compilerJavaBinaryPath,
      './packages/google-closure-compiler-windows/compiler.jar'
    ),
    copy('./compiler/contrib', './packages/google-closure-compiler/contrib'),
  ]);
}

/**
 * @param {string} src path to source file or folder
 * @param {string} dest path to destination file or folder
 * @return {!Promise<undefined>}
 */
function copy(src, dest) {
  return new Promise((resolve, reject) => {
    ncp(src, dest, (err) => {
      err ? reject(err) : resolve();
    });
  });
}

main();
