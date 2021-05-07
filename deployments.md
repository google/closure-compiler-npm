# Deploying Closure Compiler to NPM

*You now need yarn installed: https://yarnpkg.com/en/docs/install*

## Deploying new releases of the main compiler

 1. `COMPILER_VERSION_NUMBER=YYYYMMDD` (Use actual version number here without the `v`.)
 2. Update the compiler submodule pointer to the tagged release.
     * `git submodule init && git submodule update` (update the compiler submodule)
     * `cd compiler`
     * `git checkout v$COMPILER_VERSION_NUMBER` (the current tag/commit)
     * `cd ..`
     * `git add . && git commit -m "Release v$COMPILER_VERSION_NUMBER"`
 3. Run `yarn install` in the package root.
 4. Run `node_modules/.bin/lerna version --force-publish='*' $COMPILER_VERSION_NUMBER.0.0`.
    The command will ask you to verify that you wish to create new versions for each package.
    Once confirmed, version numbers will be committed, the commit tagged and changes pushed.

## Deploying changes to the package CLIs or plugins

Features and fixes to the packages in this repo need not wait for a main compiler release.
They can be published at any time if they are backwards compatible with the last major version.
Breaking changes should be deployed at the same time as a major compiler release.

 1. Run `yarn install`.
 2. Run `node_modules/.bin/lerna version`.
    The command will ask you to choose a new version number.
    Patch level versions should be used for fixing issues.
    Minor level versions should be used for new features that are backwards compatible.
    
## Verifying Publication Was Successful

The `lerna version` command will push a new tagged commit. [Github Actions](https://github.com/google/closure-compiler-npm/actions)
will automatically start building this commit. Expand the `Deploying application` section at the bottom of the log. For each
successfully published package, a `✅ publish succeeded` line should be present. In addition,
the npm registry page for each package should list the newly published version.

*Note: The lerna log file lines "lerna success published 5 packages" is misleading. Lerna will
succeed even if the package has already been published or failed to publish due to missing
dependencies.*
