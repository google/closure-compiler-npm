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
 * @fileoverview Build the compiler java jar and GWT platforms from source.
 *
 * Invoked as part of the package build process:
 *
 *     yarn run build
 */
'use strict';

const {spawn, spawnSync} = require('child_process');
const ncp = require('ncp');
const Semver = require('semver');

// Master version number of the packages. Replaces the version
// information from the root package.json file.
const packageInfo = require('../lerna.json');
const packageVersion = new Semver(packageInfo.version);

const fs = require('fs');
const glob = require('glob');

const gitTagResults = spawnSync('git', ['tag', '--points-at', 'HEAD'], {
  cwd: './compiler'
});
let compilerVersion = '1.0-SNAPSHOT';
if (gitTagResults.status === 0) {
  const currentTag = gitTagResults.stdout.toString().replace(/\s/g, '');
  let normalizedTag = currentTag;
  if (normalizedTag) {
    // Standard release tags are of the form "vYYYYMMDD".
    // We also recognize the form where a special release name proceeds it:
    //     "webpack-v20180810"
    //     "v20180810-gwt-fix"
    normalizedTag = currentTag.replace(/^([a-z]+-)?(v\d{8})(.*)$/, '$2');
  }

  // If the compiler submodule is pointing at a tagged version that matches the package
  // major version, update the compiler build to use the correct version number.
  if (normalizedTag === `v${packageVersion.major}`) {
    compilerVersion = normalizedTag;
    const pomPaths = glob.sync('./compiler/**/pom*.xml');
    pomPaths.forEach(pomPath => {
      const contents = fs.readFileSync(pomPath, 'utf8');
      fs.writeFileSync(pomPath, contents.replace('<version>1.0-SNAPSHOT</version>', `<version>${compilerVersion}</version>`), 'utf8');
    });
  }
}

const compilerJavaBinaryPath = `./compiler/target/closure-compiler-${compilerVersion}.jar`;
const compilerJsBinaryPath = `./compiler/target/closure-compiler-gwt-${compilerVersion}/jscomp/jscomp.js`;

console.log(process.platform, process.arch, compilerVersion);

function copyCompilerBinaries() {
  ncp(compilerJavaBinaryPath, './packages/google-closure-compiler-java/compiler.jar', err => {
    if (err) {
      throw new Error(err);
    }
  });
  ncp(compilerJavaBinaryPath, './packages/google-closure-compiler-linux/compiler.jar', err => {
    if (err) {
      throw new Error(err);
    }
  });
  ncp(compilerJavaBinaryPath, './packages/google-closure-compiler-osx/compiler.jar', err => {
    if (err) {
      throw new Error(err);
    }
  });
  ncp(compilerJsBinaryPath, './packages/google-closure-compiler-js/jscomp.js', err => {
    if (err) {
      throw new Error(err);
    }
  });
  ncp('./compiler/contrib', './packages/google-closure-compiler/contrib', err => {
    if (err) {
      throw new Error(err);
    }
  });
}

if (!fs.existsSync(compilerJavaBinaryPath) || !fs.existsSync(compilerJsBinaryPath)) {
  spawnSync('mvn', ['clean'], {cwd: './compiler', stdio: 'inherit'});
  const compilerBuild = spawn(
      'mvn',
      [
        '-DskipTests',
        '-pl',
        'externs/pom.xml,pom-main.xml,pom-main-shaded.xml,pom-gwt.xml',
        'install'
      ],
      {
        cwd: './compiler',
        stdio: 'inherit',
      });
  compilerBuild.on('error', err => {
    throw err;
  });
  compilerBuild.on('close', exitCode => {
    if (exitCode != 0) {
      process.exit(1);
      return;
    }
    fs.writeFileSync(
        compilerJsBinaryPath,
        `/*
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
 ${fs.readFileSync(compilerJsBinaryPath, 'utf8')}`,
        'utf8');
    copyCompilerBinaries();
  });
} else {
  copyCompilerBinaries();
}
