#include <iostream>
using namespace std;


struct Node {
    int val;
    Node* left;
    Node* right;

    Node(int x) {
        val = x;
        left = right = nullptr;
    }
};

Node* insert(Node* root, int x) {
    if (root == nullptr)
        return new Node(x);

    if (x < root->val)
        root->left = insert(root->left, x);
    else if (x > root->val)
        root->right = insert(root->right, x);

    // Ignore duplicates
    return root;
}

bool search(Node* root, int target) {
    if (root == nullptr)
        return false;

    if (root->val == target)
        return true;
    if (target < root->val)
        return search(root->left, target);
    return search(root->right, target);
}

int main() {
    int N;
    cin >> N;

    Node* root = nullptr;

    for (int i = 0; i < N; i++) {
        int x;
        cin >> x;
        root = insert(root, x);
    }

    int target;
    cin >> target;

    if (search(root, target))
        cout << "FOUND";
    else
        cout << "NOT FOUND";

    return 0;
}