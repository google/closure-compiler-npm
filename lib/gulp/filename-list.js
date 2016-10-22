/*
 * Copyright 2016 The Closure Compiler Authors.
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
'use strict';
var Transform = require('stream').Transform;

/**
 * Converts a stream of vinyl file objects
 * to a stream of path names.
 * @param {Object<string, string>=} opt_fileCache a map of path
 *   names to file contents
 * @constructor
 */
function FilenameList(opt_fileCache) {
  Transform.call(this,{objectMode: true});

  this.fileCache = opt_fileCache;
}
FilenameList.prototype = Object.create(Transform.prototype);

FilenameList.prototype._transform = function(file, encoding, cb) {
  if (this.fileCache && !file.isNull()) {
    this.fileCache[file.path] = file.contents.toString();
  }

  cb(null, file.path);
};

module.exports = FilenameList;
