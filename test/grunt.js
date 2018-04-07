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
 * @fileoverview Tests for grunt-google-closure-compiler plugin
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

const should = require('should');
const fs = require('fs');
const _ = require('lodash');
require('mocha');

process.on('unhandledRejection', e => { throw e; });

const assertNoError = new should.Assertion('grunt');
assertNoError.params = {
  operator: 'should not fail with an error',
};

const assertError = new should.Assertion('grunt');
assertError.params = {
  operator: 'should have failed with an error',
};

const assertNoWarning = new should.Assertion('grunt');
assertNoWarning.params = {
  operator: 'should not log a warning',
};

/**
 * Grunt plugins are very hard to test. In this case we're passing a mock grunt object
 * that defines the properties we need in order to test the actual task.
 */
const mockGrunt = {
  log: {
    ok: function () {},
    warn: function(x) {
      console.warn(x);
    },
  },
  file: {
    exists: function(path) {
      try {
        return fs.statSync(path).isFile();
      } catch (e) {
        return false;
      }
    }
  },
  fail: {
    warn: function() {}
  },
  registerMultiTask: function() {}
};

const closureCompiler = require('../').grunt(mockGrunt);


function gruntTaskOptions(options) {
  options = options || {};
  return function(defaults) {
    const opts = _.cloneDeep(defaults || {});
    _.merge(opts, options);
    return opts;
  }
}

function getGruntTaskObject(fileObj, options, asyncDone) {
  return {
    async: function() {
      return function() {
        asyncDone();
      }
    },
    options: gruntTaskOptions(options),
    files: fileObj
  };
}


describe('grunt-google-closure-compiler', function() {
  this.slow(1000);
  this.timeout(10000);

  it('should emit an error for invalid options', done => {
    const taskObj = getGruntTaskObject([{
      dest: 'unused.js',
      src: [__dirname + '/fixtures/one.js']
    }], {
      compilation_level: 'FOO'
    }, () => {
      assertError.fail();
      done();
    });

    let gruntWarning;
    mockGrunt.log.warn = msg => {
      gruntWarning = msg;
    };

    mockGrunt.fail.warn = (err, code) => {
      should(err).startWith('Compilation error');
      should(gruntWarning).not.be.eql(undefined);
      done();
    };

    closureCompiler.call(taskObj);
  });

  it('should warn if files cannot be found', function(done) {
    function taskDone() {
      should(gruntWarnings.length).be.eql(2);
      gruntWarnings[0].should.endWith('not found');
      gruntWarnings[1].should.endWith('not written because src files were empty');
      done();
    }

    let gruntWarnings = [];
    mockGrunt.log.warn = msg => {
      gruntWarnings.push(msg);
    };

    mockGrunt.fail.warn = (err, code) => {
      taskDone();
    };

    let taskObj = getGruntTaskObject([{
      dest: 'unused.js',
      src: ['dne.js']
    }], {
      compilation_level: 'SIMPLE'
    }, () => {
      taskDone();
    });

    closureCompiler.call(taskObj);
  });

  it('should run once for each destination', function(done) {
    this.timeout(30000);
    this.slow(10000);

    const fileOneDest = 'test/out/one.js';
    const fileTwoDest = 'test/out/two.js';

    function taskDone() {
      const fileOne = fs.statSync(fileOneDest);
      should(fileOne.isFile()).be.eql(true);
      fs.unlinkSync(fileOneDest);

      const fileTwo = fs.statSync(fileTwoDest);
      should(fileTwo.isFile()).be.eql(true);
      fs.unlinkSync(fileTwoDest);

      fs.rmdirSync('test/out');
      done();
    }

    mockGrunt.fail.warn = (err, code) => {
      assertNoError.fail();
      taskDone();
    };

    const taskObj = getGruntTaskObject([
      {src: ['test/fixtures/one.js'], dest: fileOneDest},
      {src: ['test/fixtures/one.js', 'test/fixtures/two.js'], dest: fileTwoDest}
    ], {
      compilation_level: 'SIMPLE'
    }, () => {
      taskDone();
    });

    closureCompiler.call(taskObj);
  });

  it('should run when grunt provides no files', function(done) {
    this.timeout(30000);
    this.slow(10000);

    const fileOneDest = 'test/out/one.js';

    function taskDone() {
      const fileOne = fs.statSync(fileOneDest);
      should(fileOne.isFile()).be.eql(true);
      fs.unlinkSync(fileOneDest);

      fs.rmdirSync('test/out');
      done();
    }

    mockGrunt.fail.warn = (err, code) => {
      assertNoError.fail();
      taskDone();
    };

    const taskObj = getGruntTaskObject([], {
      compilation_level: 'SIMPLE',
      js: 'test/fixtures/one.js',
      js_output_file: fileOneDest
    }, () => {
      taskDone();
    });

    closureCompiler.call(taskObj);
  });

  it('should support an arguments array', function(done) {
    this.timeout(30000);
    this.slow(10000);

    const fileOneDest = 'test/out/one.js';

    function taskDone() {
      const fileOne = fs.statSync(fileOneDest);
      should(fileOne.isFile()).be.eql(true);
      fs.unlinkSync(fileOneDest);

      fs.rmdirSync('test/out');
      done();
    }

    mockGrunt.fail.warn = (err, code) => {
      assertNoError.fail();
      taskDone();
    };

    const taskObj = getGruntTaskObject([], {
      args: [
        '--compilation_level=SIMPLE',
        '--js=test/fixtures/one.js',
        '--js_output_file=' + fileOneDest
      ]
    }, () => {
      taskDone();
    });

    closureCompiler.call(taskObj);
  });
});
