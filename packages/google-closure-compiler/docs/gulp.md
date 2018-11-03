# Using the Gulp Plugin

The gulp plugin supports piping multiple files through the compiler.

Options are a direct match to the compiler flags without the leading "--".

## Basic Configuration Example:

```js
const closureCompiler = require('google-closure-compiler').gulp();

gulp.task('js-compile', function () {
  return gulp.src('./src/js/**/*.js', {base: './'})
      .pipe(closureCompiler({
          compilation_level: 'SIMPLE',
          warning_level: 'VERBOSE',
          language_in: 'ECMASCRIPT6_STRICT',
          language_out: 'ECMASCRIPT5_STRICT',
          output_wrapper: '(function(){\n%output%\n}).call(this)',
          js_output_file: 'output.min.js'
        }, {
          platform: ['native', 'java', 'javascript']
        }))
      .pipe(gulp.dest('./dist/js'));
});
```

The `platform` option specifies whether to use the `java`, `javascript` or `native` versions of the compiler.
The option can be either a string or an array where the first supported platform will be used:

## Use without gulp.src (Java Version Only)
Gulp files are all read into memory, transformed into a JSON stream, and piped through the
compiler. With large source sets this may require a large amount of memory.

Closure-compiler can natively expand file globs which will greatly alleviate this issue.

```js
const compilerPackage = require('google-closure-compiler');
const closureCompiler = compilerPackage.gulp();

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

## gulp.src base option
Gulp attempts to set the base of a glob from the point of the first wildcard. This isn't always
what is desired. Users can specify the { base: 'path' } option to `gulp.src` calls to override
this behavior.

## Gulp Sourcemaps
The gulp plugin supports gulp sourcemaps.

```js
const closureCompiler = require('google-closure-compiler').gulp();
const sourcemaps = require('gulp-sourcemaps');

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

## Specifying Extra Java Arguments
Some users may wish to pass the java vm extra arguments - such as to specify the amount of memory the compiler should
be allocated. Both the grunt and gulp plugins support this.

```js
const closureCompiler = require('google-closure-compiler').gulp({
  extraArguments: ['-Xms2048m']
});
```
