#!/usr/bin/env node
/*
 * Copyright 2025 The Closure Compiler Authors.
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
 * @fileoverview
 *
 * Determine if there is a newer compiler release tag than the package version.
 * Select and output the oldest version that is greater than the package major version.
 */

import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';
import semver from 'semver';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const packageJson = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
const currentVersion = semver(packageJson.version);

const gitProcess = spawn(
    'git',
    [
      'tag',
      '--list',
      'v*',
    ],
    {
      cwd: path.resolve(__dirname, '../compiler'),
      stdio: 'pipe',
      // env: {
      //   PAGER: 'cat',
      // },
    },
);

const tags = [];

gitProcess.stdout.on('data', (data) => {
  tags.push(data.toString());
});

const errData = [];
gitProcess.stderr.on('data', (data) => {
  errData.push(data.toString());
});

gitProcess.on('error', (err) => {
  err.exitCode = 1;
});

gitProcess.on('close', (exitCode) => {
  if (exitCode !== 0) {
    process.stderr.write(errData.join(''));
    process.exitCode = exitCode;
  } else {
    const versionTags = tags.join('').trim().split(/\n/);
    let oldestNewVersion;
    for (const versionTag of versionTags) {
      // Only process version tags of an expected format: v########
      if (!/^v\d{8}$/.test(versionTag)) {
        continue;
      }
      const newerVersion = semver(`${versionTag.slice(1)}.0.0`);
      if (
        newerVersion.major > currentVersion.major &&
        (!oldestNewVersion || oldestNewVersion.major > newerVersion.major)
      ) {
        oldestNewVersion = newerVersion;
      }
    }
    if (oldestNewVersion) {
      process.stdout.write(oldestNewVersion.major.toString());
    }
  }
});
