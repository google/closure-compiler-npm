# Deploying Closure Compiler to NPM

*You now need yarn installed - `npm install -g yarn`*
*The compiler must be published to maven first as the build script downloads the jar from maven.*

 1. Update the package version number in `package.json` at
    https://github.com/chadkillingsworth/closure-compiler-graal.
    The major version should be equal to the compiler version and the minor and patch numbers should be `0`.
    Example: 20160619.0.0.
    Wait for Travis to publish the new versions.
 2. Update the compiler submodule pointer to the tagged release.
     * if not already done, update the compiler submodule
       `git submodule init && git submodule update`
     * change to the '/compiler' folder
     * `git checkout` the correct tag/commit
     * change back to the root folder and commit this change
 3. Update the package version number in `package.json`. The major version should be equal to the compiler version
    and the minor and patch numbers should be `0`. Example: 20160619.0.0.
    Update the native package versions in the `optionalDependencies`.
 4. Run the tests: `yarn install && yarn test`.
 5. Commit the changes made above including the update to `yarn.lock`.
    e.g. `git commit -am 'Update for v201670619 closure-compiler release'`
 6. Tag the release.
    e.g. `git tag 2016070619.0.0`
 7. Push the changes and tag.
    If the tests all pass, Travis-CI will automatically publish the new release
    to the npm registry.
    e.g. `git push origin master 2016070619.0.0`
