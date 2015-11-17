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

/** @const */
var PLUGIN_NAME = require('./plugin-name');
var gutil = require('gulp-util');
var PluginError = gutil.PluginError;
var through = require('through2');
var File = gutil.File;

function json_file(src, path, source_map) {
  var filejson = {
    src: src
  };

  if (path) {
    filejson.path = path;
  }

  if (source_map) {
    filejson.source_map = source_map;
  }

  return filejson;
}

// file is a vinyl file object
module.exports = function() {

  var fileList = [];

  function bufferContents(file, enc, cb) {
    // ignore empty files
    if (file.isNull()) {
      cb();
      return;
    }

    if (file.isStream()) {
      this.emit('error', new PluginError(PLUGIN_NAME, 'Streaming not supported'));
      cb();
      return;
    }

    fileList.push(json_file(file.contents, file.relative,
        file.sourceMap ? JSON.stringify(file.sourceMap) : undefined));

    cb();
  }

  function endStream(cb) {
    if (fileList.length === 0) {
      cb();
      return;
    }

    var jsonFileList = new File('stdin');
    jsonFileList.contents = JSON.stringify(fileList);

    this.push(jsonFileList);
    cb();
  }

  return through.obj(bufferContents, endStream);
};
