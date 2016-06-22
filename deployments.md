# Deploying Closure Compiler to NPM

 1. Update the compiler submodule pointer to the tagged release.
 2. Update the package version number in `package.json`. The major version should be equal to the compiler version
    and the minor and patch numbers should be `0`. Example: 20160619.0.0.
 3. Commit the changes from steps 1 & 2 and tag the commit.
 4. Push the changes and tag. If the tests all pass, Travis-CI will automatically publish the new release to the
   npm registry.
