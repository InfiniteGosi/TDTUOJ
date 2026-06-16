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

arr = [5, 2, 8, 1, 9]
n = len(arr)
for i in range(n):
    for j in range(n - 1 - i):
        if arr[j] > arr[j + 1]:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]

g = [[0, 1, 1, 0],
     [1, 0, 0, 1],
     [1, 0, 0, 1],
     [0, 1, 1, 0]]
visited = [False] * 4
stack = [0]
order = []
while stack:
    u = stack.pop()
    if visited[u]:
        continue
    visited[u] = True
    order.append(u)
    for v in range(3, -1, -1):
        if g[u][v] == 1 and not visited[v]:
            stack.append(v)

root = None
for v in [4, 2, 6, 1, 3]:
    root = insert(root, v)

freq = {}
for x in arr:
    freq[x] = freq.get(x, 0) + 1

print(order, freq[1])
