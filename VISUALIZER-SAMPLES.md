# Visualizer Sample Programs

Copy-paste test programs for every renderer, in all six supported languages.
Paste into the visualizer, pick the matching language, click **Visualize**.

**Renderers exercised:** array · matrix · scatter · stack · queue · linked list · tree · graph.

> **Judge0 toolchains are OLD** — these samples target them, not your local compilers:
> Python 3.8 · OpenJDK **13** · Clang 7 / **C++14** · GCC 9 / C11 · Mono 6.6 / **C# 7.3** · **Node 12**.
> Avoid newer syntax (C++17 structured bindings, Java switch-arrows, JS optional chaining `?.`).

**Feature checks while a canvas is up:** scroll = zoom · drag a graph node = move · drag empty
canvas = pan · graph top-right buttons = circle/tree/grid layout · ⟲ = reset view · Speed slider
(Play/Loop mode) = exponential curve · drag a card's bottom grip = resize its height.

> **Why a graph shows up AND animates — two rules:**
> 1. **The graph data must be a LOCAL variable** (or a Python module global). The tracers
>    capture variables *in scope*; `static`/global fields in Java/C#/C/C++ are **not** captured,
>    so a global adjacency matrix never appears. Keep `adj` inside `main` (samples do this).
> 2. **Animation comes from sibling variables.** A constant adjacency matrix never changes, so
>    there's nothing to diff. The visualizer auto-correlates a **current-node** scalar (named
>    `cur`/`u`/`v`/`node`/…, holding a valid node id) and a **visited** mask (a `bool[]`/`0-1`
>    array of length N, or a named `seen`/`visited` id list) into the graph — that's what paints
>    the current node orange, the visited set violet, and the active edge. The iterative-DFS
>    samples below are written to expose exactly those variables. A structure that *itself*
>    grows/changes each step (tree insert, linked-list build) animates directly from the diff.

---

## Python

```python
# ARRAY — bubble sort (swaps highlight)
a = [5, 2, 8, 1, 9, 3]
for i in range(len(a)):
    for j in range(len(a) - i - 1):
        if a[j] > a[j + 1]:
            a[j], a[j + 1] = a[j + 1], a[j]
print(a)
```

```python
# MATRIX — 2D DP grid (changed cells → magenta)
n, m = 4, 5
dp = [[0] * m for _ in range(n)]
for i in range(n):
    for j in range(m):
        if i == 0 or j == 0:
            dp[i][j] = 1
        else:
            dp[i][j] = dp[i - 1][j] + dp[i][j - 1]
print(dp[n - 1][m - 1])
```

```python
# SCATTER — coordinate pairs (floats → scatter, not matrix)
import math
pts = []
for k in range(24):
    ang = k * 0.5
    pts.append([math.cos(ang) * ang, math.sin(ang) * ang])
print(len(pts))
```

```python
# STACK — tail push/pop (behavioral)
stack = []
for x in [3, 1, 4, 1, 5, 9]:
    stack.append(x)
while stack:
    top = stack.pop()
    print(top)
```

```python
# QUEUE — back push, front pop (behavioral)
queue = [1, 2, 3]
out = []
while queue:
    front = queue.pop(0)
    out.append(front)
    if front < 3:
        queue.append(front + 10)
print(out)
```

```python
# LINKED LIST — object chain (one self-ref)
class Node:
    def __init__(self, val):
        self.val = val
        self.next = None

head = Node(1)
cur = head
for v in [2, 3, 4, 5]:
    cur.next = Node(v)
    cur = cur.next
print("built")
```

```python
# TREE — BST insert (left/right self-refs; forest + zoom test)
class Node:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

def insert(root, val):
    if root is None:
        return Node(val)
    if val < root.val:
        root.left = insert(root.left, val)
    else:
        root.right = insert(root.right, val)
    return root

root = None
for v in [50, 30, 70, 20, 40, 60, 80, 10]:
    root = insert(root, v)
print("done")
```

```python
# GRAPH — iterative DFS (ANIMATES: cur node orange, visited violet, node drag + layouts)
adj = [
    [0, 1, 1, 0, 0],
    [1, 0, 0, 1, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 0, 1],
    [0, 1, 1, 1, 0],
]
visited = [False] * 5
stack = [0]
while stack:
    cur = stack.pop()
    if visited[cur]:
        continue
    visited[cur] = True
    for v in range(5):
        if adj[cur][v] and not visited[v]:
            stack.append(v)
print(sum(visited))
```

```python
# GRAPH — edge list (reused small ids)
edges = [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [4, 0]]
deg = [0] * 5
for u, v in edges:
    deg[u] += 1
    deg[v] += 1
print(deg)
```

---

## C++ (C++14)

```cpp
// ARRAY — bubble sort
#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<int> a = {5, 2, 8, 1, 9, 3};
    for (int i = 0; i < (int)a.size(); i++) {
        for (int j = 0; j < (int)a.size() - i - 1; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
    cout << a[0] << endl;
    return 0;
}
```

```cpp
// MATRIX — 2D DP grid
#include <bits/stdc++.h>
using namespace std;
int main() {
    int n = 4, m = 5;
    vector<vector<int>> dp(n, vector<int>(m, 0));
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < m; j++) {
            if (i == 0 || j == 0) dp[i][j] = 1;
            else dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    cout << dp[n - 1][m - 1] << endl;
    return 0;
}
```

```cpp
// SCATTER — vector of (x,y) pairs (floats)
#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<pair<double, double>> pts;
    for (int k = 0; k < 24; k++) {
        double ang = k * 0.5;
        pts.push_back(make_pair(cos(ang) * ang, sin(ang) * ang));
    }
    cout << pts.size() << endl;
    return 0;
}
```

```cpp
// STACK — vector push_back/pop_back (behavioral)
#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<int> stk;
    int src[6] = {3, 1, 4, 1, 5, 9};
    for (int i = 0; i < 6; i++) stk.push_back(src[i]);
    while (!stk.empty()) {
        int top = stk.back();
        stk.pop_back();
        cout << top << endl;
    }
    return 0;
}
```

```cpp
// QUEUE — back push, front erase (behavioral)
#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<int> q = {1, 2, 3};
    while (!q.empty()) {
        int front = q.front();
        q.erase(q.begin());
        if (front < 3) q.push_back(front + 10);
    }
    cout << "done" << endl;
    return 0;
}
```

```cpp
// LINKED LIST — struct chain
#include <bits/stdc++.h>
using namespace std;
struct Node {
    int val;
    Node* next;
};
int main() {
    Node* head = new Node();
    head->val = 1;
    head->next = NULL;
    Node* cur = head;
    int vals[4] = {2, 3, 4, 5};
    for (int i = 0; i < 4; i++) {
        Node* n = new Node();
        n->val = vals[i];
        n->next = NULL;
        cur->next = n;
        cur = n;
    }
    cout << "built" << endl;
    return 0;
}
```

```cpp
// TREE — BST insert
#include <bits/stdc++.h>
using namespace std;
struct Node {
    int val;
    Node* left;
    Node* right;
};
Node* makeNode(int v) {
    Node* n = new Node();
    n->val = v;
    n->left = NULL;
    n->right = NULL;
    return n;
}
Node* insert(Node* root, int val) {
    if (root == NULL) return makeNode(val);
    if (val < root->val) root->left = insert(root->left, val);
    else root->right = insert(root->right, val);
    return root;
}
int main() {
    Node* root = NULL;
    int vals[8] = {50, 30, 70, 20, 40, 60, 80, 10};
    for (int i = 0; i < 8; i++) root = insert(root, vals[i]);
    cout << "done" << endl;
    return 0;
}
```

```cpp
// GRAPH — iterative DFS (ANIMATES; adj/visited/cur all LOCAL so they're captured)
#include <bits/stdc++.h>
using namespace std;
int main() {
    vector<vector<int>> adj = {
        {0, 1, 1, 0, 0},
        {1, 0, 0, 1, 1},
        {1, 0, 0, 0, 1},
        {0, 1, 0, 0, 1},
        {0, 1, 1, 1, 0},
    };
    vector<int> visited(5, 0);
    vector<int> stk;
    stk.push_back(0);
    while (!stk.empty()) {
        int cur = stk.back();
        stk.pop_back();
        if (visited[cur]) continue;
        visited[cur] = 1;
        for (int v = 0; v < 5; v++) {
            if (adj[cur][v] && !visited[v]) stk.push_back(v);
        }
    }
    cout << visited[4] << endl;
    return 0;
}
```

---

## Java (OpenJDK 13)

> Class must be named `Main`.

```java
// ARRAY — bubble sort
public class Main {
    public static void main(String[] args) {
        int[] a = {5, 2, 8, 1, 9, 3};
        for (int i = 0; i < a.length; i++) {
            for (int j = 0; j < a.length - i - 1; j++) {
                if (a[j] > a[j + 1]) {
                    int t = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = t;
                }
            }
        }
        System.out.println(a[0]);
    }
}
```

```java
// MATRIX — 2D DP grid
public class Main {
    public static void main(String[] args) {
        int n = 4, m = 5;
        int[][] dp = new int[n][m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (i == 0 || j == 0) dp[i][j] = 1;
                else dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
            }
        }
        System.out.println(dp[n - 1][m - 1]);
    }
}
```

```java
// SCATTER — 2D double array of (x,y)
public class Main {
    public static void main(String[] args) {
        double[][] pts = new double[24][2];
        for (int k = 0; k < 24; k++) {
            double ang = k * 0.5;
            pts[k][0] = Math.cos(ang) * ang;
            pts[k][1] = Math.sin(ang) * ang;
        }
        System.out.println(pts.length);
    }
}
```

```java
// STACK — ArrayList add/remove-last (behavioral)
import java.util.ArrayList;
public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> stack = new ArrayList<Integer>();
        int[] src = {3, 1, 4, 1, 5, 9};
        for (int i = 0; i < src.length; i++) stack.add(src[i]);
        while (!stack.isEmpty()) {
            int top = stack.remove(stack.size() - 1);
            System.out.println(top);
        }
    }
}
```

```java
// QUEUE — ArrayList add / remove-front (behavioral)
import java.util.ArrayList;
public class Main {
    public static void main(String[] args) {
        ArrayList<Integer> queue = new ArrayList<Integer>();
        queue.add(1);
        queue.add(2);
        queue.add(3);
        while (!queue.isEmpty()) {
            int front = queue.remove(0);
            if (front < 3) queue.add(front + 10);
        }
        System.out.println("done");
    }
}
```

```java
// LINKED LIST — object chain
public class Main {
    static class Node {
        int val;
        Node next;
        Node(int v) { val = v; next = null; }
    }
    public static void main(String[] args) {
        Node head = new Node(1);
        Node cur = head;
        int[] vals = {2, 3, 4, 5};
        for (int i = 0; i < vals.length; i++) {
            cur.next = new Node(vals[i]);
            cur = cur.next;
        }
        System.out.println("built");
    }
}
```

```java
// TREE — BST insert
public class Main {
    static class Node {
        int val;
        Node left, right;
        Node(int v) { val = v; left = null; right = null; }
    }
    static Node insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.val) root.left = insert(root.left, val);
        else root.right = insert(root.right, val);
        return root;
    }
    public static void main(String[] args) {
        Node root = null;
        int[] vals = {50, 30, 70, 20, 40, 60, 80, 10};
        for (int i = 0; i < vals.length; i++) root = insert(root, vals[i]);
        System.out.println("done");
    }
}
```

```java
// GRAPH — iterative DFS (ANIMATES; adj/visited/cur are LOCALS, not static fields, so captured)
public class Main {
    public static void main(String[] args) {
        int[][] adj = {
            {0, 1, 1, 0, 0},
            {1, 0, 0, 1, 1},
            {1, 0, 0, 0, 1},
            {0, 1, 0, 0, 1},
            {0, 1, 1, 1, 0},
        };
        boolean[] visited = new boolean[5];
        int[] stk = new int[16];
        int sp = 0;
        stk[sp++] = 0;
        while (sp > 0) {
            int cur = stk[--sp];
            if (visited[cur]) continue;
            visited[cur] = true;
            for (int v = 0; v < 5; v++) {
                if (adj[cur][v] == 1 && !visited[v]) stk[sp++] = v;
            }
        }
        System.out.println(visited[4]);
    }
}
```

---

## C# (Mono 6.6 / C# 7.3)

```csharp
// ARRAY — bubble sort
using System;
class Program {
    static void Main() {
        int[] a = {5, 2, 8, 1, 9, 3};
        for (int i = 0; i < a.Length; i++) {
            for (int j = 0; j < a.Length - i - 1; j++) {
                if (a[j] > a[j + 1]) {
                    int t = a[j];
                    a[j] = a[j + 1];
                    a[j + 1] = t;
                }
            }
        }
        Console.WriteLine(a[0]);
    }
}
```

```csharp
// MATRIX — jagged 2D DP grid
using System;
class Program {
    static void Main() {
        int n = 4, m = 5;
        int[][] dp = new int[n][];
        for (int i = 0; i < n; i++) dp[i] = new int[m];
        for (int i = 0; i < n; i++) {
            for (int j = 0; j < m; j++) {
                if (i == 0 || j == 0) dp[i][j] = 1;
                else dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
            }
        }
        Console.WriteLine(dp[n - 1][m - 1]);
    }
}
```

```csharp
// SCATTER — jagged (x,y) doubles
using System;
class Program {
    static void Main() {
        double[][] pts = new double[24][];
        for (int k = 0; k < 24; k++) {
            double ang = k * 0.5;
            pts[k] = new double[] { Math.Cos(ang) * ang, Math.Sin(ang) * ang };
        }
        Console.WriteLine(pts.Length);
    }
}
```

```csharp
// STACK — List add/remove-last (behavioral)
using System;
using System.Collections.Generic;
class Program {
    static void Main() {
        List<int> stack = new List<int>();
        int[] src = {3, 1, 4, 1, 5, 9};
        for (int i = 0; i < src.Length; i++) stack.Add(src[i]);
        while (stack.Count > 0) {
            int top = stack[stack.Count - 1];
            stack.RemoveAt(stack.Count - 1);
            Console.WriteLine(top);
        }
    }
}
```

```csharp
// QUEUE — List add / remove-front (behavioral)
using System;
using System.Collections.Generic;
class Program {
    static void Main() {
        List<int> queue = new List<int>();
        queue.Add(1);
        queue.Add(2);
        queue.Add(3);
        while (queue.Count > 0) {
            int front = queue[0];
            queue.RemoveAt(0);
            if (front < 3) queue.Add(front + 10);
        }
        Console.WriteLine("done");
    }
}
```

```csharp
// LINKED LIST — object chain
using System;
class Program {
    class Node {
        public int val;
        public Node next;
        public Node(int v) { val = v; next = null; }
    }
    static void Main() {
        Node head = new Node(1);
        Node cur = head;
        int[] vals = {2, 3, 4, 5};
        for (int i = 0; i < vals.Length; i++) {
            cur.next = new Node(vals[i]);
            cur = cur.next;
        }
        Console.WriteLine("built");
    }
}
```

```csharp
// TREE — BST insert
using System;
class Program {
    class Node {
        public int val;
        public Node left, right;
        public Node(int v) { val = v; left = null; right = null; }
    }
    static Node Insert(Node root, int val) {
        if (root == null) return new Node(val);
        if (val < root.val) root.left = Insert(root.left, val);
        else root.right = Insert(root.right, val);
        return root;
    }
    static void Main() {
        Node root = null;
        int[] vals = {50, 30, 70, 20, 40, 60, 80, 10};
        for (int i = 0; i < vals.Length; i++) root = Insert(root, vals[i]);
        Console.WriteLine("done");
    }
}
```

```csharp
// GRAPH — iterative DFS (ANIMATES; adj/visited/cur are LOCALS, not static fields, so captured)
using System;
using System.Collections.Generic;
class Program {
    static void Main() {
        int[][] adj = new int[][] {
            new int[] {0, 1, 1, 0, 0},
            new int[] {1, 0, 0, 1, 1},
            new int[] {1, 0, 0, 0, 1},
            new int[] {0, 1, 0, 0, 1},
            new int[] {0, 1, 1, 1, 0},
        };
        bool[] visited = new bool[5];
        List<int> stk = new List<int>();
        stk.Add(0);
        while (stk.Count > 0) {
            int cur = stk[stk.Count - 1];
            stk.RemoveAt(stk.Count - 1);
            if (visited[cur]) continue;
            visited[cur] = true;
            for (int v = 0; v < 5; v++) {
                if (adj[cur][v] == 1 && !visited[v]) stk.Add(v);
            }
        }
        Console.WriteLine(visited[4]);
    }
}
```

---

## C (GCC 9 / C11)

> C uses fixed-size local arrays; length comes from `sizeof`. `malloc`'d **raw buffers**
> render as opaque pointers, but **tagged `struct` pointers** (linked list / tree) serialize
> fully. Dynamic-length stack/queue and float-pair scatter are not natural in C — use the
> other languages for those, or view a fixed array with the per-variable "view as" dropdown.

```c
// ARRAY — bubble sort
#include <stdio.h>
int main() {
    int a[6] = {5, 2, 8, 1, 9, 3};
    int n = 6;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - i - 1; j++) {
            if (a[j] > a[j + 1]) {
                int t = a[j];
                a[j] = a[j + 1];
                a[j + 1] = t;
            }
        }
    }
    printf("%d\n", a[0]);
    return 0;
}
```

```c
// MATRIX — 2D DP grid
#include <stdio.h>
int main() {
    int dp[4][5];
    for (int i = 0; i < 4; i++) {
        for (int j = 0; j < 5; j++) {
            if (i == 0 || j == 0) dp[i][j] = 1;
            else dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
        }
    }
    printf("%d\n", dp[3][4]);
    return 0;
}
```

```c
// LINKED LIST — tagged struct chain
#include <stdio.h>
#include <stdlib.h>
struct Node {
    int val;
    struct Node* next;
};
int main() {
    struct Node* head = (struct Node*) malloc(sizeof(struct Node));
    head->val = 1;
    head->next = NULL;
    struct Node* cur = head;
    int vals[4] = {2, 3, 4, 5};
    for (int i = 0; i < 4; i++) {
        struct Node* n = (struct Node*) malloc(sizeof(struct Node));
        n->val = vals[i];
        n->next = NULL;
        cur->next = n;
        cur = n;
    }
    printf("built\n");
    return 0;
}
```

```c
// TREE — BST insert
#include <stdio.h>
#include <stdlib.h>
struct Node {
    int val;
    struct Node* left;
    struct Node* right;
};
struct Node* makeNode(int v) {
    struct Node* n = (struct Node*) malloc(sizeof(struct Node));
    n->val = v;
    n->left = NULL;
    n->right = NULL;
    return n;
}
struct Node* insert(struct Node* root, int val) {
    if (root == NULL) return makeNode(val);
    if (val < root->val) root->left = insert(root->left, val);
    else root->right = insert(root->right, val);
    return root;
}
int main() {
    struct Node* root = NULL;
    int vals[8] = {50, 30, 70, 20, 40, 60, 80, 10};
    for (int i = 0; i < 8; i++) root = insert(root, vals[i]);
    printf("done\n");
    return 0;
}
```

```c
// GRAPH — iterative DFS (ANIMATES; adj/visited/cur are LOCAL arrays, so captured)
#include <stdio.h>
int main() {
    int adj[5][5] = {
        {0, 1, 1, 0, 0},
        {1, 0, 0, 1, 1},
        {1, 0, 0, 0, 1},
        {0, 1, 0, 0, 1},
        {0, 1, 1, 1, 0},
    };
    int visited[5] = {0, 0, 0, 0, 0};
    int stk[16];
    int sp = 0;
    stk[sp++] = 0;
    while (sp > 0) {
        int cur = stk[--sp];
        if (visited[cur]) continue;
        visited[cur] = 1;
        for (int v = 0; v < 5; v++) {
            if (adj[cur][v] && !visited[v]) stk[sp++] = v;
        }
    }
    printf("%d\n", visited[4]);
    return 0;
}
```

---

## JavaScript (Node 12)

> No optional chaining (`?.`) or nullish coalescing (`??`) — Node 12 predates them.

```javascript
// ARRAY — bubble sort
const a = [5, 2, 8, 1, 9, 3];
for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < a.length - i - 1; j++) {
        if (a[j] > a[j + 1]) {
            const t = a[j];
            a[j] = a[j + 1];
            a[j + 1] = t;
        }
    }
}
console.log(a[0]);
```

```javascript
// MATRIX — 2D DP grid
const n = 4, m = 5;
const dp = [];
for (let i = 0; i < n; i++) {
    dp.push(new Array(m).fill(0));
}
for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
        if (i === 0 || j === 0) dp[i][j] = 1;
        else dp[i][j] = dp[i - 1][j] + dp[i][j - 1];
    }
}
console.log(dp[n - 1][m - 1]);
```

```javascript
// SCATTER — array of [x,y] pairs (floats)
const pts = [];
for (let k = 0; k < 24; k++) {
    const ang = k * 0.5;
    pts.push([Math.cos(ang) * ang, Math.sin(ang) * ang]);
}
console.log(pts.length);
```

```javascript
// STACK — push/pop (behavioral)
const stack = [];
const src = [3, 1, 4, 1, 5, 9];
for (let i = 0; i < src.length; i++) stack.push(src[i]);
while (stack.length > 0) {
    const top = stack.pop();
    console.log(top);
}
```

```javascript
// QUEUE — push/shift (behavioral)
const queue = [1, 2, 3];
while (queue.length > 0) {
    const front = queue.shift();
    if (front < 3) queue.push(front + 10);
}
console.log("done");
```

```javascript
// LINKED LIST — object chain
class Node {
    constructor(val) {
        this.val = val;
        this.next = null;
    }
}
let head = new Node(1);
let cur = head;
const vals = [2, 3, 4, 5];
for (let i = 0; i < vals.length; i++) {
    cur.next = new Node(vals[i]);
    cur = cur.next;
}
console.log("built");
```

```javascript
// TREE — BST insert
class Node {
    constructor(val) {
        this.val = val;
        this.left = null;
        this.right = null;
    }
}
function insert(root, val) {
    if (root === null) return new Node(val);
    if (val < root.val) root.left = insert(root.left, val);
    else root.right = insert(root.right, val);
    return root;
}
let root = null;
const vals = [50, 30, 70, 20, 40, 60, 80, 10];
for (let i = 0; i < vals.length; i++) root = insert(root, vals[i]);
console.log("done");
```

```javascript
// GRAPH — iterative DFS (ANIMATES; wrapped in main() so adj/visited/cur are captured locals)
function main() {
    const adj = [
        [0, 1, 1, 0, 0],
        [1, 0, 0, 1, 1],
        [1, 0, 0, 0, 1],
        [0, 1, 0, 0, 1],
        [0, 1, 1, 1, 0],
    ];
    const visited = new Array(5).fill(false);
    const stack = [0];
    while (stack.length > 0) {
        const cur = stack.pop();
        if (visited[cur]) continue;
        visited[cur] = true;
        for (let v = 0; v < 5; v++) {
            if (adj[cur][v] && !visited[v]) stack.push(v);
        }
    }
    console.log(visited[4]);
}
main();
```

---

## Coverage matrix

| Renderer     | Python | C++ | Java | C# | C | JS |
|--------------|:------:|:---:|:----:|:--:|:-:|:--:|
| array        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| matrix       | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| scatter      | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| stack        | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| queue        | ✅ | ✅ | ✅ | ✅ | ⚠️ | ✅ |
| linked list  | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tree         | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| graph        | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

⚠️ C: dynamic-length behavioral (stack/queue) and float-pair scatter aren't idiomatic; use another
language or the per-variable **"view as"** override on a fixed array.
