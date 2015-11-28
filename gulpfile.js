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
 * @fileoverview Build process for closure-compiler-npm package
 *
 * Since the package doesn't require building, this file runs
 * tests and auto-increments the version number. Auto-increment
 * is used to support continuous delivery.
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

var gulp = require('gulp');
var gutil = require('gulp-util');
var mocha = require('gulp-mocha');
var git = require('simple-git')(__dirname);
var Semver = require('semver');
var fs = require('fs');
var packageInfo = require('./package.json');
var currentVer = new Semver(packageInfo.version);

gulp.task('test', function() {
  return gulp.src('./test/**.js', {read: false})
      .pipe(mocha());
});
gulp.task('default', ['test']);


/**
 * Check the git diff for package.json to return whether it included
 * a change to the version number.
 * @return {Promise<boolean>}
 */
var didLastCommitChangeVersionNumber = function() {
  return new Promise(function (resolve, reject) {
    git.diff(['HEAD^', 'HEAD', 'package.json'], function(err, data) {
      if (err) {
        return reject(err);
      }

      var versionData = (data || '').match(/^[+-]\s*"version": "[^"]+",$/mg);
      var versionChanged = versionData === null ? false : versionData.length === 2;
      return resolve(versionChanged);
    });
  });
};

/**
 * If the previous commit didn't include a version number change,
 * calculate what the new version should be.
 *
 * @param {boolean} alreadyChanged
 * @returns {Promise<Semver>}
 */
var getNextVersionNumber = function(alreadyChanged) {
  return new Promise(function(resolve, reject) {
    if (alreadyChanged) {
      gutil.log('Most recent commit incremented version number. No changes needed.');
      return resolve(currentVer);
    }

    var Compiler = require('./lib/node/closure-compiler');
    var compiler = new Compiler({version: true});
    compiler.run(function(code, data, err) {
      if (code !== 0) {
        return reject(new Error('Non-zero exit code: ' + code));
      }

      var versionNum = (data || '').match(/Version:\sv(.*)$/m);
      if (versionNum.length !== 2) {
        return resolve(new Error('Unable to parse compiler version number'));
      }
      var compilerVer = new Semver(versionNum[1] + '.0.0');

      if (compilerVer.compare(currentVer) > 0) {
        gutil.log('New compiler version detected. Increment major version.');
        return resolve(compilerVer);
      }

      var nextVersion = new Semver(packageInfo.version);
      nextVersion.inc('minor');
      gutil.log('Changes detected. Increment minor version.');
      return resolve(nextVersion);
    });
  });
};

/**
 * Given a semver object, update package.json (if needed) to the
 * new version number. If changed, add and commit package.json.
 *
 * @param {Semver} newVersion
 * @returns {Promise<boolean>}
 */
var updatePackageToNewVersion = function(newVersion) {
  return new Promise(function(resolve, reject) {
    if (currentVer.compare(newVersion) >= 0) {
      return resolve(false);
    }

    packageInfo.version = newVersion.version;
    fs.writeFileSync('./package.json', JSON.stringify(packageInfo, null, 2) + '\n');

    git.add('package.json', function(err, data) {})
        .commit('Increment version number to ' + newVersion.version, function(err, data) {
          gutil.log('New version committed: ' + newVersion.version);
          return resolve(true);
        });
  });
};

/**
 * Task to determine whether a bump in the version number is needed.
 * This task is intended to be called by a continuous integration system
 * that will auto-push any changes back to the main repository.
 */
gulp.task('release-if-changed', function(callback) {
  var nodeVersion = new Semver(process.version);
  if (nodeVersion.compare(new Semver('5.0.0')) < 0) {
    return callback();
  }

  didLastCommitChangeVersionNumber()
      .then(getNextVersionNumber)
      .then(updatePackageToNewVersion)
      .catch(function(err) {
        throw err;
      });
});
