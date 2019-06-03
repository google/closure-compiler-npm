#!/usr/bin/env node
/*
 * Copyright 2019 The Closure Compiler Authors.
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
'use strict';
/**
 * @fileoverview
 *
 * Patch yarn for use with git-bash
 * See https://github.com/yarnpkg/yarn/issues/5349
 */

const fs = require('fs');

const yarnContents = fs.readFileSync(process.argv[2], 'utf8');
const newYarn = yarnContents.replace(
    /([ \t]+)\*MSYS\*\) basedir=`cygpath -w "\$basedir"`;;/,
    '$&\n$1*MINGW*) basedir=`cygpath -w "$basedir"`;;'
); // .replace(/case /, 'echo "$(uname -s)"\n$&');
process.stdout.write(`${newYarn}
`);
fs.writeFileSync(process.argv[2], newYarn, 'utf8');
