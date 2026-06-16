using System;
class Program {
    static void Main() {
        int[] a = {5, 2, 8, 1, 9};
        int n = 5;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (a[j] > a[j + 1]) {
                    int t = a[j]; a[j] = a[j + 1]; a[j + 1] = t;
                }
            }
        }
        int s = 0;
        for (int i = 0; i < 5; i++)
            for (int j = 0; j < 5; j++)
                s += 1;
        int evens = 0, odds = 0;
        for (int i = 0; i < n; i++)
            if (a[i] % 2 == 0)
                evens++;
            else
                odds++;
        int k = 0;
        do
            k++;
        while (k < 5);
        Console.WriteLine(s + " " + evens + " " + odds + " " + k);
    }
}
