export const LANGUAGE_IDS = {
  c: "49",
  cpp: "54",
  python: "71",
  java: "62",
  csharp: "51",
  javascript: "63",
};

export const LANGUAGE_NAMES = {
  c: "C",
  cpp: "C++",
  python: "Python",
  java: "Java",
  csharp: "C#",
  javascript: "JavaScript",
};

export const CODE_SNIPPETS = {
  c: `#include <stdio.h>

int main() {
    printf("Hello, World!\\n");
    return 0;
}
`,

  cpp: `#include <iostream>
using namespace std;

int main() {
    cout << "Hello, World!" << endl;
    return 0;
}
`,

  python: `def greet():
    print("Hello, World!")

if __name__ == "__main__":
    greet()
`,

  java: `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}
`,

  csharp: `using System;

class Program {
    static void Main() {
        Console.WriteLine("Hello, World!");
    }
}
`,

  javascript: `function greet() {
    console.log("Hello, World!");
}

greet();
`,
};

export const EXTENSION_TO_LANGUAGE = {
  ".c":    "c",
  ".cpp":  "cpp",
  ".cc":   "cpp",
  ".cxx":  "cpp",
  ".hpp":  "cpp",
  ".h":    "c",       // ambiguous — default to C; user can override
  ".py":   "python",
  ".java": "java",
  ".cs":   "csharp",
  ".js":   "javascript",
  ".mjs":  "javascript",
};
