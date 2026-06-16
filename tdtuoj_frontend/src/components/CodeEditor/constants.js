export const LANGUAGE_IDS = {
  c: "49",
  cpp: "54",
  python: "71",
  java: "62",
  csharp: "51",
  javascript: "63",
};

export const LANGUAGE_NAMES = {
  c: "C (GCC 9.2.0)",
  cpp: "C++ (GCC 9.2.0)",
  python: "Python (3.8.1)",
  java: "Java (OpenJDK 13.0.1)",
  csharp: "C# (Mono 6.6.0.161)",
  javascript: "JavaScript (Node.js 12.14.0)",
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
