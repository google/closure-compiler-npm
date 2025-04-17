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
 * @fileoverview Grunt task for closure-compiler.
 * The task is simply a grunt wrapper for the gulp plugin. The gulp plugin
 * is used to stream multiple input files in via stdin. This alleviates
 * problems with the windows command shell which has restrictions on the
 * length of a command.
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */
import {Transform} from 'node:stream';
import chalk from 'chalk';
import gulpCompiler from '../gulp/index.js';
import {getFirstSupportedPlatform} from '../utils.js';
import VinylStream from './vinyl-stream.js';

export default (grunt, pluginOptions) => {
  const gulpCompilerOptions = {};
  let extraArguments;
  let platforms;
  let maxParallelCompilations = false;
  if (pluginOptions) {
    if (pluginOptions.platform) {
      platforms = Array.isArray(pluginOptions.platform) ? pluginOptions.platform : [pluginOptions.platform];
    }
    if (pluginOptions.extraArguments) {
      extraArguments = pluginOptions.extraArguments;
    }
    if (pluginOptions.compile_in_batches && pluginOptions.max_parallel_compilations === undefined) {
      pluginOptions.max_parallel_compilations = pluginOptions.compile_in_batches;
      grunt.log.warn('DEPRECATED: compile_in_batches is deprecated. Use max_parallel_compilations.');
    }
    if (typeof pluginOptions.max_parallel_compilations === 'number' && pluginOptions.max_parallel_compilations > 0) {
      maxParallelCompilations = pluginOptions.max_parallel_compilations;
    }
  }

  if (!platforms) {
    platforms = ['native', 'java'];
  }
  const platform = getFirstSupportedPlatform(platforms);
  const compilationPromiseGenerator =
      (files, options, pluginOpts) => () => compilationPromise(files, options, pluginOpts);

  /**
   * @param {Array<string>|null} files
   * @param {Object<string,string|boolean|Array<string>>|Array<string>} options
   * @param {?} pluginOpts
   * @return {Promise}
   */
  const compilationPromise = (files, options, pluginOpts) => {
    let hadError = false;
    const logFile = (cb) => {
      // If an error was encoutered, it will have already been logged
      if (!hadError) {
        if (options.js_output_file) {
          grunt.log.ok(chalk.cyan(options.js_output_file) + ' created');
        } else {
          grunt.log.ok('Compilation succeeded');
        }
      }
      cb();
    };

    const loggingStream = new Transform({
      objectMode: true,
      transform: function() {},
      flush: logFile
    });

    return new Promise((resolve, reject) => {
      let stream;
      const args = {};
      let gulpOpts = {
        ...gulpCompilerOptions,
        streamMode: 'IN',
        logger: grunt.log,
        pluginName: 'grunt-google-closure-compiler',
        requireStreamInput: false
      };
      const compilerOpts = {
        ...gulpOpts,
        ...pluginOpts,
        ...(extraArguments ? { extraArguments } : {}),
      };
      if (files) {
        // Source files were provided by grunt. Read these
        // in to a stream of vinyl files and pipe them through
        // the compiler task
        stream = new VinylStream(files, {base: process.cwd()})
            .pipe(gulpCompiler(options, compilerOpts));
      } else {
        // No source files were provided. Assume the options specify
        // --js flags and invoke the compiler without any grunt inputs.
        // Manually end the stream to force compilation to begin.
        stream = gulpCompiler(options, compilerOpts);
        stream.end();
      }

      stream.on('error', function(err) {
        hadError = true;
        reject(err);
      });
      stream.on('end', function(err) {
        resolve();
      });

      stream.pipe(loggingStream);
      stream.resume(); //logging stream doesn't output files, so we have to manually resume;
    });
  };

  /**
   * Grabs `ps` as array of promise-returning functions, separates it in `maxParallelCount`
   * count of sequential processing consumers and runs these consumers in parallel to process
   * all promises.
   *
   * @param {!Array<function():!Promise<undefined>>} ps functions returning promises
   * @param {!number} maxParallelCount Maximum promises running in parallel
   * @return {!Promise<undefined>|undefined}
   */
  const processPromisesParallel = (ps, maxParallelCount) => {
    // While ps is not empty grab one function, run promise from it, then repeat. Else resolve to true.
    const goInSequence = async () => {
      if (!ps.length) {
        return true;
      }
      await ps.shift()();
      return goInSequence();
    };

    let bulk = [];
    // run `maxParallelCount` or lesser (if array of promises lesser) count of goInSequence
    for (let i = 0; i < Math.min(maxParallelCount, ps.length); i++) {
      bulk.push(goInSequence());
    }
    return Promise.all(bulk);
  };

  function closureCompilerGruntTask() {
    const asyncDone = this.async();
    const compileTasks = [];

    const getCompilerOptions = () => {
      const opts = this.options({
        args: undefined
      });

      const args = opts.args;

      delete opts.args;

      return {
        args,
        compilerOpts: opts
      }
    }

    // Invoke the compiler once for each set of source files
    for (const f of this.files) {
      const options = getCompilerOptions();

      const src = f.src.filter(filepath => {
        if (!grunt.file.exists(filepath)) {
          grunt.log.warn(`Source file ${chalk.cyan(filepath)} not found`);
          return false;
        }
        return true;
      });

      // Require source files
      if (src.length === 0) {
        grunt.log.warn(`Destination ${chalk.cyan(f.dest)} not written because src files were empty`);
        continue;
      } else {
        options.compilerOpts.js_output_file = f.dest;
      }

      compileTasks.push(compilationPromiseGenerator(src, options.args || options.compilerOpts, {platform}));
    }

    // If the task was invoked without any files provided by grunt, assume that
    // --js flags are present and we want to run the compiler anyway.
    if (this.files.length === 0) {
      const options = getCompilerOptions();
      compileTasks.push(compilationPromiseGenerator(null, options.args || options.compilerOpts, {platform}));
    }

    // Multiple invocations of the compiler can occur for a single task target. Wait until
    // they are all completed before calling the "done" method.

    return (maxParallelCompilations ? processPromisesParallel(compileTasks, maxParallelCompilations) : Promise.all(compileTasks.map((t) => t())))
      .then(() => asyncDone())
      .catch((err) => {
        grunt.log.warn(err.message);
        grunt.fail.warn('Compilation error');
        asyncDone();
      });
  }

  grunt.registerMultiTask('closure-compiler',
      'Minify files with Google Closure Compiler',
      closureCompilerGruntTask);

  return closureCompilerGruntTask;
};
