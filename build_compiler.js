#!/usr/bin/env node
'use strict';

var spawn = require('child_process').spawnSync;
var ncp = require('ncp');
var Semver = require('semver');
var version = require('./package.json').version;
var fs = require('fs');
var packageVer = new Semver(version);

var mavenVersion = 'v' + version.split('.')[0];
var url =
    'https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/'
    + mavenVersion + '/closure-compiler-' + mavenVersion + '.jar';

var shouldDownloadCompiler = true;
var compilerJarStats = null;
try {
  compilerJarStats = fs.statSync('./compiler.jar');
} catch (e) {}
if (compilerJarStats && compilerJarStats.isFile()) {
  var versionOutput = spawn('java',  ['-jar', 'compiler.jar', '--version']);
  for (var line of versionOutput.output) {
    if (line) {
      var lineString = line.toString();
      var versionParts = /^Version: v(\d+)$/m.exec(lineString);
      if (versionParts) {
        shouldDownloadCompiler = parseInt(versionParts[1], 10) < packageVer.major;
      }
    }
  }
}

if (shouldDownloadCompiler) {
   var compilerBuild = spawn('curl', ['-s', '-S', '-L', '-o', './compiler.jar', url], {
    stdio: 'inherit'
   });

   if (compilerBuild.status !== 0) {
    throw new Error('Downloading compiler jar from Maven Central failed');
   }
}

ncp('./compiler/contrib', './contrib', function(err) {
  if (err) {
    throw new Error(err);
  }
});
