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
 * @fileoverview Gulp help task to convert multiple vinyl file buffers to
 * a single JSON encoded buffer to pass to closure-compiler
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

var Compiler = require('../node/closure-compiler');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var through = require('through2');
/** @const */
var PLUGIN_NAME = require('./plugin-name');

/**
 * @param {Object<string,string>|Array<string>} options
 * @return {Object}
 */
module.exports = function(options) {
  var incomingFiles = [];

  function bufferContents(file, enc, cb) {
    if (file.isNull()) {
      cb();
      return;
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
    }

    incomingFiles.push(file);
  }

  function endStream(cb) {
    if (incomingFiles.length > 1) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Only a single input file is supported'));

      cb();
      return;
    }

    var compiler = new Compiler(options);

    compiler.command_arguments.splice(2, 0, '--json_streams');

    if (incomingFiles.length === 1) {
      compiler.command_arguments.push('--js', '-');
    }

    var compiler_process = compiler.run();

    var gulpStream = this;
    var stdOutData = '', stdErrData = '';
    compiler_process.stdout.on('data', function (data) {
      stdOutData += data;
    });

    compiler_process.stderr.on('data', function (data) {
      stdErrData += data;
    });

    compiler_process.on('close', function (code) {
      if (code !== 0) {
        gulpStream.emit('error', new PluginError(PLUGIN_NAME,
            'Compilation error: \n\n' + compiler.prependFullCommand(stdErrData)));
      }

      if (stdErrData.trim().length > 0) {
        gutil.log.warn(PLUGIN_NAME + ': ' + stdErrData);
      }

      if (stdOutData.trim().length > 0) {
        var file = new File('stdout');
        file.contents = input;
        gulpStream.push(file);
      }

      cb();
    });

    compiler_process.on('error', function (err) {
      gulpStream.emit('error', new PluginError(PLUGIN_NAME,
          'Process spawn error. Is java in the path?\n' + err.message));
      cb();
    });

    if (incomingFiles.length === 1) {
      compiler_process.stdin.write(incomingFiles[0].contents);
    }
  }

  return through.obj(bufferContents, endStream);
};
