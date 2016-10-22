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
var File = require('gulp-util').File;
var path = require('path');
var fs = require('fs');

/**
 * Converts a stream of file description objects from the
 * module-deps package to a stream of vinyl files.
 *
 * If a dependency from a module deps file has a
 * package.json file "main" entry, include the
 * package.json in the files.
 *
 * @constructor
 */
function ModuleDepsToVinyl() {
  Transform.call(this, {objectMode: true});
  this._filelist = [];
}
ModuleDepsToVinyl.prototype = Object.create(Transform.prototype);

ModuleDepsToVinyl.prototype._transform = function(data, encoding, cb) {
  this._filelist.push(data);
  cb();
};

ModuleDepsToVinyl.prototype._flush = function(cb) {
  var files = {};
  this._filelist.forEach(function(file) {
    files[file.file] = new File({
      path: file.file,
      contents: new Buffer(file.source, 'utf8')
    });
  });

  for (var i = 0; i < this._filelist.length; i++) {
    for (var dep in this._filelist[i].deps) {
      var packageJson = this.getPackageJsonForDep(this._filelist[i], dep);
      if (packageJson) {
        files[packageJson.path] = packageJson;
      }
    }
  }

  for (var file in files) {
    this.push(files[file]);
  }

  cb();
};

ModuleDepsToVinyl.prototype.getPackageJsonForDep = function(file, dep) {
  var packageJsonPath, pathStats;
  if (/^(\.|\/)/.test(dep[0])) {
    var normalizedPath = dep[0] === '.' ? path.normalize(path.dirname[file.file] + '/' + dep) : dep;
    try {
      pathStats = fs.statSync(normalizedPath);
      if (pathStats.isDirectory()) {
        pathStats = fs.statSync(normalizedPath + '/package.json');
        if (pathStats.isFile()) {
          packageJsonPath = normalizedPath + '/package.json';
        }
      }
    } catch(e) { }
  } else {
    var index = file.deps[dep].lastIndexOf("/node_modules/" + dep + "/");
    var parentPath = file.deps[dep].substring(0, index);
    packageJsonPath = parentPath + "/node_modules/" + dep + "/package.json";
    try {
      pathStats = fs.statSync(packageJsonPath);
      if (!pathStats.isFile()) {
        packageJsonPath = undefined;
      }
    } catch (e) {
      packageJsonPath = undefined;
    }
  }
  if (packageJsonPath) {
    return new File({
      path: packageJsonPath,
      contents: fs.readFileSync(packageJsonPath)
    });
  }
  return null;
};

module.exports = ModuleDepsToVinyl;
