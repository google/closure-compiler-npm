/*
 * Copyright 2015 The Closure Compiler Authors.
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
 * @fileoverview Tests for compiler.jar versions
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

import {spawnSync as spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';
import {compiler as Compiler} from 'google-closure-compiler';
import Semver from 'semver';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const packageInfo = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));

const compilerVersionMatch = /^Version: v(\d+)$/m;

process.on('unhandledRejection', (e) => { throw e; });

const isNightlyBuild = /^true|1$/i.test(process.env.COMPILER_NIGHTLY);

if (!isNightlyBuild) {
  describe('compiler.jar', function () {
    it('should not be a snapshot build', async () => {
      const compiler = new Compiler({version: true});
      const {stdout} = await new Promise((resolve) =>
        compiler.run((exitCode, stdout, stderr) =>
          resolve({
            exitCode,
            stdout,
            stderr,
          })
        )
      );
      let versionInfo = (stdout || '').match(compilerVersionMatch);
      expect(versionInfo).not.toBeNullish();
      versionInfo = versionInfo || [];
      expect(versionInfo.length).toBe(2);
      expect(versionInfo[1].indexOf('SNAPSHOT')).toBeLessThan(0);
    });

    it('version should be equal to the package major version', async () => {
      const compiler = new Compiler({version: true});
      const packageVer = new Semver(packageInfo.version);
      const {stdout} = await new Promise((resolve) =>
          compiler.run((exitCode, stdout, stderr) =>
            resolve({
              exitCode,
              stdout,
              stderr,
            })
          )
      );
      let versionInfo = (stdout || '').match(compilerVersionMatch);
      expect(versionInfo).not.toBeNullish();
      versionInfo = versionInfo || [];
      expect(versionInfo.length).toBe(2);

      let compilerVersion;
      try {
        console.log(versionInfo[1] + '.0.0');
        compilerVersion = new Semver(versionInfo[1] + '.0.0');
      } catch (e) {
        fail('should be a semver parseable');
      }
      expect(compilerVersion.major).toBe(packageVer.major);
    });
  });

  describe('compiler submodule', () => {
    it('should be synced to the tagged commit', () => {
      const gitCmd = spawn('git', ['tag', '--points-at', 'HEAD'], {
        cwd: './compiler'
      });
      expect(gitCmd.status).toBe(0);
      console.log(gitCmd.stdout.toString());
      const currentTag = gitCmd.stdout.toString().replace(/\s/g, '');
      const packageVer = new Semver(packageInfo.version);
      const mvnVersion = 'v' + packageVer.major;
      let normalizedTag = currentTag;
      if (normalizedTag) {
        normalizedTag = currentTag.replace(/^([-a-z]+-)?(v\d{8})(.*)$/, '$2');
      }
      expect(normalizedTag).toBe(mvnVersion)
    });
  });
}
