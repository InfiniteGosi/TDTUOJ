import java.util.*;

public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int val) { this.val = val; }
    }

    static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.val) root.left = insert(root.left, val);
        else root.right = insert(root.right, val);
        return root;
    }

    public static void main(String[] args) {
        int[] arr = {5, 2, 8, 1, 9};
        int n = arr.length;
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < n - 1 - i; j++) {
                if (arr[j] > arr[j + 1]) {
                    int t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
                }
            }
        }

        int[][] g = {
            {0, 1, 1, 0},
            {1, 0, 0, 1},
            {1, 0, 0, 1},
            {0, 1, 1, 0},
        };
        boolean[] visited = new boolean[4];
        Deque<Integer> stack = new ArrayDeque<>();
        List<Integer> order = new ArrayList<>();
        stack.push(0);
        while (!stack.isEmpty()) {
            int u = stack.pop();
            if (visited[u]) continue;
            visited[u] = true;
            order.add(u);
            for (int v = 3; v >= 0; v--) {
                if (g[u][v] == 1 && !visited[v]) stack.push(v);
            }
        }

        Node root = null;
        for (int v : new int[]{4, 2, 6, 1, 3}) {
            root = insert(root, v);
        }

        Map<Integer, Integer> freq = new HashMap<>();
        for (int x : arr) {
            freq.merge(x, 1, Integer::sum);
        }

        System.out.println(order + " " + freq.get(1));
    }
}
