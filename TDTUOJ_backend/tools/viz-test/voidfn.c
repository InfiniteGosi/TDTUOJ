#include <stdio.h>
void greet(int x) {
    int y = x + 1;
    printf("y=%d\n", y);
}
int main() {
    greet(5);
    return 0;
}
