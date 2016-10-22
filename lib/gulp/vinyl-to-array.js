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
 * @fileoverview Convert an array of vinyl files to
 * a single array of records to pass to closure-compiler
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';
var Transform = require('stream').Transform;
var path = require('path');
var PLUGIN_NAME = require('./plugin-name');
var PluginError = require('gulp-util').PluginError;

function json_file(src, path, source_map) {
  var filejson = {
    src: src
  };

  if (path) {
    filejson.path = path;
  }

  if (source_map) {
    filejson.sourceMap = source_map;
  }

  return filejson;
}

/**
 * Converts a stream of vinyl file objects
 * to an array of JSON file records
 * @constructor
 */
function VinylToArray() {
  Transform.call(this,{objectMode: true});
  this.filelist = [];
}
VinylToArray.prototype = Object.create(Transform.prototype);

VinylToArray.prototype._transform = function(file, encoding, cb) {
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

  this.filelist.push(
      json_file(file.contents.toString(),
          '/' + path.relative(process.cwd(), file.path),
          file.sourceMap ? JSON.stringify(file.sourceMap) : undefined));

  cb(null);
};

VinylToArray.prototype._flush = function(cb) {
  this.push(this.filelist);
  cb();
};

module.exports = VinylToArray;
