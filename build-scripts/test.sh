#!/usr/bin/env bash
# Run the test commands and fail the script if any of them failed
EXIT_STATUS=0
yarn workspaces run test "$@" || EXIT_STATUS=$?
mocha "$@" || EXIT_STATUS=$?
exit $EXIT_STATUS
