const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/bfhl', (req, res) => {
    try {
        const { data } = req.body;

        if (!data || !Array.isArray(data)) {
            return res.status(400).json({ error: "Invalid input. Expected an array in 'data' field." });
        }

        const validEdgesArr = [];
        const invalidEntries = [];
        const duplicateEdges = [];

        const seenEdges = new Set();
        const duplicateSet = new Set();

        const parentMap = new Map();

        data.forEach(entry => {
            if (typeof entry !== 'string') {
                invalidEntries.push(entry);
                return;
            }

            const regex = /^([A-Z])->([A-Z])$/;
            const match = entry.match(regex);

            if (!match) {
                invalidEntries.push(entry);
                return;
            }

            const parentNode = match[1];
            const childNode = match[2];

            if (parentNode === childNode) {
                invalidEntries.push(entry);
                return;
            }

            if (seenEdges.has(entry)) {
                if (!duplicateSet.has(entry)) {
                    duplicateSet.add(entry);
                    duplicateEdges.push(entry);
                }
                return;
            }

            seenEdges.add(entry);

            if (parentMap.has(childNode)) {
                // Multi-parent rule: keep first occurrence.
                // We ignore subsequent parents.
                return;
            }
            parentMap.set(childNode, parentNode);

            validEdgesArr.push({ u: parentNode, v: childNode });
        });


        const adjacencyList = new Map();
        const nodes = new Set();
        const inDegree = new Map();

        validEdgesArr.forEach(({ u, v }) => {
            nodes.add(u);
            nodes.add(v);
            if (!adjacencyList.has(u)) adjacencyList.set(u, []);
            adjacencyList.get(u).push(v);

            if (!inDegree.has(u)) inDegree.set(u, 0);
            inDegree.set(v, (inDegree.get(v) || 0) + 1);
        });

        const roots = [];
        for (const node of nodes) {
            if ((inDegree.get(node) || 0) === 0) {
                roots.push(node);
            }
        }

        const hierarchies = [];
        let totalTrees = 0;
        let totalCycles = 0;
        let largestTreeRoot = null;
        let maxDepth = -1;
        const globalVisited = new Set();

        const buildTree = (root) => {
            const visited = new Set();
            const processStack = new Set();
            let hasCycle = false;
            let maxPathDepth = 0;

            const dfs = (node, depth) => {
                if (processStack.has(node)) {
                    hasCycle = true;
                    return {};
                }

                processStack.add(node);
                visited.add(node);
                globalVisited.add(node);

                maxPathDepth = Math.max(maxPathDepth, depth);

                const tree = {};
                const children = adjacencyList.get(node) || [];
                for (const child of children) {
                    // Sort children lexicographically for predictable output order, though not strictly required
                    tree[child] = dfs(child, depth + 1);
                }

                processStack.delete(node);
                return tree;
            };

            const structure = dfs(root, 1);

            if (hasCycle) {
                return { has_cycle: true, tree: {} };
            } else {
                const finalTree = {};
                finalTree[root] = structure;
                return { has_cycle: false, tree: finalTree, depth: maxPathDepth };
            }
        };

        roots.forEach(root => {
            const result = buildTree(root);
            if (result.has_cycle) {
                totalCycles++;
                hierarchies.push({
                    root: root,
                    tree: {},
                    has_cycle: true
                });
            } else {
                totalTrees++;
                hierarchies.push({
                    root: root,
                    tree: result.tree,
                    depth: result.depth
                });

                if (result.depth > maxDepth) {
                    maxDepth = result.depth;
                    largestTreeRoot = root;
                } else if (result.depth === maxDepth) {
                    if (largestTreeRoot === null || root < largestTreeRoot) {
                        largestTreeRoot = root;
                    }
                }
            }
        });


        for (const node of nodes) {
            if (!globalVisited.has(node)) {
                const result = buildTree(node);
                totalCycles++;
                hierarchies.push({
                    root: node,
                    tree: {},
                    has_cycle: true
                });
            }
        }

        const summary = {
            total_trees: totalTrees,
            total_cycles: totalCycles,
            largest_tree_root: largestTreeRoot
        };

        res.json({
            user_id: "antigravity_24042026",
            email_id: "Chebrolurakesh7155@gmail.com",
            college_roll_number: "AG100",
            hierarchies,
            invalid_entries: invalidEntries,
            duplicate_edges: duplicateEdges,
            summary
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
