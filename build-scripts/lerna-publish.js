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
 * @fileoverview Custom lerna cli which adds a publication command to bypass checks for a
 * clean working directory.
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
const pkg = require('lerna/package.json');
const { PublishCommand } = require('@lerna/publish');
const getCurrentTags = require('@lerna/publish/lib/get-current-tags');
const fs = require('fs');
const path = require('path');

function factory(argv) {
  return new PublishWithoutCleanCheckCommand(argv);
}

/** Override methods in the main publication command class to bypass clean working directory checks */
class PublishWithoutCleanCheckCommand extends PublishCommand {
  verifyWorkingTreeClean() {
    return describeRef(this.execOpts);
  }

  detectFromGit() {
    let chain = Promise.resolve();

    chain = chain.then(() => getCurrentTags(this.execOpts));
    chain = chain.then(taggedPackageNames => {
      if (!taggedPackageNames.length) {
        this.logger.notice("from-git", "No tagged release found");

        return [];
      }

      if (this.project.isIndependent()) {
        return taggedPackageNames.map(name => this.packageGraph.get(name));
      }

      return Array.from(this.packageGraph.values());
    });

    return chain.then(updates => {
      const updatesVersions = updates.map(({ pkg }) => [pkg.name, pkg.version]);

      return {
        updates,
        updatesVersions,
        needsConfirmation: true,
      };
    });
  }
}

// New command meta data
const publishWithoutCleanCheckCmd = Object.assign({}, publishCmd, {
  command: 'publish-without-clean-check [bump]',
  describe: 'Publish packages in the current project - even without a clean working directory',
  handler: factory
});

// Setup the custom cli
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
      .command(publishWithoutCleanCheckCmd)
      .parse(argv, context);
}

// Invoke the cli with arguments
main(process.argv.slice(2));
