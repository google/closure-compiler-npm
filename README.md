# google-closure-compiler
[![Build Status](https://travis-ci.org/google/closure-compiler-npm.svg?branch=master)](https://travis-ci.org/google/closure-compiler-npm) [![npm version](https://badge.fury.io/js/google-closure-compiler.svg)](https://badge.fury.io/js/google-closure-compiler)

Check, compile, optimize and compress JavaScript with Closure-Compiler.

This repository tracks issues related to the publication of the npmjs.com package and associated plugins.
Any bugs not related to the plugins themselves should be reported to the
[main repository](https://github.com/google/closure-compiler/).

## Getting Started
*This package requires Java to be installed and in the path.*
Looking for a version that does not require Java? Take a look at the JavaScript port: [google-closure-compiler-js](https://github.com/google/closure-compiler-js).

If you are new to [Closure-Compiler](https://developers.google.com/closure/compiler/), make sure to read and understand the [compilation levels](https://developers.google.com/closure/compiler/docs/compilation_levels), as the compiler works very differently depending on selected level.

If you need help or have questions about the compiler, your best resource will be [Stack Overflow](http://stackoverflow.com/questions/tagged/google-closure-compiler). Posts there
are monitored by multiple Closure Compiler team members.

You may also post in the
[Closure Compiler Discuss Google Group](https://groups.google.com/forum/#!forum/closure-compiler-discuss).

*Please avoid cross-posting to Stack Overflow and Closure Compiler Discuss Google Group at the same time.*

## Usage
The compiler package now includes building tool plugins for both [Grunt](http://gruntjs.com/) and
[Gulp](http://gulpjs.com/).

### Installation

```
npm install --save google-closure-compiler
```

### Configuration

The compiler has a large number of flags, all of which you can see by running the compiler.jar file (inside `node_modules/google-closure-compiler` folder) with the `--help` command, like so:

```
java -jar compiler.jar --help
```

### Specifying Options

- Both Grunt and Gulp tasks take options objects.
- Options parameters without the preceding `--` characters map directly to the compiler flags.
- Values must be either strings or booleans.
- Arrays can be used for options having multiple values.

```js
  {
    js: ['/file-one.js', '/file-two.js'],
    compilation_level: 'ADVANCED',
    js_output_file: 'out.js',
    debug: true
  }
```

An array of strings can be used to specify your options if advanced usage is needed.
In this case, options keys *must* be preceded by `--`, and the compiler processes them in the specified order (left to right, top to bottom).

```js
  [
    '--js', '/file-one.js',
    '--js', '/file-two.js',
    '--compilation_level', 'ADVANCED',
    '--js_output_file', 'out.js',
    '--debug'
  ]
```

- Input files should not be specified via build tools when passing an array of option flags. Instead, you should use compilation flags as you would, directly.

Some shells (Windows, in particular) try to do an expansion on globs rather than passing the string on to the compiler. To prevent this, you should quote certain arguments like so:

```js
  {
    js: '"my/quoted/glob/**.js"',
    compilation_level: 'ADVANCED',
    js_output_file: 'out.js',
    debug: true
  }
```

## Using the Grunt Task

Include the plugin in your Gruntfile.js:

```js
require('google-closure-compiler').grunt(grunt);
// The load-grunt-tasks plugin won't automatically load closure-compiler
```

* Options, files, and task targets may be specified according to Grunt's [Configuring Tasks Guide](http://gruntjs.com/configuring-tasks).

### Basic Configuration Example:

```js
require('google-closure-compiler').grunt(grunt);

// Project configuration.
grunt.initConfig({
  'closure-compiler': {
    my_target: {
      files: {
        'dest/output.min.js': ['src/js/**/*.js']
      },
      options: {
        compilation_level: 'SIMPLE',
        language_in: 'ECMASCRIPT5_STRICT',
        create_source_map: 'dest/output.min.js.map',
        output_wrapper: '(function(){\n%output%\n}).call(this)\n//# sourceMappingURL=output.min.js.map'
      }
    }
  }
});
```

### Closure Library Example:

```js

var compilerPackage = require('google-closure-compiler');
compilerPackage.grunt(grunt);

// Project configuration.
grunt.initConfig({
  'closure-compiler': {
    my_target: {
      files: {
        'dest/output.min.js': ['src/js/**/*.js']
      },
      options: {
        js: '/node_modules/google-closure-library/**.js'
        externs: compilerPackage.compiler.CONTRIB_PATH + '/externs/jquery-1.9.js',
        compilation_level: 'SIMPLE',
        manage_closure_dependencies: true,
        language_in: 'ECMASCRIPT5_STRICT',
        create_source_map: 'dest/output.min.js.map',
        output_wrapper: '(function(){\n%output%\n}).call(this)\n//# sourceMappingURL=output.min.js.map'
      }
    }
  }
});
```

### Advanced Usage with Arguments Array:

```js
// Project configuration.
grunt.initConfig({
  'closure-compiler': {
    my_target: {
      options: {
        // When args is present, all other options are ignored
        args: [
          '--js', '/file-one.js',
          '--js', '/file-two.js',
          '--compilation_level', 'ADVANCED',
          '--js_output_file', 'out.js',
          '--debug'
        ]
      }
    }
  }
});
```

## Using the Gulp Plugin

The Gulp plugin supports piping multiple files through the compiler.

Options without the preceding `--` are a direct match to compiler's flags.

### Basic Configuration Example:

```js
var closureCompiler = require('google-closure-compiler').gulp();

gulp.task('js-compile', function () {
  return gulp.src('./src/js/**/*.js', {base: './'})
      .pipe(closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE',
          language_in: 'ECMASCRIPT6_STRICT',
          language_out: 'ECMASCRIPT5_STRICT',
          output_wrapper: '(function(){\n%output%\n}).call(this)',
          js_output_file: 'output.min.js'
        }))
      .pipe(gulp.dest('./dist/js'));
});
```

### Use without gulp.src
Gulp files are all read into memory, transformed into a JSON stream, and piped through the compiler. With large source sets, this might end demanding a significant amount of it [memory].

To mitigate this issue considerably, Closure-Compiler can natively expand file globs like so:

```js
var compilerPackage = require('google-closure-compiler');
var closureCompiler = compilerPackage.gulp();

gulp.task('js-compile', function () {
  return closureCompiler({
        js: './src/js/**.js',
        externs: compilerPackage.compiler.CONTRIB_PATH + '/externs/jquery-1.9.js',
        compilation_level: 'SIMPLE',
        warning_level: 'VERBOSE',
        language_in: 'ECMASCRIPT6_STRICT',
        language_out: 'ECMASCRIPT5_STRICT',
        output_wrapper: '(function(){\n%output%\n}).call(this)',
        js_output_file: 'output.min.js'
      })
      .src() // needed to force the plugin to run without gulp.src
      .pipe(gulp.dest('./dist/js'));
});
```

### gulp.src base option
Gulp attempts to set the base of a glob from the point of the first wildcard, but this is not always what you desire. To override this behavior, you can set a specific base path to `gulp.src` using the `{base: 'path'}` option.

### Advanced Usage with Arguments Array:

```js
var closureCompiler = require('google-closure-compiler').gulp();

gulp.task('js-compile', function () {
  return closureCompiler([
        '--js', '/file-one.js',
        '--js', '/file-two.js',
        '--compilation_level', 'ADVANCED',
        '--js_output_file', 'out.js',
        '--debug'
      ])
      .src() // needed to force the plugin to run without gulp.src
      .pipe(gulp.dest('./dist/js'));
});
```

### Gulp Source Maps
The Gulp plugin also gives support to gulp-sourcemaps.

```js
var closureCompiler = require('google-closure-compiler').gulp();
var sourcemaps = require('gulp-sourcemaps');

gulp.task('js-compile', function () {
  return gulp.src('./src/js/**/*.js', {base: './'})
      .pipe(sourcemaps.init())
      .pipe(closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE',
          language_in: 'ECMASCRIPT6_STRICT',
          language_out: 'ECMASCRIPT5_STRICT',
          output_wrapper: '(function(){\n%output%\n}).call(this)',
          js_output_file: 'output.min.js'
        }))
      .pipe(sourcemaps.write('/')) // gulp-sourcemaps automatically adds the sourcemap url comment
      .pipe(gulp.dest('./dist/js'));
});
```

## Specifying Additional Java Arguments
Some users may wish to pass additional arguments to the Java VM, such as to specify the amount of memory the compiler should be allocating.
Both the Grunt and Gulp plugins support this:

### Grunt
```js
require('google-closure-compiler').grunt(grunt, ['-Xms2048m']);
```

### Gulp
```js
var closureCompiler = require('google-closure-compiler').gulp({
  extraArguments: ['-Xms2048m']
});
```

## Plugin Authors and Native Node Usage
We include a low-level node class to facilitate spawning compiler jar as a process from Node.
Along with that, there's also a static property that exposes the path to the compiler jar file.

```js
var ClosureCompiler = require('google-closure-compiler').compiler;

console.log(ClosureCompiler.COMPILER_PATH); // absolute path the compiler jar
console.log(ClosureCompiler.CONTRIB_PATH); // absolute path the contrib folder which contains

var closureCompiler = new ClosureCompiler({
  js: 'file-one.js',
  compilation_level: 'ADVANCED'
});

var compilerProcess = closureCompiler.run(function(exitCode, stdOut, stdErr) {
  //compilation complete
});
```

## Version History
Closure Compiler release notes can be found on the [main repository wiki](https://github.com/google/closure-compiler/wiki/Binary-Downloads).

## License
Copyright © 2017 The Closure Compiler Authors

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
