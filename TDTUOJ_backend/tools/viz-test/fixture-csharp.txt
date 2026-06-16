using System;
using System.Collections.Generic;

class Node {
    public int Val;
    public Node Left, Right;
    public Node(int val) { Val = val; }
}

class Program {
    static Node Insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.Val) root.Left = Insert(root.Left, val);
        else root.Right = Insert(root.Right, val);
        return root;
    }

    static void Main() {
        int[] arr = {5, 2, 8, 1, 9};
        int n = arr.Length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
                }
            }
        }

        int[][] g = {
            new[] {0, 1, 1, 0},
            new[] {1, 0, 0, 1},
            new[] {1, 0, 0, 1},
            new[] {0, 1, 1, 0},
        };
        bool[] visited = new bool[4];
        var stack = new Stack<int>();
        var order = new List<int>();
        stack.Push(0);
        while (stack.Count > 0) {
            int u = stack.Pop();
            if (visited[u]) continue;
            visited[u] = true;
            order.Add(u);
            for (int v = 3; v >= 0; v--) {
                if (g[u][v] == 1 && !visited[v]) stack.Push(v);
            }
        }

        Node root = null;
        foreach (int v in new[] {4, 2, 6, 1, 3}) {
            root = Insert(root, v);
        }

        var freq = new Dictionary<int, int>();
        foreach (int x in arr) {
            if (freq.ContainsKey(x)) freq[x] = freq[x] + 1;
            else freq[x] = 1;
        }

        Console.WriteLine(string.Join(" ", order) + " " + freq[1]);
    }
}
