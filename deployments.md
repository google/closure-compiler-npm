# Deploying Closure Compiler to NPM

*You now need yarn installed - `npm install -g yarn`*

 1. Update the compiler submodule pointer to the tagged release.
     * if not already done, update the compiler submodule
       `git submodule init && git submodule update`
     * change to the '/compiler' folder
     * `git checkout` the correct tag/commit
     * change back to the root folder and commit this change
 2. Run `node_modules/.bin/lerna version {COMPILER_VERSION_NUMBER}.0.0`.
    The command will ask you to verify that you wish to create new versions for each package.
    Once confirmed, version numbers will be committed, the commit tagged and changes pushed.
