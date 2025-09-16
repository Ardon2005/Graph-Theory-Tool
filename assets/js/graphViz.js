// Alfabeti për etiketat e nyjeve
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
let selectedNode = null;
let selectedEdge = null;
let history = [];
let redoStack = [];
let lastAction = null;
const showWeights = false; // Vendosur si false dhe nuk ndryshohet më
let adjacencyNetwork = null;
let incidenceNetwork = null;
let edgeCounter = 1;

// Variablat për dy grafet e ndarë
const leftNodes = new vis.DataSet([]);
const leftEdges = new vis.DataSet([]);
const rightNodes = new vis.DataSet([]);
const rightEdges = new vis.DataSet([]);
let leftSelectedNode = null;
let leftSelectedEdge = null;
let rightSelectedNode = null;
let rightSelectedEdge = null;
let leftEdgeCounter = 1;
let rightEdgeCounter = 1;
let isSplit = false;

const container = document.getElementById('graphViz-graphContainer');
const leftContainer = document.getElementById('graphViz-leftGraphContainer');
const rightContainer = document.getElementById('graphViz-rightGraphContainer');
const graphInfo = document.getElementById('graphViz-graphInfo');
const shortestPathInfo = document.getElementById('graphViz-shortestPathInfo');
const clearBtn = document.getElementById('graphViz-clearBtn');
const resetZoomBtn = document.getElementById('graphViz-resetZoomBtn');
const undoBtn = document.getElementById('graphViz-undoBtn');
const redoBtn = document.getElementById('graphViz-redoBtn');
const exportBtn = document.getElementById('graphViz-exportBtn');
const importInput = document.getElementById('graphViz-importInput');
const importBtn = document.getElementById('graphViz-importBtn');
const edgeTypeSelect = document.getElementById('graphViz-edgeType');
const edgeOrientationSelect = document.getElementById('graphViz-edgeOrientation');
const startNodeSelect = document.getElementById('graphViz-startNode');
const endNodeSelect = document.getElementById('graphViz-endNode');
const dijkstraBtn = document.getElementById('graphViz-dijkstraBtn');
const customPopup = document.getElementById('graphViz-customPopup');
const nodeColorPicker = document.getElementById('graphViz-nodeColorPicker');
const edgeColorPicker = document.getElementById('graphViz-edgeColorPicker');
const toggleLabelBtn = document.getElementById('graphViz-toggleLabelBtn');
const adjacencyMatrixBtn = document.getElementById('graphViz-adjacencyMatrixBtn');
const incidenceMatrixBtn = document.getElementById('graphViz-incidenceMatrixBtn');
const createFromMatrixBtn = document.getElementById('graphViz-createFromMatrixBtn');
const createFromIncidenceBtn = document.getElementById('graphViz-createFromIncidenceBtn');
const splitGraphBtn = document.getElementById('graphViz-splitGraphBtn');

// Konfigurimet për nyjet
const nodeStyles = {
    labelsInside: {
        shape: 'circle',
        size: 15,
        font: { size: 14, color: '#ffffff', align: 'center', vadis: 'middle', multi: false },
        color: { border: '#000000', background: '#2B7CE9', highlight: { border: '#000000', background: '#D32F2F' } },
        borderWidth: 2,
        labelHighlightBold: false,
        fixed: { x: false, y: false }
    },
    labelsOutside: {
        shape: 'dot',
        size: 12,
        font: { size: 14, color: '#000000', face: 'Arial', strokeWidth: 2, strokeColor: '#2c3e50' },
        color: { border: '#2c3e50', background: '#3498db', highlight: { border: '#c0392b', background: '#e74c3c' }, hover: { border: '#2c3e50', background: '#5dade2' } },
        borderWidth: 2,
        shadow: { enabled: true, color: 'rgba(0, 0, 0, 0.2)', size: 8, x: 4, y: 4 },
        scaling: { min: 8, max: 20, label: { enabled: true } }
    }
};

let currentNodeStyle = 'labelsInside';

const options = {
    nodes: nodeStyles[currentNodeStyle],
    edges: {
        width: 2,
        smooth: { enabled: true, type: 'cubicBezier', roundness: 1.0 },
        font: { size: 14, color: '#2c3e50', background: '#ffffff', align: 'middle' }
    },
    interaction: { dragNodes: true, selectable: true, zoomView: true, multiselect: false },
    physics: { enabled: false },
    layout: { improvedLayout: false }
};

// Konfigurim i përbashkët për grafët në popup-e
const popupOptions = {
    nodes: nodeStyles[currentNodeStyle],
    edges: {
        width: 2,
        smooth: { enabled: true, type: 'cubicBezier', roundness: 1.0 },
        font: { size: 14, color: '#2c3e50', background: '#ffffff', align: 'middle' }
    },
    interaction: { dragNodes: false, selectable: false, zoomView: false },
    physics: {
        enabled: true,
        stabilization: true
    },
    layout: {
        improvedLayout: true
    }
};

let network = new vis.Network(container, { nodes, edges }, options);
let leftNetwork = null;
let rightNetwork = null;

// Funksion për të ndërruar stilin e nyjeve
function toggleNodeStyle() {
    currentNodeStyle = currentNodeStyle === 'labelsInside' ? 'labelsOutside' : 'labelsInside';
    if (!isSplit) {
        network.setOptions({ nodes: nodeStyles[currentNodeStyle] });
        nodes.update(nodes.get().map(node => ({ id: node.id, color: node.color || { background: nodeColorPicker.value } })));
    } else {
        leftNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
        rightNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
        leftNodes.update(leftNodes.get().map(node => ({ id: node.id, color: node.color || { background: nodeColorPicker.value } })));
        rightNodes.update(rightNodes.get().map(node => ({ id: node.id, color: node.color || { background: nodeColorPicker.value } })));
    }
}

toggleLabelBtn.addEventListener('click', () => {
    toggleNodeStyle();
});

function saveState(actionType) {
    if (!isSplit) {
        history.push({ 
            nodes: [...nodes.get()], 
            edges: [...edges.get()], 
            action: actionType,
            nodeStyle: currentNodeStyle,
            edgeCounter: edgeCounter
        });
    } else {
        history.push({ 
            leftNodes: [...leftNodes.get()], 
            leftEdges: [...leftEdges.get()], 
            rightNodes: [...rightNodes.get()], 
            rightEdges: [...rightEdges.get()], 
            action: actionType,
            nodeStyle: currentNodeStyle,
            leftEdgeCounter: leftEdgeCounter,
            rightEdgeCounter: rightEdgeCounter
        });
    }
    redoStack = [];
    lastAction = actionType;
}

function getEdgeCount(from, to, edgeSet) {
    return edgeSet.get().filter(edge => 
        (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from)
    ).length;
}

function getNextAvailableLabel(nodesSet) {
    const existingLabels = nodesSet.get().map(node => node.label);
    for (let i = 0; i < alphabet.length; i++) {
        if (!existingLabels.includes(alphabet[i])) {
            return alphabet[i];
        }
    }
    return null;
}

function updateNodeSelects() {
    const nodeArray = isSplit ? leftNodes.get().concat(rightNodes.get()) : nodes.get();
    startNodeSelect.innerHTML = '';
    endNodeSelect.innerHTML = '';

    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.text = 'Zgjidh nyjën';
    defaultOption.disabled = true;
    defaultOption.selected = true;
    startNodeSelect.appendChild(defaultOption.cloneNode(true));
    endNodeSelect.appendChild(defaultOption.cloneNode(true));

    nodeArray.forEach(node => {
        const option = document.createElement('option');
        option.value = node.id;
        option.text = node.label;
        startNodeSelect.appendChild(option.cloneNode(true));
        endNodeSelect.appendChild(option.cloneNode(true));
    });
}

function setupNetworkEvents(networkInstance, nodesSet, edgesSet, selectedNodeVarName, selectedEdgeVarName, edgeCounterVarName) {
    networkInstance.on('click', (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            if (window[selectedNodeVarName]) {
                saveState('graphChange');
                const edgeType = edgeTypeSelect.value;
                const edgeDirection = edgeOrientationSelect.value;
                const edgeCount = getEdgeCount(window[selectedNodeVarName], nodeId, edgesSet);
                let smoothConfig;
            
                if (edgeType === 'curved') {
                    smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.5 };
                } else {
                    smoothConfig = { enabled: false };
                }
            
                const edge = {
                    id: `${window[selectedNodeVarName]}-${nodeId}-${Date.now()}`,
                    from: window[selectedNodeVarName],
                    to: nodeId,
                    smooth: smoothConfig,
                    selfReference: window[selectedNodeVarName] === nodeId ? { size: 20, angle: Math.PI / 2 } : undefined,
                    color: { color: edgeColorPicker.value }
                };
            
                if (edgeDirection === 'directed') {
                    edge.arrows = { to: { enabled: true } };
                }
            
                edgesSet.add(edge);
                window[selectedNodeVarName] = null;
                window[selectedEdgeVarName] = null;
                networkInstance.unselectAll();
                analyzeGraph();
            
            } else {
                window[selectedNodeVarName] = nodeId;
                window[selectedEdgeVarName] = null;
                networkInstance.selectNodes([nodeId]);
            }
        } else if (params.edges.length > 0) {
            window[selectedEdgeVarName] = params.edges[0];
            window[selectedNodeVarName] = null;
            networkInstance.selectEdges([window[selectedEdgeVarName]]);
            
            const edge = edgesSet.get(window[selectedEdgeVarName]);
            const currentWeight = edge.weight || '';
            const weight = prompt(`Shkruaj peshën për lidhjen ${edge.label || 'pa emër'}:`, currentWeight);
            if (weight !== null) {
                saveState('graphChange');
                const parsedWeight = parseFloat(weight);
                if (!isNaN(parsedWeight) && parsedWeight >= 0) {
                    edgesSet.update({ 
                        id: window[selectedEdgeVarName], 
                        weight: parsedWeight,
                        label: String(parsedWeight)
                    });
                } else if (weight === '') {
                    edgesSet.update({ 
                        id: window[selectedEdgeVarName], 
                        weight: undefined,
                        label: undefined
                    });
                } else {
                    showCustomPopup('Pesha duhet të jetë një numër pozitiv!');
                }
                analyzeGraph();
            }
        } else if (params.pointer.canvas) {
            const nextLabel = getNextAvailableLabel(nodesSet);
            if (nextLabel) {
                saveState('graphChange');
                const { x, y } = params.pointer.canvas;
                nodesSet.add({ 
                    id: nextLabel, 
                    label: nextLabel, 
                    x, 
                    y, 
                    color: { background: nodeColorPicker.value }
                });
                window[selectedNodeVarName] = null;
                window[selectedEdgeVarName] = null;
                networkInstance.unselectAll();
                analyzeGraph();
            }
        }
    });

    networkInstance.on('dragEnd', (params) => {
        if (params.nodes.length > 0) {
            saveState('graphChange');
            analyzeGraph();
        }
    });

    networkInstance.on('oncontext', (params) => {
        params.event.preventDefault();
        const nodeId = networkInstance.getNodeAt(params.pointer.DOM);
        const edgeId = networkInstance.getEdgeAt(params.pointer.DOM);

        if (nodeId || edgeId) {
            saveState('graphChange');
            if (nodeId) {
                const connectedEdges = edgesSet.get().filter(edge => edge.from === nodeId || edge.to === nodeId);
                connectedEdges.forEach(edge => edgesSet.remove(edge.id));
                nodesSet.remove(nodeId);
                if (window[selectedNodeVarName] === nodeId) window[selectedNodeVarName] = null;
                networkInstance.unselectAll();
            } else if (edgeId) {
                edgesSet.remove(edgeId);
                if (window[selectedEdgeVarName] === edgeId) window[selectedEdgeVarName] = null;
            }
            analyzeGraph();
        }
    });
}

setupNetworkEvents(network, nodes, edges, 'selectedNode', 'selectedEdge', 'edgeCounter');

clearBtn.addEventListener('click', () => {
    saveState('graphChange');
    if (!isSplit) {
        nodes.clear();
        edges.clear();
        selectedNode = null;
        selectedEdge = null;
        network.unselectAll();
        edgeCounter = 1;
    } else {
        leftNodes.clear();
        leftEdges.clear();
        rightNodes.clear();
        rightEdges.clear();
        leftSelectedNode = null;
        leftSelectedEdge = null;
        rightSelectedNode = null;
        rightSelectedEdge = null;
        leftNetwork.unselectAll();
        rightNetwork.unselectAll();
        leftEdgeCounter = 1;
        rightEdgeCounter = 1;
    }
    graphInfo.innerHTML = '';
    shortestPathInfo.innerHTML = '';
    analyzeGraph();
});

resetZoomBtn.addEventListener('click', () => {
    if (!isSplit) {
        network.fit({ animation: true });
    } else {
        leftNetwork.fit({ animation: true });
        rightNetwork.fit({ animation: true });
    }
});

undoBtn.addEventListener('click', () => {
    if (history.length > 0) {
        const currentState = isSplit ? { 
            leftNodes: [...leftNodes.get()], 
            leftEdges: [...leftEdges.get()], 
            rightNodes: [...rightNodes.get()], 
            rightEdges: [...rightEdges.get()], 
            action: lastAction,
            nodeStyle: currentNodeStyle,
            leftEdgeCounter: leftEdgeCounter,
            rightEdgeCounter: rightEdgeCounter
        } : { 
            nodes: [...nodes.get()], 
            edges: [...edges.get()], 
            action: lastAction,
            nodeStyle: currentNodeStyle,
            edgeCounter: edgeCounter
        };
        redoStack.push(currentState);
        
        const lastState = history.pop();
        if (lastState.action === 'highlight') {
            if (!isSplit) {
                nodes.update(nodes.get().map(n => ({ id: n.id, color: n.color || { background: '#2B7CE9' } })));
                edges.update(edges.get().map(e => ({ id: e.id, color: e.color || null })));
            } else {
                leftNodes.update(leftNodes.get().map(n => ({ id: n.id, color: n.color || { background: '#2B7CE9' } })));
                leftEdges.update(leftEdges.get().map(e => ({ id: e.id, color: e.color || null })));
                rightNodes.update(rightNodes.get().map(n => ({ id: n.id, color: n.color || { background: '#2B7CE9' } })));
                rightEdges.update(rightEdges.get().map(e => ({ id: e.id, color: e.color || null })));
            }
            shortestPathInfo.innerHTML = '';
            lastAction = history.length > 0 ? history[history.length - 1].action : null;
        } else {
            if (!isSplit) {
                nodes.clear();
                edges.clear();
                nodes.add(lastState.nodes);
                edges.add(lastState.edges);
                selectedNode = null;
                selectedEdge = null;
                currentNodeStyle = lastState.nodeStyle;
                edgeCounter = lastState.edgeCounter;
                network.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                network.unselectAll();
            } else {
                leftNodes.clear();
                leftEdges.clear();
                rightNodes.clear();
                rightEdges.clear();
                leftNodes.add(lastState.leftNodes);
                leftEdges.add(lastState.leftEdges);
                rightNodes.add(lastState.rightNodes);
                rightEdges.add(lastState.rightEdges);
                leftSelectedNode = null;
                leftSelectedEdge = null;
                rightSelectedNode = null;
                rightSelectedEdge = null;
                currentNodeStyle = lastState.nodeStyle;
                leftEdgeCounter = lastState.leftEdgeCounter;
                rightEdgeCounter = lastState.rightEdgeCounter;
                leftNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                rightNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                leftNetwork.unselectAll();
                rightNetwork.unselectAll();
            }
            analyzeGraph();
            lastAction = lastState.action;
        }
    }
});

redoBtn.addEventListener('click', () => {
    if (redoStack.length > 0) {
        const currentState = isSplit ? { 
            leftNodes: [...leftNodes.get()], 
            leftEdges: [...leftEdges.get()], 
            rightNodes: [...rightNodes.get()], 
            rightEdges: [...rightEdges.get()], 
            action: lastAction,
            nodeStyle: currentNodeStyle,
            leftEdgeCounter: leftEdgeCounter,
            rightEdgeCounter: rightEdgeCounter
        } : { 
            nodes: [...nodes.get()], 
            edges: [...edges.get()], 
            action: lastAction,
            nodeStyle: currentNodeStyle,
            edgeCounter: edgeCounter
        };
        history.push(currentState);

        const nextState = redoStack.pop();
        if (nextState.action === 'highlight') {
            findShortestPath();
            lastAction = 'highlight';
        } else {
            if (!isSplit) {
                nodes.clear();
                edges.clear();
                nodes.add(nextState.nodes);
                edges.add(nextState.edges);
                selectedNode = null;
                selectedEdge = null;
                currentNodeStyle = nextState.nodeStyle;
                edgeCounter = nextState.edgeCounter;
                network.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                network.unselectAll();
            } else {
                leftNodes.clear();
                leftEdges.clear();
                rightNodes.clear();
                rightEdges.clear();
                leftNodes.add(nextState.leftNodes);
                leftEdges.add(nextState.leftEdges);
                rightNodes.add(nextState.rightNodes);
                rightEdges.add(nextState.rightEdges);
                leftSelectedNode = null;
                leftSelectedEdge = null;
                rightSelectedNode = null;
                rightSelectedEdge = null;
                currentNodeStyle = nextState.nodeStyle;
                leftEdgeCounter = nextState.leftEdgeCounter;
                rightEdgeCounter = nextState.rightEdgeCounter;
                leftNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                rightNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                leftNetwork.unselectAll();
                rightNetwork.unselectAll();
            }
            analyzeGraph();
            lastAction = nextState.action;
        }
    }
});

async function exportGraph() {
    if (!isSplit) {
        const nodeData = nodes.get();
        const edgeData = edges.get();

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'graph',
                    types: [
                        { description: 'JSON File', accept: { 'application/json': ['.json'] } },
                        { description: 'PNG Image', accept: { 'image/png': ['.png'] } }
                    ]
                });

                const fileName = handle.name.toLowerCase();
                const writable = await handle.createWritable();

                if (fileName.endsWith('.json')) {
                    const data = JSON.stringify({ 
                        nodes: nodeData, 
                        edges: edgeData, 
                        selectedNode, 
                        selectedEdge,
                        nodeStyle: currentNodeStyle,
                        edgeCounter: edgeCounter
                    });
                    const blob = new Blob([data], { type: 'application/json' });
                    await writable.write(blob);
                } else if (fileName.endsWith('.png')) {
                    const canvas = container.getElementsByTagName('canvas')[0];
                    const dataURL = canvas.toDataURL('image/png');
                    const blob = dataURLtoBlob(dataURL);
                    await writable.write(blob);
                }

                await writable.close();
            } catch (err) {
                console.error('Ruajtja u anulua ose dështoi:', err);
            }
        } else {
            const choice = confirm('Shfletuesi juaj nuk mbështet dritaren e ruajtjes. Dëshironi të shkarkoni si JSON?');
            if (choice) {
                const data = JSON.stringify({ 
                    nodes: nodeData, 
                    edges: edgeData, 
                    selectedNode, 
                    selectedEdge,
                    nodeStyle: currentNodeStyle,
                    edgeCounter: edgeCounter
                });
                const jsonBlob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(jsonBlob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'graph.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                alert('Ju lutemi përdorni një shfletues që mbështet File System Access API për më shumë opsione (p.sh., Chrome ose Edge).');
            }
        }
    } else {
        const leftNodeData = leftNodes.get();
        const leftEdgeData = leftEdges.get();
        const rightNodeData = rightNodes.get();
        const rightEdgeData = rightEdges.get();

        if (window.showSaveFilePicker) {
            try {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'split_graph',
                    types: [{ description: 'JSON File', accept: { 'application/json': ['.json'] } }]
                });

                const fileName = handle.name.toLowerCase();
                const writable = await handle.createWritable();

                if (fileName.endsWith('.json')) {
                    const data = JSON.stringify({ 
                        leftNodes: leftNodeData, 
                        leftEdges: leftEdgeData, 
                        rightNodes: rightNodeData, 
                        rightEdges: rightEdgeData, 
                        leftSelectedNode, 
                        leftSelectedEdge,
                        rightSelectedNode, 
                        rightSelectedEdge,
                        nodeStyle: currentNodeStyle,
                        leftEdgeCounter: leftEdgeCounter,
                        rightEdgeCounter: rightEdgeCounter
                    });
                    const blob = new Blob([data], { type: 'application/json' });
                    await writable.write(blob);
                }

                await writable.close();
            } catch (err) {
                console.error('Ruajtja u anulua ose dështoi:', err);
            }
        } else {
            const data = JSON.stringify({ 
                leftNodes: leftNodeData, 
                leftEdges: leftEdgeData, 
                rightNodes: rightNodeData, 
                rightEdges: rightEdgeData, 
                leftSelectedNode, 
                leftSelectedEdge,
                rightSelectedNode, 
                rightSelectedEdge,
                nodeStyle: currentNodeStyle,
                leftEdgeCounter: leftEdgeCounter,
                rightEdgeCounter: rightEdgeCounter
            });
            const jsonBlob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(jsonBlob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'split_graph.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }
    }
}

function dataURLtoBlob(dataURL) {
    const arr = dataURL.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
}

exportBtn.addEventListener('click', () => {
    exportGraph();
});

importBtn.addEventListener('click', () => {
    importInput.click();
});

importInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        saveState('graphChange');
        const reader = new FileReader();
        reader.onload = (event) => {
            const data = JSON.parse(event.target.result);
            if (data.leftNodes) {
                isSplit = true;
                container.style.display = 'none';
                leftContainer.style.display = 'inline-block';
                rightContainer.style.display = 'inline-block';
                
                leftNodes.clear();
                leftEdges.clear();
                rightNodes.clear();
                rightEdges.clear();
                leftNodes.add(data.leftNodes);
                leftEdges.add(data.leftEdges);
                rightNodes.add(data.rightNodes);
                rightEdges.add(data.rightEdges);
                leftSelectedNode = data.leftSelectedNode || null;
                leftSelectedEdge = data.leftSelectedEdge || null;
                rightSelectedNode = data.rightSelectedNode || null;
                rightSelectedEdge = data.rightSelectedEdge || null;
                currentNodeStyle = data.nodeStyle || 'labelsInside';
                leftEdgeCounter = data.leftEdgeCounter || 1;
                rightEdgeCounter = data.rightEdgeCounter || 1;

                if (!leftNetwork) {
                    leftNetwork = new vis.Network(leftContainer, { nodes: leftNodes, edges: leftEdges }, options);
                    setupNetworkEvents(leftNetwork, leftNodes, leftEdges, 'leftSelectedNode', 'leftSelectedEdge', 'leftEdgeCounter');
                }
                if (!rightNetwork) {
                    rightNetwork = new vis.Network(rightContainer, { nodes: rightNodes, edges: rightEdges }, options);
                    setupNetworkEvents(rightNetwork, rightNodes, rightEdges, 'rightSelectedNode', 'rightSelectedEdge', 'rightEdgeCounter');
                }
                leftNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                rightNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                leftNetwork.unselectAll();
                rightNetwork.unselectAll();
            } else {
                isSplit = false;
                container.style.display = 'block';
                leftContainer.style.display = 'none';
                rightContainer.style.display = 'none';
                nodes.clear();
                edges.clear();
                nodes.add(data.nodes);
                edges.add(data.edges);
                selectedNode = data.selectedNode || null;
                selectedEdge = data.selectedEdge || null;
                currentNodeStyle = data.nodeStyle || 'labelsInside';
                edgeCounter = data.edgeCounter || 1;
                network.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                network.unselectAll();
            }
            analyzeGraph();
        };
        reader.readAsText(file);
    }
});

function findShortestPath() {
    const nodeArray = isSplit ? leftNodes.get() : nodes.get();
    const edgeArray = isSplit ? leftEdges.get() : edges.get();

    if (nodeArray.length < 2) {
        showCustomPopup('Duhet të ketë të paktën 2 nyje për të gjetur shtegun.');
        shortestPathInfo.innerHTML = '';
        return;
    }

    const startNodeId = startNodeSelect.value;
    const endNodeId = endNodeSelect.value;

    if (!startNodeId || !endNodeId) {
        showCustomPopup('Zgjidhni nyje fillestare dhe fundore.');
        shortestPathInfo.innerHTML = '';
        return;
    }

    const startNode = nodeArray.find(n => n.id === startNodeId);
    const endNode = nodeArray.find(n => n.id === endNodeId);

    const queue = [startNode.id];
    const visited = new Set([startNode.id]);
    const prev = new Map();

    while (queue.length > 0) {
        const current = queue.shift();

        const neighbors = edgeArray.reduce((acc, edge) => {
            if (edge.from === current) {
                if (edge.arrows && edge.arrows.to.enabled) {
                    acc.push(edge.to);
                } else {
                    acc.push(edge.to);
                }
            } else if (edge.to === current && (!edge.arrows || !edge.arrows.to.enabled)) {
                acc.push(edge.from);
            }
            return acc;
        }, []);

        for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
                prev.set(neighbor, current);
            }
        }

        if (current === endNode.id) break;
    }

    const path = [];
    let current = endNode.id;
    while (current !== undefined) {
        path.unshift(nodeArray.find(n => n.id === current).label);
        current = prev.get(current);
    }

    saveState('highlight');
    if (!isSplit) {
        nodes.update(nodeArray.map(n => ({ id: n.id, color: n.color || { background: '#2B7CE9' } })));
        edges.update(edgeArray.map(e => ({ id: e.id, color: e.color || null })));
    } else {
        leftNodes.update(leftNodes.get().map(n => ({ id: n.id, color: n.color || { background: '#2B7CE9' } })));
        leftEdges.update(leftEdges.get().map(e => ({ id: e.id, color: e.color || null })));
    }

    let info = '<h3>Shtegu më i Shkurtër</h3>';
    info += '<table>';
    if (path[0] !== startNode.label) {
        showCustomPopup(`Nuk ekziston shteg nga ${startNode.label} në ${endNode.label}.`);
        info += `<tr><td colspan="2">Nuk ekziston shteg nga ${startNode.label} në ${endNode.label}.</td></tr>`;
    } else {
        info += `<tr><td>Nga</td><td>${startNode.label} në ${endNode.label}</td></tr>`;
        info += `<tr><td>Shtegu</td><td>${path.join(' → ')}</td></tr>`;
        info += `<tr><td>Gjatësia</td><td>${path.length - 1} hapa</td></tr>`;

        for (let i = 0; i < path.length - 1; i++) {
            const fromLabel = path[i];
            const toLabel = path[i + 1];
            const fromId = nodeArray.find(n => n.label === fromLabel).id;
            const toId = nodeArray.find(n => n.label === toLabel).id;

            if (!isSplit) {
                nodes.update({ id: fromId, color: { background: '#27ae60', border: '#2c3e50' } });
                nodes.update({ id: toId, color: { background: '#27ae60', border: '#2c3e50' } });

                const edge = edgeArray.find(e => 
                    (e.from === fromId && e.to === toId) || 
                    (!e.arrows && e.from === toId && e.to === fromId)
                );
                if (edge) {
                    edges.update({ id: edge.id, color: { color: '#27ae60' }, width: 3 });
                }
            } else {
                leftNodes.update({ id: fromId, color: { background: '#27ae60', border: '#2c3e50' } });
                leftNodes.update({ id: toId, color: { background: '#27ae60', border: '#2c3e50' } });

                const edge = leftEdges.get().find(e => 
                    (e.from === fromId && e.to === toId) || 
                    (!e.arrows && e.from === toId && e.to === fromId)
                );
                if (edge) {
                    leftEdges.update({ id: edge.id, color: { color: '#27ae60' }, width: 3 });
                }
            }
        }
    }
    info += '</table>';
    shortestPathInfo.innerHTML = info;
}

dijkstraBtn.addEventListener('click', () => {
    findShortestPath();
});

function showCustomPopup(message) {
    customPopup.textContent = message;
    customPopup.classList.add('graphViz-show');
    setTimeout(() => {
        customPopup.classList.remove('graphViz-show');
    }, 3000);
}

// Funksion për llogaritjen e matricës së fqinjësisë
function computeAdjacencyMatrix(nodeArray, edgeArray) {
    const directed = edgeOrientationSelect.value === 'directed';
    const n = nodeArray.length;
    const matrix = Array(n).fill().map(() => Array(n).fill(0));
    const labels = nodeArray.map(node => node.label).sort();

    edgeArray.forEach(edge => {
        const fromIdx = labels.indexOf(nodeArray.find(n => n.id === edge.from).label);
        const toIdx = labels.indexOf(nodeArray.find(n => n.id === edge.to).label);

        if (fromIdx !== -1 && toIdx !== -1) {
            matrix[fromIdx][toIdx] += 1;
            if (!directed && fromIdx !== toIdx) {
                matrix[toIdx][fromIdx] += 1;
            }
        }
    });

    return { matrix, labels };
}

// Funksion për llogaritjen e matricës së incidencës
function computeIncidenceMatrix(nodeArray, edgeArray) {
    const directed = edgeOrientationSelect.value === 'directed';
    const n = nodeArray.length;
    const m = edgeArray.length;
    const matrix = Array(n).fill().map(() => Array(m).fill(0));
    const nodeLabels = nodeArray.map(node => node.label).sort();
    const edgeLabels = edgeArray.map((edge, idx) => `e${idx + 1}`);

    edgeArray.forEach((edge, edgeIdx) => {
        const fromIdx = nodeLabels.indexOf(nodeArray.find(n => n.id === edge.from).label);
        const toIdx = nodeLabels.indexOf(nodeArray.find(n => n.id === edge.to).label);

        if (fromIdx !== -1 && toIdx !== -1) {
            if (directed) {
                matrix[fromIdx][edgeIdx] = 1;  // Nyja fillestare
                matrix[toIdx][edgeIdx] = -1;   // Nyja përfundimtare
            } else {
                matrix[fromIdx][edgeIdx] = 1;
                matrix[toIdx][edgeIdx] = 1;
                if (fromIdx === toIdx) {
                    matrix[fromIdx][edgeIdx] = 2; // Lak (loop)
                }
            }
        }
    });

    return { matrix, nodeLabels, edgeLabels };
}

// Funksion për të shfaqur popup-in e matricës së fqinjësisë
function showAdjacencyPopup() {
    const nodeArray = isSplit ? leftNodes.get() : nodes.get();
    const edgeArray = isSplit ? leftEdges.get() : edges.get();

    if (nodeArray.length === 0) {
        showCustomPopup('Shto të paktën një nyje për të parë matricën e fqinjësisë.');
        return;
    }

    const { matrix, labels } = computeAdjacencyMatrix(nodeArray, edgeArray);
    const adjacencyPopup = document.getElementById('adjacencyPopup');
    const table = document.getElementById('adjacencyMatrixTable');

    let html = '<tr><th></th>';
    labels.forEach(label => html += `<th>${label}</th>`);
    html += '</tr>';

    matrix.forEach((row, i) => {
        html += `<tr><th>${labels[i]}</th>`;
        row.forEach(cell => html += `<td>${cell}</td>`);
        html += '</tr>';
    });

    table.innerHTML = html;

    const adjacencyContainer = document.getElementById('adjacencyGraphContainer');
    const adjacencyNodes = new vis.DataSet(nodeArray.map(node => ({ ...node })));
    const adjacencyEdges = new vis.DataSet(edgeArray.map(edge => ({ ...edge })));
    adjacencyNetwork = new vis.Network(adjacencyContainer, { nodes: adjacencyNodes, edges: adjacencyEdges }, popupOptions);

    // Qendërzimi automatik pas stabilizimit
    adjacencyNetwork.on("stabilized", function () {
        adjacencyNetwork.fit({
            animation: {
                duration: 500,
                easingFunction: "easeInOutQuad"
            }
        });
    });

    // Qendërzim fillestar me vonesë për t’u siguruar që grafi është gati
    setTimeout(() => {
        adjacencyNetwork.fit();
    }, 100);

    adjacencyPopup.style.display = 'block';
}

adjacencyMatrixBtn.addEventListener('click', () => {
    showAdjacencyPopup();
    const closeBtn = document.querySelector('#adjacencyPopup .close-btn');
    closeBtn.addEventListener('click', () => {
        document.getElementById('adjacencyPopup').style.display = 'none';
        if (adjacencyNetwork) {
            adjacencyNetwork.destroy();
            adjacencyNetwork = null;
        }
    }, { once: true });
});

// Funksion për të shfaqur popup-in e matricës së incidencës
function showIncidencePopup() {
    const nodeArray = isSplit ? leftNodes.get() : nodes.get();
    const edgeArray = isSplit ? leftEdges.get() : edges.get();

    if (nodeArray.length === 0 || edgeArray.length === 0) {
        showCustomPopup('Shto të paktën dy nyje dhe një lidhje për të parë matricën e incidencës.');
        return;
    }

    const { matrix, nodeLabels, edgeLabels } = computeIncidenceMatrix(nodeArray, edgeArray);
    const incidencePopup = document.getElementById('incidencePopup');
    const table = document.getElementById('incidenceMatrixTable');

    let html = '<tr><th></th>';
    edgeLabels.forEach(label => html += `<th>${label}</th>`);
    html += '</tr>';

    matrix.forEach((row, i) => {
        html += `<tr><th>${nodeLabels[i]}</th>`;
        row.forEach(cell => html += `<td>${cell}</td>`);
        html += '</tr>';
    });

    table.innerHTML = html;

    const incidenceContainer = document.getElementById('incidenceGraphContainer');
    const incidenceNodes = new vis.DataSet(nodeArray.map(node => ({ ...node })));
    const incidenceEdges = new vis.DataSet(edgeArray.map(edge => ({ ...edge })));
    incidenceNetwork = new vis.Network(incidenceContainer, { nodes: incidenceNodes, edges: incidenceEdges }, popupOptions);

    // Qendërzimi automatik pas stabilizimit
    incidenceNetwork.on("stabilized", function () {
        incidenceNetwork.fit({
            animation: {
                duration: 500,
                easingFunction: "easeInOutQuad"
            }
        });
    });

    // Qendërzim fillestar me vonesë
    setTimeout(() => {
        incidenceNetwork.fit();
    }, 100);

    incidencePopup.style.display = 'block';
}

incidenceMatrixBtn.addEventListener('click', () => {
    showIncidencePopup();
    const closeBtn = document.querySelector('#incidencePopup .close-btn');
    closeBtn.addEventListener('click', () => {
        document.getElementById('incidencePopup').style.display = 'none';
        if (incidenceNetwork) {
            incidenceNetwork.destroy();
            incidenceNetwork = null;
        }
    }, { once: true });
});

// Funksion për të shfaqur popup-in për krijimin nga matrica e fqinjësisë
function showMatrixInputPopup() {
    const matrixInputPopup = document.getElementById('matrixInputPopup');
    const table = document.getElementById('matrixTable');
    let previewNodes = new vis.DataSet([]);
    let previewEdges = new vis.DataSet([]);
    let previewNetwork = null;

    function generateMatrixTable(size) {
        const labels = alphabet.slice(0, size);
        let html = '<tr><th></th>';
        labels.forEach(label => html += `<th>${label}</th>`);
        html += '</tr>';

        for (let i = 0; i < size; i++) {
            html += `<tr><th>${labels[i]}</th>`;
            for (let j = 0; j < size; j++) {
                html += `<td><input type="number" min="0" value="0" data-row="${i}" data-col="${j}" style="width: 40px;"></td>`;
            }
            html += '</tr>';
        }

        table.innerHTML = html;

        previewNodes.clear();
        previewEdges.clear();
        labels.forEach((label, i) => {
            previewNodes.add({
                id: label,
                label: label,
                x: 100 * Math.cos(2 * Math.PI * i / size),
                y: 100 * Math.sin(2 * Math.PI * i / size),
                color: { background: nodeColorPicker.value }
            });
        });

        const previewContainer = document.getElementById('matrixGraphPreview');
        if (!previewNetwork) {
            previewNetwork = new vis.Network(previewContainer, { nodes: previewNodes, edges: previewEdges }, popupOptions);
            // Qendërzimi pas stabilizimit
            previewNetwork.on("stabilized", function () {
                previewNetwork.fit({
                    animation: {
                        duration: 500,
                        easingFunction: "easeInOutQuad"
                    }
                });
            });
            // Qendërzim fillestar me vonesë
            setTimeout(() => {
                previewNetwork.fit();
            }, 100);
        }

        document.querySelectorAll('#matrixTable input').forEach(input => {
            input.addEventListener('input', updatePreviewGraph);
        });
    }

    function updatePreviewGraph() {
        const sizeInput = document.getElementById('matrixSize');
        const size = parseInt(sizeInput.value);
        const labels = alphabet.slice(0, size);
        const matrixInputs = document.querySelectorAll('#matrixTable input');
        const matrix = Array(size).fill().map(() => Array(size).fill(0));
        const directed = edgeOrientationSelect.value === 'directed';
        const edgeType = edgeTypeSelect.value;

        matrixInputs.forEach(input => {
            const row = parseInt(input.dataset.row);
            const col = parseInt(input.dataset.col);
            const value = parseInt(input.value) || 0;
            if (value < 0) return;
            matrix[row][col] = value;
        });

        previewEdges.clear();
        for (let i = 0; i < size; i++) {
            for (let j = directed ? 0 : i; j < size; j++) {
                let numEdges = matrix[i][j];
                if (!directed) {
                    numEdges = Math.min(matrix[i][j], matrix[j][i]);
                }

                if (numEdges > 0) {
                    const from = labels[i];
                    const to = labels[j];
                    for (let k = 0; k < numEdges; k++) {
                        let smoothConfig = { enabled: false };
                        if (edgeType === 'curved' || numEdges > 1 || from === to) {
                            smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.2 + (k * 0.2) };
                        }

                        const edge = {
                            id: `${from}-${to}-${k}-${Date.now()}`,
                            from: from,
                            to: to,
                            smooth: smoothConfig,
                            selfReference: from === to ? { size: 20 + k * 10, angle: Math.PI / 2 } : undefined,
                            color: { color: edgeColorPicker.value }
                        };

                        if (directed) {
                            edge.arrows = { to: { enabled: true } };
                        }

                        previewEdges.add(edge);
                    }
                }
            }
        }
        // Qendërzim pas çdo përditësimi
        setTimeout(() => {
            previewNetwork.fit();
        }, 100);
    }

    generateMatrixTable(5);
    matrixInputPopup.style.display = 'block';

    const updateBtn = document.getElementById('updateMatrixSizeBtn');
    updateBtn.addEventListener('click', () => {
        const sizeInput = document.getElementById('matrixSize');
        let size = parseInt(sizeInput.value);
        if (isNaN(size) || size < 1 || size > 26) {
            showCustomPopup('Numri i nyjeve duhet të jetë midis 1 dhe 26!');
            sizeInput.value = 5;
            size = 5;
        }
        generateMatrixTable(size);
    }, { once: true });

    const generateBtn = document.getElementById('generateGraphBtn');
    generateBtn.addEventListener('click', () => {
        const sizeInput = document.getElementById('matrixSize');
        const size = parseInt(sizeInput.value);
        const labels = alphabet.slice(0, size);
        const matrixInputs = document.querySelectorAll('#matrixTable input');
        const matrix = Array(size).fill().map(() => Array(size).fill(0));

        matrixInputs.forEach(input => {
            const row = parseInt(input.dataset.row);
            const col = parseInt(input.dataset.col);
            const value = parseInt(input.value) || 0;
            if (value < 0) {
                showCustomPopup('Vlerat duhet të jenë numra pozitivë ose zero!');
                return;
            }
            matrix[row][col] = value;
        });

        const directed = edgeOrientationSelect.value === 'directed';
        if (!directed) {
            for (let i = 0; i < size; i++) {
                for (let j = 0; j < size; j++) {
                    if (matrix[i][j] !== matrix[j][i]) {
                        showCustomPopup('Për graf të padrejtuar, matrica duhet të jetë simetrike!');
                        return;
                    }
                }
            }
        }

        generateGraphFromMatrix(matrix, labels);
        matrixInputPopup.style.display = 'none';
        if (previewNetwork) {
            previewNetwork.destroy();
            previewNetwork = null;
        }
    }, { once: true });

    const closeBtn = document.querySelector('#matrixInputPopup .close-btn');
    closeBtn.addEventListener('click', () => {
        matrixInputPopup.style.display = 'none';
        if (previewNetwork) {
            previewNetwork.destroy();
            previewNetwork = null;
        }
    }, { once: true });
}

createFromMatrixBtn.addEventListener('click', () => {
    showMatrixInputPopup();
});

// Funksion për të shfaqur popup-in për krijimin nga matrica e incidencës
function showIncidenceInputPopup() {
    const incidenceInputPopup = document.getElementById('incidenceInputPopup');
    const table = document.getElementById('incidenceTable');
    let previewNodes = new vis.DataSet([]);
    let previewEdges = new vis.DataSet([]);
    let previewNetwork = null;

    function generateIncidenceTable(nodeCount, edgeCount) {
        const nodeLabels = alphabet.slice(0, nodeCount);
        const edgeLabels = Array.from({ length: edgeCount }, (_, i) => `e${i + 1}`);
        let html = '<tr><th></th>';
        edgeLabels.forEach(label => html += `<th>${label}</th>`);
        html += '</tr>';

        for (let i = 0; i < nodeCount; i++) {
            html += `<tr><th>${nodeLabels[i]}</th>`;
            for (let j = 0; j < edgeCount; j++) {
                html += `<td><input type="number" min="-1" max="2" value="0" data-row="${i}" data-col="${j}" style="width: 40px;"></td>`;
            }
            html += '</tr>';
        }

        table.innerHTML = html;

        previewNodes.clear();
        previewEdges.clear();
        nodeLabels.forEach((label, i) => {
            previewNodes.add({
                id: label,
                label: label,
                x: 100 * Math.cos(2 * Math.PI * i / nodeCount),
                y: 100 * Math.sin(2 * Math.PI * i / nodeCount),
                color: { background: nodeColorPicker.value }
            });
        });

        const previewContainer = document.getElementById('incidenceGraphPreview');
        if (!previewNetwork) {
            previewNetwork = new vis.Network(previewContainer, { nodes: previewNodes, edges: previewEdges }, popupOptions);
            // Qendërzimi pas stabilizimit
            previewNetwork.on("stabilized", function () {
                previewNetwork.fit({
                    animation: {
                        duration: 500,
                        easingFunction: "easeInOutQuad"
                    }
                });
            });
            // Qendërzim fillestar me vonesë
            setTimeout(() => {
                previewNetwork.fit();
            }, 100);
        }

        document.querySelectorAll('#incidenceTable input').forEach(input => {
            input.addEventListener('input', updatePreviewGraph);
        });
    }

    function updatePreviewGraph() {
        const nodeInput = document.getElementById('nodeCount');
        const edgeInput = document.getElementById('edgeCount');
        const nodeCount = parseInt(nodeInput.value);
        const edgeCount = parseInt(edgeInput.value);
        const labels = alphabet.slice(0, nodeCount);
        const matrixInputs = document.querySelectorAll('#incidenceTable input');
        const matrix = Array(nodeCount).fill().map(() => Array(edgeCount).fill(0));
        const edgeType = edgeTypeSelect.value;

        matrixInputs.forEach(input => {
            const row = parseInt(input.dataset.row);
            const col = parseInt(input.dataset.col);
            const value = parseInt(input.value) || 0;
            if (value < -1 || value > 2) return;
            matrix[row][col] = value;
        });

        const hasNegativeOne = matrix.some(row => row.some(val => val === -1));
        if (hasNegativeOne) {
            edgeOrientationSelect.value = 'directed';
        } else {
            edgeOrientationSelect.value = 'undirected';
        }

        previewEdges.clear();
        const edgeCounterMap = {};

        for (let j = 0; j < edgeCount; j++) {
            let fromNode = null;
            let toNode = null;
            let onesCount = 0;
            let hasNegativeOneInColumn = matrix.some(row => row[j] === -1);
            let isDirected = hasNegativeOneInColumn;

            for (let i = 0; i < nodeCount; i++) {
                if (matrix[i][j] === 1) {
                    if (fromNode === null) {
                        fromNode = labels[i];
                    } else if (!hasNegativeOneInColumn && toNode === null) {
                        toNode = labels[i];
                    }
                    onesCount++;
                } else if (matrix[i][j] === -1 && isDirected) {
                    toNode = labels[i];
                } else if (matrix[i][j] === 2) {
                    fromNode = labels[i];
                    toNode = labels[i];
                    isDirected = false;
                }
            }

            if (isDirected) {
                if (!fromNode || !toNode) continue;
            } else {
                if (onesCount !== 2 && matrix.every(row => row[j] !== 2)) continue;
            }

            if (fromNode && toNode) {
                const edgeKey = isDirected ? `${fromNode}-${toNode}` : `${Math.min(fromNode, toNode)}-${Math.max(fromNode, toNode)}`;
                edgeCounterMap[edgeKey] = (edgeCounterMap[edgeKey] || 0) + 1;
                const edgeCountBetweenNodes = edgeCounterMap[edgeKey] - 1;

                let smoothConfig = { enabled: false };
                if (edgeType === 'curved' || edgeCountBetweenNodes > 0 || fromNode === toNode) {
                    smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.2 + (edgeCountBetweenNodes * 0.2) };
                }

                const edge = {
                    id: `${fromNode}-${toNode}-${j}-${Date.now()}`,
                    from: fromNode,
                    to: toNode,
                    smooth: smoothConfig,
                    selfReference: fromNode === toNode ? { size: 20 + edgeCountBetweenNodes * 10, angle: Math.PI / 2 } : undefined,
                    color: { color: edgeColorPicker.value }
                };

                if (isDirected) {
                    edge.arrows = { to: { enabled: true } };
                }

                previewEdges.add(edge);
            }
        }
        // Qendërzim pas çdo përditësimi
        setTimeout(() => {
            previewNetwork.fit();
        }, 100);
    }

            // Vazhdimi i funksionit showIncidenceInputPopup nga ku u ndërpre
            generateIncidenceTable(5, 5);
            incidenceInputPopup.style.display = 'block';
    
            const updateBtn = document.getElementById('updateIncidenceSizeBtn');
            updateBtn.addEventListener('click', () => {
                const nodeInput = document.getElementById('nodeCount');
                const edgeInput = document.getElementById('edgeCount');
                let nodeCount = parseInt(nodeInput.value);
                let edgeCount = parseInt(edgeInput.value);
    
                if (isNaN(nodeCount) || nodeCount < 1 || nodeCount > 26) {
                    showCustomPopup('Numri i nyjeve duhet të jetë midis 1 dhe 26!');
                    nodeInput.value = 5;
                    nodeCount = 5;
                }
                if (isNaN(edgeCount) || edgeCount < 1) {
                    showCustomPopup('Numri i lidhjeve duhet të jetë të paktën 1!');
                    edgeInput.value = 5;
                    edgeCount = 5;
                }
    
                generateIncidenceTable(nodeCount, edgeCount);
            }, { once: true });
    
            const generateBtn = document.getElementById('generateIncidenceGraphBtn');
            generateBtn.addEventListener('click', () => {
                const nodeInput = document.getElementById('nodeCount');
                const edgeInput = document.getElementById('edgeCount');
                const nodeCount = parseInt(nodeInput.value);
                const edgeCount = parseInt(edgeInput.value);
                const labels = alphabet.slice(0, nodeCount);
                const matrixInputs = document.querySelectorAll('#incidenceTable input');
                const matrix = Array(nodeCount).fill().map(() => Array(edgeCount).fill(0));
    
                matrixInputs.forEach(input => {
                    const row = parseInt(input.dataset.row);
                    const col = parseInt(input.dataset.col);
                    const value = parseInt(input.value) || 0;
                    if (value < -1 || value > 2) {
                        showCustomPopup('Vlerat duhet të jenë -1, 0, 1 ose 2!');
                        return;
                    }
                    matrix[row][col] = value;
                });
    
                generateGraphFromIncidence(matrix, labels);
                incidenceInputPopup.style.display = 'none';
                if (previewNetwork) {
                    previewNetwork.destroy();
                    previewNetwork = null;
                }
            }, { once: true });
    
            const closeBtn = document.querySelector('#incidenceInputPopup .close-btn');
            closeBtn.addEventListener('click', () => {
                incidenceInputPopup.style.display = 'none';
                if (previewNetwork) {
                    previewNetwork.destroy();
                    previewNetwork = null;
                }
            }, { once: true });
        }
    
        createFromIncidenceBtn.addEventListener('click', () => {
            showIncidenceInputPopup();
        });
    
        // Funksion për të gjeneruar grafin nga matrica e fqinjësisë
        function generateGraphFromMatrix(matrix, labels) {
            saveState('graphChange');
            const size = labels.length;
            const directed = edgeOrientationSelect.value === 'directed';
            const edgeType = edgeTypeSelect.value;
    
            if (!isSplit) {
                nodes.clear();
                edges.clear();
                edgeCounter = 1;
    
                labels.forEach((label, i) => {
                    nodes.add({
                        id: label,
                        label: label,
                        x: 100 * Math.cos(2 * Math.PI * i / size),
                        y: 100 * Math.sin(2 * Math.PI * i / size),
                        color: { background: nodeColorPicker.value }
                    });
                });
    
                for (let i = 0; i < size; i++) {
                    for (let j = directed ? 0 : i; j < size; j++) {
                        const numEdges = matrix[i][j];
                        if (numEdges > 0) {
                            const from = labels[i];
                            const to = labels[j];
                            for (let k = 0; k < numEdges; k++) {
                                let smoothConfig = { enabled: false };
                                if (edgeType === 'curved' || numEdges > 1 || from === to) {
                                    smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.2 + (k * 0.2) };
                                }
    
                                const edge = {
                                    id: `${from}-${to}-${Date.now() + edgeCounter++}`,
                                    from: from,
                                    to: to,
                                    smooth: smoothConfig,
                                    selfReference: from === to ? { size: 20 + k * 10, angle: Math.PI / 2 } : undefined,
                                    color: { color: edgeColorPicker.value }
                                };
    
                                if (directed) {
                                    edge.arrows = { to: { enabled: true } };
                                }
    
                                edges.add(edge);
                            }
                        }
                    }
                }
    
                network.fit();
            } else {
                leftNodes.clear();
                leftEdges.clear();
                leftEdgeCounter = 1;
    
                labels.forEach((label, i) => {
                    leftNodes.add({
                        id: label,
                        label: label,
                        x: 100 * Math.cos(2 * Math.PI * i / size),
                        y: 100 * Math.sin(2 * Math.PI * i / size),
                        color: { background: nodeColorPicker.value }
                    });
                });
    
                for (let i = 0; i < size; i++) {
                    for (let j = directed ? 0 : i; j < size; j++) {
                        const numEdges = matrix[i][j];
                        if (numEdges > 0) {
                            const from = labels[i];
                            const to = labels[j];
                            for (let k = 0; k < numEdges; k++) {
                                let smoothConfig = { enabled: false };
                                if (edgeType === 'curved' || numEdges > 1 || from === to) {
                                    smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.2 + (k * 0.2) };
                                }
    
                                const edge = {
                                    id: `${from}-${to}-${Date.now() + leftEdgeCounter++}`,
                                    from: from,
                                    to: to,
                                    smooth: smoothConfig,
                                    selfReference: from === to ? { size: 20 + k * 10, angle: Math.PI / 2 } : undefined,
                                    color: { color: edgeColorPicker.value }
                                };
    
                                if (directed) {
                                    edge.arrows = { to: { enabled: true } };
                                }
    
                                leftEdges.add(edge);
                            }
                        }
                    }
                }
    
                leftNetwork.fit();
            }
    
            analyzeGraph();
        }
    
        // Funksion për të gjeneruar grafin nga matrica e incidencës
        function generateGraphFromIncidence(matrix, labels) {
            saveState('graphChange');
            const nodeCount = labels.length;
            const edgeCount = matrix[0].length;
            const directed = edgeOrientationSelect.value === 'directed';
            const edgeType = edgeTypeSelect.value;
    
            if (!isSplit) {
                nodes.clear();
                edges.clear();
                edgeCounter = 1;
    
                labels.forEach((label, i) => {
                    nodes.add({
                        id: label,
                        label: label,
                        x: 100 * Math.cos(2 * Math.PI * i / nodeCount),
                        y: 100 * Math.sin(2 * Math.PI * i / nodeCount),
                        color: { background: nodeColorPicker.value }
                    });
                });
    
                const edgeCounterMap = {};
                for (let j = 0; j < edgeCount; j++) {
                    let fromNode = null;
                    let toNode = null;
                    let onesCount = 0;
                    let hasNegativeOneInColumn = matrix.some(row => row[j] === -1);
                    let isDirected = directed && hasNegativeOneInColumn;
    
                    for (let i = 0; i < nodeCount; i++) {
                        if (matrix[i][j] === 1) {
                            if (fromNode === null) {
                                fromNode = labels[i];
                            } else if (!isDirected && toNode === null) {
                                toNode = labels[i];
                            }
                            onesCount++;
                        } else if (matrix[i][j] === -1 && isDirected) {
                            toNode = labels[i];
                        } else if (matrix[i][j] === 2) {
                            fromNode = labels[i];
                            toNode = labels[i];
                            isDirected = false;
                        }
                    }
    
                    if (fromNode && toNode) {
                        const edgeKey = isDirected ? `${fromNode}-${toNode}` : `${Math.min(fromNode, toNode)}-${Math.max(fromNode, toNode)}`;
                        edgeCounterMap[edgeKey] = (edgeCounterMap[edgeKey] || 0) + 1;
                        const edgeCountBetweenNodes = edgeCounterMap[edgeKey] - 1;
    
                        let smoothConfig = { enabled: false };
                        if (edgeType === 'curved' || edgeCountBetweenNodes > 0 || fromNode === toNode) {
                            smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.2 + (edgeCountBetweenNodes * 0.2) };
                        }
    
                        const edge = {
                            id: `${fromNode}-${toNode}-${edgeCounter++}`,
                            from: fromNode,
                            to: toNode,
                            smooth: smoothConfig,
                            selfReference: fromNode === toNode ? { size: 20 + edgeCountBetweenNodes * 10, angle: Math.PI / 2 } : undefined,
                            color: { color: edgeColorPicker.value }
                        };
    
                        if (isDirected) {
                            edge.arrows = { to: { enabled: true } };
                        }
    
                        edges.add(edge);
                    } else {
                        showCustomPopup('Matricë e pavlefshme e incidencës për kolonën ' + (j + 1));
                        return;
                    }
                }
    
                network.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                network.fit();
            } else {
                leftNodes.clear();
                leftEdges.clear();
                leftEdgeCounter = 1;
    
                labels.forEach((label, i) => {
                    leftNodes.add({
                        id: label,
                        label: label,
                        x: 100 * Math.cos(2 * Math.PI * i / nodeCount),
                        y: 100 * Math.sin(2 * Math.PI * i / nodeCount),
                        color: { background: nodeColorPicker.value }
                    });
                });
    
                const edgeCounterMap = {};
                for (let j = 0; j < edgeCount; j++) {
                    let fromNode = null;
                    let toNode = null;
                    let onesCount = 0;
                    let hasNegativeOneInColumn = matrix.some(row => row[j] === -1);
                    let isDirected = directed && hasNegativeOneInColumn;
    
                    for (let i = 0; i < nodeCount; i++) {
                        if (matrix[i][j] === 1) {
                            if (fromNode === null) {
                                fromNode = labels[i];
                            } else if (!isDirected && toNode === null) {
                                toNode = labels[i];
                            }
                            onesCount++;
                        } else if (matrix[i][j] === -1 && isDirected) {
                            toNode = labels[i];
                        } else if (matrix[i][j] === 2) {
                            fromNode = labels[i];
                            toNode = labels[i];
                            isDirected = false;
                        }
                    }
    
                    if (fromNode && toNode) {
                        const edgeKey = isDirected ? `${fromNode}-${toNode}` : `${Math.min(fromNode, toNode)}-${Math.max(fromNode, toNode)}`;
                        edgeCounterMap[edgeKey] = (edgeCounterMap[edgeKey] || 0) + 1;
                        const edgeCountBetweenNodes = edgeCounterMap[edgeKey] - 1;
    
                        let smoothConfig = { enabled: false };
                        if (edgeType === 'curved' || edgeCountBetweenNodes > 0 || fromNode === toNode) {
                            smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.2 + (edgeCountBetweenNodes * 0.2) };
                        }
    
                        const edge = {
                            id: `${fromNode}-${toNode}-${leftEdgeCounter++}`,
                            from: fromNode,
                            to: toNode,
                            smooth: smoothConfig,
                            selfReference: fromNode === toNode ? { size: 20 + edgeCountBetweenNodes * 10, angle: Math.PI / 2 } : undefined,
                            color: { color: edgeColorPicker.value }
                        };
    
                        if (isDirected) {
                            edge.arrows = { to: { enabled: true } };
                        }
    
                        leftEdges.add(edge);
                    } else {
                        showCustomPopup('Matricë e pavlefshme e incidencës për kolonën ' + (j + 1));
                        return;
                    }
                }
    
                leftNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                leftNetwork.fit();
            }
    
            analyzeGraph();
        }
    
        // Funksion për të kontrolluar izomorfizmin (version bazik)
        function areGraphsIsomorphic() {
            const leftNodeArray = leftNodes.get();
            const leftEdgeArray = leftEdges.get();
            const rightNodeArray = rightNodes.get();
            const rightEdgeArray = rightEdges.get();
    
            if (leftNodeArray.length !== rightNodeArray.length || leftEdgeArray.length !== rightEdgeArray.length) {
                return false;
            }
    
            const leftDegrees = leftNodeArray.map(node => 
                leftEdges.get().filter(e => e.from === node.id || e.to === node.id).length
            ).sort((a, b) => a - b);
            const rightDegrees = rightNodeArray.map(node => 
                rightEdges.get().filter(e => e.from === node.id || e.to === node.id).length
            ).sort((a, b) => a - b);
    
            if (JSON.stringify(leftDegrees) !== JSON.stringify(rightDegrees)) {
                return false;
            }
    
            return true;
        }
    
        splitGraphBtn.addEventListener('click', () => {
            saveState('graphChange');
            if (!isSplit) {
                isSplit = true;
                container.style.display = 'none';
                leftContainer.style.display = 'inline-block';
                rightContainer.style.display = 'inline-block';
    
                leftNetwork = new vis.Network(leftContainer, { nodes: leftNodes, edges: leftEdges }, options);
                rightNetwork = new vis.Network(rightContainer, { nodes: rightNodes, edges: rightEdges }, options);
    
                setupNetworkEvents(leftNetwork, leftNodes, leftEdges, 'leftSelectedNode', 'leftSelectedEdge', 'leftEdgeCounter');
                setupNetworkEvents(rightNetwork, rightNodes, rightEdges, 'rightSelectedNode', 'rightSelectedEdge', 'rightEdgeCounter');
    
                leftNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                rightNetwork.setOptions({ nodes: nodeStyles[currentNodeStyle] });
    
                leftNodes.add(nodes.get());
                leftEdges.add(edges.get());
                leftEdgeCounter = edgeCounter;
    
                nodes.clear();
                edges.clear();
                edgeCounter = 1;
    
                leftNetwork.fit();
                rightNetwork.fit();
            } else {
                isSplit = false;
                container.style.display = 'block';
                leftContainer.style.display = 'none';
                rightContainer.style.display = 'none';
    
                nodes.add(leftNodes.get());
                edges.add(leftEdges.get());
                edgeCounter = leftEdgeCounter;
    
                leftNodes.clear();
                leftEdges.clear();
                rightNodes.clear();
                rightEdges.clear();
                leftEdgeCounter = 1;
                rightEdgeCounter = 1;
    
                if (leftNetwork) leftNetwork.destroy();
                if (rightNetwork) rightNetwork.destroy();
                leftNetwork = null;
                rightNetwork = null;
    
                network.setOptions({ nodes: nodeStyles[currentNodeStyle] });
                network.fit();
            }
            analyzeGraph();
        });
    
        function analyzeGraph() {
            let info = '';
    
            if (!isSplit) {
                info += '<h3>Analiza e Grafit</h3>';
                info += '<table>';
    
                const nodeArray = nodes.get();
                const edgeArray = edges.get();
    
                info += '<tr><th colspan="2">Informacionet Bazë</th></tr>';
                info += '<tr><td>Numri i nyjeve</td><td>' + nodeArray.length + '</td></tr>';
                info += '<tr><td>Numri i lidhjeve</td><td>' + edgeArray.length + '</td></tr>';
    
                const directed = edgeOrientationSelect.value === 'directed';
                const hasLoops = edgeArray.some(e => e.from === e.to);
                const hasMultipleEdges = edgeArray.some((e1, i) => 
                    edgeArray.some((e2, j) => i !== j && e1.from === e2.from && e1.to === e2.to)
                );
                let graphType = directed ? 'Digraf' : 'Graf i thjeshtë';
                if (hasLoops) graphType = 'Pseudograf';
                else if (hasMultipleEdges) graphType = 'Multigraf';
                if (nodeArray.length === 0 || edgeArray.length === 0) graphType = 'Graf i zbrazët';
                info += '<tr><td>Lloji i grafit</td><td>' + graphType + '</td></tr>';
    
                info += '<tr><th colspan="2">Bashkësitë</th></tr>';
                const vertexSet = nodeArray.map(n => n.label).join(', ') || 'Boshe';
                info += '<tr><td>V (Nyjet)</td><td>{' + vertexSet + '}</td></tr>';
                const edgeSet = edgeArray.map(e => `{${nodes.get(e.from).label}, ${nodes.get(e.to).label}${e.label ? ', ' + e.label : ''}}`).join(', ') || 'Boshe';
                info += '<tr><td>E (Lidhjet)</td><td>{' + edgeSet + '}</td></tr>';
    
                info += '<tr><th colspan="2">Valenca e Nyjeve</th></tr>';
                if (nodeArray.length === 0) {
                    info += '<tr><td colspan="2">-</td></tr>';
                } else {
                    nodeArray.forEach(node => {
                        const valence = edges.get().filter(e => e.from === node.id || e.to === node.id).length;
                        info += `<tr><td>${node.label}</td><td>${valence}</td></tr>`;
                    });
                }
    
                info += '<tr><th colspan="2">Nyjet Fqinje</th></tr>';
                if (nodeArray.length === 0) {
                    info += '<tr><td colspan="2">-</td></tr>';
                } else {
                    nodeArray.forEach(node => {
                        const neighbors = edges.get()
                            .filter(e => e.from === node.id || e.to === node.id)
                            .map(e => e.from === node.id ? nodes.get(e.to).label : nodes.get(e.from).label)
                            .join(', ') || 'Asnjë';
                        info += `<tr><td>${node.label}</td><td>[${neighbors}]</td></tr>`;
                    });
                }
    
                info += '</table>';
            } else {
                const leftNodeArray = leftNodes.get();
                const leftEdgeArray = leftEdges.get();
                const rightNodeArray = rightNodes.get();
                const rightEdgeArray = rightEdges.get();
    
                info += '<div class="split-graph-analysis">';
                
                info += '<div class="split-graph-table split-left-table">';
                info += '<h3>Grafi Majtas</h3>';
                info += '<table>';
                info += '<tr><th colspan="2">Informacionet Bazë</th></tr>';
                info += `<tr><td>Numri i nyjeve</td><td>${leftNodeArray.length}</td></tr>`;
                info += `<tr><td>Numri i lidhjeve</td><td>${leftEdgeArray.length}</td></tr>`;
                const leftValences = leftNodeArray.map(node => 
                    leftEdges.get().filter(e => e.from === node.id || e.to === node.id).length
                ).sort((a, b) => a - b);
                info += `<tr><td>Sekuenca e valencave</td><td>[${leftValences.join(', ')}]</td></tr>`;
                info += '</table>';
                info += '</div>';
    
                info += '<div class="split-graph-table split-right-table">';
                info += '<h3>Grafi Djathtas</h3>';
                info += '<table>';
                info += '<tr><th colspan="2">Informacionet Bazë</th></tr>';
                info += `<tr><td>Numri i nyjeve</td><td>${rightNodeArray.length}</td></tr>`;
                info += `<tr><td>Numri i lidhjeve</td><td>${rightEdgeArray.length}</td></tr>`;
                const rightValences = rightNodeArray.map(node => 
                    rightEdges.get().filter(e => e.from === node.id || e.to === node.id).length
                ).sort((a, b) => a - b);
                info += `<tr><td>Sekuenca e valencave</td><td>[${rightValences.join(', ')}]</td></tr>`;
                info += '</table>';
                info += '</div>';
                
                info += '</div>';
    
                info += '<div class="isomorphism-result">';
                info += '<h3>Rezultati i Izomorfizmit</h3>';
                const isIsomorphic = areGraphsIsomorphic();
                info += `<p style="font-size: 16px; color: ${isIsomorphic ? '#27ae60' : '#c0392b'};">${isIsomorphic ? 'Grafet janë izomorfikë!' : 'Grafet nuk janë izomorfikë.'}</p>`;
                info += '</div>';
            }
    
            graphInfo.innerHTML = info;
            updateNodeSelects();
        }
    
        nodeColorPicker.addEventListener('input', () => {
            // Nuk bëjmë asgjë këtu - ngjyra do të aplikohet vetëm për nyjet e reja
        });
    
        edgeColorPicker.addEventListener('input', () => {
            // Nuk bëjmë asgjë këtu - ngjyra do të aplikohet vetëm për lidhjet e reja
        });
    
        edgeTypeSelect.addEventListener('change', () => {
            // Vetëm ruaj vlerën e re, mos përditëso lidhjet ekzistuese
            analyzeGraph();
        });
    
        edgeOrientationSelect.addEventListener('change', () => {
    // Vetëm ruaj vlerën e re, mos përditëso lidhjet ekzistuese
    analyzeGraph();
});