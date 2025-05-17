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

import stream from 'node:stream';
import chalk from 'chalk';
import File from 'vinyl';
import applySourceMap from 'vinyl-sourcemaps-apply';

import filesToJson from './concat-to-json.js';
import jsonToVinyl from './json-to-vinyl.js';
import Compiler from '../node/index.js';
import {getNativeImagePath, getFirstSupportedPlatform} from '../utils.js';

const PLUGIN_NAME = 'gulp-google-closure-compiler';

const getLogger = async () => {
  try {
    const { default: fancyLog } = await import('fancy-log');
    return fancyLog;
  } catch {}

  try {
    const { default: gulpUtil } = await import('gulp-util');
    return gulpUtil.log;
  } catch {}

  return console;
};

/**
 * Rethrow an error with a custom message.
 * @see https://stackoverflow.com/a/42755876/1211524
 */
class PluginError extends Error {
  constructor(plugin, message) {
    if (message instanceof Error) {
      super(`Error in ${plugin}`, {cause: message});
    } else {
      super(`${plugin}: ${message}`);
    }
  }
}

class CompilationStream extends stream.Transform {
  constructor(compilationOptions, pluginOptions = {}) {
    super({objectMode: true});
    this.compilationOptions_ = compilationOptions;
    this.streamMode_ = pluginOptions.streamMode || 'BOTH';
    this.logger_ = pluginOptions.logger;
    this.PLUGIN_NAME_ = pluginOptions.pluginName || PLUGIN_NAME;
    this.extraCommandArgs_ = pluginOptions.extraCommandArguments || [];

    this.fileList_ = [];
    this._streamInputRequired = pluginOptions.requireStreamInput !== false;

    let platforms = (pluginOptions && pluginOptions.platform) || ['native', 'java'];
    if (!Array.isArray(platforms)) {
      platforms = [platforms];
    }
    this.platform = getFirstSupportedPlatform(platforms);
  }

  src() {
    this._streamInputRequired = false;
    process.nextTick(() => {
      const stdInStream = new stream.Readable({ read: function() {
        return new File();
      }});
      stdInStream.pipe(this);
      stdInStream.push(null);
    });
    return this;
  }

  _transform(file, enc, cb) {
    // ignore empty files
    if (!file || file.isNull()) {
      cb();
      return;
    }

    if (file.isStream()) {
      cb(new PluginError(this.PLUGIN_NAME_, 'Streaming not supported'));
      return;
    }

    this.fileList_.push(file);
    cb();
  }

  async _flush(cb) {
    let jsonFiles;
    if (this.fileList_.length > 0) {
      // Input files are present. Convert them to a JSON encoded string
      jsonFiles = filesToJson(this.fileList_);
    } else {
      // If files in the stream were required, no compilation needed here.
      if (this._streamInputRequired) {
        this.push(null);
        cb();
        return;
      }

      // The compiler will always expect something on standard-in. So pass it an empty
      // list if no files were piped into this plugin.
      jsonFiles = [];
    }
    const compiler = new Compiler(this.compilationOptions_, this.extraCommandArgs_);
    if (this.platform === 'native') {
      compiler.JAR_PATH = null;
      compiler.javaPath = getNativeImagePath();
    }
    let stdOutData = '';
    let stdErrData = '';

    // Add the gulp-specific argument so the compiler will understand the JSON encoded input
    // for gulp, the stream mode will be 'BOTH', but when invoked from grunt, we only use
    // a stream mode of 'IN'
    compiler.commandArguments.push('--json_streams', this.streamMode_);
    const compilerProcess = compiler.run();

    compilerProcess.stdout.on('data', (data) => {
      stdOutData += data;
    });
    compilerProcess.stderr.on('data', (data) => {
      stdErrData += data;
    });
    // Error events occur when there was a problem spawning the compiler process
    compilerProcess.on('error', async (err) => {
      this.emit('error', new PluginError(this.PLUGIN_NAME_,
          `Process spawn error. Is java in the path?\n${err.message}`));
      cb();
    });
    compilerProcess.stdin.on('error', (err) => {
      stdErrData += `Error writing to stdin of the compiler. ${err.message}`;
    });

    const compileExecComplete = Promise.all([
      new Promise((resolve) => compilerProcess.on('close', resolve)),
      new Promise((resolve) => compilerProcess.stdout.on('end', resolve)),
      new Promise((resolve) => compilerProcess.stderr.on('end', resolve))
    ]);

    const stdInStream = new stream.Readable({ read: function() {}});
    stdInStream.pipe(compilerProcess.stdin);
    await new Promise((resolve) => {
      process.nextTick(() => {
        stdInStream.push(JSON.stringify(jsonFiles));
        stdInStream.push(null);
        resolve();
      });
    });

    try {
      const [code] = await compileExecComplete;

      // If present, standard output will be a string of JSON encoded files.
      // Convert these back to vinyl
      let outputFiles = [];
      if (stdOutData.trim().length > 0) {
        if (code !== 0) {
          this.emit('error', new PluginError(this.PLUGIN_NAME_, `Compiler error.\n${stdOutData}\n${stdErrData}`));
          cb();
          return;
        }

        // stdOutData = stdOutData.substr(stdOutData.indexOf('{'));
        try {
          outputFiles = JSON.parse(stdOutData);
        } catch (e) {
          const composedError = new Error('Error parsing json encoded files', {cause: e});
          this.emit('error', new PluginError(this.PLUGIN_NAME_, composedError));
          cb();
          return;
        }
      }

      if (!this.logger_) {
        this.logger_ = await getLogger();
      }
      this._compilationComplete(code, outputFiles, stdErrData);
    } catch (err) {
      this.emit('error', new PluginError(this.PLUGIN_NAME_, err));
    }
    cb();
  }

  /**
   * @param {number} exitCode
   * @param {Array<!{
   *     path: string,
   *     src: string,
   *     sourceMap: (string|undefined)
   *   }>} compiledJs
   * @param {string} errors
   * @private
   */
  _compilationComplete(exitCode, compiledJs, errors) {
    // standard error will contain compilation warnings, log those
    if (errors && errors.trim().length > 0) {
      const logger = this.logger_.warn ? this.logger_.warn : this.logger_;
      logger(`${chalk.yellow(this.PLUGIN_NAME_)}: ${errors}`);
    }

    // non-zero exit means a compilation error
    if (exitCode !== 0) {
      this.emit('error', new PluginError(this.PLUGIN_NAME_, 'Compilation errors occurred'));
    }

    // If present, standard output will be a string of JSON encoded files.
    // Convert these back to vinyl
    const outputFiles = jsonToVinyl(compiledJs);

    for (let i = 0; i < outputFiles.length; i++) {
      if (outputFiles[i].sourceMap) {
        applySourceMap(outputFiles[i], outputFiles[i].sourceMap);
      }
      this.push(outputFiles[i]);
    }
  }
}

/**
 * @param {Object<string,string>} initOptions
 * @return {function(Object<string,string>|Array<string>):Object}
 */
export default (compilationOptions, pluginOptions) => new CompilationStream(compilationOptions, pluginOptions);
