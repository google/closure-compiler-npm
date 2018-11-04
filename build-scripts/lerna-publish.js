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

/** Override methods in the main publication command class to return the full set of packages for publication */
class TravisPublishCommand extends PublishCommand {
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
      // If no version bump was specified, check to ensure the working directory is clean
      // and then attempt to publish all packages.
      chain = chain
          .then(() => this.verifyWorkingTreeClean())
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
}

// New command meta data
// Used by yargs to invoke the correct class and display help information
// The bump argument has identical semantics as the main publish command
const travisPublishCmd = Object.assign({}, publishCmd, {
  command: 'publish-travis [bump]',
  describe: 'Publish all packages in the current project',
  handler: argv => new TravisPublishCommand(argv)
});

/**
 * Setup the custom cli
 * @see https://github.com/lerna/lerna/blob/master/core/lerna/index.js
 */
function main(argv) {
  // For lerna publication to work, the NPM token must be stored in the .npmrc file in the user home directory
  if (process.env.TRAVIS && process.env.NPM_TOKEN) {
    fs.writeFileSync(
        path.resolve(process.env.HOME, '.npmrc'),
        `//registry.npmjs.org/:_authToken=${process.env.NPM_TOKEN}\n`,
        'utf8');
  }

  const context = {
    lernaVersion: pkg.version,
  };

  // yargs instance.
  // Add all the standard lerna commands + our custom travis-publish command
  // This is a direct copy of the lerna cli setup with our custom travis command added.
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
      .command(travisPublishCmd)
      .parse(argv, context);
}

// match both the "publish" and "publish-travis" lerna commands
if (/publish/.test(process.argv[2])) {
  // Looks like we're trying to publish packages
  // Don't publish for cron jobs
  if (process.env.COMPILER_NIGHTLY) {
    process.exit(0);
  }

  // Make sure the compiler version matches the package major version before publishing
  const compilerVersionMatch = require(path.resolve(__dirname, 'version-match.js'));
  const lernaConfig = require(path.resolve(__dirname, '..', 'lerna.json'));
  const Compiler = require('google-closure-compiler').compiler;
  const compiler = new Compiler({version: true});
  compiler.run((exitCode, stdout) => {
    let versionInfo = (stdout || '').match(compilerVersionMatch);
    versionInfo = versionInfo || [];
    let packageVersion = new Semver(lernaConfig.version);
    if (versionInfo.length < 2 || versionInfo[1] !== `v${packageVersion.major}`) {
      console.log('Package major version does not match compiler version - skipping publication');
      console.log(stdout);
      process.exit(0);
    }
    // Invoke the cli with arguments
    main(process.argv.slice(2));
  });
} else {
  // Invoke the cli with arguments
  main(process.argv.slice(2));
}
