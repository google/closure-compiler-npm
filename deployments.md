# Deploying Closure Compiler to NPM

*You now need yarn installed: https://yarnpkg.com/en/docs/install*

Workflows now automatically check for and create new releases daily based from tags
on the main compiler repo.

## Manually deploying new releases of the main compiler

 1. Run the [Compiler release workflow](https://github.com/google/closure-compiler-npm/actions/workflows/release.yml)
     * For the `COMPILER_VERSION_NUMBER` input, use the actual version number here without the `v`.
     * If you do not provide a version number, the workflow will use the oldest version tag that is newer than the current package major version.
 2. Verify the workflow runs successfully. It will push the release commit and tag.
 3. Verify the new version published to npm.

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
