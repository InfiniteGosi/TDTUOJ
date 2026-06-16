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

// 1) array + bubble sort
const arr = [5, 2, 8, 1, 9];
const n = arr.length;
for (let i = 0; i < n; i++) {
  for (let j = 0; j < n - 1 - i; j++) {
    if (arr[j] > arr[j + 1]) {
      const t = arr[j]; arr[j] = arr[j + 1]; arr[j + 1] = t;
    }
  }
}

// 2) graph as adjacency matrix + iterative DFS
const g = [
  [0, 1, 1, 0],
  [1, 0, 0, 1],
  [1, 0, 0, 1],
  [0, 1, 1, 0],
];
const visited = [false, false, false, false];
const stack = [0];
const order = [];
while (stack.length > 0) {
  const u = stack.pop();
  if (visited[u]) continue;
  visited[u] = true;
  order.push(u);
  for (let v = 3; v >= 0; v--) {
    if (g[u][v] === 1 && !visited[v]) stack.push(v);
  }
}

// 3) BST from user class (recursive insert)
let root = null;
for (const v of [4, 2, 6, 1, 3]) {
  root = insert(root, v);
}

// 4) Map -> memory-model fallback
const freq = new Map();
for (const x of arr) {
  freq.set(x, (freq.get(x) || 0) + 1);
}

console.log(order.join(" "), freq.get(1));
