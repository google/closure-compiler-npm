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
const runCommand = require('../../../build-scripts/run-command');
require('mocha');

process.on('unhandledRejection', e => { throw e; });

describe('command line interface', function() {
  this.timeout(45000);
  this.slow(10000);

  let cliPath = require.resolve('../cli.js');
  if (process.platform === 'win32') {
    cliPath = `node ${cliPath}`;
  }

  it('chooses an acceptable platform automatically', done => {
    function complete(arg) {
      should(arg).not.be.instanceof(Error);
      const {stdout, sderr, exitCode} = arg;
      should(exitCode).equal(0);
      should(stdout.length).above(0);
      done();
    }

    runCommand(`${cliPath} --js test/fixtures/one.js`, {stdio: 'pipe'})
      .then(complete)
      .catch(complete);
  });

  ['java', 'native'].forEach(platform => {
    describe(`${platform} version`, function() {
      it('--help flag', done => {
        function complete(arg) {
          should(arg).not.be.instanceof(Error);
          const {stdout, sderr, exitCode} = arg;
          should(stdout.length).above(0);
          should(exitCode).equal(0);
          done();
        }

        runCommand(`${cliPath} --platform=${platform} --help`, {stdio: 'pipe'})
          .then(complete)
          .catch(complete);
      });

      it('invalid flag', done => {
        function complete(arg) {
          should(arg).be.instanceof(Error);
          should.exist(arg.exitCode);
          should(arg.exitCode).not.equal(0);
          done();
        }

        runCommand(`${cliPath} --platform=${platform} --foo=bar --js=test/fixtures/one.js`, {stdio: 'pipe'})
          .then(complete)
          .catch(complete);
      });

      it('compile successfully', done => {
        function complete(arg) {
          if (arg instanceof Error) {
            console.error(arg);
          }
          should(arg).not.be.instanceof(Error);
          const {stdout, sderr, exitCode} = arg;
          should(exitCode).equal(0);
          should(stdout.length).above(0);
          should(stdout.indexOf("console.log")).above(-1);
          done();
        }

        runCommand(`${cliPath} --platform=${platform} --js=test/fixtures/one.js --use_types_for_optimization`, {stdio: 'pipe'})
          .then(complete)
          .catch(complete);
      });

      it('accept piped input', done => {
        function complete(arg) {
          should(arg).not.be.instanceof(Error);
          const {stdout, sderr, exitCode} = arg;
          should(exitCode).equal(0);
          should(stdout.length).above(0);
          should(stdout.indexOf('alert("hello world")')).above(-1);
          done();
        }

        const cmd = runCommand(`${cliPath} --platform=${platform}`, {stdio: 'pipe'});
        cmd
          .then(complete)
          .catch(complete);

        cmd.childProcess.stdin.setEncoding('utf8');
        cmd.childProcess.stdin.end('alert("hello world")');
      });

      it('read input js files', done => {
        function complete(arg) {
          should(arg).not.be.instanceof(Error);
          const {stdout, sderr, exitCode} = arg;
          should(exitCode).equal(0);
          should(stdout.length).above(0);
          should(stdout.indexOf('console.log')).above(-1);
          done();
        }

        runCommand(`${cliPath} --platform=${platform} --js=test/fixtures/one.js`, {stdio: 'pipe'})
          .then(complete, complete);
      });

      it('read extern files', done => {
        function complete(arg) {
          should(arg).not.be.instanceof(Error);
          const {stdout, sderr, exitCode} = arg;
          should(exitCode).equal(0);
          should(stdout.length).above(0);
          should(stdout.indexOf('externalMethod')).above(-1);
          done();
        }

        const cmd = runCommand(
            `${cliPath} --platform=${platform} --warning_level=VERBOSE --externs=test/fixtures/extern.js`,
            {stdio: 'pipe'});
        cmd.then(complete, complete);

        cmd.childProcess.stdin.setEncoding('utf8');
        cmd.childProcess.stdin.end('externalMethod("foo")');
      });
    });
  });
});
