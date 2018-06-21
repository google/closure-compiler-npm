#!/usr/bin/env node
'use strict';

const {spawn, spawnSync} = require('child_process');
const ncp = require('ncp');
const Semver = require('semver');
const version = require('./package.json').version;
const fs = require('fs');
const packageVer = new Semver(version);

const mavenVersion = 'v' + version.split('.')[0];
const url =
    'https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/'
    + mavenVersion + '/closure-compiler-' + mavenVersion + '.jar';

let shouldDownloadCompiler = true;
let compilerJarStats = null;
try {
  compilerJarStats = fs.statSync('./compiler.jar');
} catch (e) {}
if (compilerJarStats && compilerJarStats.isFile()) {
  const versionOutput = spawnSync('java',  ['-jar', 'compiler.jar', '--version']);
  for (let line of versionOutput.output) {
    if (line) {
      const lineString = line.toString();
      const versionParts = /^Version: v(\d+)(?:[-\.][-a-z0-9]+)?$/m.exec(lineString);
      if (versionParts) {
        shouldDownloadCompiler = parseInt(versionParts[1], 10) < packageVer.major;
      }
    }
  }
}

if (shouldDownloadCompiler) {
   const compilerBuild = spawnSync('curl', ['-s', '-S', '-L', '-o', './compiler.jar', url], {
    stdio: 'inherit'
   });

   if (compilerBuild.status !== 0) {
    throw new Error('Downloading compiler jar from Maven Central failed');
   }
}

ncp('./compiler/contrib', './contrib', err => {
  if (err) {
    throw new Error(err);
  }
});

if (shouldDownloadCompiler) {
  const gwtBuild = spawn(
      'mvn', ['-DskipTests', '-f', 'pom-gwt.xml', 'clean', 'install'], {
        cwd: './compiler',
        stdio: 'inherit',
      });
  gwtBuild.on('error', err => {
    throw err;
  });
  gwtBuild.on('close', exitCode => {
    if (exitCode != 0) {
      process.exit(1);
      return;
    }
    ncp('./compiler/target/closure-compiler-gwt-1.0-SNAPSHOT/jscomp/jscomp.js', './jscomp.js', err => {
      if (err) {
        throw new Error(err);
      }
    });
  });
}
