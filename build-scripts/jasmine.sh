#!/usr/bin/env bash
# Run the test commands and fail the script if any of them failed
EXIT_STATUS=0
./packages/google-closure-compiler/test/support/jasmine-launcher.js "$@" || EXIT_STATUS=$?
exit $EXIT_STATUS
