#!/usr/bin/env node
/*
 * Copyright 2018 The Closure Compiler Authors.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @fileoverview Custom lerna cli which adds a publication command to always attempt publication
 * of all packages.
 *
 * Taken directly from the lerna publication command and lerna cli packages.
 */

'use strict';
const cli = require('@lerna/cli');
const addCmd = require('@lerna/add/command');
const bootstrapCmd = require('@lerna/bootstrap/command');
const changedCmd = require('@lerna/changed/command');
const cleanCmd = require('@lerna/clean/command');
const Command = require('@lerna/command');
const createCmd = require('@lerna/create/command');
const diffCmd = require('@lerna/diff/command');
const execCmd = require('@lerna/exec/command');
const importCmd = require('@lerna/import/command');
const initCmd = require('@lerna/init/command');
const linkCmd = require('@lerna/link/command');
const listCmd = require('@lerna/list/command');
const publishCmd = require('@lerna/publish/command');
const runCmd = require('@lerna/run/command');
const versionCmd = require('@lerna/version/command');
const Semver = require('semver');
const pkg = require('lerna/package.json');
const { PublishCommand } = require('@lerna/publish');
const fs = require('fs');
const path = require('path');

if (process.env.GITHUB_ACTIONS) {
  // force enable colorized output for all lerna commands
  const originalConfigureEnvironment = Command.prototype.configureEnvironment;
  Command.prototype.configureEnvironment = function(...args) {
    const retVal = originalConfigureEnvironment.apply(this, args);
    try {
      // force enable colorized output
      const log = require('npmlog');
      log.enableColor();
    } catch (e) {}
    return retVal;
  };
}

/** Override methods in the main publication command class to return the full set of packages for publication */
class CIPublishCommand extends PublishCommand {
  /**
   * @see https://github.com/lerna/lerna/blob/master/commands/publish/index.js
   *
   * @override
   * @return {Promise<{
   *     updates: Array<PackageGraphNode>,
   *     updatesVersions: Array<string>,
   *     needsConfirmation: boolean
   *   }>
   * }
   */
  findVersionedUpdates() {
    let chain = Promise.resolve();

    if (this.options.bump === "from-git") {
      // Returns packages which have changes in git since the last release
      // Copied from the main lerna publish command
      chain = chain.then(() => this.detectFromGit());
    } else if (this.options.canary) {
      // Returns packages which should be part of a canary (nightly) release
      // Copied from the main lerna publish command
      chain = chain.then(() => this.detectCanaryVersions());
    } else {
      // If no version bump was specified then attempt to publish all packages.
      // WARNING: this does not check for a clean working directory.
      chain = chain
          .then(() => Array.from(this.packageGraph.values()))
          .then(updates => {
            const updatesVersions = updates.map(({ pkg }) => [pkg.name, pkg.version]);

            return {
              updates,
              updatesVersions,
              needsConfirmation: true,
            };
          });
    }

    return chain;
  }

  /**
   * After publication, write the custom npm client publish log to standard out
   *
   * @override
   * @return {!Promise<undefined>}
   */
  execute() {
    return super.execute().then(() => {
      const logPath = path.resolve(__dirname, '..', 'publish-log.txt');
      if (fs.existsSync(logPath)) {
        process.stdout.write(fs.readFileSync(path.resolve(__dirname, '..', 'publish-log.txt'), 'utf8'));
      } else {
        process.stdout.write('publication log missing');
      }
    });
  }
}

// New command meta data
// Used by yargs to invoke the correct class and display help information
// The bump argument has identical semantics as the main publish command
const ciPublishCmd = Object.assign({}, publishCmd, {
  command: 'publish-ci [bump]',
  describe: 'Publish all packages in the current project',
  handler: argv => new CIPublishCommand(argv)
});

/**
 * Setup the custom cli
 * @see https://github.com/lerna/lerna/blob/master/core/lerna/index.js
 */
function main(argv) {
  // For lerna publication to work, the NPM token must be stored in the .npmrc file in the user home directory
  if (process.env.GITHUB_ACTIONS && process.env.NPM_TOKEN) {
    fs.writeFileSync(
        path.resolve(process.env.HOME, '.npmrc'),
        `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`,
        'utf8');
  }

  const context = {
    lernaVersion: pkg.version,
  };

  // yargs instance.
  // Add all the standard lerna commands + our custom ci-publish command
  // This is a direct copy of the lerna cli setup with our custom ci command added.
  return cli()
      .command(addCmd)
      .command(bootstrapCmd)
      .command(changedCmd)
      .command(cleanCmd)
      .command(createCmd)
      .command(diffCmd)
      .command(execCmd)
      .command(importCmd)
      .command(initCmd)
      .command(linkCmd)
      .command(listCmd)
      .command(publishCmd)
      .command(runCmd)
      .command(versionCmd)
      .command(ciPublishCmd)
      .parse(argv, context);
}

const flags = process.argv.slice(2);

// match both the "publish" and "publish-ci" lerna commands
if (/publish/.test(process.argv[2])) {
  // Looks like we're trying to publish packages
  const lernaConfig = require(path.resolve(__dirname, '..', 'lerna.json'));
  const packageVersion = new Semver(lernaConfig.version);

  // If publishing nightly images, the compiler version will be a snapshot
  const isNightlyBuild = /^true|1$/i.test(process.env.COMPILER_NIGHTLY);
  if (isNightlyBuild) {
    if (!packageVersion.prerelease.includes('nightly')) {
      console.log('Package version does not have a nightly prerelease component');
      process.exit(0);
    }
    // Add the nightly tag so we don't publish this as the "latest" tag
    main(flags.concat(['--npm-tag', 'nightly']));
  } else {
    // Make sure the compiler version matches the package major version before publishing
    const compilerVersionMatch = require(path.resolve(__dirname, 'version-match.js'));

    const Compiler = require('google-closure-compiler').compiler;
    const compiler = new Compiler({version: true});
    compiler.run((exitCode, stdout) => {
      let versionInfo = (stdout || '').match(compilerVersionMatch);
      versionInfo = versionInfo || [];
      if (versionInfo.length < 2 || parseInt(versionInfo[1]) !== packageVersion.major) {
        console.log('Package major version does not match compiler version - skipping publication');
        console.log(stdout);
        process.exit(0);
      }
      // Invoke the cli with arguments
      main(flags);
    });
  }
} else {
  // Invoke the cli with arguments
  main(flags);
}
