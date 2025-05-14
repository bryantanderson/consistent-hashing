import { HashRingNode } from "./types";

class AVLTreeNode {
	key: HashRingNode;
	leftChild: AVLTreeNode | null;
	rightChild: AVLTreeNode | null;
	height: number;

	constructor(key: HashRingNode) {
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

	constructor(key?: HashRingNode) {
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

	// Rotations preserve the BST property (left < root < right). The fundamental goal of a rotation
	// is to reduce the overall height of an imbalanced branch.
	//
	// The in order traversal of the BST (left, root, right) must be the same before and after the rotation.
	//
	// In a right rotation, the left child becomes the new root, effectively reducing the depth of the left subtree.
	//
	// In a left rotation, the right child becomes the new root, reducing the depth of the right subtree.

	// Visual representation of a right rotation:
	//     y           x
	//    / \         / \
	//   x   T3  ->  T1  y
	//  / \             / \
	// T1  T2          T2  T3
	private rightRotate(y: AVLTreeNode) {
		if (!y.leftChild) {
			return y;
		}
		const x = y.leftChild;
		const T2 = x.rightChild;

		x.rightChild = y;
		y.leftChild = T2;

		y.height = this.computeNodeHeightFromChildren(y);
		x.height = this.computeNodeHeightFromChildren(x);

		// Return the new root
		return x;
	}

	// Visual representation of a left rotation:
	//   x               y
	//  / \             / \
	// T1  y     ->    x   T3
	//    / \         / \
	//   T2  T3      T1  T2
	private leftRotate(x: AVLTreeNode) {
		if (!x.rightChild) {
			return x;
		}
		const y = x.rightChild;
		const T2 = y.leftChild;

		y.leftChild = x;
		x.rightChild = T2;

		x.height = this.computeNodeHeightFromChildren(x);
		y.height = this.computeNodeHeightFromChildren(y);

		// Return the new root
		return y;
	}

	// Explanation: https://www.geeksforgeeks.org/insertion-in-an-avl-tree/
	private insertNode(node: AVLTreeNode | null, key: HashRingNode) {
		// Base case: If the node is null, we insert a new node in this position
		if (node === null) {
			return new AVLTreeNode(key);
		}

		// In an AVL (BST in general) tree, all keys to the left of a node are less than the node's key,
		// and all keys to the right of a node are greater than the node's key.
		// Duplicate keys are not allowed in a BST.
		if (key.position < node.key.position) {
			node.leftChild = this.insertNode(node.leftChild, key);
		} else if (key.position > node.key.position) {
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
		if (
			balance > 1 &&
			node.leftChild &&
			key.position < node.leftChild.key.position
		) {
			return this.rightRotate(node);
		}

		// Left Right case, where the inserted node ends up on the right subtree
		// of the node's left child node
		if (
			balance > 1 &&
			node.leftChild &&
			key.position > node.leftChild.key.position
		) {
			node.leftChild = this.leftRotate(node.leftChild);
			return this.rightRotate(node);
		}

		// Right Right case, where the inserted node ends up on the right subtree
		// of the node's right child node
		if (
			balance < -1 &&
			node.rightChild &&
			key.position > node.rightChild.key.position
		) {
			return this.leftRotate(node);
		}

		// Right Left case, where the inserted node ends up on the left subtree
		// of the node's right child node
		if (
			balance < -1 &&
			node.rightChild &&
			key.position < node.rightChild.key.position
		) {
			node.rightChild = this.rightRotate(node.rightChild);
			return this.leftRotate(node);
		}

		// Return the unchanged node pointer
		return node;
	}

	private preOrderTraversal(node: AVLTreeNode | null, keys: HashRingNode[]) {
		if (!node) {
			return keys;
		}
		keys.push(node.key);
		this.preOrderTraversal(node.leftChild, keys);
		this.preOrderTraversal(node.rightChild, keys);
		return keys;
	}

	// As the height of the tree is O(log n), the time complexity of this operation is O(log n).
	private findSmallestNode() {
		if (!this.root) {
			return null;
		}
  
		let current = this.root;

		while (current.leftChild) {
			current = current.leftChild;
		}

		return current.key;
	}

	insert(key: HashRingNode) {
		this.root = this.insertNode(this.root, key);
		return this.root;
	}

  // O(log n) complexity as it's searching through a BST
	findNextClockwiseNode(hash: number) {
		if (!this.root) {
			return null;
		}

		// We want to find the next successor node in the clockwise duration
		let current: AVLTreeNode | null = this.root;
		let successor: AVLTreeNode | null = null;

		while (current) {
			// If current node is >= hash, it's a potential successor
			if (current.key.position >= hash) {
				successor = current;
				// Continue left to find potentially closer nodes
				current = current.leftChild;
			} else {
				// Current is < target, go right as this cannot be a successor node
				current = current.rightChild;
			}
		}

		if (successor) {
			return successor.key;
		}

		// If no successor node is found, return the smallest node in the tree
		// This means we're wrapping around the ring to the first (smallest) node
		return this.findSmallestNode();
	}

	preOrder() {
		return this.preOrderTraversal(this.root, []);
	}
}

export { AVLTree };
