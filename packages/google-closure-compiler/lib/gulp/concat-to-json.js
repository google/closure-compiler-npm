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
 * @fileoverview Convert an array of vinyl files to
 * a single JSON encoded string to pass to closure-compiler
 *
 * @author Chad Killingsworth (chadkillingsworth@gmail.com)
 */

import path from 'node:path';

/**
 * @param {string} src
 * @param {string=} path
 * @param {string=} sourceMap
 * @return {{
 *   src: string,
 *   path: string|undefined,
 *   sourceMap: string|undefined,
 * }}
 */
const json_file = (src, path, sourceMap) => {
  return {
    src: src,
    ...(path !== undefined ? {path} : undefined),
    ...(sourceMap !== undefined ? {sourceMap} : undefined),
  };
};

/**
 * @param {!Array<!{
 *   src: string,
 *   path: string|undefined,
 *   sourceMap: string|undefined,
 * }>} files
 * @return {string}
 */
export default (files) => {
  /**
   * @type {!Array<!{
   *   src: string,
   *   path: string|undefined,
   *   sourceMap: string|undefined,
   * }>}
   */
  const jsonFiles = [];
  for (let i = 0; i < files.length; i++) {
    jsonFiles.push(
        json_file(files[i].contents.toString(), files[i].relative || path.relative(process.cwd(), files[i].path),
            files[i].sourceMap ? JSON.stringify(files[i].sourceMap) : undefined));
  }

  return jsonFiles;
};
