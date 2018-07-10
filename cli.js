#!/usr/bin/env node
'use strict';
const fs = require('fs');
const {getNativeImagePath, getFirstSupportedPlatform, parseCliFlags} = require('./lib/utils');

const compilerFlags = parseCliFlags(process.argv.slice(2));
let platform;
if (compilerFlags.platform) {
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
    process.exit(exitCode);
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
        .catch(e => console.error(e)));

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
        .catch(e => console.error(e)));

    delete compilerFlags.externs;
  }

  const inputsReadPromise = inputFilePromises.length > 0 ? Promise.all(inputFilePromises) : Promise.resolve([]);
  const externsReadPromise = externFilePromises.length > 0 ? Promise.all(externFilePromises) : Promise.resolve([]);

  Promise.all([inputsReadPromise, externsReadPromise])
    .then(([inputFiles, externs]) => {
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
          process.stdin.on('readable', () => {
            const chunk = process.stdin.read();
            if (chunk !== null) {
              stdInData += chunk;
            }
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
      const compiler = new Compiler(compilerFlags);
      compiler.run(inputFiles, (exitCode, compiledFiles, errors) => {
        if (errors && errors.length > 0) {
          console.error(errors);
        }
        if (compiledFiles.length === 1 && compiledFiles[0].path === 'compiled.js' && !compilerFlags['js_output_file']) {
          console.log(compiledFiles[0].src);
        }

        process.exit(exitCode);
      });
    });
}
