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

## Node module resolution
By default the compiler will not resolve any node module imports however the compiler can resolve modules if it's made aware of them. You have two options at your disposal:

### Option 1 include the module files with the source

Using hello-world-npm as an example, this command will add the hello-world-npm node module from the node_modules folder into your output file.

```npx google-closure-compiler --js=source.js node_modules/hello-world-npm/lib/index.js node_modules/hello-world-npm/package.json --js_output_file=out.js --warning_level=VERBOSE --module_resolution=NODE --externs=externs.js --process_common_js_modules```

This may not be the most user-friendly approach in a gulp workflow though.

### Option 2 use another utility that can resolve modules

Tools such as [rollup.js](https://rollupjs.org/guide/en/) or [Browserify](http://browserify.org/) can automatically resolve any imports from the node_modules folder and you can then pass those files to the Closure-compiler.

Example below using rollup.js, sourcemaps and closure-compiler in a gulp stream, you can then run the function in any tasks.

```js
const rollup = require('@rollup/stream');
const closureCompiler = require('google-closure-compiler').gulp();
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');

function compileJS() {
  return rollupStream(...//config)
    .pipe(source('script.js'))
    .pipe(buffer())
    .pipe(sourcemaps.init({ loadMaps: true }))
    .pipe(closureCompiler(...//config))
    .pipe(sourcemaps.write('./'))
    .pipe(gulp.dest('dist'));
}
```

Alternatively you can extend the closure-compiler or use a utility such as [closure-calculate-chunks](https://github.com/chadkillingsworth/closure-calculate-chunks).


## Specifying Extra Java Arguments
Some users may wish to pass the java vm extra arguments - such as to specify the amount of memory the compiler should
be allocated. Both the grunt and gulp plugins support this.

```js
const closureCompiler = require('google-closure-compiler').gulp({
  extraArguments: ['-Xms2048m']
});
```
