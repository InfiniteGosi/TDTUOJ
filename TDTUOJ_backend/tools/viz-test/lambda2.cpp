#include <iostream>
int main() {
    int total = 100;
    auto sq = [](int x) {
        int r = x * x;
        return r;
    };
    int a = sq(3);
    int b = sq(4);
    std::cout << (a + b + total) << "\n";
    return 0;
}
