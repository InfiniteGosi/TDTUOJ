# Visualizer runtime test harness (manual, pre-defense checklist)

JUnit covers instrumentation-level assertions (`TracerInstrumentationTest`).
This harness covers the part CI can't: actually RUNNING instrumented programs
with real toolchains and validating the emitted frames.

## Build the helper

```powershell
cd D:\OJ\TDTUOJ_backend
.\mvnw.cmd compile -q
$rhino = "$env:USERPROFILE\.m2\repository\org\mozilla\rhino\1.7.15\rhino-1.7.15.jar"
$jp    = "$env:USERPROFILE\.m2\repository\com\github\javaparser\javaparser-core\3.26.4\javaparser-core-3.26.4.jar"
javac -cp "target\classes;$rhino;$jp" -d tools\viz-test tools\viz-test\InstrumentTest.java
```

## Per-language checklist

```powershell
# Python
java -cp "target\classes;tools\viz-test;$rhino;$jp" InstrumentTest python tools\viz-test\fixture.py tools\viz-test\out.py
python tools\viz-test\out.py 2> stderr.txt          # stdout: "[0, 1, 3, 2] 1"

# JavaScript (Node)
java ... InstrumentTest js tools\viz-test\fixture.js tools\viz-test\out.js
node tools\viz-test\out.js 2> stderr.txt            # stdout: "0 1 3 2 1"

# Java (output file MUST be named Main.java)
# IMPORTANT: --release 13 — Judge0 id 62 is OpenJDK 13; modern javac hides preamble
# incompatibilities (pattern instanceof, switch arrows) that break on Judge0.
java ... InstrumentTest java tools\viz-test\fixture-java.txt tools\viz-test\run-java\Main.java
javac --release 13 -d tools\viz-test\run-java tools\viz-test\run-java\Main.java && java -cp tools\viz-test\run-java Main 2> stderr.txt

# C#
java ... InstrumentTest csharp tools\viz-test\fixture-csharp.txt tools\viz-test\out.cs
csc /nologo /out:out.exe tools\viz-test\out.cs && .\out.exe 2> stderr.txt

# C++
java ... InstrumentTest cpp tools\viz-test\fixture-cpp.txt tools\viz-test\out.cpp
g++ -std=c++14 -o out.exe tools\viz-test\out.cpp && .\out.exe 2> stderr.txt

# C
java ... InstrumentTest c tools\viz-test\fixture-c.txt tools\viz-test\out.c
gcc -std=c11 -o out.exe tools\viz-test\out.c && .\out.exe 2> stderr.txt
```

## Validate frames + inference

```powershell
cd D:\OJ\tdtuoj_frontend
npx esbuild tools/infer-test.mjs --bundle --format=esm --platform=node --outfile=tools/infer-test.bundle.mjs
node tools/infer-test.bundle.mjs <path-to-stderr.txt>
```

Expected classifications for every language's `full_demo` fixture:

| var | expected |
|---|---|
| `arr` | array |
| `g` | **graph** (adjacency matrix — no Graph class in source) |
| `stack`/`stack_` | **stack** (behavioral; C's `int stack[16]+top` is a documented exception → array) |
| `visited`, `order` | array |
| `root` | **tree** (class/struct + pointer chasing) |
| `freq` | memory fallback (Python/JS/Java/C#/C++ dict/map) |
| loop counters | scalar |

Then E2E through real Judge0: run each fixture via `POST /api/visualize` and
confirm the same classifications appear in the UI.
