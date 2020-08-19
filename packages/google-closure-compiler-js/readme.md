# google-closure-compiler-js

**The JS version of closure-compiler is no longer supported or maintained.**

We have decided that the maintenance burden of supporting the JS-compiled version of closure-compiler
is greater than its benefits.

 - The need to support compiling Java to JavaScript enforces restrictions on the Java code we can write
 and our ability to upgrade to newer versions of the JDK.
 - The JDK implemented by J2CL (used to transform Java to JS) has functional differences that lead
  to frustrating bugs in the JS version, such as poor support for non-ASCII characters in input sources.
 - There are inevitable differences in the command line flags and options that can be supported by the
  Java and JS versions of the compiler, leading to user frustration and confusion.
 - Users always have the option to install the JVM and run the Java version. We realize that some users
 strongly prefer not to install and use a JVM. We believe that these users' needs are satisfied by the
 Graal compiled-to-native version of the compiler, which is much faster and more functionally identical
 to the behavior of the Java version than the JS version ever could be.
 
