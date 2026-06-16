using System;
class Program {
    static void Main() {
        int total = 100;
        Func<int,int> sq = x => {
            int r = x * x;
            return r;
        };
        Console.WriteLine(sq(3) + total);
    }
}
