/*
 * Copyright 2015 The Closure Compiler Authors.
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
 * @fileoverview Tests for compiler.jar versions
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

var should = require('should');
var compilerPackage = require('../');
var Compiler = compilerPackage.compiler;
var packageInfo = require('../package.json');
var Semver = require('semver');
var compilerVersionExpr = /^Version:\sv(.*)$/m;
var spawn = require('child_process').spawnSync;
require('mocha');

process.on('unhandledRejection', e => { throw e; });

var assertError = new should.Assertion('compiler version');
assertError.params = {
  operator: 'should be a semver parseabe',
};

describe('compiler.jar', function() {
  this.timeout(10000);
  this.slow(5000);

  it('should not be a snapshot build', function(done) {
    var compiler = new Compiler({ version: true});
    compiler.run(function(exitCode, stdout, stderr) {
      var versionInfo = (stdout || '').match(compilerVersionExpr);
      should(versionInfo).not.be.eql(null);
      versionInfo = versionInfo || [];
      versionInfo.length.should.be.eql(2);
      versionInfo[1].indexOf('SNAPSHOT').should.be.below(0);
      done();
    });
  });

  it('version should be equal to the package major version', function(done) {
    var compiler = new Compiler({ version: true});
    var packageVer = new Semver(packageInfo.version);
    compiler.run(function(exitCode, stdout, stderr) {
      var versionInfo = (stdout || '').match(compilerVersionExpr);
      should(versionInfo).not.be.eql(null);
      versionInfo = versionInfo || [];
      versionInfo.length.should.be.eql(2);

      try {
        var compilerVersion = new Semver(versionInfo[1] + '.0.0');
        compilerVersion.major.should.be.equal(packageVer.major);
      } catch (e) {
        assertError.fail();
      }
      done();
    });
  });
});

describe('compiler submodule', function() {
  this.timeout(10000);
  this.slow(5000);
  it('should be synced to the tagged commit', function() {
    var gitCmd = spawn('git', ['tag', '--points-at', 'HEAD'], {
      cwd: './compiler'
    });
    should(gitCmd.status).eql(0)
    var currentTag = gitCmd.stdout.toString().replace(/\s/g, '');
    var packageVer = new Semver(packageInfo.version);
    var mvnVersion = 'v' + packageVer.major;
    should(currentTag).eql(mvnVersion)
  });
});
