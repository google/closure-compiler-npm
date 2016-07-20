#!/usr/bin/env node
'use strict';

var spawn = require('child_process').spawnSync;
var ncp = require('ncp');
var version = require('./package.json').version

var mavenVersion = 'v' + version.split('.')[0];
var url =
    'https://repo1.maven.org/maven2/com/google/javascript/closure-compiler/'
    + mavenVersion + '/closure-compiler-' + mavenVersion + '.jar';

var compilerBuild = spawn('wget', ['-O', './compiler.jar', url], {
  stdio: 'inherit'
});

if (compilerBuild.status !== 0) {
  throw new Error('Downloading compiler jar from Maven Central failed');
}

ncp('./compiler/contrib', './contrib', function(err) {
  if (err) {
    throw new Error(err);
  }
});
