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
 * Check to see if the graal native image for this platform should be built
 */

const fs = require('fs');
const path = require('path');
const {DIM, RESET} = require('../../build-scripts/colors');
const runCommand = require('../../build-scripts/run-command');

if (fs.existsSync(path.resolve(__dirname, 'compiler'))) {
  process.stdout.write(`  ${DIM}google-closure-compiler-windows binary already exists${RESET}\n`);
  process.exit(0);
} else if (process.platform !== 'win32') {
  process.stdout.write(`  ${DIM}google-closure-compiler-windows build wrong platform${RESET}\n`);
  process.exit(0);
}
process.stdout.write(`  ${DIM}google-closure-compiler-windows building image${RESET}\\n`);

const NET_FRAMEWORK_VERSION = fs.readdirSync('C:\\WINDOWS\\Microsoft.NET\\Framework64', 'utf8').find(filepath => /^v4/.test(filepath));
process.env.APPVER = '6.1';
process.env.CL = `/AI C:\\WINDOWS\\Microsoft.NET\\Framework64\\${NET_FRAMEWORK_VERSION}`;
process.env.CommandPromptType = 'Native';
process.env.Configuration = 'Debug';
process.env.CURRENT_CPU = 'x64';
process.env.FrameworkVersion = NET_FRAMEWORK_VERSION;
process.env.INCLUDE = 'C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\INCLUDE;C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\INCLUDE;C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\INCLUDE\\gl;';
process.env.LIB = 'C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\Lib\\amd64;C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\Lib\\X64;';
process.env.LIBPATH =`C:\\WINDOWS\\Microsoft.NET\\Framework64\\${NET_FRAMEWORK_VERSION};C:\\WINDOWS\\Microsoft.NET\\Framework\\${NET_FRAMEWORK_VERSION};C:\\WINDOWS\\Microsoft.NET\\Framework64\\v3.5;C:\\WINDOWS\\Microsoft.NET\\Framework\\v3.5;C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\Lib\\amd64;`;
process.env.Path = `C:\\WINDOWS\\Microsoft.NET\\Framework64\\${NET_FRAMEWORK_VERSION};C:\\WINDOWS\\Microsoft.NET\\Framework\\${NET_FRAMEWORK_VERSION};C:\\WINDOWS\\Microsoft.NET\\Framework64\\v3.5;C:\\WINDOWS\\Microsoft.NET\\Framework\\v3.5;C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\Common7\\IDE;C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\Common7\\Tools;C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\Bin\\amd64;C:\\Program Files (x86)\\Microsoft Visual Studio 10.0\\VC\\Bin\\VCPackages;C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\Bin\\NETFX 4.0 Tools\\x64;C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\Bin\\x64;C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\Bin;` + process.env.PATH;
process.env.PlatformToolset = 'Windows7.1SDK';
process.env.sdkdir = 'C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\';
process.env.TARGET_CPU = 'x86';
process.env.TARGET_PLATFORM = 'WIN7';
process.env.ToolsVersion = '4.0';
process.env.WindowsSDKDir = 'C:\\Program Files\\Microsoft SDKs\\Windows\\v7.1\\';
process.env.WindowsSDKVersionOverride = 'v7.1';

runCommand('node ../../build-scripts/graal.js',{stdio: 'inherit'})
    .catch(e => {
      console.error(e);
      process.exit(1);
    });
