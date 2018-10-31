#!/usr/bin/env bash
yarn workspaces run test "$@"
mocha "$@"
