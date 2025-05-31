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

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, URL} from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

const filepath = path.resolve(__dirname, '../compiler/MODULE.bazel');
const contents = fs.readFileSync(filepath, 'utf-8');
fs.writeFileSync(
    filepath,
    contents.replace(/4.30.\d+/g, '4.31.1'),
    'utf-8',
);
