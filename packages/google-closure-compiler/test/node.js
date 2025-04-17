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

import {default as Compiler, JAR_PATH, CONTRIB_PATH, EXTERNS_PATH} from '../index.js';

process.on('unhandledRejection', e => { throw e; });

describe('closure-compiler node bindings', () => {
  it('should export a property for the jar path', () => {
    expect(JAR_PATH).toMatch(/[\/\\]compiler\.jar$/);
  });

  it('should export a property for the contrib folder', () => {
    expect(CONTRIB_PATH).toMatch(/[\/\\]contrib$/);
  });

  it('should export a property for the externs folder', () => {
    expect(EXTERNS_PATH).toMatch(/[\/\\]externs$/);
  });

  describe('java version', () => {
    it('should error when java is not in the path', async () => {
      const compiler = new Compiler({version: true});
      compiler.javaPath = 'DOES_NOT_EXIST';
      let hasRun = false;
      await new Promise((resolve) => {
        compiler.run((exitCode, stdout, stderr) => {
          if (hasRun) {
            return;
          }
          hasRun = true;
          expect(exitCode).not.toBe(0);
          expect(stderr.indexOf('Is java in the path?')).toBeGreaterThanOrEqual(0);
          resolve();
        });
      });
      expect(hasRun).toBe(true);
    });

    it('should normalize an options object to an arguments array', () => {
      const compiler = new Compiler({
        one: true,
        two: 'two',
        three: ['one', 'two', 'three']
      });

      const expectedArray = ['--one=true', '--two=two',
        '--three=one', '--three=two', '--three=three'];
      expect(compiler.commandArguments.length).toBe(expectedArray.length);
      compiler.commandArguments.forEach((item, index) => {
        expect(expectedArray[index]).toBe(item);
      });
    });

    it('should prepend the -jar argument and compiler path when configured by array', async () => {
      const expectedArray = ['-jar', JAR_PATH, '--one=true', '--two=two',
        '--three=one', '--three=two', '--three=three'];

      const compiler = new Compiler(expectedArray.slice(2));
      await new Promise((resolve) => compiler.run(resolve));

      expect(compiler.commandArguments.length).toBe(expectedArray.length);
      compiler.commandArguments.forEach((item, index) => {
        expect(expectedArray[index]).toBe(item);
      });
    });

    describe('extra command arguments', () => {
      it('should include initial command arguments when configured by an options object', async () => {
        const expectedArray = ['-Xms2048m', '-jar', JAR_PATH, '--one=true', '--two=two',
          '--three=one', '--three=two', '--three=three'];

        const compiler = new Compiler(expectedArray.slice(3), expectedArray.slice(0, 1));
        await new Promise((resolve) => compiler.run(resolve));

        expect(compiler.commandArguments.length).toBe(expectedArray.length);
        compiler.commandArguments.forEach(function (item, index) {
          expect(expectedArray[index]).toBe(item);
        });
      });

      it('should include initial command arguments when configured by array', async () => {
        const expectedArray = ['-Xms2048m', '-jar', JAR_PATH, '--one=true', '--two=two',
          '--three=one', '--three=two', '--three=three'];

        const compiler = new Compiler(expectedArray.slice(3), expectedArray.slice(0, 1));
        await new Promise((resolve) => compiler.run(resolve));
        expect(compiler.commandArguments.length).toBe(expectedArray.length);
        compiler.commandArguments.forEach(function (item, index) {
          expect(expectedArray[index]).toBe(item);
        });
      });
    });
  });
});
