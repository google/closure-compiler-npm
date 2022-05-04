# Deploying Closure Compiler to NPM

*You now need yarn installed: https://yarnpkg.com/en/docs/install*

## Deploying new releases of the main compiler

 1. `COMPILER_VERSION_NUMBER=YYYYMMDD` (Use actual version number here without the `v`.)
 2. Update the compiler submodule pointer to the tagged release.
     * `git submodule init && git submodule update` (update the compiler submodule)
     * `cd compiler`
     * `git checkout v$COMPILER_VERSION_NUMBER` (the current tag/commit)
     * `cd ..`
     * `git add compiler`
 3. Run `yarn install` in the package root.
 4. Run `yarn version --new-version $COMPILER_VERSION_NUMBER.0.0`.
 5. Push commit and tags

## Deploying changes to the package CLIs or plugins

Features and fixes to the packages in this repo need not wait for a main compiler release.
They can be published at any time if they are backwards compatible with the last major version.
Breaking changes should be deployed at the same time as a major compiler release.

 1. Run `yarn install`.
 2. Run `yarn version (patch|minor)`.
    Patch level versions should be used for fixing issues.
    Minor level versions should be used for new features that are backwards compatible.
 3. Push commit and tags
    
## Verifying Publication Was Successful

After pushing a new tagged commit, [Github Actions](https://github.com/google/closure-compiler-npm/actions)
will automatically start building this commit. Expand the `Deploying application` section at the bottom of the log.
Each package should show npm logs for packaging and publication. In addition,
the npm registry page for each package should list the newly published version.
