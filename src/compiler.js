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
 * @fileoverview Low level interface for calling the closure-compiler jar
 * from nodejs
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

'use strict';

var spawn = require('child_process').spawn;
var compiler_path = require.resolve('../compiler.jar');

/**
 * @param {Object<string,string>|Array<string>} args
 * @param {function(number, string, string)} callback
 * @param {Object<string, string>=} options
 * @param {Function=} logger
 * @returns {child_process.ChildProcess}
 */
function compile(args, callback, options, logger) {
  var cmdArgs = [];
  if (Array.isArray(args)) {
    cmdArgs = args.slice();
  } else {
    for (let key in args) {
      if (Array.isArray(args[key])) {
        for (let i = 0; i < args[key].length; i++) {
          cmdArgs.push('--' + key, args[key][i]);
        }
      } else {
        cmdArgs.push('--' + key)
        if (args[key] !== null && args[key] !== undefined) {
          cmdArgs.push(args[key]);
        }
      }
    }
  }

  cmdArgs.unshift('-jar', compiler_path);
  if (logger) {
    logger(cmdString(cmdArgs) + '\n');
  }

  var compileProcess = spawn('java', cmdArgs, options);

  var stdOutData = '', stdErrData = '';
  compileProcess.stdout.on('data', function (data) {
    stdOutData += data;
  });

  compileProcess.stderr.on('data', function (data) {
    stdErrData += data;
  });

  compileProcess.on('close', function (code) {
    if (code !== 0) {
      stdErrData = addCmdToErrorMessage(cmdArgs, stdErrData);
    }

    callback(code, stdOutData, stdErrData);
  });

  compileProcess.on('error', function (err) {
    callback(1, stdOutData, addCmdToErrorMessage(cmdArgs, 'Process spawn error. Is java in the path?\n' + err.message));
  });

  return compileProcess;
}

/**
 * @param {Array<string>} cmdArgs
 * @return {string}
 */
function cmdString(cmdArgs) {
  return 'java ' + cmdArgs.join(' ');
}

/**
 * @param {Array<string>} cmdArgs
 * @param {string} error
 * @return {string}
 */
function addCmdToErrorMessage(cmdArgs, error) {
  return cmdString(cmdArgs) + '\n\n' + error + '\n\n';
}

module.exports = compile;
