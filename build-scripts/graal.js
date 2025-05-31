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
 * @fileoverview
 *
 * Build the graal native compiler image for the current OS.
 * Intended to be run with a working directory of the intended package.
 */

import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';
import runCommand from './run-command.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// This script should catch and handle all rejected promises.
// If it ever fails to do so, report that and exit immediately.
process.on('unhandledRejection', error => {
  console.error(error);
  process.exit(1);
});

const NATIVE_IMAGE_BUILD_ARGS = [
  '-H:+UnlockExperimentalVMOptions',
  '-H:IncludeResourceBundles=org.kohsuke.args4j.Messages',
  '-H:IncludeResourceBundles=org.kohsuke.args4j.spi.Messages',
  '-H:IncludeResourceBundles=com.google.javascript.jscomp.parsing.ParserConfig',
  '-H:+AllowIncompleteClasspath',
  `-H:ReflectionConfigurationFiles=${path.resolve(__dirname, 'reflection-config.json')}`,
  '-H:IncludeResources=externs\.zip',
  '-H:IncludeResources=.*\.typedast',
  '-H:IncludeResources=com/google/javascript/.*\.js',
  '-H:IncludeResources=com/google/javascript/.*\.txt',
  '-H:IncludeResources=lib/.*\.js',
  '-H:IncludeResources=META-INF/.*\.txt',
  '-H:+ReportExceptionStackTraces',
  // '-H:+GenerateEmbeddedResourcesFile', // Available on Graal JDK 24 and newer
  '--report-unsupported-elements-at-runtime',
  '--initialize-at-build-time',
  '--color=always',
  '-jar',
  path.resolve(process.cwd(), 'compiler.jar')
];

const spawnOpts = {};
switch (process.platform) {
  case 'win32':
    spawnOpts.shell = true;
    break;
  case 'linux':
    // On linux, statically link all libraries. Allows usage on systems
    // which are missing or have incompatible versions of GLIBC.
    // Only linux x86 architectures can fully statically link
    // See https://www.graalvm.org/latest/reference-manual/native-image/guides/build-static-executables/
    if (process.arch !== 'arm64') {
      NATIVE_IMAGE_BUILD_ARGS.unshift('--static', '--libc=musl');
    } else {
      NATIVE_IMAGE_BUILD_ARGS.unshift('--static-nolibc');
    }
    break;
  case 'darwin': {
    NATIVE_IMAGE_BUILD_ARGS.unshift('--static-nolibc');
    break;
  }
}

runCommand(`native-image${process.platform === 'win32' ? '.cmd' : ''}`, NATIVE_IMAGE_BUILD_ARGS, spawnOpts)
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
