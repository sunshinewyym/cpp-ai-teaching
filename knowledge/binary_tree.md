# 二叉树（Binary Tree）

## 定义
二叉树是每个节点最多有两个子节点的树结构。

## 基本结构

```cpp
struct TreeNode {
    int val;
    TreeNode* left;
    TreeNode* right;
    TreeNode(int x) : val(x), left(nullptr), right(nullptr) {}
};
```

## 遍历方式

### 前序遍历（根-左-右）

```cpp
void preorder(TreeNode* root) {
    if (!root) return;
    cout << root->val << " ";
    preorder(root->left);
    preorder(root->right);
}
```

### 中序遍历（左-根-右）

```cpp
void inorder(TreeNode* root) {
    if (!root) return;
    inorder(root->left);
    cout << root->val << " ";
    inorder(root->right);
}
```

### 后序遍历（左-右-根）

```cpp
void postorder(TreeNode* root) {
    if (!root) return;
    postorder(root->left);
    postorder(root->right);
    cout << root->val << " ";
}
```

### 层序遍历（BFS）

```cpp
void levelOrder(TreeNode* root) {
    if (!root) return;
    queue<TreeNode*> q;
    q.push(root);
    while (!q.empty()) {
        int sz = q.size();
        for (int i = 0; i < sz; i++) {
            TreeNode* node = q.front(); q.pop();
            cout << node->val << " ";
            if (node->left) q.push(node->left);
            if (node->right) q.push(node->right);
        }
        cout << endl; // 换行 = 新的一层
    }
}
```

## 经典问题

### 树的高度

```cpp
int maxDepth(TreeNode* root) {
    if (!root) return 0;
    return 1 + max(maxDepth(root->left), maxDepth(root->right));
}
```

### 判断对称树

```cpp
bool isSymmetric(TreeNode* root) {
    if (!root) return true;
    return isMirror(root->left, root->right);
}

bool isMirror(TreeNode* a, TreeNode* b) {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a->val == b->val
        && isMirror(a->left, b->right)
        && isMirror(a->right, b->left);
}
```

### 最近公共祖先（LCA）

```cpp
TreeNode* lowestCommonAncestor(TreeNode* root, TreeNode* p, TreeNode* q) {
    if (!root || root == p || root == q) return root;
    TreeNode* left = lowestCommonAncestor(root->left, p, q);
    TreeNode* right = lowestCommonAncestor(root->right, p, q);
    if (left && right) return root;
    return left ? left : right;
}
```

## 时间复杂度
- 所有遍历：O(n)
- LCA：O(n)

## 常见错误
- 递归终止条件写错（`!root` vs `!root->left`）
- 层序遍历忘记处理每层的 size
- 空指针访问
