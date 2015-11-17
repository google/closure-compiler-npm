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
 * @fileoverview Gulp helper task to convert an array of JSON encoded files
 * back to multiple vinyl files
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

/** @const */
var PLUGIN_NAME = require('./plugin-name');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var through = require('through2');
var File = gutil.File;

// file is a vinyl file object
module.exports = function() {

  var incomingFile;

  function bufferContents(file, enc, cb) {
    if (incomingFile) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Only a single input file is supported'));
      cb();
      return;
    }

    // ignore empty files
    if (file.isNull()) {
      incomingFile = {};
      cb();
      return;
    }

    if (file.isStream()) {
      incomingFile = {};
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
      cb();
      return;
    }

    incomingFile = file;
    cb();
  }

  function endStream(cb) {
    if (!(incomingFile && incomingFile.contents)) {
      cb();
      return;
    }

    var fileList;
    try {
      fileList = JSON.parse(incomingFile.contents);
    } catch (e) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Error parsing json encoded files'));
      cb();
      return;
    }

    for (var i = 0; i < fileList.length; i++) {
      let file = new File(fileList[i].path || 'compiled' + i + '.js');
      file.contents = fileList[i].src;
      if (fileList[i].source_map) {
        try {
          file.sourceMap = JSON.parse(fileList[i].source_map);
        } catch (e) {
          this.emit('error', new PluginError(PLUGIN_NAME, 'Error parsing json encoded sourcemap'));
        }
      }
      this.push(file);
    }

    cb();
  }

  return through.obj(bufferContents, endStream);
};
