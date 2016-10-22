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
 * @fileoverview Gulp task for closure-compiler. Multiplexes input
 * files into a json encoded stream which can be piped into closure-compiler.
 * Each json file object includes the contents, path and optionally sourcemap
 * for every input file.
 *
 * Closure-compiler will return the same style string via standard-out which
 * is then converted back to vinyl files.
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';


/**
 * @param {Object<string,string>} initOptions
 * @return {function(Object<string,string>|Array<string>):Object}
 */
module.exports = function(initOptions) {
  var CompilationStream = require('./compilation-stream');
  var lazypipe = require('lazypipe');
  var FilenameList = require('./filename-list');
  var moduleDeps = require('module-deps');
  var DepsToVinyl = require('./deps-to-vinyl');
  var sourcemaps = require('gulp-sourcemaps');
  var VinylToArray = require('./vinyl-to-array');
  var ArrayToVinyl = require('./array-to-vinyl');
  var stream = require('stream');
  var gutil = require('gulp-util');

  // Force the pipe to run even without input
  var compileWithoutInput = function(compilationStream) {
    compilationStream._streamInputRequired = false;
    process.nextTick((function() {
      var stdInStream = new stream.Readable({ read: function() {
        return new gutil.File();
      }});
      stdInStream.pipe(this);
      stdInStream.push(null);
    }).bind(this));
  };

  return function (compilationOptions, pluginOptions) {
    pluginOptions = pluginOptions || {};
    for (var key in initOptions) {
      if (!(key in pluginOptions) && initOptions.hasOwnProperty(key)) {
        pluginOptions[key] = initOptions[key];
      }
    }

    var compilationStream = new CompilationStream(compilationOptions, pluginOptions);
    var combinedPipe = lazypipe();
    var fileCache = {};
    if (pluginOptions.includeDependencies) {
      combinedPipe = combinedPipe
          .pipe(function() { return new FilenameList(fileCache); })
          .pipe(function() { return moduleDeps({ fileCache: fileCache}) })
          .pipe(function() { return new DepsToVinyl(); })
          .pipe(function() { return sourcemaps.init({loadMaps: true})})
    }
    combinedPipe = combinedPipe
          .pipe(function() { return new VinylToArray(); })
          .pipe(function() { return compilationStream; })
          .pipe(function() { return new ArrayToVinyl(); });

    combinedPipe = combinedPipe();
    combinedPipe.src = function() {
      compilationStream._streamInputRequired = false;
      process.nextTick((function() {
        var stdInStream = new stream.Readable({ read: function() {
          return new gutil.File();
        }});
        stdInStream.pipe(combinedPipe);
        stdInStream.push(null);
      }).bind(combinedPipe));
      return combinedPipe;
    };
    return combinedPipe;
  };
};
