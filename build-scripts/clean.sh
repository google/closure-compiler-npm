#!/usr/bin/env bash
rm -rf ./packages/google-closure-compiler/contrib
rm ./packages/google-closure-compiler-java/compiler.jar
rm ./packages/google-closure-compiler-js/jscomp.js
rm ./packages/google-closure-compiler-linux/compiler.jar
rm ./packages/google-closure-compiler-linux/compiler
rm ./packages/google-closure-compiler-osx/compiler.jar
rm ./packages/google-closure-compiler-osx/compiler
cd ./compiler && mvn clean
