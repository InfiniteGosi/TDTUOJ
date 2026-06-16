#include <stdio.h>
#include <stdlib.h>

struct Node {
    int val;
    struct Node *left;
    struct Node *right;
};

struct Node* insertNode(struct Node* root, int val) {
    if (root == NULL) {
        struct Node* nd = (struct Node*)malloc(sizeof(struct Node));
        nd->val = val;
        nd->left = NULL;
        nd->right = NULL;
        return nd;
    }
    if (val < root->val) root->left = insertNode(root->left, val);
    else root->right = insertNode(root->right, val);
    return root;
}

int main(void) {
    int arr[5] = {5, 2, 8, 1, 9};
    int n = 5;
    for (int i = 0; i < n; i++) {
        for (int j = 0; j < n - 1 - i; j++) {
            if (arr[j] > arr[j + 1]) {
                int t = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = t;
            }
        }
    }

    int g[4][4] = {
        {0, 1, 1, 0},
        {1, 0, 0, 1},
        {1, 0, 0, 1},
        {0, 1, 1, 0},
    };
    int visited[4] = {0, 0, 0, 0};
    int stack[16];
    int top = 0;
    int order[4];
    int cnt = 0;
    stack[top++] = 0;
    while (top > 0) {
        int u = stack[--top];
        if (visited[u]) continue;
        visited[u] = 1;
        order[cnt++] = u;
        for (int v = 3; v >= 0; v--) {
            if (g[u][v] == 1 && !visited[v]) {
                stack[top++] = v;
            }
        }
    }

    struct Node* root = NULL;
    int vals[5] = {4, 2, 6, 1, 3};
    for (int i = 0; i < 5; i++) {
        root = insertNode(root, vals[i]);
    }

    printf("%d %d\n", cnt, order[0]);
    return 0;
}
