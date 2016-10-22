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
 * @fileoverview Transform stream for piping an array
 * of file records through closure compiler.
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';
var Compiler = require('../node/closure-compiler');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var stream = require('stream');
/** @const */
var PLUGIN_NAME = require('./plugin-name');

function CompilationStream(compilationOptions, pluginOptions) {
  stream.Transform.call(this, {objectMode: true});

  pluginOptions = pluginOptions || {};

  this.compilatonOptions_ = compilationOptions;
  this.streamMode_ = pluginOptions.streamMode || 'BOTH';
  this.logger_ = pluginOptions.logger || gutil.log;
  this.PLUGIN_NAME_ = pluginOptions.pluginName || PLUGIN_NAME;
  this.extraCommandArguments = pluginOptions.extraArguments;

  this.fileList_ = [];
  this._streamInputRequired = pluginOptions.requireStreamInput !== false;
}
CompilationStream.prototype = Object.create(stream.Transform.prototype);

// Buffer the files into an array
CompilationStream.prototype._transform = function(jsonfiles, enc, cb) {
  this.fileList_ = jsonfiles;
  cb();
};

CompilationStream.prototype._flush = function(cb) {
  this.fileList_ = this.fileList_ || [];
  var logger = this.logger_.warn ? this.logger_.warn : this.logger_;
  if (this.fileList_.length == 0 && this._streamInputRequired) {
    this.emit('end');
    cb();
    return;
  }

  var compiler = new Compiler(this.compilatonOptions_, this.extraCommandArguments);

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

  Promise.all([
    new Promise(function(resolve) {
      compilerProcess.on('close', function(code) {
        resolve(code);
      });
    }),
    new Promise(function(resolve) {
      compilerProcess.stdout.on('end', function() {
        resolve();
      });
    }),
    new Promise(function(resolve) {
      compilerProcess.stderr.on('end', function() {
        resolve();
      });
    })
  ]).then((function(results) {
    var code = results[0];

    // standard error will contain compilation warnings, log those
    if (stdErrData.trim().length > 0) {
      logger(gutil.colors.yellow(this.PLUGIN_NAME_) + ': ' + stdErrData);
    }

    // non-zero exit means a compilation error
    if (code !== 0) {
      this.emit('error', new PluginError(this.PLUGIN_NAME_, 'Compilation error'));
    }

    // If present, standard output will be a string of JSON encoded files.
    // Convert these back to vinyl
    if (stdOutData.trim().length > 0) {
      try {
        this.push(JSON.parse(stdOutData));
      } catch (e) {
        this.emit('error', new PluginError(this.PLUGIN_NAME_, 'Error parsing json encoded files'));
        cb();
        return;
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
  stdInStream.push(JSON.stringify(this.fileList_));
  stdInStream.push(null);
};

module.exports = CompilationStream;
