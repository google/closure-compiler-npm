#!/usr/bin/env node
'use strict';

var spawn = require('child_process').spawnSync;
var ncp = require('ncp');

var compilerBuild = spawn('ant', ['jar'], {
  cwd: './compiler',
  stdio: 'inherit'
});

if (compilerBuild.status !== 0) {
  throw new Error('compiler build failed');
}

ncp('./compiler/build/compiler.jar', './compiler.jar', function (err) {
  if (err) {
    throw new Error(err);
  }

  ncp('./compiler/contrib', './contrib', function(err) {
    if (err) {
      throw new Error(err);
    }
  });
});
