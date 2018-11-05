# Deploying Closure Compiler to NPM

*You now need yarn installed: https://yarnpkg.com/en/docs/install*

 1. Update the compiler submodule pointer to the tagged release.
     * if not already done, update the compiler submodule
       `git submodule init && git submodule update`
     * change to the '/compiler' folder
     * `git checkout` the correct tag/commit (should be of the form `closure-compiler-parent-vYYYYMMDD`)
     * change back to the root folder and commit this change
 2. Run `yarn install` in the package root.
 3. Run `node_modules/.bin/lerna version {COMPILER_VERSION_NUMBER}.0.0`.
    The `COMPILER_VERSION_NUMBER` should not include the preceding `v` - example: 20181008.
    The command will ask you to verify that you wish to create new versions for each package.
    Once confirmed, version numbers will be committed, the commit tagged and changes pushed.
