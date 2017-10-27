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
 * @fileoverview Tests for google-closure-compiler node bindings
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

var should = require('should');
var compilerPackage = require('../');
var Compiler = compilerPackage.compiler;
require('mocha');

process.on('unhandledRejection', e => { throw e; });

describe('closure-compiler node bindings', function() {
  it('should have a static property for the jar path', function() {
    Compiler.COMPILER_PATH.should.endWith('/compiler.jar');
  });

  it('should have a static property for the contrib folder', function() {
    Compiler.CONTRIB_PATH.should.endWith('/contrib');
  });

  it('should error when java is not in the path', function(done) {
    this.slow(1000);

    var compiler = new Compiler({ version: true});
    compiler.javaPath = 'DOES_NOT_EXIST';
    compiler.run(function(exitCode, stdout, stderr) {
      exitCode.should.not.eql(0);
      stderr.indexOf('Is java in the path?').should.be.aboveOrEqual(0);
      done();
    });
  });

  it('should normalize an options object to an arguments array', function() {
    var compiler = new Compiler({
      one: true,
      two: 'two',
      three: ['one', 'two', 'three']
    });

    var expectedArray = ['-jar', Compiler.COMPILER_PATH, '--one=true', '--two=two',
        '--three=one', '--three=two', '--three=three'];
    compiler.commandArguments.length.should.eql(expectedArray.length);
    compiler.commandArguments.forEach(function(item, index) {
      expectedArray[index].should.eql(item);
    });
  });

  it('should prepend the -jar argument and compiler path when configured by array', function() {
    var expectedArray = ['-jar', Compiler.COMPILER_PATH, '--one=true', '--two=two',
      '--three=one', '--three=two', '--three=three'];

    var compiler = new Compiler(expectedArray.slice(2));

    compiler.commandArguments.length.should.eql(expectedArray.length);
    compiler.commandArguments.forEach(function(item, index) {
      expectedArray[index].should.eql(item);
    });
  });

  describe('extra command arguments', function() {
    it('should include initial command arguments when configured by an options object', function() {
      var expectedArray = ['-Xms2048m', '-jar', Compiler.COMPILER_PATH, '--one=true', '--two=two',
        '--three=one', '--three=two', '--three=three'];

      var compiler = new Compiler(expectedArray.slice(3), expectedArray.slice(0, 1));

      compiler.commandArguments.length.should.eql(expectedArray.length);
      compiler.commandArguments.forEach(function(item, index) {
        expectedArray[index].should.eql(item);
      });
    });

    it('should include initial command arguments when configured by array', function() {
      var expectedArray = ['-Xms2048m', '-jar', Compiler.COMPILER_PATH, '--one=true', '--two=two',
        '--three=one', '--three=two', '--three=three'];

      var compiler = new Compiler(expectedArray.slice(3), expectedArray.slice(0, 1));

      compiler.commandArguments.length.should.eql(expectedArray.length);
      compiler.commandArguments.forEach(function(item, index) {
        expectedArray[index].should.eql(item);
      });
    });
  });
});
