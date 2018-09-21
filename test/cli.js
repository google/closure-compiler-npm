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
 * @fileoverview Tests for google-closure-compiler cli
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

const should = require('should');
const spawn = require('child_process').spawn;
require('mocha');

process.on('unhandledRejection', e => { throw e; });

describe('command line interface', function() {
  this.timeout(30000);
  this.slow(10000);

  const cliPath = require.resolve('../cli.js');
  let stdOut = '';
  let stdError = '';
  let exitCode;
  function runCmd(cmd, args, stdInData) {
    return new Promise((resolve, reject) => {
      const compilationProcess = spawn(cmd, args);
      compilationProcess.stdout.setEncoding('utf8');
      compilationProcess.stdout.on('data', data => {
        stdOut += data;
      });
      compilationProcess.stdout.on('error', err => {
        stdError += err.toString();
      });

      compilationProcess.stderr.setEncoding('utf8');
      compilationProcess.stderr.on('data', data => {
        stdError += data;
      });

      compilationProcess.on('close', code => {
        exitCode = code;
        if (code !== 0) {
          reject();
        }

        resolve();
      });

      compilationProcess.on('error', err => {
        reject(err);
      });

      if (stdInData) {
        compilationProcess.stdin.setEncoding('utf8');
        compilationProcess.stdin.end(stdInData);
      }
    });
  }

  it('chooses an acceptable platform automatically', done => {
    function complete() {
      should(exitCode).equal(0);
      should(stdOut.length).above(0);
      done();
    }

    runCmd(cliPath, ['--js', 'test/fixtures/one.js'])
      .then(complete)
      .catch(complete);
  });

  ['java', 'native', 'javascript'].forEach(platform => {
    describe(`${platform} version`, function() {
      beforeEach(() => {
        stdOut = '';
        stdError = '';
      });
      it('--help flag', done => {
        function complete() {
          should(stdOut.length).above(0);
          should(exitCode).equal(0);
          done();
        }

        runCmd(cliPath, [`--platform=${platform}`, '--help'])
          .then(complete)
          .catch(complete);
      });

      it('invalid flag', done => {
        function complete() {
          should(exitCode).not.equal(0);
          done();
        }

        runCmd(cliPath, [`--platform=${platform}`, '--foo=bar', '--js=test/fixtures/one.js'])
          .then(complete)
          .catch(complete);
      });

      it('compile successfully', done => {
        function complete() {
          should(exitCode).equal(0);
          should(stdOut.length).above(0);
          if (stdError.length > 0) {
            console.error(stdError);
          }
          should(stdOut.indexOf("console.log")).above(-1);
          done();
        }

        runCmd(cliPath, [`--platform=${platform}`, '--js=test/fixtures/one.js', '--use_types_for_optimization'])
          .then(complete)
          .catch(complete);
      });

      it('accept piped input', done => {
        function complete() {
          should(exitCode).equal(0);
          should(stdOut.length).above(0);
          should(stdOut.indexOf('alert("hello world")')).above(-1);
          done();
        }

        runCmd(cliPath, [`--platform=${platform}`], 'alert("hello world")')
          .then(complete)
          .catch(complete);
      });

      it('read input js files', done => {
        function complete() {
          should(exitCode).equal(0);
          should(stdOut.length).above(0);
          should(stdOut.indexOf('console.log')).above(-1);
          done();
        }

        runCmd(cliPath, [`--platform=${platform}`, '--js=test/fixtures/one.js'])
          .then(complete, complete);
      });

      it('read extern files', done => {
        function complete() {
          should(exitCode).equal(0);
          should(stdOut.length).above(0);
          should(stdOut.indexOf('externalMethod')).above(-1);
          done();
        }

        runCmd(
            cliPath,
            [
              `--platform=${platform}`,
              '--warning_level=VERBOSE',
              '--externs=test/fixtures/extern.js'
            ],
            'externalMethod("foo")')
          .then(complete, complete);
      });
    });
  });
});
