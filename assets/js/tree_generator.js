const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
let network = null;

const container = document.getElementById('treeViz-treeContainer');
const clearBtn = document.getElementById('treeViz-clearBtn');
const resetZoomBtn = document.getElementById('treeViz-resetZoomBtn');
const nodeCountInput = document.getElementById('nodeCount');
const treeTypeSelect = document.getElementById('treeType');
const nodeCountInfo = document.getElementById('nodeCountInfo');
const edgeCountInfo = document.getElementById('edgeCountInfo');
const heightInfo = document.getElementById('heightInfo');
const typeInfo = document.getElementById('typeInfo');

const nodeStyles = {
    labelsInside: {
        shape: 'circle',
        font: { size: 14, color: '#ffffff', align: 'center', vadis: 'middle', multi: false },
        color: { border: '#000000', background: '#2B7CE9', highlight: { border: '#000000', background: '#D32F2F' } },
        borderWidth: 2,
        labelHighlightBold: false,
        fixed: { x: false, y: false }
    }
};

const baseOptions = {
    nodes: nodeStyles.labelsInside,
    edges: {
        width: 2,
        smooth: { enabled: false },
        font: { size: 14, color: '#2c3e50', background: '#ffffff', align: 'middle' },
        color: { color: '#2c3e50' }
    },
    interaction: { dragNodes: false, selectable: false, zoomView: true },
    physics: { enabled: false },
    layout: { hierarchical: { enabled: true, direction: 'UD', sortMethod: 'directed' } }
};

network = new vis.Network(container, { nodes, edges }, baseOptions);

function getNextAvailableLabel(index) {
    if (index < alphabet.length) {
        return alphabet[index];
    }
    return `N${index - alphabet.length + 1}`;
}

function adjustTreeLayout(nodeCount, treeType, maxLevel) {
    let nodeSize = 15;
    let nodeSpacing = 150;
    let levelSeparation = 100;
    let fontSize = 14;
    let scale = 1.0;

    if (nodeCount > 10) {
        if (treeType === 'random') {
            // Përshtatje agresive për pemën e rastësishme
            nodeSize = Math.max(4, 15 - Math.floor(nodeCount / 3)); // Zvogëlim më i shpejtë
            nodeSpacing = Math.max(15, 150 - nodeCount * 3); // Hapësirë shumë e ngjeshur
            levelSeparation = Math.max(15, 100 - nodeCount * 1.5 - maxLevel * 8); // Konsidero lartësinë
            fontSize = Math.max(5, 14 - Math.floor(nodeCount / 6)); // Font shumë i vogël
            scale = Math.max(0.15, 1.0 - (nodeCount - 10) * 0.02 - maxLevel * 0.03); // Zmadhim i reduktuar
        } else {
            // Përshtatje për llojet e tjera të pemëve
            nodeSize = Math.max(6, 15 - Math.floor(nodeCount / 5));
            nodeSpacing = Math.max(30, 150 - nodeCount * 2);
            levelSeparation = Math.max(30, 100 - nodeCount * 1.5);
            fontSize = Math.max(8, 14 - Math.floor(nodeCount / 10));
            scale = Math.max(0.3, 1.0 - (nodeCount - 10) * 0.02);
        }
    }

    const updatedOptions = {
        nodes: {
            ...nodeStyles.labelsInside,
            size: nodeSize,
            font: { ...nodeStyles.labelsInside.font, size: fontSize }
        },
        layout: {
            hierarchical: {
                enabled: true,
                direction: 'UD',
                sortMethod: 'directed',
                nodeSpacing: nodeSpacing,
                levelSeparation: levelSeparation
            }
        }
    };

    network.setOptions(updatedOptions);
    return scale;
}

function generateTree(nodeCount, treeType) {
    nodes.clear();
    edges.clear();

    if (nodeCount === 0) {
        updateInfoPanel(0, 0, 0, '-');
        adjustTreeLayout(0, treeType, 0);
        network.fit({ animation: true });
        return;
    }

    let maxLevel = 0;
    const rootLabel = getNextAvailableLabel(0);
    nodes.add({ id: rootLabel, label: rootLabel, level: 0 });
    let remainingNodes = nodeCount - 1;
    let currentLevel = 0;

    if (treeType === 'star') {
        for (let i = 0; i < remainingNodes; i++) {
            const childLabel = getNextAvailableLabel(i + 1);
            nodes.add({ id: childLabel, label: childLabel, level: 1 });
            edges.add({
                id: `${rootLabel}-${childLabel}-${Date.now()}`,
                from: rootLabel,
                to: childLabel
            });
        }
        maxLevel = 1;
    } else if (treeType === 'binary') {
        const queue = [{ label: rootLabel, level: 0 }];
        let index = 1;
        while (remainingNodes > 0 && queue.length > 0) {
            const parent = queue.shift();
            const children = Math.min(2, remainingNodes);
            for (let i = 0; i < children; i++) {
                const childLabel = getNextAvailableLabel(index++);
                const childLevel = parent.level + 1;
                nodes.add({ id: childLabel, label: childLabel, level: childLevel });
                edges.add({
                    id: `${parent.label}-${childLabel}-${Date.now()}`,
                    from: parent.label,
                    to: childLabel
                });
                queue.push({ label: childLabel, level: childLevel });
                remainingNodes--;
                maxLevel = Math.max(maxLevel, childLevel);
            }
        }
    } else if (treeType === 'balanced') {
        const maxChildren = Math.ceil(Math.sqrt(nodeCount));
        const queue = [{ label: rootLabel, level: 0 }];
        let index = 1;
        while (remainingNodes > 0 && queue.length > 0) {
            const parent = queue.shift();
            const children = Math.min(maxChildren, remainingNodes);
            for (let i = 0; i < children; i++) {
                const childLabel = getNextAvailableLabel(index++);
                const childLevel = parent.level + 1;
                nodes.add({ id: childLabel, label: childLabel, level: childLevel });
                edges.add({
                    id: `${parent.label}-${childLabel}-${Date.now()}`,
                    from: parent.label,
                    to: childLabel
                });
                queue.push({ label: childLabel, level: childLevel });
                remainingNodes--;
                maxLevel = Math.max(maxLevel, childLevel);
            }
        }
    } else if (treeType === 'random') {
        let index = 1;
        const availableNodes = [{ label: rootLabel, level: 0 }];

        while (remainingNodes > 0 && availableNodes.length > 0) {
            const parentIndex = Math.floor(Math.random() * availableNodes.length);
            const parent = availableNodes[parentIndex];
            const maxChildren = Math.min(4, remainingNodes); // Rritur max fëmijët për pemë më të gjera
            const numChildren = Math.floor(Math.random() * (maxChildren - 1)) + 2; // Minimum 2 fëmijë për gjerësi

            for (let i = 0; i < numChildren; i++) {
                if (remainingNodes <= 0) break;
                const childLabel = getNextAvailableLabel(index++);
                const childLevel = parent.level + 1;
                nodes.add({ id: childLabel, label: childLabel, level: childLevel });
                edges.add({
                    id: `${parent.label}-${childLabel}-${Date.now()}`,
                    from: parent.label,
                    to: childLabel
                });
                availableNodes.push({ label: childLabel, level: childLevel });
                remainingNodes--;
                maxLevel = Math.max(maxLevel, childLevel);
            }

            // Hiq prindin më shpesh për të shmangur pemë të larta
            if (Math.random() < 0.5 || availableNodes.length > remainingNodes * 1.5) {
                availableNodes.splice(parentIndex, 1);
            }
        }
    }

    const scale = adjustTreeLayout(nodeCount, treeType, maxLevel);

    // Animacion për gjenerimin e pemës
    const nodeArray = nodes.get();
    nodeArray.forEach((node, index) => {
        setTimeout(() => {
            network.body.data.nodes.update({ id: node.id, hidden: false });
        }, index * 50);
    });
    const edgeArray = edges.get();
    edgeArray.forEach((edge, index) => {
        setTimeout(() => {
            network.body.data.edges.update({ id: edge.id, hidden: false });
        }, (nodeArray.length + index) * 50);
    });

    updateInfoPanel(nodeCount, edges.length, maxLevel + 1, treeType);
    network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad', scale: scale } });
}

function updateInfoPanel(nodeCount, edgeCount, height, treeType) {
    nodeCountInfo.textContent = nodeCount;
    edgeCountInfo.textContent = edgeCount;
    heightInfo.textContent = height;
    typeInfo.textContent = {
        binary: 'Pemë Binare',
        balanced: 'Pemë e Balancuar',
        star: 'Pemë Yll',
        random: 'Pemë e Rastësishme'
    }[treeType] || '-';
}

function updateTree() {
    let nodeCount = parseInt(nodeCountInput.value);
    const treeType = treeTypeSelect.value;

    if (isNaN(nodeCount) || nodeCount < 0) {
        alert('Numri i nyjeve duhet të jetë 0 ose më i madh!');
        nodeCountInput.value = 0;
        nodeCount = 0;
    } else if (nodeCount > 100) {
        alert('Numri i nyjeve është shumë i madh! Rekomandohet të përdorni deri në 100 nyje për performancë të mirë.');
        nodeCountInput.value = 100;
        nodeCount = 100;
    }

    generateTree(nodeCount, treeType);
}

nodeCountInput.addEventListener('input', updateTree);
treeTypeSelect.addEventListener('change', updateTree);

clearBtn.addEventListener('click', () => {
    nodes.clear();
    edges.clear();
    nodeCountInput.value = 0;
    updateInfoPanel(0, 0, 0, '-');
    adjustTreeLayout(0, 'none', 0);
    network.fit({ animation: true });
});

resetZoomBtn.addEventListener('click', () => {
    network.fit({ animation: true });
});