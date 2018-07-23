#!/usr/bin/env node
'use strict';
const fs = require('fs');
const {getNativeImagePath, getFirstSupportedPlatform, parseCliFlags} = require('./lib/utils');

const compilerFlags = parseCliFlags(process.argv.slice(2));
let platform;
if (compilerFlags.hasOwnProperty('platform')) {
  platform = compilerFlags.platform;
  delete compilerFlags.platform;
} else {
  platform = getFirstSupportedPlatform(['native', 'java', 'javascript']);
}

if (platform !== 'javascript') {
  const Compiler = require('./lib/node/closure-compiler');
  let args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (/^--platform/.test(args[i])) {
      let delCount = 1;
      if (args[i].indexOf('=') < 0 && args.length > i + 1) {
        delCount++;
      }
      args.splice(i, delCount);
      break;
    }
  }

  const compiler = new Compiler(args);

  compiler.spawnOptions = {stdio: 'inherit'};
  if (platform === 'native') {
    compiler.JAR_PATH = null;
    compiler.javaPath = getNativeImagePath();
  }

  compiler.run((exitCode) => {
    process.exitCode = exitCode;
  });
} else {
  if (compilerFlags.help === true) {
    console.log('Sample usage: --compilation_level (-O) VAL --externs VAL --js VAL --js_output_file VAL --warning_level (-W) [QUIET | DEFAULT | VERBOSE]');
    console.log('See https://github.com/google/closure-compiler/wiki/Flags-and-Options for the full list of flags');
    process.exit(0);
  }

  if (compilerFlags.version === true) {
    const {version} = require('./package.json');
    console.log(`Version: ${version}`);
    process.exit(0);
  }

  let inputFilePromises = [];
  let waitOnStdIn = true;
  if (compilerFlags.js) {
    waitOnStdIn = false;
    if (!Array.isArray(compilerFlags.js)) {
      compilerFlags.js = [compilerFlags.js];
    }
    inputFilePromises = compilerFlags.js.map(path =>
        new Promise((resolve, reject) =>
            fs.readFile(path, 'utf8', (err, src) => err ? reject(err) : resolve({src, path})))
        .catch(e => {
          process.exitCode = 1;
          console.error(e);
        }));

    delete compilerFlags.js;
  }
  let externFilePromises = [];
  if (compilerFlags.externs) {
    if (!Array.isArray(compilerFlags.externs)) {
      compilerFlags.externs = [compilerFlags.externs];
    }
    externFilePromises = compilerFlags.externs.map(path =>
        new Promise((resolve, reject) =>
            fs.readFile(path, 'utf8', (err, src) => err ? reject(err) : resolve({src, path})))
        .catch(e => {
          process.exitCode = 1;
          console.error(e);
        }));

    delete compilerFlags.externs;
  }

  Promise.all([...inputFilePromises, ...externFilePromises])
    .then(files => {
      const inputFiles = files.slice(0, inputFilePromises.length);
      const externs = files.slice(inputFilePromises.length);
      if (externs.length > 0) {
        compilerFlags.externs = externs;
      } else {
        delete compilerFlags.externs;
      }

      if (!waitOnStdIn) {
        return inputFiles;
      } else {
        return new Promise(resolve => {
          let stdInData = '';
          process.stdin.setEncoding('utf8');
          process.stdin.on('readable', () => {
            const chunk = process.stdin.read();
            if (chunk !== null) {
              stdInData += chunk;
            }
          });
          process.stdin.on('error', (err) => {
            process.exitCode = 1;
            console.error(err);
          });
          process.stdin.on('end', () => {
            if (stdInData.length > 0) {
              inputFiles.push({
                path: 'stdin',
                src: stdInData
              });
            }
            resolve(inputFiles);
          });
        });
      }
    })
    .then(inputFiles => {
      const Compiler = require('./lib/node/closure-compiler-js');
      const logErrors = require('./lib/logger');
      const compiler = new Compiler(compilerFlags);
      const output = compiler.run(inputFiles);
      const exitCode = output.errors.length === 0 ? 0 : 1;
      logErrors(output, inputFiles);
      if (output.compiledFiles.length === 1 && output.compiledFiles[0].path === 'compiled.js' &&
          !compilerFlags['js_output_file']) {
        console.log(output.compiledFiles[0].src);
      }

      process.exitCode = process.exitCode || exitCode;
    })
    .catch(e => {
      console.error(e);
      process.exitCode = process.exitCode || 1;
    });
}
