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

const path = require('path');
const runCommand = require('./run-command');

// This script should catch and handle all rejected promises.
// If it ever fails to do so, report that and exit immediately.
process.on('unhandledRejection', error => {
  console.error(error);
  process.exit(1);
});

const NATIVE_IMAGE_BUILD_ARGS = [
  '-H:+ReportUnsupportedElementsAtRuntime',
  '-H:IncludeResourceBundles=org.kohsuke.args4j.Messages',
  '-H:IncludeResourceBundles=org.kohsuke.args4j.spi.Messages',
  '-H:IncludeResourceBundles=com.google.javascript.jscomp.parsing.ParserConfig',
  '-H:+AllowIncompleteClasspath',
  `-H:ReflectionConfigurationFiles=${path.resolve(__dirname, 'reflection-config.json')}`,
  '-H:IncludeResources=(externs.zip)|(.*(js|txt|typedast))'.replace(/[\|\(\)]/g, (match) => {
    if (process.platform === 'win32') {
      // Escape the '|' character in a  windows batch command
      // See https://stackoverflow.com/a/16018942/1211524
      if (match === '|') {
        return '^^^|';
      }
      return `^${match}`;
    }
    return '|';
  }),
  '-H:+ReportExceptionStackTraces',
  '-H:Log=registerResource:3',
  '--initialize-at-build-time',
  '-jar',
  path.resolve(process.cwd(), 'compiler.jar')
];

runCommand(`native-image${process.platform === 'win32' ? '.cmd' : ''}`, NATIVE_IMAGE_BUILD_ARGS)
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
