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
 * @fileoverview Tests for gulp-google-closure-compiler plugin
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */
import {Transform} from 'node:stream';
import {fileURLToPath, URL} from 'node:url';
import gulp from 'gulp';
import sourcemaps from 'gulp-sourcemaps';
import File from 'vinyl';
import {
  default as ClosureCompiler,
  gulp as closureCompiler,
} from '../index.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const javaOnly = process.argv.find((arg) => arg == '--java-only');
const platforms = ['java'];
if (!javaOnly) {
  platforms.push('native');
}

process.on('unhandledRejection', (e) => { throw e; });

class ExpectFile extends Transform {
  constructor(fileMatcher) {
    super({objectMode: true});
    this.fileCount = 0;
    this.fileMatcher = fileMatcher;
  }
  _transform(file, _, cb) {
    this.fileCount++;
    this.fileMatcher.call(this, file);
    this.push(file);
    cb();
  }
}

describe('gulp-google-closure-compiler', function() {
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
    const ensureCorrectPlatformUtilized = () => {
      if (platformUtilized) {
        expect(platform).toBe(platformUtilized);
      }
    };

    describe(`${platform} version`, function() {
      const fakeFile1 = new File({
        path: '/foo.js',
        contents: Buffer.from('console.log("foo");')
      });
      const fakeFile2 = new File({
        path: '/bar.js',
        contents: Buffer.from('console.log("bar");')
      });

      const fixturesCompiled = 'function log(a){console.log(a)}log("one.js");' +
          'var WindowInfo=function(){this.props=[]};WindowInfo.prototype.propList=function(){' +
          'for(var a in window)this.props.push(a)};WindowInfo.prototype.list=function(){' +
          'log(this.props.join(", "))};(new WindowInfo).list();\n';

      it('should emit an error for invalid flag', async () => {
        let resolvePromise;
        const complete = new Promise((resolve) => {
          resolvePromise = resolve;
        });
        const stream = closureCompiler({
          foo: 'BAR'
        }, {
          platform
        });

        let error;
        stream.on('error', (err) => {
          error = err;
          resolvePromise();
        });
        stream.write(fakeFile1);
        stream.end();
        await complete;
        expect(error.message).toMatch(/^(gulp-google-closure-compiler: )?Compilation error/);
        ensureCorrectPlatformUtilized();
      });

      it('should emit an error for a flag with an invalid value', async () => {
        let resolvePromise;
        const complete = new Promise((resolve) => {
          resolvePromise = resolve;
        });
        const stream = closureCompiler({
          compilation_level: 'FOO'
        }, {
          platform
        });

        let error;
        stream.on('error', (err) => {
          error = err;
          resolvePromise();
        });
        stream.write(fakeFile1);
        stream.end();
        await complete;
        expect(error.message).toMatch(/^(gulp-google-closure-compiler: )?Compilation error/);
        ensureCorrectPlatformUtilized();
      });

      it('should compile a single file', async () => {
        let resolvePromise;
        const complete = new Promise((resolve) => {
          resolvePromise = resolve;
        });
        const stream = closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE'
        }, {
          platform
        });

        const expectFile = new ExpectFile(
            (file) => expect(file.contents.toString().trim()).toBe(fakeFile1.contents.toString())
        );
        stream.pipe(expectFile).on('finish', resolvePromise);

        stream.write(fakeFile1);
        stream.end();
        await complete;
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should name the output file when no js_output_file option is provided', async () => {
        let resolvePromise;
        const complete = new Promise((resolve) => {
          resolvePromise = resolve;
        });
        const stream = closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE'
        }, {
          platform
        });
        const expectFile = new ExpectFile(
            (file) => expect(file.path).toBe('compiled.js')
        );
        stream.pipe(expectFile).on('finish', resolvePromise);

        stream.write(fakeFile1);
        stream.end();
        await complete;
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should name the output file from the js_output_file option', async () => {
        let resolvePromise;
        const complete = new Promise((resolve) => {
          resolvePromise = resolve;
        });
        const stream = closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE',
          js_output_file: 'out.js'
        }, {
          platform
        });
        const expectFile = new ExpectFile(
            (file) => expect(file.path).toBe('out.js')
        );
        stream.pipe(expectFile).on('finish', resolvePromise);

        stream.write(fakeFile1);
        stream.end();
        await complete;
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should compile multiple input files into a single output', async () => {
        let resolvePromise;
        const complete = new Promise((resolve) => {
          resolvePromise = resolve;
        });
        const stream = closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE'
        }, {
          platform
        });

        const expectFile = new ExpectFile(
            (file) => expect(file.contents.toString().trim())
                .toBe(fakeFile1.contents.toString() + fakeFile2.contents.toString())
        );
        stream.pipe(expectFile).on('finish', resolvePromise);

        stream.write(fakeFile1);
        stream.write(fakeFile2);
        stream.end();
        await complete;
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should compile multiple inputs into multiple outputs with chunk options', async () => {
        let resolvePromise;
        const complete = new Promise((resolve) => {
          resolvePromise = resolve;
        });
        const stream = closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE',
          chunk: [
            'one:1',
            'two:1'
          ],
          createSourceMap: true
        }, {
          platform
        });

        const expectFile = new ExpectFile(function (file){
          if (this.fileCount === 1) {
            expect(file.contents.toString().trim()).toBe(fakeFile1.contents.toString());
            expect(file.path).toBe('one.js');
          } else if (this.fileCount === 2) {
            expect(file.contents.toString().trim()).toBe(fakeFile2.contents.toString());
            expect(file.path).toBe('two.js');
          }
        });

        stream.pipe(expectFile).on('finish', resolvePromise);

        stream.write(fakeFile1);
        stream.write(fakeFile2);
        stream.end();
        await complete;
        expect(expectFile.fileCount).toBe(2);
        ensureCorrectPlatformUtilized();
      });

      it('should generate a sourcemap for a single output file', async () => {
        const expectFile = new ExpectFile((file) => {
          expect(file.sourceMap.sources.length).toBe(2);
          expect(file.sourceMap.file).toBe('compiled.js');
        });
        await new Promise((resolve) =>
          gulp.src('test/fixtures/**/*.js', {base: './'})
            .pipe(sourcemaps.init())
            .pipe(closureCompiler({
              compilation_level: 'SIMPLE',
              warning_level: 'VERBOSE'
            }, {
              platform
            }))
            .pipe(expectFile)
            .on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should generate a sourcemap for each output file with chunks', async () => {
        const expectFile = new ExpectFile(function (file){
          if (this.fileCount === 1) {
            expect(file.sourceMap.sources.length).toBe(1);
            expect(file.sourceMap.file).toBe('./one.js');
          } else if (this.fileCount === 2) {
            expect(file.sourceMap.sources.length).toBe(1);
            expect(file.sourceMap.file).toBe('./two.js');
          }
        });
        await new Promise((resolve) =>
          gulp.src([`${__dirname}fixtures/one.js`, `${__dirname}fixtures/two.js`])
              .pipe(sourcemaps.init())
              .pipe(closureCompiler({
                compilation_level: 'SIMPLE',
                warning_level: 'VERBOSE',
                chunk: [
                  'one:1',
                  'two:1:one'
                ],
                createSourceMap: true
              }, {
                debugLog: true,
                platform
              }))
              .pipe(expectFile)
              .on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(2);
        ensureCorrectPlatformUtilized();
      });

      it('should support passing input globs directly to the compiler', async () => {
        const expectFile = new ExpectFile((file) => {
          expect(file.contents.toString()).toBe(fixturesCompiled);
        });
        await new Promise((resolve) =>
          closureCompiler({
            js: `${__dirname}fixtures/**.js`,
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE',
            language_out: 'ECMASCRIPT5'
          }, {
            platform
          }).src().pipe(expectFile).on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should include js options before gulp.src files', async () => {
        const expectFile = new ExpectFile((file) => {
          expect(file.contents.toString()).toBe(fixturesCompiled);
        });
        await new Promise((resolve) =>
          gulp.src(`${__dirname}fixtures/two.js`)
              .pipe(closureCompiler({
                js: `${__dirname}fixtures/one.js`,
                compilation_level: 'SIMPLE',
                warning_level: 'VERBOSE',
                language_out: 'ECMASCRIPT5'
              }, {
                platform
              }))
              .pipe(expectFile)
              .on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should support calling the compiler with an arguments array', async () => {
        const expectFile = new ExpectFile((file) => {
          expect(file.contents.toString()).toBe(fixturesCompiled);
        });
        await new Promise((resolve) =>
          closureCompiler([
            `--js="${__dirname}fixtures/**.js"`,
            '--compilation_level=SIMPLE',
            '--warning_level=VERBOSE',
      '--language_out=ECMASCRIPT5'
          ], {
            platform
          }).src().pipe(expectFile).on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should compile without gulp.src files when .src() is called', async () => {
        const expectFile = new ExpectFile((file) => {
          expect(file.contents.toString()).toBe(fixturesCompiled);
        });
        await new Promise((resolve) =>
          closureCompiler({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE',
            language_out: 'ECMASCRIPT5',
            js: `${__dirname}fixtures/**.js`,
          }, {
            platform
          }).src().pipe(expectFile).on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('should generate no output without gulp.src files', async () => {
        const expectFile = new ExpectFile((file) => {
          fail('should not produce output files');
        });
        await new Promise((resolve) =>
          gulp.src('test/does-not-exist.js', {allowEmpty: true})
            .pipe(closureCompiler({
              compilation_level: 'SIMPLE',
              warning_level: 'VERBOSE'
            }, {
              platform
            })).pipe(expectFile).on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(0);
        ensureCorrectPlatformUtilized();
      });

      it('should properly compose sourcemaps when multiple transformations are chained', async () => {
        const expectFile = new ExpectFile((file) => {
          expect(file.sourceMap.sources).toContain('test/fixtures/one.js');
          expect(file.sourceMap.sources).toContain('test/fixtures/two.js');
        });
        await new Promise((resolve) =>
          gulp.src(['test/fixtures/one.js', 'test/fixtures/two.js'], {base: './'})
            .pipe(sourcemaps.init())
            .pipe(closureCompiler({
              compilation_level: 'WHITESPACE_ONLY',
              warning_level: 'VERBOSE',
              formatting: 'PRETTY_PRINT',
              sourceMapIncludeContent: true
            }, {
              platform
            }))
            .pipe(closureCompiler({
              compilation_level: 'SIMPLE',
              warning_level: 'QUIET',
              formatting: 'PRETTY_PRINT',
              js_output_file: 'final.js',
              sourceMapIncludeContent: true
            }, {
              platform
            }))
            .pipe(expectFile)
            .on('error', (err) => {
              console.error(err);
            })
            .on('finish', resolve)
        );
        expect(expectFile.fileCount).toBe(1);
        ensureCorrectPlatformUtilized();
      });

      it('in streaming mode should emit an error', async () => {
        // Gulp throws a global uncatchable stream error
        // Handle the error so that the test suite does not fail
        const globalExceptionListener = (err) => {};
        process.on('uncaughtException', globalExceptionListener);
        let errorEncountered = false;
        await new Promise((resolve) => {
          gulp.src(`${__dirname}fixtures/**/*.js`, {buffer: false})
              .pipe(closureCompiler({
                compilation_level: 'SIMPLE',
                warning_level: 'VERBOSE'
              }, {
                platform
              }))
              .on('error', (err) => {
                errorEncountered = true;
                expect(err.message).toMatch(/^(gulp-google-closure-compiler: )?Streaming not supported/);
                resolve();
              });
        });
        expect(errorEncountered).toBe(true);
        await new Promise((resolve) => {
          setTimeout(() => {
            process.off('uncaughtException', globalExceptionListener);
            resolve();
          });
        });
      });
    });
  });
});
