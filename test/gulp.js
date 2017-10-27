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

'use strict';

var assert = require('stream-assert');
var should = require('should');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var File = require('vinyl');
var compilerPackage = require('../');
var closureCompiler = compilerPackage.gulp();
require('mocha');

process.on('unhandledRejection', e => { throw e; });

describe('gulp-google-closure-compiler', function() {
  this.timeout(30000);
  this.slow(10000);

  describe('in buffer mode', function() {
    var fakeFile1 = new File({
      path: '/foo.js',
      contents: new Buffer('console.log("foo");')
    });
    var fakeFile2 = new File({
      path: '/bar.js',
      contents: new Buffer('console.log("bar");')
    });

    var fixturesCompiled = 'function log(a){console.log(a)}log("one.js");' +
        'var WindowInfo=function(){this.props=[]};WindowInfo.prototype.propList=function(){' +
        'for(var a in window)this.props.push(a)};WindowInfo.prototype.list=function(){' +
        'log(this.props.join(", "))};(new WindowInfo).list();\n';


    it('should emit an error for invalid options', function(done) {
      var stream = closureCompiler({
        compilation_level: 'FOO'
      });

      stream.on('error', function (err) {
        err.message.should.startWith('Compilation error');
        done();
      });
      stream.write(fakeFile1);
      stream.end();
    });

    it('should compile a single file', function(done) {
      var stream = closureCompiler({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE'
      });

      stream.pipe(assert.length(1))
          .pipe(assert.first(function (f) {
                f.contents.toString().trim().should.eql(fakeFile1.contents.toString());
           }))
           .pipe(assert.end(done));

      stream.write(fakeFile1);
      stream.end();
    });

    it('should name the output file when no js_output_file option is provided', function(done) {
      var stream = closureCompiler({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE'
      });
      stream.pipe(assert.length(1))
          .pipe(assert.first(function (f) {
            f.path.should.eql('compiled.js');
          }))
          .pipe(assert.end(done));

      stream.write(fakeFile1);
      stream.end();
    });

    it('should name the output file from the js_output_file option', function(done) {
      var stream = closureCompiler({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        js_output_file: 'out.js'
      });
      stream.pipe(assert.length(1))
          .pipe(assert.first(function (f) {
            f.path.should.eql('out.js');
          }))
          .pipe(assert.end(done));

      stream.write(fakeFile1);
      stream.end();
    });

    it('should compile multiple input files into a single output', function(done) {
      var stream = closureCompiler({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE'
      });

      stream.pipe(assert.length(1))
          .pipe(assert.first(function (f) {
            f.contents.toString().trim().should.eql(fakeFile1.contents.toString() +
                fakeFile2.contents.toString());
          }))
          .pipe(assert.end(done));

      stream.write(fakeFile1);
      stream.write(fakeFile2);
      stream.end();
    });

    it('should compile multiple inputs into multiple outputs with module options', function(done) {
      var stream = closureCompiler({
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        module: [
          'one:1',
          'two:1'
        ]
      });

      stream.pipe(assert.length(2))
          .pipe(assert.first(function (f) {
            f.contents.toString().trim().should.eql(fakeFile1.contents.toString());
            f.path.should.eql('one.js');
          }))
          .pipe(assert.second(function (f) {
            f.contents.toString().trim().should.eql(fakeFile2.contents.toString());
            f.path.should.eql('two.js');
          }))
          .pipe(assert.end(done));

      stream.write(fakeFile1);
      stream.write(fakeFile2);
      stream.end();
    });

    it('should generate a sourcemap for a single output file', function(done) {
      gulp.src('test/fixtures/**/*.js', {base: './'})
          .pipe(sourcemaps.init())
          .pipe(closureCompiler({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE'
          }))
          .pipe(assert.length(1))
          .pipe(assert.first(function (f) {
            f.sourceMap.sources.should.have.length(2);
            f.sourceMap.file.should.eql('compiled.js');
          }))
          .pipe(assert.end(done));
    });

    it('should generate a sourcemap for each output file with modules', function(done) {
      gulp.src(__dirname + '/fixtures/**/*.js')
          .pipe(sourcemaps.init())
          .pipe(closureCompiler({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE',
            module: [
              'one:1',
              'two:1:one'
            ]
          }))
          .pipe(assert.length(2))
          .pipe(assert.first(function (f) {
            f.sourceMap.sources.should.have.length(1);
            f.sourceMap.file.should.eql('./one.js');
          }))
          .pipe(assert.second(function (f) {
            f.sourceMap.sources.should.have.length(1);
            f.sourceMap.file.should.eql('./two.js');
          }))
          .pipe(assert.end(done));
    });

    it('should support passing input globs directly to the compiler', function(done) {
      var stream = closureCompiler({
            js: __dirname + '/fixtures/**.js',
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE'
          })
          .src()
          .pipe(assert.length(1))
          .pipe(assert.first(function(f) {
            f.contents.toString().should.eql(fixturesCompiled);
          }))
          .pipe(assert.end(done));
    });

    it('should include js options before gulp.src files', function(done) {
      gulp.src(__dirname + '/fixtures/two.js')
          .pipe(closureCompiler({
            js: __dirname + '/fixtures/one.js',
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE'
          }))
          .pipe(assert.length(1))
          .pipe(assert.first(function(f) {
            f.contents.toString().should.eql(fixturesCompiled);
          }))
          .pipe(assert.end(done));
    });

    it('should support calling the compiler with an arguments array', function(done) {
      var stream = closureCompiler([
            '--js="' + __dirname + '/fixtures/**.js"',
            '--compilation_level=SIMPLE',
            '--warning_level=VERBOSE'
          ])
          .src()
          .pipe(assert.length(1))
          .pipe(assert.first(function(f) {
            f.contents.toString().should.eql(fixturesCompiled);
          }))
          .pipe(assert.end(done));
    });

    it('should generate no output without gulp.src files', function(done) {
      gulp.src([])
          .pipe(closureCompiler({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE'
          }))
          .pipe(assert.length(0))
          .pipe(assert.end(done));
    });

    it('should compile without gulp.src files when .src() is called', function(done) {
      closureCompiler({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE',
            js: __dirname + '/fixtures/**.js'
          })
          .src()
          .pipe(assert.length(1))
          .pipe(assert.first(function(f) {
            f.contents.toString().should.eql(fixturesCompiled);
          }))
          .pipe(assert.end(done));
    });

    it('should properly compose sourcemaps when multiple transformations are chained', function(done) {
      gulp.src(['test/fixtures/one.js', 'test/fixtures/two.js'], {base: './'})
          .pipe(sourcemaps.init())
          .pipe(closureCompiler({
            compilation_level: 'WHITESPACE_ONLY',
            warning_level: 'VERBOSE',
            formatting: 'PRETTY_PRINT',
            module: [
                'three:1',
                'four:1:three'
            ]
          }))
          .pipe(closureCompiler({
            compilation_level: 'SIMPLE',
            warning_level: 'QUIET',
            formatting: 'PRETTY_PRINT',
            js_output_file: 'final.js'
          }))
          .pipe(assert.first(function (f) {
            f.sourceMap.sources.should.containEql('test/fixtures/one.js');
            f.sourceMap.sources.should.containEql('test/fixtures/two.js');
          }))
          .pipe(assert.end(done));
    });
  });

  describe('in streaming mode', function() {
    it('should emit an error', function (done) {
      gulp.src(__dirname + '/fixtures/**/*.js', {buffer: false})
          .pipe(closureCompiler({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE'
          }))
          .on('error', function (err) {
            err.message.should.eql('Streaming not supported');
            done();
          });
    });
  });
});
