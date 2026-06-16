#include <stdio.h>
#include <stdlib.h>

struct Node
{
    int val;
    struct Node *left;
    struct Node *right;
};

struct Node* insertNode(struct Node* root, int val)
{
    if (root == NULL)
    {
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

int main(void)
{
    int arr[3] = {5, 2, 8};
    int s = 0;
    for (int i = 0; i < 3; i++)
    {
        s += arr[i];
    }
    struct Node* root = NULL;
    int vals[3] = {4, 2, 6};
    for (int i = 0; i < 3; i++)
    {
        root = insertNode(root, vals[i]);
    }
    printf("%d\n", s);
    return 0;
}
