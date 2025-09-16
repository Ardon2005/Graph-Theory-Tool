const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const nodes = new vis.DataSet([]);
const edges = new vis.DataSet([]);
let selectedNode = null;
let selectedEdge = null;
let history = [];
let redoStack = [];
let lastAction = null;
let edgeCounter = 1;

const container = document.getElementById('graphViz-graphContainer');
const graphInfo = document.getElementById('graphViz-graphInfo');
const clearBtn = document.getElementById('graphViz-clearBtn');
const resetZoomBtn = document.getElementById('graphViz-resetZoomBtn');
const undoBtn = document.getElementById('graphViz-undoBtn');
const redoBtn = document.getElementById('graphViz-redoBtn');
const edgeTypeSelect = document.getElementById('graphViz-edgeType');
const edgeOrientationSelect = document.getElementById('graphViz-edgeOrientation');
const customPopup = document.getElementById('graphViz-customPopup');
const nodeColorPicker = document.getElementById('graphViz-nodeColorPicker');
const edgeColorPicker = document.getElementById('graphViz-edgeColorPicker');
const toggleLabelBtn = document.getElementById('graphViz-toggleLabelBtn');
const checkPlanarBtn = document.getElementById('graphViz-checkPlanarBtn');

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

let network = new vis.Network(container, { nodes, edges }, options);

// Funksion për të ndërruar stilin e nyjeve
function toggleNodeStyle() {
    currentNodeStyle = currentNodeStyle === 'labelsInside' ? 'labelsOutside' : 'labelsInside';
    network.setOptions({ nodes: nodeStyles[currentNodeStyle] });
    nodes.update(nodes.get().map(node => ({ id: node.id, color: node.color || { background: nodeColorPicker.value } })));
}

toggleLabelBtn.addEventListener('click', () => {
    toggleNodeStyle();
});

function saveState(actionType) {
    history.push({ 
        nodes: [...nodes.get()], 
        edges: [...edges.get()], 
        action: actionType,
        nodeStyle: currentNodeStyle,
        edgeCounter: edgeCounter
    });
    redoStack = [];
    lastAction = actionType;
}

function getEdgeCount(from, to) {
    return edges.get().filter(edge => 
        (edge.from === from && edge.to === to) || (edge.from === to && edge.to === from)
    ).length;
}

function getNextAvailableLabel() {
    const existingLabels = nodes.get().map(node => node.label);
    for (let i = 0; i < alphabet.length; i++) {
        if (!existingLabels.includes(alphabet[i])) {
            return alphabet[i];
        }
    }
    return null;
}

function setupNetworkEvents() {
    network.on('click', (params) => {
        if (params.nodes.length > 0) {
            const nodeId = params.nodes[0];
            if (selectedNode) {
                saveState('graphChange');
                const edgeType = edgeTypeSelect.value;
                const edgeDirection = edgeOrientationSelect.value;
                const edgeCount = getEdgeCount(selectedNode, nodeId);
                let smoothConfig;
            
                if (edgeType === 'curved') {
                    smoothConfig = { enabled: true, type: 'curvedCW', roundness: 0.5 };
                } else {
                    smoothConfig = { enabled: false };
                }
            
                const edge = {
                    id: `${selectedNode}-${nodeId}-${Date.now()}`,
                    from: selectedNode,
                    to: nodeId,
                    smooth: smoothConfig,
                    selfReference: selectedNode === nodeId ? { size: 20, angle: Math.PI / 2 } : undefined,
                    color: { color: edgeColorPicker.value }
                };
            
                if (edgeDirection === 'directed') {
                    edge.arrows = { to: { enabled: true } };
                }
            
                edges.add(edge);
                selectedNode = null;
                selectedEdge = null;
                network.unselectAll();
                analyzeGraph();
            
            } else {
                selectedNode = nodeId;
                selectedEdge = null;
                network.selectNodes([nodeId]);
            }
        } else if (params.edges.length > 0) {
            selectedEdge = params.edges[0];
            selectedNode = null;
            network.selectEdges([selectedEdge]);
        } else if (params.pointer.canvas) {
            const nextLabel = getNextAvailableLabel();
            if (nextLabel) {
                saveState('graphChange');
                const { x, y } = params.pointer.canvas;
                nodes.add({ 
                    id: nextLabel, 
                    label: nextLabel, 
                    x, 
                    y, 
                    color: { background: nodeColorPicker.value }
                });
                selectedNode = null;
                selectedEdge = null;
                network.unselectAll();
                analyzeGraph();
            }
        }
    });

    network.on('dragEnd', (params) => {
        if (params.nodes.length > 0) {
            saveState('graphChange');
            analyzeGraph();
        }
    });

    network.on('oncontext', (params) => {
        params.event.preventDefault();
        const nodeId = network.getNodeAt(params.pointer.DOM);
        const edgeId = network.getEdgeAt(params.pointer.DOM);

        if (nodeId || edgeId) {
            saveState('graphChange');
            if (nodeId) {
                const connectedEdges = edges.get().filter(edge => edge.from === nodeId || edge.to === nodeId);
                connectedEdges.forEach(edge => edges.remove(edge.id));
                nodes.remove(nodeId);
                if (selectedNode === nodeId) selectedNode = null;
                network.unselectAll();
            } else if (edgeId) {
                edges.remove(edgeId);
                if (selectedEdge === edgeId) selectedEdge = null;
            }
            analyzeGraph();
        }
    });
}

setupNetworkEvents();

clearBtn.addEventListener('click', () => {
    saveState('graphChange');
    nodes.clear();
    edges.clear();
    selectedNode = null;
    selectedEdge = null;
    network.unselectAll();
    edgeCounter = 1;
    graphInfo.innerHTML = '';
    analyzeGraph();
});

resetZoomBtn.addEventListener('click', () => {
    network.fit({ animation: true });
});

undoBtn.addEventListener('click', () => {
    if (history.length > 0) {
        const currentState = { 
            nodes: [...nodes.get()], 
            edges: [...edges.get()], 
            action: lastAction,
            nodeStyle: currentNodeStyle,
            edgeCounter: edgeCounter
        };
        redoStack.push(currentState);
        
        const lastState = history.pop();
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
        analyzeGraph();
        lastAction = lastState.action;
    }
});

redoBtn.addEventListener('click', () => {
    if (redoStack.length > 0) {
        const currentState = { 
            nodes: [...nodes.get()], 
            edges: [...edges.get()], 
            action: lastAction,
            nodeStyle: currentNodeStyle,
            edgeCounter: edgeCounter
        };
        history.push(currentState);

        const nextState = redoStack.pop();
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
        analyzeGraph();
        lastAction = nextState.action;
    }
});

function showCustomPopup(message, isPlanar) {
    customPopup.textContent = message;
    customPopup.classList.remove('graphViz-planar', 'graphViz-non-planar');
    customPopup.classList.add(isPlanar ? 'graphViz-planar' : 'graphViz-non-planar');
    customPopup.classList.add('graphViz-show');
    setTimeout(() => {
        customPopup.classList.remove('graphViz-show');
    }, 3000);
}

// Funksion për të kontrolluar nëse grafi është planar
function isGraphPlanar() {
    const nodeArray = nodes.get();
    const edgeArray = edges.get();

    if (nodeArray.length < 3 || edgeArray.length < 3) {
        return true; // Grafet me më pak se 3 nyje ose lidhje janë gjithmonë planarë
    }

    // Kontrollojmë për kryqëzimet e lidhjeve
    for (let i = 0; i < edgeArray.length; i++) {
        for (let j = i + 1; j < edgeArray.length; j++) {
            const edge1 = edgeArray[i];
            const edge2 = edgeArray[j];

            // Mos kontrollo lidhje që ndajnë një nyje
            if (
                edge1.from === edge2.from ||
                edge1.from === edge2.to ||
                edge1.to === edge2.from ||
                edge1.to === edge2.to
            ) {
                continue;
            }

            // Merr koordinatat e nyjeve për të dy lidhjet
            const node1From = nodes.get(edge1.from);
            const node1To = nodes.get(edge1.to);
            const node2From = nodes.get(edge2.from);
            const node2To = nodes.get(edge2.to);

            // Kontrollo nëse segmentet kryqëzohen
            if (doEdgesIntersect(
                { x: node1From.x, y: node1From.y },
                { x: node1To.x, y: node1To.y },
                { x: node2From.x, y: node2From.y },
                { x: node2To.x, y: node2To.y }
            )) {
                return false; // Grafi nuk është planar
            }
        }
    }

    return true; // Grafi është planar
}

// Funksion për të kontrolluar nëse dy segmente linjore kryqëzohen
function doEdgesIntersect(p1, p2, p3, p4) {
    function orientation(p, q, r) {
        const val = (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y);
        if (val === 0) return 0; // Kolinear
        return val > 0 ? 1 : 2; // Orar ose kundër orës
    }

    function onSegment(p, q, r) {
        return q.x <= Math.max(p.x, r.x) && q.x >= Math.min(p.x, r.x) &&
               q.y <= Math.max(p.y, r.y) && q.y >= Math.min(p.y, r.y);
    }

    const o1 = orientation(p1, p2, p3);
    const o2 = orientation(p1, p2, p4);
    const o3 = orientation(p3, p4, p1);
    const o4 = orientation(p3, p4, p2);

    // Rasti i përgjithshëm
    if (o1 !== o2 && o3 !== o4) return true;

    // Raste speciale: kolineare dhe pikat në segmente
    if (o1 === 0 && onSegment(p1, p3, p2)) return true;
    if (o2 === 0 && onSegment(p1, p4, p2)) return true;
    if (o3 === 0 && onSegment(p3, p1, p4)) return true;
    if (o4 === 0 && onSegment(p3, p2, p4)) return true;

    return false;
}

checkPlanarBtn.addEventListener('click', () => {
    saveState('graphChange');
    const isPlanar = isGraphPlanar();
    showCustomPopup(isPlanar ? 'Grafi është planar!' : 'Grafi nuk është planar.', isPlanar);
    analyzeGraph(isPlanar);
});

function analyzeGraph(isPlanar = null) {
    let info = '<h3>Analiza e Grafit</h3>';
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

    info += '<tr><th colspan="2">Planariteti</th></tr>';
    if (isPlanar !== null) {
        info += `<tr><td>Është planar?</td><td style="color: ${isPlanar ? '#27ae60' : '#c0392b'};">${isPlanar ? 'Po pasi nuk kemi rruge qe priten' : 'Jo pasi qe kemi rruge qe priten'}</td></tr>`;
    } else {
        info += '<tr><td>Është planar?</td><td>Kontrollo duke klikuar butonin</td></tr>';
    }

    info += '</table>';
    graphInfo.innerHTML = info;
}

nodeColorPicker.addEventListener('input', () => {
    // Ngjyra aplikohet vetëm për nyjet e reja
});

edgeColorPicker.addEventListener('input', () => {
    // Ngjyra aplikohet vetëm për lidhjet e reja
});

edgeTypeSelect.addEventListener('change', () => {
    analyzeGraph();
});

edgeOrientationSelect.addEventListener('change', () => {
    analyzeGraph();
});

$(document).ready(function() {
    $('.tab-btn').click(function() {
        $('.tab-btn').removeClass('active');
        $(this).addClass('active');
        
        $('.toolbar-content').removeClass('active');
        var tabId = $(this).data('tab');
        $('#' + tabId).addClass('active');
    });

    $('.color-btn').click(function() {
        var colorInputId = $(this).data('color-input');
        $('#' + colorInputId).click();
    });
});

analyzeGraph();