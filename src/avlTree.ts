class AVLTreeNode {
	key: string;
	leftChild: AVLTreeNode | null;
	rightChild: AVLTreeNode | null;
	height: number;

	constructor(key: string) {
		this.key = key;
		this.leftChild = null;
		this.rightChild = null;
		this.height = 1;
	}

	get subTreeHeightDifference() {
		const leftHeight = this.leftChild?.height ?? 0;
		const rightHeight = this.rightChild?.height ?? 0;
		return leftHeight - rightHeight;
	}
}

// AVL tree is a self-balancing Binary Search Tree (BST) where the difference between
// heights of left and right subtrees cannot be more than one for all nodes
//
// By ensuring a height of O(log n) for the tree after insertions and deletions,
// we can guarantee an upper bound of O(log n) for all operations.
// (Where n is the number of nodes in the tree)
//
// There are 4 types of imbalances in an AVL tree:
// 1. Left Left Case
// 2. Left Right Case
// 3. Right Left Case
// 4. Right Right Case
//
// The solution for each case is composed of a series of left or right "rotations", which
// brings the tree back into balance (the AVL height condition is re-established).
class AVLTree {
	root: AVLTreeNode | null;

	constructor(key?: string) {
		if (key) {
			this.root = new AVLTreeNode(key);
		} else {
			this.root = null;
		}
	}

	private getNodeHeight(node: AVLTreeNode | null) {
		if (!node) {
			return 0;
		}
		return node.height;
	}

	private computeNodeHeightFromChildren(node: AVLTreeNode | null) {
		if (!node) {
			return 0;
		}
		const leftChildHeight = this.getNodeHeight(node.leftChild);
		const rightChildHeight = this.getNodeHeight(node.rightChild);
		return 1 + Math.max(leftChildHeight, rightChildHeight);
	}

	private rightRotate(y: AVLTreeNode) {
    // TODO
		return y;
	}

	private leftRotate(x: AVLTreeNode) {
    // TODO
		return x;
	}

	// Explanation: https://www.geeksforgeeks.org/insertion-in-an-avl-tree/
	private insertNode(node: AVLTreeNode | null, key: string) {
    // Base case: If the node is null, we insert a new node in this position
		if (node === null) {
			return new AVLTreeNode(key);
		}

		// In an AVL (BST in general) tree, all keys to the left of a node are less than the node's key,
		// and all keys to the right of a node are greater than the node's key.
		// Duplicate keys are not allowed in a BST.
		if (key < node.key) {
			node.leftChild = this.insertNode(node.leftChild, key);
		} else if (key > node.key) {
			node.rightChild = this.insertNode(node.rightChild, key);
		} else {
			return node;
		}

		node.height = this.computeNodeHeightFromChildren(node);

		// This is simply the (height of left subtree - height of right subtree)
		// If the value is not 0, 1, or -1, then the node is unbalanced as the difference
		// between the heights of the left and right subtrees is no longer <= 1. (AVL condition)
		const balance = node.subTreeHeightDifference;

    // Left Left case, where the inserted node ends up on the left subtree
    // of the node's left child node
		if (balance > 1 && node.leftChild && key < node.leftChild.key) {
			return this.rightRotate(node);
		}

    // Left Right case, where the inserted node ends up on the right subtree
    // of the node's left child node
		if (balance > 1 && node.leftChild && key > node.leftChild.key) {
			node.leftChild = this.leftRotate(node.leftChild);
			return this.rightRotate(node);
		}

    // Right Right case, where the inserted node ends up on the right subtree
    // of the node's right child node
    if (balance < -1 && node.rightChild && key > node.rightChild.key) {
      return this.leftRotate(node);
    }

    // Right Left case, where the inserted node ends up on the left subtree
    // of the node's right child node
    if (balance < -1 && node.rightChild && key < node.rightChild.key) {
      node.rightChild = this.rightRotate(node.rightChild);
      return this.leftRotate(node);
    }

		// Return the unchanged node pointer
		return node;
	}

	insert(key: string) {
		this.root = this.insertNode(this.root, key);
		return this.root;
	}
}

export { AVLTree };
