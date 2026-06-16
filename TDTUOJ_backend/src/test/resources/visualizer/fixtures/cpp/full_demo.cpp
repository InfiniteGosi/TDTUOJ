#include <bits/stdc++.h>
using namespace std;

struct Node {
    int val;
    Node *left, *right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

Node* insertNode(Node* root, int val) {
    if (root == nullptr) return new Node(val);
    if (val < root->val) root->left = insertNode(root->left, val);
    else root->right = insertNode(root->right, val);
    return root;
}

int main() {
    vector<int> arr = {5, 2, 8, 1, 9};
    int n = (int)arr.size();
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                swap(arr[j], arr[j + 1]);
            }
        }
    }

    vector<vector<int>> g = {
        {0, 1, 1, 0},
        {1, 0, 0, 1},
        {1, 0, 0, 1},
        {0, 1, 1, 0},
    };
    vector<bool> visited(4, false);
    vector<int> stack_;
    vector<int> order;
    stack_.push_back(0);
    while (!stack_.empty()) {
        int u = stack_.back();
        stack_.pop_back();
        if (visited[u]) continue;
        visited[u] = true;
        order.push_back(u);
        for (int v = 3; v >= 0; v--) {
            if (g[u][v] == 1 && !visited[v]) {
                stack_.push_back(v);
            }
        }
    }

    Node* root = nullptr;
    for (int v : {4, 2, 6, 1, 3}) {
        root = insertNode(root, v);
    }

    map<int, int> freq;
    for (int x : arr) freq[x]++;

    cout << order.size() << " " << freq[1] << "\n";
    return 0;
}
