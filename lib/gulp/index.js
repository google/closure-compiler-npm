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
  var filesToJson = require('./concat-to-json');
  var jsonToVinyl = require('./json-to-vinyl');
  var Compiler = require('../node/closure-compiler');
  var gutil = require('gulp-util');
  var PluginError = gutil.PluginError;
  var stream = require('stream');
  /** @const */
  var PLUGIN_NAME = 'gulp-google-closure-compiler';
  var streamInputRequired = initOptions ? !!initOptions.requireStreamInput : false;
  var extraCommandArguments = initOptions ? initOptions.extraArguments : undefined;
  var SourceMapGenerator = require('source-map').SourceMapGenerator;
  var SourceMapConsumer = require('source-map').SourceMapConsumer;
  var applySourceMap = require('vinyl-sourcemaps-apply');
  var path = require('path');


  function CompilationStream(compilationOptions, pluginOptions) {
    stream.Transform.call(this, {objectMode: true});

    pluginOptions = pluginOptions || {};

    this.compilatonOptions_ = compilationOptions;
    this.streamMode_ = pluginOptions.streamMode || 'BOTH';
    this.logger_ = pluginOptions.logger || gutil.log;
    this.PLUGIN_NAME_ = pluginOptions.pluginName || PLUGIN_NAME;

    this.fileList_ = [];

  }
  CompilationStream.prototype = Object.create(stream.Transform.prototype);

  // Buffer the files into an array
  CompilationStream.prototype._transform = function(file, enc, cb) {
    // ignore empty files
    if (file.isNull()) {
      cb();
      return;
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(this.PLUGIN_NAME_, 'Streaming not supported'));
      cb();
      return;
    }

    this.fileList_.push(file);

    cb();
  };

  CompilationStream.prototype._flush = function(cb) {
    var jsonFiles, logger = this.logger_.warn ? this.logger_.warn : this.logger_;
    if (this.fileList_.length > 0) {
      // Input files are present. Convert them to a JSON encoded string
      jsonFiles = filesToJson(this.fileList_);
    } else {
      // If files in the stream were required, no compilation needed here.
      if (streamInputRequired) {
        this.emit('end');
        cb();
        return;
      }

      // The compiler will always expect something on standard-in. So pass it an empty
      // list if no files were piped into this plugin.
      jsonFiles = [];
    }

    var compiler = new Compiler(this.compilatonOptions_, extraCommandArguments);

    // Add the gulp-specific argument so the compiler will understand the JSON encoded input
    // for gulp, the stream mode will be 'BOTH', but when invoked from grunt, we only use
    // a stream mode of 'IN'
    compiler.commandArguments.push('--json_streams', this.streamMode_);

    var compilerProcess = compiler.run();

    var stdOutData = '', stdErrData = '';

    compilerProcess.stdout.on('data', function (data) {
      stdOutData += data;
    });
    compilerProcess.stderr.on('data', function (data) {
      stdErrData += data;
    });
    compilerProcess.on('close', (function (code) {
      // non-zero exit means a compilation error
      if (code !== 0) {
        this.emit('error', new PluginError(this.PLUGIN_NAME_,
            'Compilation error: \n\n' + compiler.prependFullCommand(stdErrData)));
      }

      // standard error will contain compilation warnings, log those
      if (stdErrData.trim().length > 0) {
        logger(gutil.colors.yellow(this.PLUGIN_NAME_) + ': ' + stdErrData);
      }

      // If present, standard output will be a string of JSON encoded files.
      // Convert these back to vinyl
      if (stdOutData.trim().length > 0) {
        var outputFiles;
        try {
          outputFiles = jsonToVinyl(stdOutData);
        } catch (e) {
          this.emit('error', new PluginError(this.PLUGIN_NAME_, 'Error parsing json encoded files'));
          cb();
          return;
        }

        for (var i = 0; i < outputFiles.length; i++) {
          if (outputFiles[i].sourceMap) {
            // Closure compiler does not compose source maps (use input source maps)
            // We need to manually compose the maps so that we reference the original file
            var generator = SourceMapGenerator.fromSourceMap(
                new SourceMapConsumer(outputFiles[i].sourceMap));
            outputFiles[i].sourceMap = undefined;

            for (var j = 0; j < jsonFiles.length; j++) {
              if (!jsonFiles[j].source_map) {
                continue;
              }
              generator.applySourceMap(
                  new SourceMapConsumer(jsonFiles[j].source_map),
                  jsonFiles[j].path.substr(1));
            }
            applySourceMap(outputFiles[i], generator.toString());
          }
          this.push(outputFiles[i]);
        }
      }
      cb();
    }).bind(this));

    // Error events occur when there was a problem spawning the compiler process
    compilerProcess.on('error', (function (err) {
      this.emit('error', new PluginError(this.PLUGIN_NAME_,
          'Process spawn error. Is java in the path?\n' + err.message));
      cb();
    }).bind(this));

    compilerProcess.stdin.on('error', (function(err) {
      this.emit('Error', new PluginError(this.PLUGIN_NAME_,
          'Error writing to stdin of the compiler.\n' + err.message));
      cb();
    }).bind(this));
    
    var stdInStream = new stream.Readable({ read: function() {}});
    stdInStream.pipe(compilerProcess.stdin);
    stdInStream.push(JSON.stringify(jsonFiles));
    stdInStream.push(null);
  };


  return function (compilationOptions, pluginOptions) {
    return new CompilationStream(compilationOptions, pluginOptions);
  };
};
