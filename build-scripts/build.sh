#!/usr/bin/env bash
./build-scripts/build_compiler.js "$@"
yarn workspaces run build "$@"
