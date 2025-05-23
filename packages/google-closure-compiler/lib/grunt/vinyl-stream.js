/*
 * Copyright 2016 The Closure Compiler Authors.
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
 * @fileoverview Class to convert an array of file paths to
 * as stream of Vinyl files.
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import {Readable} from 'node:stream';
import File from 'vinyl';

export default class VinylStream extends Readable {
  constructor(files, opts) {
    super({objectMode: true});
    this._base = path.resolve(opts.base || process.cwd());
    this._files = files.slice();
    this.resume();
  }

  async _read() {
    if (this._files.length === 0) {
      this.push(null);
      return;
    }
    const filepath = this._files.shift();
    const fullpath = path.resolve(this._base, filepath);
    try {
      const data = await fs.readFile(fullpath);
      this.push(new File({
        base: this._base,
        path: fullpath,
        contents: data
      }));
    } catch (err) {
      this.emit('error', err);
    }
  }
};
