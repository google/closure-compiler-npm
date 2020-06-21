# Using the Grunt Task

Task targets, files and options may be specified according to the grunt
[Configuring tasks](http://gruntjs.com/configuring-tasks) guide.

Include the plugin in your Gruntfile.js:

```js
require('google-closure-compiler').grunt(grunt, {
  platform: ['native', 'java', 'javascript'],
  max_parallel_compilations: require('os').cpus().length
});
// The load-grunt-tasks plugin won't automatically load closure-compiler
```

The `platform` option specifies whether to use the `java`, `javascript` or `native` versions of the compiler.
The option can be either a string or an array where the first supported platform will be used.

The `max_parallel_compilations` option caps number of parallel compilations to specified number. If it's 
`false` or not set all files compiled in parallel.

## Basic Configuration Example:

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

## Closure Library Example:

```js

const compilerPackage = require('google-closure-compiler');
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

## Specifying Extra Java Arguments
Some users may wish to pass the java vm extra arguments - such as to specify the amount of memory the compiler should
be allocated. Both the grunt and gulp plugins support this.

```js
require('google-closure-compiler').grunt(grunt, {
  platform: 'java',
  extraArguments: ['-Xms2048m']
});
```
