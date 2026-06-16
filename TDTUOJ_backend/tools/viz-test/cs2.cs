using System;
class Program {
    static int Add(int a,
                   int b) {
        int s = a + b;
        return s;
    }
    static void Main() {
        int total = 100;
        Func<int,int> sq = x => {
            int r = x * x;
            return r;
        };
        Console.WriteLine(Add(2,3) + sq(3) + total);
    }
}
