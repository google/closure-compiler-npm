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

import {createRequire} from 'node:module';
import runCommand from '../../../build-scripts/run-command.js';

const require = createRequire(import.meta.url);

const javaOnly = process.argv.find((arg) => arg == '--java-only');
const platforms = ['java'];
if (!javaOnly) {
  platforms.push('native');
}

process.on('unhandledRejection', (e) => { throw e; });

describe('command line interface', () => {
  let cliPath = require.resolve('../cli.js');
  if (process.platform === 'win32') {
    cliPath = `node ${cliPath}`;
  }

  if (!javaOnly) {
    it('chooses an acceptable platform automatically', async () => {
      const retVal = await runCommand(`${cliPath} --js test/fixtures/one.js`, {stdio: 'pipe'});
      expect(retVal).not.toBeInstanceOf(Error);
      const {stdout, exitCode} = retVal;
      expect(exitCode).toBe(0);
      expect(stdout.length).toBeGreaterThan(0);
    });
  }

  platforms.forEach((platform) => {
    describe(`${platform} version`, () => {
      let originalTimeout;
      beforeEach(() => {
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        if (platform === 'java') {
          jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        }
      });
      afterEach(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
      });

      it('--help flag', async () => {
        const retVal =
            await runCommand(`${cliPath} --platform=${platform} --help`, {stdio: 'pipe'});
        expect(retVal).not.toBeInstanceOf(Error);
        const {stdout, exitCode} = retVal;
        expect(exitCode).toBe(0);
        expect(stdout.length).toBeGreaterThan(0);
      });

      it('invalid flag', async () => {
        try {
          await runCommand(`${cliPath} --platform=${platform} --foo=bar --js=test/fixtures/one.js`, {stdio: 'pipe'});
          fail('should have thrown');
        } catch (err) {
          expect(err).toBeInstanceOf(Error);
          const {exitCode} = err;
          expect(exitCode).toBeDefined();
          expect(exitCode).not.toBe(0);
        }
      });

      it('compile successfully', async () => {
        const retVal =
            await runCommand(`${cliPath} --platform=${platform} --js=test/fixtures/one.js --use_types_for_optimization`, {stdio: 'pipe'});
        if (retVal instanceof Error) {
          console.error(retVal);
        }
        expect(retVal).not.toBeInstanceOf(Error);
        const {stdout, exitCode} = retVal;
        expect(exitCode).toBe(0);
        expect(stdout.length).toBeGreaterThan(0);
        expect(stdout.indexOf('console.log')).toBeGreaterThan(-1);
      });

      it('accept piped input', async () => {
        const cmd = runCommand(`${cliPath} --platform=${platform}`, {stdio: 'pipe'});
        cmd.childProcess.stdin.setEncoding('utf8');
        cmd.childProcess.stdin.end('alert("hello world")');

        const retVal = await cmd;
        expect(retVal).not.toBeInstanceOf(Error);
        const {exitCode, stdout} = retVal;
        expect(exitCode).toBe(0);
        expect(stdout.length).toBeGreaterThan(0);
        expect(stdout.indexOf('alert("hello world")')).toBeGreaterThan(-1);
      });

      it('read input js files', async () => {
        const retVal = await runCommand(`${cliPath} --platform=${platform} --js=test/fixtures/one.js`, {stdio: 'pipe'});
        expect(retVal).not.toBeInstanceOf(Error);
        const {stdout, exitCode} = retVal;
        expect(exitCode).toBe(0);
        expect(stdout.length).toBeGreaterThan(0);
        expect(stdout.indexOf('console.log')).toBeGreaterThan(-1);
      });

      it('read extern files', async () => {
        const cmd = runCommand(
            `${cliPath} --platform=${platform} --warning_level=VERBOSE --externs=test/fixtures/extern.js`,
            {stdio: 'pipe'},
        );
        cmd.childProcess.stdin.setEncoding('utf8');
        cmd.childProcess.stdin.end('externalMethod("foo")');

        const retVal = await cmd;
        expect(retVal).not.toBeInstanceOf(Error);
        const {stdout, exitCode} = retVal;
        expect(exitCode).toBe(0);
        expect(stdout.length).toBeGreaterThan(0);
        expect(stdout.indexOf('externalMethod')).toBeGreaterThan(-1);
      });
    });
  });
});
