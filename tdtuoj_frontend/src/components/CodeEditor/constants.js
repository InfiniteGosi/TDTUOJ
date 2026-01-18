export const LANGUAGE_IDS = {
  c: "49",
  cpp: "54",
  python: "71",
  java: "62",
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
};
