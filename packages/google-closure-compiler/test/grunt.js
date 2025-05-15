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
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';
import ClosureCompiler from '../lib/node/index.js';
import gruntPlugin from '../lib/grunt/index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

process.on('unhandledRejection', (e) => { throw e; });

const javaOnly = process.argv.find((arg) => arg == '--java-only');
const platforms = ['java'];
if (!javaOnly) {
  platforms.push('native');
}

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
    },
    write: function(filepath, contents, opts) {
      const pathSegments = filepath.split(path.sep);
      for (let i = 0; i < pathSegments.length - 1; i++) {
        const intermediatePath = pathSegments.slice(0, i + 1).join(path.sep);
        try {
          fs.mkdirSync(intermediatePath);
        } catch (e) {}
      }
      return fs.writeFileSync(filepath, contents, opts);
    }
  },
  fail: {
    warn: function(...args) {
      console.error(args);
    }
  },
  registerMultiTask: function() {}
};

function gruntTaskOptions(options) {
  options = options || {};
  return (defaults)  => {
    const baseOpts = structuredClone(defaults || {});
    return {
      ...baseOpts,
      ...options,
    };
  };
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

describe('grunt-google-closure-compiler', () => {
  let originalCompilerRunMethod;
  let platformUtilized;

  beforeEach(() => {
    platformUtilized = undefined;
    originalCompilerRunMethod = ClosureCompiler.prototype.run;
    spyOn(ClosureCompiler.prototype, 'run')
        .and.callFake(function(...args) {
          const retVal = originalCompilerRunMethod.apply(this, args);
          platformUtilized = /^java/.test(this.getFullCommand()) ? 'java' : 'native';
          return retVal;
        });
  });

  platforms.forEach((platform) => {
    describe(`${platform} version`, () => {
      let closureCompiler;
      let originalTimeout;
      beforeEach(() => {
        closureCompiler = gruntPlugin(mockGrunt, {platform});
        originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
        if (platform === 'java') {
          jasmine.DEFAULT_TIMEOUT_INTERVAL = 10000;
        }
      });

      afterEach(() => {
        jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
      });

      const ensureCorrectPlatformUtilized = () => {
        if (platformUtilized) {
          expect(platform).toBe(platformUtilized);
        }
      };

      it('should emit an error for invalid options', (done) => {
        let didFail = false;
        let gruntWarning;

        debugger;
        let taskObj;
        const completed = new Promise((resolve) => {
          taskObj = getGruntTaskObject([{
            dest: 'unused.js',
            src: [__dirname + '/fixtures/one.js']
          }], {
            compilation_level: 'FOO'
          }, () => {
            resolve();
          });
        });

        const logWarning = new Promise((resolve) => {
          mockGrunt.log.warn = (msg) => {
            gruntWarning = msg;
            console.warn(gruntWarning);
            resolve();
          };
        });

        const failWarning = new Promise((resolve) => {
          mockGrunt.fail.warn = (err, code) => {
            expect(err).toMatch(/^Compilation error/);
            console.warn(err);
            didFail = true;
            resolve();
          };
        });

        Promise.all([completed, logWarning, failWarning]).then(() => {
          expect(didFail).toBe(true);
          expect(gruntWarning).toBeDefined();
          ensureCorrectPlatformUtilized();
          done();
        }).catch((err) => {
          fail('should not fail');
        });

        closureCompiler.call(taskObj);
      });

      it('should warn if files cannot be found', (done) => {
        function taskDone() {
          expect(gruntWarnings.length).toBe(2);
          expect(gruntWarnings[0]).toMatch(/not found$/);
          expect(gruntWarnings[1]).toMatch(/not written because src files were empty$/);
          ensureCorrectPlatformUtilized();
          done();
        }

        let gruntWarnings = [];
        mockGrunt.log.warn = (msg) => {
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

      it('should run once for each destination', (done) => {
        const fileOneDest = 'test/out/one.js';
        const fileTwoDest = 'test/out/two.js';

        function taskDone() {
          const fileOne = fs.statSync(fileOneDest);
          expect(fileOne.isFile()).toBe(true);
          fs.unlinkSync(fileOneDest);

          const fileTwo = fs.statSync(fileTwoDest);
          expect(fileTwo.isFile()).toBe(true);
          fs.unlinkSync(fileTwoDest);

          fs.rmdirSync('test/out');
          ensureCorrectPlatformUtilized();
          done();
        }

        mockGrunt.fail.warn = (err, code) => {
          console.error(err);
          fail('should not caused an error');
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

      it('should run when grunt provides no files', (done) => {
        const fileOneDest = 'test/out/one.js';

        function taskDone() {
          const fileOne = fs.statSync(fileOneDest);
          expect(fileOne.isFile()).toBe(true);
          fs.unlinkSync(fileOneDest);

          fs.rmdirSync('test/out');
          done();
        }

        mockGrunt.fail.warn = (err, code) => {
          fail('should not caused an error');
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
        ensureCorrectPlatformUtilized();
      });

      it('should support an arguments array', (done) => {
        const fileOneDest = 'test/out/one.js';

        function taskDone() {
          const fileOne = fs.statSync(fileOneDest);
          expect(fileOne.isFile()).toBe(true);
          fs.unlinkSync(fileOneDest);

          fs.rmdirSync('test/out');
          ensureCorrectPlatformUtilized();
          done();
        }

        mockGrunt.fail.warn = (err, code) => {
          fail('should not caused an error');
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
  });
});
