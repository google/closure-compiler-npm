# google-closure-compiler
[![npm version](https://badge.fury.io/js/google-closure-compiler.svg)](https://badge.fury.io/js/google-closure-compiler)

Check, compile, optimize and compress Javascript with Closure-Compiler

This repository tracks issues related to the publication to npmjs.org and associated plugins.
Any bugs not related to the plugins themselves should be reported to the
[main repository](https://github.com/google/closure-compiler/).

**Note that the installed binary is not actually JavaScript, but native binary or Java jar file depending on the local system.** 

## Getting Started
If you are new to [Closure-Compiler](https://developers.google.com/closure/compiler/), make
sure to read and understand the
[compilation levels](https://developers.google.com/closure/compiler/docs/compilation_levels) as
the compiler works very differently depending on the compilation level selected.

For help or questions with the compiler, the best resource is
[Stack Overflow](http://stackoverflow.com/questions/tagged/google-closure-compiler). Posts there
are monitored by multiple Closure Compiler team members.

You may also post in the
[Closure Compiler Discuss Google Group](https://groups.google.com/forum/#!forum/closure-compiler-discuss).

*Please don't cross post to both Stack Overflow and Closure Compiler Discuss.*

The compiler is distributed as a Java jar or as Mac OS, Linux and Windows native binaries.

### Native Binary Version
On Linux, Mac OS and Windows, optional dependencies will install a native binary of the compiler.
Native binaries offer faster compile times without requiring Java to be installed and available.
Compilations with a very large number of source files may be slightly slower than the java version.

### Java Version
Requires java to be installed and in the path. Using the java version typically results in faster compilation times.

## Usage
The simplest way to invoke the compiler (e.g. if you're just trying it out) is with [`npx`](https://www.npmjs.com/package/npx):

    npx google-closure-compiler --js=my_program.js --js_output_file=out.js

The npx version will attempt to detect the best platform to use. You can also specify the platform
with the special `--platform` flag.

### Installation

```
npm install --save google-closure-compiler
```

### Configuration

See the [full list of compiler flags](https://github.com/google/closure-compiler/wiki/Flags-and-Options).

The build tool plugins take options objects. The option parameters map directly to the
compiler flags without the leading '--' characters. You may also use camelCase option names.

Values are either strings or booleans. Options which have multiple values can be arrays.

```js
  {
    js: ['/file-one.js', '/file-two.js'],
    compilation_level: 'ADVANCED',
    js_output_file: 'out.js',
    debug: true
  }
```

For the java version, some shells (particularly windows) try to do expansion on globs rather
than passing the string on to the compiler. To prevent this it is necessary to quote
certain arguments:

```js
  {
    js: '"my/quoted/glob/**.js"',
    compilation_level: 'ADVANCED',
    js_output_file: 'out.js',
    debug: true
  }
```

## Build Tool Plugins
The compiler package also includes build tool plugins for [Grunt](http://gruntjs.com/) and [Gulp](http://gulpjs.com/). There is also an [official webpack plugin](https://www.npmjs.com/package/closure-webpack-plugin).

 * [Grunt Plugin](https://github.com/google/closure-compiler-npm/blob/master/packages/google-closure-compiler/docs/grunt.md)
 * [Gulp Plugin](https://github.com/google/closure-compiler-npm/blob/master/packages/google-closure-compiler/docs/gulp.md)

### Community Maintained Plugins
Additionally, community members have created plugins leveraging this library.
 * [Rollup Plugin](https://github.com/ampproject/rollup-plugin-closure-compiler)

## Advanced Java Version Usage

### Changing the Path to the Java SDK

Override the path before first use.

```
import Compiler from 'google-closure-compiler';

const compiler = new Compiler({args});
compiler.javaPath = '/node_modules/MODULE_NAME/jre/jre1.8.0_131.jre/Contents/Home/bin/java';
```

## Native Node Usage (for Plugin Authors)
A low-level node class is included to facilitate spawning the compiler jar as a process from Node.
In addition, it exposes a static property with the path to the compiler jar file.

### Java Version

```js
import ClosureCompiler, {COMPILER_PATH, CONTRIB_PATH} from 'google-closure-compiler';

console.log(COMPILER_PATH); // absolute path to the compiler jar
console.log(CONTRIB_PATH); // absolute path to the contrib folder which contain externs

const closureCompiler = new ClosureCompiler({
  js: 'file-one.js',
  compilation_level: 'ADVANCED'
});

const compilerProcess = closureCompiler.run((exitCode, stdOut, stdErr) => {
  //compilation complete
});
```

## License
Copyright 2015 The Closure Compiler Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## Version History
Closure Compiler release notes can be found on the
[main repository wiki](https://github.com/google/closure-compiler/wiki/Releases).
