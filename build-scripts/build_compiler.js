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
 *
 * For pull requests and pushes to master, the compiler submodule is expected to be pointed at the tagged commit
 * that matches the package major version.
 *
 * When the COMPILER_NIGHTLY env variable is set, the compiler submodule will be pointing to the latest master
 * commit. This is for regular integration testing of the compiler with the various tests in this repo's packages.
 * In this case the compiler will be built as a SNAPSHOT.
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

function getCompilerSubmoduleReleaseVersion() {
  const gitTagResults = spawnSync('git', ['tag', '--points-at', 'HEAD'], {
    cwd: './compiler'
  });
  if (gitTagResults.status === 0) {
    const currentTag = gitTagResults.stdout.toString().replace(/\s/g, '');
    let normalizedTag = currentTag;
    if (normalizedTag) {
      // Standard release tags are of the form "vYYYYMMDD".
      // We also recognize the forms where a special release name is present:
      //     "webpack-v20180810"
      //     "v20180810-gwt-fix"
      normalizedTag = currentTag.replace(/^([a-z]+-)?(v\d{8})(.*)$/, '$2');
    }
    return normalizedTag;
  }
}

let compilerVersion = getCompilerSubmoduleReleaseVersion();
if (compilerVersion === `v${packageVersion.major}`) {
  // Since the tagged commit pom.xml files are still set as SNAPSHOT versions,
  // update these files to the correct version so that the `compiler --version` command is correct.
  // TODO(chadkillingsworth): Find a better way to do this
  const pomPaths = glob.sync('./compiler/**/pom*.xml');
  pomPaths.forEach(pomPath => {
    const contents = fs.readFileSync(pomPath, 'utf8');
    fs.writeFileSync(pomPath, contents.replace('<version>1.0-SNAPSHOT</version>', `<version>${compilerVersion}</version>`), 'utf8');
  });
} else {
  compilerVersion = '1.0-SNAPSHOT';
}

const compilerJavaBinaryPath = `./compiler/target/closure-compiler-${compilerVersion}.jar`;
const compilerJsBinaryPath = `./compiler/target/closure-compiler-gwt-${compilerVersion}/jscomp/jscomp.js`;

console.log(process.platform, process.arch, compilerVersion);

function copyCompilerBinaries() {
  const reportErrors = err => {
    if (err) {
      throw new Error(err);
    }
  };
  ncp(compilerJavaBinaryPath, './packages/google-closure-compiler-java/compiler.jar', reportErrors);
  ncp(compilerJavaBinaryPath, './packages/google-closure-compiler-linux/compiler.jar', reportErrors);
  ncp(compilerJavaBinaryPath, './packages/google-closure-compiler-osx/compiler.jar', reportErrors);
  ncp(compilerJsBinaryPath, './packages/google-closure-compiler-js/jscomp.js', reportErrors);
  ncp('./compiler/contrib', './packages/google-closure-compiler/contrib', reportErrors);
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
    // Add a license header to the gwt version jscomp.js file since the compiler build omits this.
    // If the gwt version ever has a source map, the source mappings will need updated to account for the
    // prepended lines.
    const jscompFileContents = fs.readFileSync(compilerJsBinaryPath, 'utf8');
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
 ${jscompFileContents}`,
        'utf8');
    copyCompilerBinaries();
  });
} else {
  copyCompilerBinaries();
}
