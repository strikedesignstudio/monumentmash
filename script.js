// --- LOADING MANAGER ---
let loadingProgress = { model: 0, audio: 0 };
let experienceStarted = false;
const loadingBar = document.getElementById('loading-bar');
const loadingText = document.getElementById('loading-text');
const loadingBarContainer = document.getElementById('loading-bar-container');
const startBtn = document.getElementById('start-experience-btn');
const loadingScreen = document.getElementById('loading-screen');

function updateLoadingBar() {
    const totalProgress = (loadingProgress.model + loadingProgress.audio) / 2;
    loadingBar.style.width = totalProgress + '%';
    loadingText.textContent = `Loading... ${Math.round(totalProgress)}%`;
    
    if (totalProgress >= 100) {
        loadingBarContainer.style.transition = 'opacity 0.5s ease-out';
        loadingText.style.transition = 'opacity 0.5s ease-out';
        loadingBarContainer.style.opacity = '0';
        loadingText.style.opacity = '0';
        
        setTimeout(() => {
            loadingBarContainer.style.display = 'none';
            loadingText.style.display = 'none';
            startBtn.style.transition = 'opacity 0.5s ease-in';
            startBtn.classList.add('visible');
        }, 500);
    }
}

async function startExperience() {
    experienceStarted = true;
    warpAnimationEnabled = true;
    
    // CRITICAL: Resume AudioContext on user interaction (required for mobile)
    try {
        if (listener.context.state === 'suspended') {
            console.log('Resuming audio context...');
            await listener.context.resume();
            console.log('Audio context state:', listener.context.state);
        }
    } catch (error) {
        console.error('Error resuming audio context:', error);
    }
    
    loadingScreen.classList.add('hidden');
    
    if (loadedModel) {
        loadedModel.userData.animationStartTime = performance.now();
    }
    
    playPauseBtn.classList.add('visible');
    
    // Try to start audio
    try {
        if (audioBufferShared) {
            playFrom(0);
            isPlaying = true;
            playPauseBtn.innerHTML = '⏸';
            console.log('Audio started successfully');
        } else {
            console.log('Audio buffer not ready yet');
            isPlaying = false;
            playPauseBtn.innerHTML = '▶';
        }
    } catch (error) {
        console.error('Error starting audio:', error);
        isPlaying = false;
        playPauseBtn.innerHTML = '▶';
    }
}

startBtn.addEventListener('click', startExperience);

// --- ABOUT PAGE TOGGLE ---
document.addEventListener('DOMContentLoaded', function() {
    const aboutPageBtn = document.getElementById('about-page-btn');
    const aboutPage = document.querySelector('.aboutpage');
    const aboutPageClose = document.querySelector('.aboutpage-close');

    function toggleAboutPage() {
        aboutPage.classList.toggle('open');
    }

    aboutPageBtn.addEventListener('click', toggleAboutPage);
    aboutPageClose.addEventListener('click', toggleAboutPage);

    aboutPage.addEventListener('click', (e) => {
        if (e.target === aboutPage) {
            toggleAboutPage();
        }
    });
});

// --- SPACE WARP BACKGROUND ---
const warpCanvas = document.getElementById('warp-canvas');
const warpScene = new THREE.Scene();
warpScene.background = new THREE.Color(0x000000);

const warpCamera = new THREE.PerspectiveCamera(
    100,
    window.innerWidth / window.innerHeight,
    0.1,
    200
);
warpCamera.position.z = 5;

const warpRenderer = new THREE.WebGLRenderer({ 
    canvas: warpCanvas,
    antialias: true 
});
warpRenderer.setSize(window.innerWidth, window.innerHeight);
warpRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
warpRenderer.toneMapping = THREE.ACESFilmicToneMapping;
warpRenderer.toneMappingExposure = 1.2;

let COUNT = 400;
let instancedMesh;
let warpAnimationEnabled = false;

function createStarField() {
    if (instancedMesh) {
        warpScene.remove(instancedMesh);
        instancedMesh.geometry.dispose();
        instancedMesh.material.dispose();
    }
    
    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(2.0, 2.0, 2.5),
        toneMapped: false,
        transparent: true,
        opacity: 0.9
    });
    
    instancedMesh = new THREE.InstancedMesh(geometry, material, COUNT);
    
    const temp = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
        temp.position.x = (Math.random() - 0.5) * 10;
        temp.position.y = (Math.random() - 0.5) * 10;
        temp.position.z = (Math.random() - 0.5) * 20;
        temp.updateMatrix();
        instancedMesh.setMatrixAt(i, temp.matrix);
    }
    
    instancedMesh.instanceMatrix.needsUpdate = true;
    warpScene.add(instancedMesh);
}

createStarField();

const clock = new THREE.Clock();
const tempMatrix = new THREE.Matrix4();
const tempPosition = new THREE.Vector3();
const tempObject = new THREE.Object3D();
const tempColor = new THREE.Color();

// --- MAIN SCENE SETUP ---
const mainScene = new THREE.Scene();
const sceneLayer = document.getElementById('scene-layer');
const mainCamera = new THREE.PerspectiveCamera(70, sceneLayer.clientWidth / sceneLayer.clientHeight, 0.01, 1000);
mainCamera.position.set(0, 0, 3);

const mainRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
mainRenderer.setClearColor(0x000000, 0);
mainRenderer.setSize(sceneLayer.clientWidth, sceneLayer.clientHeight);
sceneLayer.appendChild(mainRenderer.domElement);

let isDragging = false;
let previousMousePosition = { x: 0, y: 0 };
const rotationSpeed = 0.01;

// Mouse events
sceneLayer.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMousePosition = { x: e.clientX, y: e.clientY };
});

sceneLayer.addEventListener('mousemove', (e) => {
    if (isDragging) {
        const deltaX = e.clientX - previousMousePosition.x;
        const deltaY = e.clientY - previousMousePosition.y;
        
        mainCamera.position.x += deltaX * rotationSpeed;
        mainCamera.position.y -= deltaY * rotationSpeed;
        
        previousMousePosition = { x: e.clientX, y: e.clientY };
    }
});

sceneLayer.addEventListener('mouseup', () => {
    isDragging = false;
});

// Touch events for mobile
sceneLayer.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) {
        isDragging = true;
        previousMousePosition = { 
            x: e.touches[0].clientX, 
            y: e.touches[0].clientY 
        };
    }
});

sceneLayer.addEventListener('touchmove', (e) => {
    if (isDragging && e.touches.length === 1) {
        e.preventDefault();
        const deltaX = e.touches[0].clientX - previousMousePosition.x;
        const deltaY = e.touches[0].clientY - previousMousePosition.y;
        
        mainCamera.position.x += deltaX * rotationSpeed;
        mainCamera.position.y -= deltaY * rotationSpeed;
        
        previousMousePosition = { 
            x: e.touches[0].clientX, 
            y: e.touches[0].clientY 
        };
    }
}, { passive: false });

sceneLayer.addEventListener('touchend', () => {
    isDragging = false;
});

sceneLayer.addEventListener('wheel', (e) => {
    e.preventDefault();
    mainCamera.position.z += e.deltaY * 0.01;
    mainCamera.position.z = Math.max(-5, Math.min(mainCamera.position.z, 20));
});

// --- LIGHTS ---
const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.2);
hemiLight.position.set(0, 2, 0);
mainScene.add(hemiLight);

const rainbowLights = [];
const rainbowColors = [0xff6b6b, 0xffd93d, 0x6bcf7f, 0x4d96ff, 0xc77dff, 0xff6bda];
rainbowColors.forEach((color, i) => {
    const light = new THREE.PointLight(color, 0.4, 100);
    const angle = (i / rainbowColors.length) * Math.PI * 2;
    light.position.set(Math.cos(angle) * 15, Math.sin(angle) * 15, -10);
    mainScene.add(light);
    rainbowLights.push({ light, angle, radius: 15, speed: 0.001 + i * 0.0002 });
});

// --- GLOBAL VARIABLES ---
const clickableObjects = [];
const hoverableObjects = [];
const warpingMeshes = [];
let INTERSECTED;
let loadedModel = null;
let isModelShifted = false;
let targetModelPosition = new THREE.Vector3(0, -2.5, -5);
let originalModelPosition = new THREE.Vector3(0, -2.5, -5);

// Store exploding meshes for animation
const explodingMeshes = [];

// --- AUDIO SETUP ---
const listener = new THREE.AudioListener();
mainCamera.add(listener);
const audioLoader = new THREE.AudioLoader();
let audioBufferShared = null;
let currentSource = null;
let isPlaying = false;
let audioStartTime = 0;
let audioPauseTime = 0;

const audioSegments = {
    "Hilmi": 4,
    "Henry": 66,
    "Sabir": 116,
    "Shemi": 144,
    "Hannah": 186,
    "Evodie": 235,
    "Marvin": 285,
    "Jessica": 340,
    "Rachid": 456,
    "Jermaine": 568,
    "Dominic": 617
};

let meshInfo = {};

const hoverColorMap = {
    "Hilmi": 0xff0000,
    "Henry": 0x0000ff,
    "Sabir": 0xffff00,
    "Shemi": 0xff00ff,
    "Hannah": 0x00ffff,
    "Evodie": 0xff8800,
    "Marvin": 0x88ff00,
    "Jessica": 0x0088ff,
    "Rachid": 0x8800ff,
    "Jermaine": 0xff0088,
    "Dominic": 0x00ff88,
    "mesh001": 0xff6b6b,
    "mesh002": 0x4ecdc4,
    "mesh003": 0xffe66d,
    "mesh004": 0xa8e6cf,
    "mesh005": 0xff8b94,
    "garaflag": 0xfff000
};

const playPauseBtn = document.getElementById('play-pause-btn');

// --- MONUMENT COUNTER ---
const visitedMonuments = new Set();
const dissolvedStatues = new Set();
const monumentCounter = document.getElementById('monument-counter');

// Track whether the intro sequence has already played
let introSequencePlayed = false;

// --- INTRO MESSAGE SEQUENCE ---
// Called once after the model finishes zooming in (triggered in the animate loop)
function playIntroSequence() {
    if (introSequencePlayed) return;
    introSequencePlayed = true;

    const messages = [
        "You have entered Deptford Town Hall.",
        "Click on a floating monument to hear Lewisham voices.",
        "Click on a colonial statue and dissolve it into space."
    ];

    // Helper: fade in a message, hold for 5s, fade out, then call onComplete
    function showMessage(text, onComplete) {
        monumentCounter.style.transition = 'opacity 0.6s ease-in-out';
        monumentCounter.innerHTML = text;
        monumentCounter.style.opacity = '1';

        setTimeout(() => {
            monumentCounter.style.opacity = '0';
            // Wait for fade-out transition to finish before moving to next step
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 700);
        }, 5000);
    }

    // Chain the three intro messages, then show the visitor counters briefly
    showMessage(messages[0], () => {
        showMessage(messages[1], () => {
            showMessage(messages[2], () => {
                showVisitorCountersBriefly();
            });
        });
    });
}

// Shows the live visitor counters, holds 5s, then fades out
// After this the counter only reappears when the user clicks something
function showVisitorCountersBriefly() {
    const totalMonuments = Object.keys(audioSegments).length;
    const visitedCount = visitedMonuments.size;
    const totalStatues = 5;
    const dissolvedCount = dissolvedStatues.size;

    let message = visitedCount > 0
        ? `You have visited ${visitedCount}/${totalMonuments} monuments`
        : `You have visited 0/${totalMonuments} monuments`;

    if (dissolvedCount > 0) {
        message += `<br>You have dissolved ${dissolvedCount}/${totalStatues} colonial statues`;
    }

    monumentCounter.style.transition = 'opacity 0.6s ease-in-out';
    monumentCounter.innerHTML = message;
    monumentCounter.style.opacity = '1';

    updateTwoCounters();

    setTimeout(() => {
        monumentCounter.style.transition = 'opacity 0.6s ease-in-out';
        monumentCounter.style.opacity = '0';
    }, 2000);
}

// --- TWO-COUNTER UPDATE ---
function updateTwoCounters() {
    const dissolvedSpan = document.querySelector('.twocounters p:first-child .moncounter');
    const visitedSpan = document.querySelector('.twocounters p:last-child .moncounter');
    if (dissolvedSpan) dissolvedSpan.textContent = `${dissolvedStatues.size}/5`;
    if (visitedSpan) visitedSpan.textContent = `${visitedMonuments.size}/11`;
}

// Called whenever a monument is visited or a statue is dissolved
function updateMonumentCounter() {
    const totalMonuments = Object.keys(audioSegments).length;
    const visitedCount = visitedMonuments.size;
    const totalStatues = 5;
    const dissolvedCount = dissolvedStatues.size;
    
    if (monumentCounter) {
        let message = visitedCount > 0
            ? `You have visited ${visitedCount}/${totalMonuments} monuments`
            : `You have visited 0/${totalMonuments} monuments`;

        if (dissolvedCount > 0) {
            message += `<br>You have dissolved ${dissolvedCount}/${totalStatues} colonial statues`;
        }
        
        monumentCounter.innerHTML = message;

        // Fade in, hold 5 seconds, then fade out
        monumentCounter.style.transition = 'opacity 0.6s ease-in-out';
        monumentCounter.style.opacity = '1';

        // Clear any existing hide timer so rapid clicks don't conflict
        if (monumentCounter._hideTimer) clearTimeout(monumentCounter._hideTimer);
        monumentCounter._hideTimer = setTimeout(() => {
            monumentCounter.style.transition = 'opacity 0.6s ease-in-out';
            monumentCounter.style.opacity = '0';
        }, 5000);
    }

    updateTwoCounters();
}

// --- MODEL SHIFT FUNCTIONS ---
function isMobileDevice() {
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

function shiftModelForPopup() {
    if (!loadedModel || isModelShifted) return;
    
    isModelShifted = true;
    const isMobile = isMobileDevice();
    
    if (isMobile) {
        const shiftAmount = window.innerHeight * 0.0025;
        targetModelPosition.set(
            originalModelPosition.x,
            originalModelPosition.y + shiftAmount,
            originalModelPosition.z
        );
    } else {
        const shiftAmount = window.innerWidth * 0.003;
        targetModelPosition.set(
            originalModelPosition.x - shiftAmount,
            originalModelPosition.y,
            originalModelPosition.z
        );
    }
}

function resetModelPosition() {
    if (!loadedModel || !isModelShifted) return;
    isModelShifted = false;
    targetModelPosition.copy(originalModelPosition);
}

// --- AUDIO LOADER ---
audioLoader.load('audio/monmashcompnew.mp3', function (buffer) {
    audioBufferShared = buffer;
    loadingProgress.audio = 100;
    updateLoadingBar();
    console.log('Audio loaded successfully');
    
    if (experienceStarted && !isPlaying) {
        if (listener.context.state === 'suspended') {
            listener.context.resume().then(() => {
                playFrom(0);
                isPlaying = true;
                playPauseBtn.innerHTML = '⏸';
            });
        } else {
            playFrom(0);
            isPlaying = true;
            playPauseBtn.innerHTML = '⏸';
        }
    }
}, function(xhr) {
    if (xhr.total) {
        loadingProgress.audio = (xhr.loaded / xhr.total) * 100;
        updateLoadingBar();
    }
}, function(err) {
    console.log('Audio file not found, continuing without audio');
    loadingProgress.audio = 100;
    updateLoadingBar();
});

// --- RAYCASTING ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function playFrom(startTime) {
    if (!audioBufferShared) {
        console.log('Audio buffer not loaded');
        return;
    }
    
    if (currentSource) {
        currentSource.stop();
    }
    
    const audioCtx = listener.context;
    
    if (audioCtx.state === 'suspended') {
        console.log('Audio context suspended, resuming...');
        audioCtx.resume().then(() => {
            console.log('Audio context resumed, now playing');
            playFromInternal(startTime);
        });
    } else {
        playFromInternal(startTime);
    }
}

function playFromInternal(startTime) {
    const audioCtx = listener.context;
    const source = audioCtx.createBufferSource();
    source.buffer = audioBufferShared;
    source.connect(listener.getInput());
    source.start(0, startTime);
    currentSource = source;
    audioStartTime = audioCtx.currentTime - startTime;
    isPlaying = true;
    playPauseBtn.innerHTML = '⏸';
}

async function togglePlayPause() {
    if (!audioBufferShared) {
        console.log('Audio not loaded yet');
        return;
    }
    
    const audioCtx = listener.context;
    
    if (audioCtx.state === 'suspended') {
        console.log('Resuming audio context in togglePlayPause');
        try {
            await audioCtx.resume();
            console.log('Audio context resumed successfully');
        } catch (error) {
            console.error('Failed to resume audio context:', error);
            return;
        }
    }
    
    if (isPlaying) {
        if (currentSource) {
            currentSource.stop();
            audioPauseTime = audioCtx.currentTime - audioStartTime;
        }
        isPlaying = false;
        playPauseBtn.innerHTML = '▶';
    } else {
        playFrom(audioPauseTime);
    }
}

playPauseBtn.addEventListener('click', togglePlayPause);
playPauseBtn.addEventListener('touchend', (e) => {
    e.preventDefault();
    togglePlayPause();
});

// --- TABLE MODEL LOADER ---
let tableScene = null;
let tableCamera = null;
let tableRenderer = null;
let tableModel = null;
let tableAnimationId = null;

// --- FULL MODEL LOADER ---
let fullTableScene = null;
let fullTableCamera = null;
let fullTableRenderer = null;
let fullTableModel = null;
let fullTableAnimationId = null;
let currentModelIndex = 0;
const fullModels = ['model/ttexhibition.glb', 'model/tabletopex.glb'];

function animateTableModel() {
    tableAnimationId = requestAnimationFrame(animateTableModel);
    if (tableModel) {
        tableModel.rotation.y += 0.01;
    }
    tableRenderer.render(tableScene, tableCamera);
}

function animateFullTableModel() {
    fullTableAnimationId = requestAnimationFrame(animateFullTableModel);
    if (fullTableModel) {
        fullTableModel.rotation.y += 0.005;
    }
    fullTableRenderer.render(fullTableScene, fullTableCamera);
}

function cleanupTableModel() {
    if (tableAnimationId) {
        cancelAnimationFrame(tableAnimationId);
        tableAnimationId = null;
    }
    
    if (tableRenderer) {
        const tableContainer = document.getElementById('table-model');
        if (tableContainer && tableRenderer.domElement.parentNode === tableContainer) {
            tableContainer.removeChild(tableRenderer.domElement);
        }
        tableRenderer.dispose();
        tableRenderer.forceContextLoss();
        tableRenderer = null;
    }
    
    if (tableModel) {
        tableScene.remove(tableModel);
        tableModel = null;
    }
    
    tableScene = null;
    tableCamera = null;
    console.log('Table model cleaned up');
}

function initTableModel(meshName) {
    const tableContainer = document.getElementById('table-model');
    if (!tableContainer) {
        console.error('table-model div not found');
        return;
    }
    
    cleanupTableModel();
    
    tableScene = new THREE.Scene();
    
    const width = tableContainer.clientWidth;
    const height = tableContainer.clientHeight;
    
    tableCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    tableCamera.position.set(0, 0, 5);
    
    tableRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    tableRenderer.setClearColor(0x000000, 0);
    tableRenderer.setSize(width, height);
    tableRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    tableContainer.appendChild(tableRenderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    tableScene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight1.position.set(5, 10, 7.5);
    tableScene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight2.position.set(-5, 5, -7.5);
    tableScene.add(directionalLight2);
    
    const pointLight = new THREE.PointLight(0xffffff, 1.5, 100);
    pointLight.position.set(0, 10, 0);
    tableScene.add(pointLight);
    
    if (!loadedModel) {
        console.error('Main model not loaded yet');
        return;
    }
    
    let originalMesh = null;
    loadedModel.traverse((child) => {
        if (child.isMesh && child.name === meshName) {
            originalMesh = child;
        }
    });
    
    if (!originalMesh) {
        console.error(`Mesh "${meshName}" not found in main model`);
        return;
    }
    
    tableModel = originalMesh.clone();
    
    if (tableModel.material) {
        if (Array.isArray(tableModel.material)) {
            tableModel.material = tableModel.material.map(mat => mat.clone());
            tableModel.material.forEach(mat => {
                if (mat.color) mat.color.setHex(0xffffff);
            });
        } else {
            tableModel.material = tableModel.material.clone();
            if (tableModel.material.color) tableModel.material.color.setHex(0xffffff);
        }
    }
    
    const wrapper = new THREE.Object3D();
    wrapper.add(tableModel);
    
    tableModel.position.set(0, 0, 0);
    tableModel.rotation.set(0, 0, 0);
    tableModel.scale.set(1, 1, 1);
    
    const box = new THREE.Box3().setFromObject(wrapper);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    wrapper.scale.set(scale, scale, scale);
    wrapper.position.set(0, 0, 0);
    
    tableModel.position.x = -center.x;
    tableModel.position.y = -center.y;
    tableModel.position.z = -center.z;
    
    tableScene.add(wrapper);
    tableModel = wrapper;
    
    console.log(`Cloned mesh "${meshName}" successfully`);
    animateTableModel();
}

function cleanupFullTableModel() {
    if (fullTableAnimationId) {
        cancelAnimationFrame(fullTableAnimationId);
        fullTableAnimationId = null;
    }
    
    if (fullTableRenderer) {
        const fullTableContainer = document.getElementById('table-model-full');
        if (fullTableContainer && fullTableRenderer.domElement.parentNode === fullTableContainer) {
            fullTableContainer.removeChild(fullTableRenderer.domElement);
        }
        fullTableRenderer.dispose();
        fullTableRenderer.forceContextLoss();
        fullTableRenderer = null;
    }
    
    if (fullTableModel) {
        fullTableModel.traverse((child) => {
            if (child.isMesh) {
                child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach((m) => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
        fullTableScene.remove(fullTableModel);
        fullTableModel = null;
    }
    
    fullTableScene = null;
    fullTableCamera = null;
    console.log('Full table model cleaned up');
}

function initFullTableModel(modelPath) {
    const tableContainer = document.getElementById('table-model-full');
    if (!tableContainer) {
        console.error('table-model-full div not found');
        return;
    }
    
    cleanupFullTableModel();
    fullTableScene = new THREE.Scene();
    
    let width = tableContainer.clientWidth || 800;
    let height = tableContainer.clientHeight || 600;
    
    if (height < 100) {
        height = 600;
        console.warn('table-model-full has no height, using fallback of 600px');
    }
    
    console.log('Full table model dimensions:', { width, height });
    
    fullTableCamera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    fullTableCamera.position.set(0, 2, 5);
    
    fullTableRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    fullTableRenderer.setClearColor(0x000000, 0);
    fullTableRenderer.setSize(width, height);
    fullTableRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    tableContainer.appendChild(fullTableRenderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    fullTableScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    fullTableScene.add(directionalLight);
    
    const fullTableLoader = new THREE.GLTFLoader();
    
    fullTableLoader.load(
        modelPath,
        function (gltf) {
            fullTableModel = gltf.scene;
            
            const box = new THREE.Box3().setFromObject(fullTableModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = 3 / maxDim;
            
            const wrapper = new THREE.Object3D();
            wrapper.add(fullTableModel);
            wrapper.scale.set(scale, scale, scale);
            
            fullTableModel.position.x = -center.x;
            fullTableModel.position.y = -center.y;
            fullTableModel.position.z = -center.z;
            
            wrapper.position.y = size.y * scale * 1.5;
            
            fullTableScene.add(wrapper);
            fullTableModel = wrapper;
            
            animateFullTableModel();
            
            console.log(`Loaded full model from ${modelPath}`, {
                center, size, scale,
                yOffset: size.y * scale * 1.5
            });
        },
        function (xhr) {
            console.log(`Loading full table model... ${Math.round((xhr.loaded / xhr.total) * 100)}%`);
        },
        function (error) {
            console.error('Error loading full table model:', error);
        }
    );
}

function loadNextFullModel() {
    currentModelIndex = (currentModelIndex + 1) % fullModels.length;
    const nextModel = fullModels[currentModelIndex];
    console.log(`Loading next model: ${nextModel} (index ${currentModelIndex})`);
    initFullTableModel(nextModel);
}

function loadPreviousFullModel() {
    currentModelIndex = (currentModelIndex - 1 + fullModels.length) % fullModels.length;
    const previousModel = fullModels[currentModelIndex];
    console.log(`Loading previous model: ${previousModel} (index ${currentModelIndex})`);
    initFullTableModel(previousModel);
}

function closeFullTableModel() {
    cleanupFullTableModel();
    currentModelIndex = 0;
}

window.addEventListener('resize', function() {
    if (tableRenderer && tableCamera) {
        const tableContainer = document.getElementById('table-model');
        if (tableContainer) {
            const width = tableContainer.clientWidth;
            const height = tableContainer.clientHeight;
            tableCamera.aspect = width / height;
            tableCamera.updateProjectionMatrix();
            tableRenderer.setSize(width, height);
        }
    }
    
    if (fullTableRenderer && fullTableCamera) {
        const fullTableContainer = document.getElementById('table-model-full');
        if (fullTableContainer) {
            const width = fullTableContainer.clientWidth;
            const height = fullTableContainer.clientHeight;
            fullTableCamera.aspect = width / height;
            fullTableCamera.updateProjectionMatrix();
            fullTableRenderer.setSize(width, height);
        }
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const infoBtn = document.getElementById('about-page-btn');
    
    if (infoBtn) {
        infoBtn.addEventListener('click', function() {
            const fullTableContainer = document.getElementById('table-model-full');
            if (fullTableContainer && !fullTableRenderer) {
                console.log('Info button clicked, loading first model');
                setTimeout(() => {
                    initFullTableModel(fullModels[currentModelIndex]);
                }, 100);
            }
        });
    } else {
        console.warn('about-page-btn button not found');
    }
    
    const nextBtn = document.getElementById('model-next-btn');
    const prevBtn = document.getElementById('model-prev-btn');
    
    if (nextBtn) {
        nextBtn.addEventListener('click', function() {
            console.log('Next button clicked');
            loadNextFullModel();
        });
    }
    
    if (prevBtn) {
        prevBtn.addEventListener('click', function() {
            console.log('Previous button clicked');
            loadPreviousFullModel();
        });
    }
});

// --- POPUP FUNCTIONS ---
function showPopup(meshName) {
    const info = meshInfo[meshName];
    if (!info) return;
    
    let popup = document.getElementById('mesh-popup');
    if (!popup) {
        console.error('Popup element not found in HTML');
        return;
    }
    
    const title = popup.querySelector('.mesh-popup-title');
    const subtitle = popup.querySelector('.mesh-popup-sub');
    const description = popup.querySelector('.mesh-popup-description');
    
    if (title) title.textContent = info.title;
    if (subtitle) subtitle.textContent = info.subtitle || '';
    if (description) description.textContent = info.description;
    
    initTableModel(meshName);
    popup.classList.add('active');
    shiftModelForPopup();
}

function closePopup() {
    const popup = document.getElementById('mesh-popup');
    if (popup) {
        popup.classList.remove('active');
    }
    cleanupTableModel();
    resetModelPosition();
}

document.addEventListener('DOMContentLoaded', function() {
    const meshInfoElements = document.querySelectorAll('.mesh-info-item');
    console.log('Found mesh info elements:', meshInfoElements.length);
    meshInfoElements.forEach(item => {
        const name = item.getAttribute('data-name');
        const title = item.getAttribute('data-title');
        const subtitle = item.getAttribute('data-subtitle');
        const description = item.getAttribute('data-description');
        
        if (name && title && description) {
            meshInfo[name] = { 
                title, 
                subtitle: subtitle || '',
                description 
            };
            console.log('Loaded mesh info for:', name);
        }
    });
    
    console.log('Total meshInfo loaded:', Object.keys(meshInfo));
    
    const popup = document.getElementById('mesh-popup');
    const closeBtn = document.getElementById('mesh-popup-close');
    
    if (closeBtn) {
        closeBtn.addEventListener('click', closePopup);
    }
    
    if (popup) {
        popup.addEventListener('click', (e) => {
            if (e.target === popup) {
                closePopup();
            }
        });
    }
});

// --- EXPLOSION EFFECT FOR MESH001-005 ---
function explodeMesh(mesh) {
    const explosiveMeshes = ['mesh001', 'mesh002', 'mesh003', 'mesh004', 'mesh005'];
    if (!explosiveMeshes.includes(mesh.name)) return;
    
    console.log('Exploding mesh:', mesh.name);
    
    const particleCount = 20;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = mesh.clone();
        
        const scale = 0.05 + Math.random() * 0.1;
        particle.scale.set(scale, scale, scale);
        particle.position.copy(mesh.position);
        
        particle.userData.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.15,
            (Math.random() - 0.5) * 0.15,
            (Math.random() - 0.5) * 0.15
        );
        
        particle.userData.rotationSpeed = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1,
            (Math.random() - 0.5) * 0.1
        );
        
        particle.userData.life = 1.0;
        particle.userData.fadeSpeed = 0.05 + Math.random() * 0.05;
        
        if (particle.material) {
            if (Array.isArray(particle.material)) {
                particle.material = particle.material.map(mat => {
                    const newMat = mat.clone();
                    newMat.transparent = true;
                    return newMat;
                });
            } else {
                particle.material = particle.material.clone();
                particle.material.transparent = true;
            }
        }
        
        mainScene.add(particle);
        particles.push(particle);
    }
    
    explodingMeshes.push(...particles);
    
    if (mesh.material) {
        if (Array.isArray(mesh.material)) {
            mesh.material.forEach(mat => {
                mat.transparent = true;
                mat.opacity = 0;
            });
        } else {
            mesh.material.transparent = true;
            mesh.material.opacity = 0;
        }
    }
    mesh.visible = false;
    
    const clickIndex = clickableObjects.indexOf(mesh);
    if (clickIndex > -1) clickableObjects.splice(clickIndex, 1);
    
    const hoverIndex = hoverableObjects.indexOf(mesh);
    if (hoverIndex > -1) hoverableObjects.splice(hoverIndex, 1);
    
    console.log(`Mesh ${mesh.name} exploded into ${particleCount} particles and is now invisible`);
}

function onClick(event) {
    const rect = sceneLayer.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, mainCamera);
    const intersects = raycaster.intersectObjects(clickableObjects, true);

    if (intersects.length > 0) {
        const clicked = intersects[0].object;
        console.log('Clicked mesh:', clicked.name);
        console.log('Has meshInfo?', !!meshInfo[clicked.name]);
        console.log('Has audioSegment?', audioSegments[clicked.name]);
        
        if (clicked.material && clicked.material.opacity !== undefined) {
            clicked.material.opacity = 0.6;
            setTimeout(() => (clicked.material.opacity = 1), 300);
        }
        
        if (audioSegments[clicked.name] !== undefined) {
            visitedMonuments.add(clicked.name);
            updateMonumentCounter();
        }
        
        if (meshInfo[clicked.name]) {
            showPopup(clicked.name);
        }
        
        const explosiveMeshes = ['mesh001', 'mesh002', 'mesh003', 'mesh004', 'mesh005'];
        if (explosiveMeshes.includes(clicked.name)) {
            dissolvedStatues.add(clicked.name);
            updateMonumentCounter();
            
            setTimeout(() => {
                explodeMesh(clicked);
            }, 100);
        }
        
        const segmentStart = audioSegments[clicked.name];
        if (segmentStart !== undefined) {
            playFrom(segmentStart);
            isPlaying = true;
            playPauseBtn.innerHTML = '⏸';
        }
    }
}

function onMouseMove(event) {
    const rect = sceneLayer.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, mainCamera);
    const intersects = raycaster.intersectObjects(hoverableObjects, true);

    if (intersects.length > 0) {
        const hovered = intersects[0].object;
        if (INTERSECTED !== hovered) {
            if (INTERSECTED) INTERSECTED.targetColor = INTERSECTED.originalColor;
            INTERSECTED = hovered;
            if (!INTERSECTED.originalColor) INTERSECTED.originalColor = INTERSECTED.material.color.clone();
            const colorHex = hoverColorMap[INTERSECTED.name] || 0xffff00;
            INTERSECTED.targetColor = new THREE.Color(colorHex);
        }
    } else {
        if (INTERSECTED) INTERSECTED.targetColor = INTERSECTED.originalColor;
        INTERSECTED = null;
    }
}

sceneLayer.addEventListener("click", onClick);
sceneLayer.addEventListener("mousemove", onMouseMove);

// --- LOAD GLTF MODEL ---
const loader = new THREE.GLTFLoader();

loader.load(
    'model/modelfull2.glb',
    function (gltf) {
        loadingProgress.model = 100;
        updateLoadingBar();
        
        if (!gltf || !gltf.scene) {
            console.error('GLTF file did not load properly:', gltf);
            return;
        }
        const model = gltf.scene;
        loadedModel = model;
        
        model.scale.set(0.026, 0.026, 0.026);
        model.position.set(0, -2.5, -50);
        
        model.userData.finalPosition = new THREE.Vector3(0, -2.5, -5);
        model.userData.startPosition = new THREE.Vector3(0, -2.5, -50);
        model.userData.animationStartTime = null;
        model.userData.animationDuration = 5000;
        
        originalModelPosition.set(0, -2.5, -5);
        targetModelPosition.set(0, -2.5, -5);
        
        const meshesToRemove = ["Mesh040", "Final_Model_bottom_to_building"];
        const toRemove = [];
        
        model.traverse((child) => {
            if (meshesToRemove.includes(child.name)) {
                toRemove.push(child);
            }
        });

        toRemove.forEach((mesh) => {
            mesh.traverse((descendant) => {
                if (descendant.isMesh) {
                    descendant.geometry.dispose();
                    if (descendant.material) {
                        if (Array.isArray(descendant.material)) {
                            descendant.material.forEach((m) => m.dispose());
                        } else {
                            descendant.material.dispose();
                        }
                    }
                }
            });
            if (mesh.parent) mesh.parent.remove(mesh);
        });

        model.traverse((child) => {
            if (child.isMesh && !meshesToRemove.includes(child.name)) {
                console.log('Found mesh:', child.name);
                
                clickableObjects.push(child);
                child.material.transparent = true;
                
                if (Object.keys(hoverColorMap).includes(child.name)) {
                    console.log('Added to hoverable:', child.name);
                    hoverableObjects.push(child);
                    
                    const isStaticMesh = ['mesh001', 'mesh002', 'mesh003', 'mesh004', 'mesh005', 'garaflag'].includes(child.name);
                    
                    if (!isStaticMesh) {
                        warpingMeshes.push(child);
                        child.userData.originalPosition = child.position.clone();
                        
// Positions are in local space inside a model scaled at 0.026,
// so large local values are needed to reach visible world distances.
// x/y: radius 250–550 local → ~6.5–14 world units of spread
// z:   100–350 local → world z roughly -2 to +4 (forward of the
//      model, around/in front of the viewer) avoiding centre overlap.
const radius = 75 + Math.random() * 100;
const theta = Math.random() * Math.PI * 2;
const phi = (0.1 + Math.random() * 0.4) * Math.PI; // avoid z-axis poles

child.position.x = radius * Math.sin(phi) * Math.cos(theta);
child.position.y = radius * Math.sin(phi) * Math.sin(theta) - 2.5;
child.position.z = 50 + Math.random() * 150; // forward bias in local space
                        
                        child.scale.multiplyScalar(8);
                        child.userData.velocityX = (Math.random() - 0.5) * 0.02;
                        child.userData.velocityY = (Math.random() - 0.5) * 0.02;
                        child.userData.velocityZ = (Math.random() - 0.5) * 0.02;
                        
                        child.userData.rotationSpeed = {
                            x: (Math.random() - 0.5) * 0.01,
                            y: (Math.random() - 0.5) * 0.01,
                            z: (Math.random() - 0.5) * 0.01
                        };
                    } else {
                        console.log('Keeping mesh static (no warping):', child.name);
                    }
                }
            }
        });
        mainScene.add(model);
    },
    function (xhr) {
        if (xhr.total) {
            loadingProgress.model = (xhr.loaded / xhr.total) * 100;
            updateLoadingBar();
            console.log(`Loading model... ${Math.round(loadingProgress.model)}%`);
        }
    },
    function (error) {
        console.error('GLTF load error:', error);
    }
);

window.addEventListener("resize", function () {
    warpCamera.aspect = window.innerWidth / window.innerHeight;
    warpCamera.updateProjectionMatrix();
    warpRenderer.setSize(window.innerWidth, window.innerHeight);
    
    mainCamera.aspect = sceneLayer.clientWidth / sceneLayer.clientHeight;
    mainCamera.updateProjectionMatrix();
    mainRenderer.setSize(sceneLayer.clientWidth, sceneLayer.clientHeight);
});

// --- ANIMATE LOOP ---
function animate() {
    requestAnimationFrame(animate);

    // Animate model zoom-in
    if (experienceStarted && loadedModel && loadedModel.userData.animationStartTime) {
        const elapsed = performance.now() - loadedModel.userData.animationStartTime;
        const progress = Math.min(elapsed / loadedModel.userData.animationDuration, 1);
        
        const easeProgress = 1 - Math.pow(1 - progress, 3);
        
        loadedModel.position.lerpVectors(
            loadedModel.userData.startPosition,
            loadedModel.userData.finalPosition,
            easeProgress
        );
        
        if (progress >= 1) {
            loadedModel.userData.animationStartTime = null;
            loadedModel.position.copy(loadedModel.userData.finalPosition);
            originalModelPosition.copy(loadedModel.userData.finalPosition);
            targetModelPosition.copy(loadedModel.userData.finalPosition);

            // Trigger intro message sequence now that the model has settled
            playIntroSequence();
        }
    }
    
    // Smooth model position shift for popup
    if (loadedModel && !loadedModel.userData.animationStartTime) {
        loadedModel.position.lerp(targetModelPosition, 0.1);
    }

    // Animate explosion particles
    for (let i = explodingMeshes.length - 1; i >= 0; i--) {
        const particle = explodingMeshes[i];
        
        particle.position.x += particle.userData.velocity.x;
        particle.position.y += particle.userData.velocity.y;
        particle.position.z += particle.userData.velocity.z;
        
        particle.userData.velocity.y -= 0.003;
        
        particle.rotation.x += particle.userData.rotationSpeed.x;
        particle.rotation.y += particle.userData.rotationSpeed.y;
        particle.rotation.z += particle.userData.rotationSpeed.z;
        
        particle.userData.life -= particle.userData.fadeSpeed;
        
        if (particle.material) {
            if (Array.isArray(particle.material)) {
                particle.material.forEach(mat => {
                    mat.opacity = Math.max(0, particle.userData.life);
                });
            } else {
                particle.material.opacity = Math.max(0, particle.userData.life);
            }
        }
        
        if (particle.userData.life <= 0) {
            mainScene.remove(particle);
            
            if (particle.material) {
                if (Array.isArray(particle.material)) {
                    particle.material.forEach(mat => mat.dispose());
                } else {
                    particle.material.dispose();
                }
            }
            if (particle.geometry) {
                particle.geometry.dispose();
            }
            
            explodingMeshes.splice(i, 1);
        }
    }

    if (warpAnimationEnabled && experienceStarted) {
        const elapsedTime = clock.getElapsedTime();
        
        if (instancedMesh) {
            for (let i = 0; i < COUNT; i++) {
                instancedMesh.getMatrixAt(i, tempMatrix);
                tempPosition.setFromMatrixPosition(tempMatrix);
                
                if (tempPosition.z > 10) {
                    tempPosition.z = -10;
                } else {
                    const minSpeed = 0.5;
                    const maxSpeed = 10.0;
                    const decayFactor = 0.5;
                    const velocity = minSpeed + (maxSpeed - minSpeed) * Math.exp(-decayFactor * elapsedTime);
                    tempPosition.z += velocity * 0.016;
                }
                
                const maxScale = 15;
                const minScale = 1;
                const decayFactor = 0.5;
                const scaleZ = minScale + (maxScale - minScale) * Math.exp(-decayFactor * elapsedTime);
                
                const distanceScale = Math.max(0.3, 1 - (tempPosition.z + 10) / 20);
                tempObject.scale.set(distanceScale, distanceScale, scaleZ);
                tempObject.position.copy(tempPosition);
                tempObject.updateMatrix();
                
                instancedMesh.setMatrixAt(i, tempObject.matrix);
                
                const fadeStartZ = 3;
                const fadeEndZ = 8;
                
                if (tempPosition.z < fadeStartZ) {
                    tempColor.setRGB(1.2, 1.2, 1.5);
                } else if (tempPosition.z >= fadeEndZ) {
                    tempColor.setRGB(0, 0, 0);
                } else {
                    const fadeProgress = (tempPosition.z - fadeStartZ) / (fadeEndZ - fadeStartZ);
                    const brightness = (1 - fadeProgress);
                    tempColor.setRGB(brightness * 1.2, brightness * 1.2, brightness * 1.5);
                }
                
                instancedMesh.setColorAt(i, tempColor);
            }
            
            instancedMesh.instanceMatrix.needsUpdate = true;
            if (instancedMesh.instanceColor) {
                instancedMesh.instanceColor.needsUpdate = true;
            }
        }
    }
    
    warpRenderer.render(warpScene, warpCamera);

    hoverableObjects.forEach((obj) => {
        if (obj.material && obj.material.color && obj.targetColor) {
            obj.material.color.lerp(obj.targetColor, 0.1);
        }
    });

    warpingMeshes.forEach((mesh) => {
        mesh.position.x += mesh.userData.velocityX;
        mesh.position.y += mesh.userData.velocityY;
        mesh.position.z += mesh.userData.velocityZ;
        
        mesh.rotation.x += mesh.userData.rotationSpeed.x;
        mesh.rotation.y += mesh.userData.rotationSpeed.y;
        mesh.rotation.z += mesh.userData.rotationSpeed.z;

        const centerX = 0, centerY = -2.5, centerZ = -5;
        const dx = mesh.position.x - centerX;
        const dy = mesh.position.y - centerY;
        const dz = mesh.position.z - centerZ;
        const distanceFromCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);

        const maxRadius = 500;
        if (distanceFromCenter > maxRadius) {
            mesh.userData.velocityX = -mesh.userData.velocityX * 0.8 + (Math.random() - 0.5) * 0.01;
            mesh.userData.velocityY = -mesh.userData.velocityY * 0.8 + (Math.random() - 0.5) * 0.01;
            mesh.userData.velocityZ = -mesh.userData.velocityZ * 0.8 + (Math.random() - 0.5) * 0.01;
        }
        
        if (Math.random() < 0.01) {
            mesh.userData.velocityX += (Math.random() - 0.5) * 0.005;
            mesh.userData.velocityY += (Math.random() - 0.5) * 0.005;
            mesh.userData.velocityZ += (Math.random() - 0.5) * 0.005;
        }
    });

    rainbowLights.forEach((item) => {
        item.angle += item.speed;
        item.light.position.x = Math.cos(item.angle) * item.radius;
        item.light.position.y = Math.sin(item.angle) * item.radius;
    });

    mainRenderer.render(mainScene, mainCamera);
}
animate();