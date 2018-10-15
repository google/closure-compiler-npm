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

const {spawn, spawnSync} = require('child_process');
const ncp = require('ncp');
const Semver = require('semver');
const version = require('../lerna.json').version;
const fs = require('fs');
const packageVer = new Semver(version);
const glob = require('glob');

const gitCmd = spawnSync('git', ['tag', '--points-at', 'HEAD'], {
  cwd: './compiler'
});
let compilerVersion = '1.0-SNAPSHOT';
if (gitCmd.status === 0) {
  const currentTag = gitCmd.stdout.toString().replace(/\s/g, '');
  let normalizedTag = currentTag;
  if (normalizedTag) {
    normalizedTag = currentTag.replace(/^([a-z]+-)?v\d{8}(.*)$/,
        (match, g1, g2) => match.substr((g1 || '').length, match.length - (g1 || '').length - (g2 || '').length));
  }

  // If the compiler submodule is pointing at a tagged version that matches the package
  // major version, update the compiler build to use the correct version number.
  if (normalizedTag === `v${packageVer.major}`) {
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
    copyCompilerBinaries();
  });
} else {
  copyCompilerBinaries();
}
