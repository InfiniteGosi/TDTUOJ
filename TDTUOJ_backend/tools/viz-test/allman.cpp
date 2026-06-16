#include <bits/stdc++.h>
using namespace std;

struct Node
{
    int val;
    Node *left, *right;
    Node(int v) : val(v), left(nullptr), right(nullptr) {}
};

Node* insertNode(Node* root, int val)
{
    if (root == nullptr) return new Node(val);
    if (val < root->val) root->left = insertNode(root->left, val);
    else root->right = insertNode(root->right, val);
    return root;
}

int main()
{
    vector<int> arr = {5, 2, 8};
    int s = 0;
    for (int x : arr)
    {
        s += x;
    }
    Node* root = nullptr;
    for (int v : {4, 2, 6, 1, 3})
    {
        root = insertNode(root, v);
    }
    cout << s << "\n";
    return 0;
}
