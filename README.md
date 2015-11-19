# google-closure-compiler
Check, compile, optimize and compress Javascript with Closure-Compiler

## Getting Started
Closure-compiler requires java to be installed and in the path.

If you are new to [Closure-Compiler](https://developers.google.com/closure/compiler/), make
sure to read and understand the
[compilation levels](https://developers.google.com/closure/compiler/docs/compilation_levels) as
the compiler works very differently depending on the compilation level selected.

## Usage
The compiler package now includes build tool plugins for [Grunt](http://gruntjs.com/) and
[Gulp](http://gulpjs.com/).

### Installation

```
npm install --save google-closure-compiler
```

### Configuration

The compiler has a large number of flags. The best documentation for the flags can be found by
running the `--help` command of the compiler.jar found inside the
`node_modules/google-closure-compiler` folder:

```
java -jar compiler.jar --help
```

### Specifying Options

Both the grunt and gulp tasks take options objects. The option parameters map directly to the
compiler flags without the leading '--' characters.

Values are either strings or booleans. Options which have multiple values can be arrays.

```js
  {
    js: ['/file-one.js', '/file-two.js'],
    compilation_level: 'ADVANCED',
    js_output_file: 'out.js',
    debug: true
  }
```

For advanced usages, the options may be specified as an array of strings. These values _include_
the "--" characters and are directly passed to the compiler in the order specified:

```js
  [
    '--js', '/file-one.js',
    '--js', '/file-two.js',
    '--compilation_level', 'ADVANCED',
    '--js_output_file', 'out.js',
    '--debug'
  ]
```

When an array of flags is passed, the input files should not be specified via the build tools, but
rather as compilation flags directly.

### Windows Path Length Limitations
Windows command shells have a maximum length for a command. This is surprisingly easy to hit when
you allows the build tools to expand large source paths for the compiler.

This can be avoided by specifying the input globs to the compiler and letting it expand the
files. You can mix these techniques. Files specified via `js` options will specified first.
See examples below.

A flagfile can also be used to workaround this issue.

### Using the Grunt Task

Include the plugin in your Gruntfile.js:

```JavaScript
// The load-grunt-tasks plugin won't automatically load closure-compiler
require('google-closure-compiler').grunt(grunt);
```

Task targets, files and options may be specified according to the grunt
[Configuring tasks](http://gruntjs.com/configuring-tasks) guide.

#### Basic Configuration Example:

```js
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

#### Closure Library Example:

```js
// Project configuration.
grunt.initConfig({
  'closure-compiler': {
    my_target: {
      files: {
        'dest/output.min.js': ['src/js/**/*.js']
      },
      options: {
        js: '/node_modules/google-closure-library/**.js'
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

### Using the Gulp Plugin

The gulp plugin supports piping multiple files through the compiler.

Options are a direct match to the compiler flags without the leading "--".

#### Basic Configuration Example:

```js
var compiler = require('google-closure-compiler').gulp();

gulp.task('js-compile', function () {
    return gulp.src('./src/js/**/*.js', {base: './'})
        .pipe(compiler({
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE',
            language_in: 'ECMASCRIPT6_STRICT',
            language_out: 'ECMASCRIPT5_STRICT',
            output_wrapper: '(function(){\n%output%\n}).call(this)\n//# sourceMappingURL=output.min.js.map'
            js_output_file: 'output.min.js'
          }))
        .pipe(gulp.dest('./dist/js'));
  });
```

### Use without gulp.src
Gulp files are all read into memory, transformed into a JSON stream, and piped through the
compiler. With large source sets this can lead to performance issues.

Closure-compiler can natively expand file globs which will greatly alleviate this issue.

```js
var compiler = require('google-closure-compiler').gulp();

gulp.task('js-compile', function () {
    return compiler({
            js: './src/js/**.js',
            compilation_level: 'SIMPLE',
            warning_level: 'VERBOSE',
            language_in: 'ECMASCRIPT6_STRICT',
            language_out: 'ECMASCRIPT5_STRICT',
            output_wrapper: '(function(){\n%output%\n}).call(this)\n//# sourceMappingURL=output.min.js.map'
            js_output_file: 'output.min.js'
          })
        .pipe(gulp.dest('./dist/js'));
  });
```

##### gulp.src base option
Gulp attempts to set the base of a glob from the point of the first wildcard. This isn't always
what is desired. Users can specify the { base: 'path' } option to `gulp.src` calls to override
this behavior.

## Version History
Closure Compiler release notes can be found on the
[main repository wiki](https://github.com/google/closure-compiler/wiki/Binary-Downloads).
