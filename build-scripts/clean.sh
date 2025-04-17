#!/usr/bin/env bash
rm -rf ./temp
rm -rf ./packages/google-closure-compiler/contrib
rm ./packages/google-closure-compiler-java/compiler.jar
rm ./packages/google-closure-compiler-linux/compiler.jar
rm ./packages/google-closure-compiler-linux/compiler
rm ./packages/google-closure-compiler-linux-arm64/compiler.jar
rm ./packages/google-closure-compiler-linux-arm64/compiler
rm ./packages/google-closure-compiler-macos/compiler.jar
rm ./packages/google-closure-compiler-macos/compiler
rm ./packages/google-closure-compiler-windows/compiler.jar
rm ./packages/google-closure-compiler-windows/compiler.exe
cd ./compiler && mvn clean
