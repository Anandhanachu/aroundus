/**
 * Cute Car Adventure - Core Game Engine
 * Powered by Three.js & Web Audio API
 */

// ==========================================================================
// 1. Procedural Audio Engine
// ==========================================================================
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.initialized = false;
        
        // Music state
        this.musicInterval = null;
        this.currentBeat = 0;
        this.tempo = 115; // BPM
        
        // Sweet, cartoon pentatonic melody
        this.melody = [
            329.63, 392.00, 440.00, 523.25, 0, 523.25, 440.00, 392.00,
            329.63, 0,      329.63, 293.66, 261.63, 0,      261.63, 293.66,
            329.63, 392.00, 440.00, 523.25, 587.33, 0,      523.25, 440.00,
            392.00, 440.00, 392.00, 329.63, 293.66, 0,      0,      0
        ]; // 32 beats loop (8th notes)
        
        // Balanced chord progression (bass arpeggios):
        this.bass = [
            130.81, 164.81, 196.00, 164.81, // C major
            110.00, 130.81, 165.00, 130.81, // A minor
            87.31,  103.83, 130.81, 103.83, // F major
            98.00,  123.47, 146.83, 123.47  // G major
        ]; // 16 beats (quarter notes)
    }

    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            this.initialized = true;
            console.log("Music Audio Engine Initialized Successfully.");
        } catch (e) {
            console.warn("Web Audio API not supported or blocked: ", e);
        }
    }

    startMusic() {
        if (!this.initialized) this.init();
        if (this.muted || !this.ctx) return;

        // Resume AudioContext if suspended
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        if (this.musicInterval) clearInterval(this.musicInterval);

        const beatDuration = 60 / this.tempo / 2; // 8th note duration (seconds)
        
        this.musicInterval = setInterval(() => {
            if (this.muted || !this.ctx || this.ctx.state === 'suspended') return;

            const now = this.ctx.currentTime;
            
            // 1. Play melody note (8th notes)
            const melodyFreq = this.melody[this.currentBeat % this.melody.length];
            if (melodyFreq > 0) {
                this.playTone(melodyFreq, 'triangle', 0.04, 0.22, now);
            }
            
            // 2. Play arpeggiated bass (quarter notes, every 2 beats)
            if (this.currentBeat % 2 === 0) {
                const bassStep = Math.floor(this.currentBeat / 2) % this.bass.length;
                const bassFreq = this.bass[bassStep];
                this.playTone(bassFreq, 'sine', 0.07, 0.4, now);
            }
            
            this.currentBeat++;
        }, beatDuration * 1000);
    }

    playTone(freq, type, volume, duration, time) {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gainNode = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, time);
        
        gainNode.gain.setValueAtTime(volume, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        
        osc.connect(gainNode);
        gainNode.connect(this.ctx.destination);
        
        osc.start(time);
        osc.stop(time + duration);
    }

    stopMusic() {
        if (this.musicInterval) {
            clearInterval(this.musicInterval);
            this.musicInterval = null;
        }
    }

    // Dummy methods for vehicle sound compatibility
    startEngineSequence() {
        this.startMusic();
    }
    updateEngineSound(speedRatio) {}
    updateBrakingSound(isBraking, speed) {}
    playHonk() {}
    playCoinSound() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.playTone(1046.50, 'triangle', 0.05, 0.08, now);
        this.playTone(1567.98, 'triangle', 0.05, 0.2, now + 0.06);
    }
    playLevelUpSound() {
        if (this.muted || !this.ctx) return;
        const now = this.ctx.currentTime;
        this.playTone(523.25, 'triangle', 0.08, 0.1, now);
        this.playTone(659.25, 'triangle', 0.08, 0.1, now + 0.08);
        this.playTone(783.99, 'triangle', 0.08, 0.1, now + 0.16);
        this.playTone(1046.50, 'triangle', 0.1, 0.3, now + 0.24);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            this.stopMusic();
        } else {
            if (isPlaying && screenActive) {
                this.startMusic();
            }
        }
        return this.muted;
    }
}

const audio = new SoundEngine();

// ==========================================================================
// 2. Global Game Variables & Initialization
// ==========================================================================
let scene, camera, renderer;
let carGroup, carBodyGroup;
let frontLeftWheel, frontRightWheel, rearLeftWheel, rearRightWheel;
let leftPupil, rightPupil;

// Lights
let ambientLight, hemiLight, sunLight, rimLight, bounceLight;
let floorMat;

// Game State
let isPlaying = false;
let screenActive = true;
let speed = 0;
let heading = 0;
let steerAngle = 0;

// Config Constants
let ACCELERATION = 0.007;
const BRAKE_DECEL = 0.016;
const DRAG = 0.955;
let MAX_SPEED = 0.35;
const WHEEL_RADIUS = 0.45;

// Inputs
let driveInputX = 0; // Joystick X (-1 to 1)
let driveInputY = 0; // Joystick Y (-1 to 1)
let keyDriveX = 0;   // Keyboard X
let keyDriveY = 0;   // Keyboard Y
let isBraking = false;
let isDriving = false;

// State & Entities
let coinCount = 0;
let carLevel = 1;
let cameraShake = 0;
const floatingTexts = [];
const obstacles = [];
const coins = [];
const particles = [];
const clouds = [];
const cacti = [];
const boundaryRocks = [];
const meshes = [];

// Blink Animation Timings
let lastBlink = 0;
let isBlinking = false;
let blinkDuration = 120; // ms
let blinkScaleY = 1.0;

// Setup DOM elements
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');
const speedVal = document.getElementById('speedVal');
const gearVal = document.getElementById('gearVal');
const muteBtn = document.getElementById('muteBtn');
const resetBtn = document.getElementById('resetBtn');
const screenOff = document.getElementById('screenOff');
const leftZone = document.getElementById('leftZone');
const rightZone = document.getElementById('rightZone');
const joyRing = document.getElementById('joyRing');
const joyDot = document.getElementById('joyDot');
const brakeIndicator = document.getElementById('brakeIndicator');

// Camera Setup Parameters & Orbit State
let cameraRadius = 23.36;
let cameraYaw = 0.27; // Initial rotation angle
let cameraPitch = 0.64; // Initial vertical angle
const defaultPitch = 0.64;

// Multitouch pinch-to-zoom tracking
const activePointers = {};
let initialPinchDist = null;
let initialCameraRadius = 23.36;

const cameraOffset = new THREE.Vector3(5, 14, 18);

// Setup Canvas size
const canvas = document.getElementById('gameCanvas');

function initEngine() {
    // Scene — sky blue sky with dark environment
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.FogExp2(0x87CEEB, 0.0035);

    // Camera
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.copy(cameraOffset);

    // Renderer — cinematic quality
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputEncoding = THREE.sRGBEncoding;
    resizeCanvas();

    // Lights — HDR darker cinematic setup
    // Soft dark sky fill
    ambientLight = new THREE.AmbientLight(0x5c7a99, 0.35);
    scene.add(ambientLight);

    // Sky/Ground hemisphere
    hemiLight = new THREE.HemisphereLight(0x3a5b7c, 0x1f361a, 0.5);
    scene.add(hemiLight);

    // Primary subdued sun
    sunLight = new THREE.DirectionalLight(0xd9cdad, 1.2);
    sunLight.position.set(80, 100, 40);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 500;
    const d = 90;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0002;
    scene.add(sunLight);

    // Cool dark sky rim from opposite
    rimLight = new THREE.DirectionalLight(0x446688, 0.25);
    rimLight.position.set(-70, 40, -50);
    scene.add(rimLight);

    // Warm bounce light from ground
    bounceLight = new THREE.PointLight(0x5a8a40, 0.15, 200);
    bounceLight.position.set(0, 0.5, 0);
    scene.add(bounceLight);

    // Build the World
    createGrassFloor();
    createNaturalEnvironment();
    createClouds();
    spawnInitialCoins(35);

    // Build the Car
    createCuteCar();

    // Start Loop
    animate();
}

// Handle resizing accurately inside simulator screen bounds
function resizeCanvas() {
    const parent = canvas.parentElement;
    const width = parent.clientWidth;
    const height = parent.clientHeight;
    
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => {
    resizeCanvas();
    cachedRightZoneBounds = null;
});

// ==========================================================================
// 3. Environment & World Models Creation
// ==========================================================================
function createGrassFloor() {
    // Perfectly flat plane prevents z-fighting and clipping with river
    const floorGeo = new THREE.PlaneGeometry(620, 620, 1, 1);

    floorMat = new THREE.MeshStandardMaterial({
        color: 0x228B22, // Forest Green
        roughness: 0.95,
        metalness: 0.0
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
}

function createClouds() {
    const cloudMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.9,
        metalness: 0.05,
        transparent: true,
        opacity: 0.92
    });

    const numClouds = 8;
    for (let i = 0; i < numClouds; i++) {
        const cloudGroup = new THREE.Group();
        const x = (Math.random() - 0.5) * 240;
        const z = (Math.random() - 0.5) * 240;
        const y = 25 + Math.random() * 12;
        cloudGroup.position.set(x, y, z);

        const numPuffs = 4 + Math.floor(Math.random() * 4);
        for (let j = 0; j < numPuffs; j++) {
            const size = 2.0 + Math.random() * 2.5;
            const geo = new THREE.SphereGeometry(size, 8, 8);
            const puff = new THREE.Mesh(geo, cloudMat);
            puff.position.set(
                (j - numPuffs/2) * 2.2,
                (Math.random() - 0.2) * 1.0,
                (Math.random() - 0.5) * 1.5
            );
            cloudGroup.add(puff);
        }

        cloudGroup.userData = { speed: 0.015 + Math.random() * 0.03 };
        scene.add(cloudGroup);
        clouds.push(cloudGroup);
    }
}

// Foliage Materials — Kelly green and forest green combinations
const woodMat  = new THREE.MeshStandardMaterial({ color: 0x3d2b1a, roughness: 0.95, metalness: 0.0 });
const pineMat  = new THREE.MeshStandardMaterial({ color: 0x228B22, roughness: 0.88, metalness: 0.0 }); // Forest Green
const puffMat  = new THREE.MeshStandardMaterial({ color: 0x4CBB17, roughness: 0.88, metalness: 0.0 }); // Kelly Green
const puffMat2 = new THREE.MeshStandardMaterial({ color: 0x4CBB17, roughness: 0.86, metalness: 0.0 }); // Kelly Green
const bushMat  = new THREE.MeshStandardMaterial({ color: 0x4CBB17, roughness: 0.90, metalness: 0.0 }); // Kelly Green

function createPineTree(x, z, scale = 1.0) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.35, 2.0, 6), woodMat);
    trunk.position.y = 1.0;
    trunk.castShadow = true;
    tree.add(trunk);

    for (let i = 0; i < 3; i++) {
        const yOffset = 1.6 + i * 1.2;
        const radius = 1.8 - i * 0.4;
        const leaves = new THREE.Mesh(new THREE.ConeGeometry(radius, 2.0, 7), pineMat);
        leaves.position.y = yOffset;
        leaves.castShadow = true;
        tree.add(leaves);
    }
    scene.add(tree);
    obstacles.push({ x: x, z: z, radius: 1.5 * scale, type: 'tree' }); // Slightly wider for pine
}

function createPuffTree(x, z, scale = 1.0) {
    const tree = new THREE.Group();
    tree.position.set(x, 0, z);
    tree.scale.setScalar(scale);

    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.5, 7), woodMat);
    trunk.position.y = 1.25;
    trunk.castShadow = true;
    tree.add(trunk);

    const numPuffs = 4 + Math.floor(Math.random() * 3);
    for (let j = 0; j < numPuffs; j++) {
        const size = 1.0 + Math.random() * 0.8;
        const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(size, 1), puffMat);
        puff.position.set((Math.random() - 0.5) * 1.2, 2.5 + Math.random() * 1.5, (Math.random() - 0.5) * 1.2);
        puff.castShadow = true;
        tree.add(puff);
    }
    scene.add(tree);
    obstacles.push({ x: x, z: z, radius: 1.4 * scale, type: 'tree' }); // Slightly wider for puff
}

function createBush(x, z, scale = 1.0) {
    const bush = new THREE.Group();
    bush.position.set(x, 0, z);
    bush.scale.setScalar(scale);
    for(let i=0; i<3; i++) {
        const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + Math.random()*0.4, 0), bushMat);
        m.position.set((Math.random()-0.5)*0.8, 0.4 + Math.random()*0.2, (Math.random()-0.5)*0.8);
        m.castShadow = true;
        bush.add(m);
    }
    scene.add(bush);
    obstacles.push({ x: x, z: z, radius: 1.2 * scale, type: 'tree' });
}

// Simple pseudo-noise for rock vertex displacement
function hash(n) { return (Math.sin(n * 127.1 + 311.7) * 43758.5453) % 1.0; }
function noise3(x, y, z) {
    const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z);
    const fx = x - ix, fy = y - iy, fz = z - iz;
    return hash(ix + hash(iy + hash(iz))) * fx +
           hash(ix+1 + hash(iy + hash(iz))) * (1-fx) +
           hash(ix + hash(iy+1 + hash(iz))) * fy * 0.5 +
           hash(ix + hash(iy + hash(iz+1))) * fz * 0.5;
}

// Dark granite rock colours — real rock palettes
const ROCK_COLORS = [
    0x222222, 0x2a2a2a, 0x2e2e2e, 0x333333,
    0x383838, 0x1f1f1f, 0x252525, 0x2c2c2c
];

function createRealisticRock(x, z, scale = 1.0) {
    const cluster = new THREE.Group();
    cluster.position.set(x, 0, z);
    cluster.rotation.y = Math.random() * Math.PI * 2;

    const numRocks = 2 + Math.floor(Math.random() * 3);
    let maxRadius = 0;

    // Pick a base colour family for this cluster
    const baseColorHex = ROCK_COLORS[Math.floor(Math.random() * ROCK_COLORS.length)];

    for (let ri = 0; ri < numRocks; ri++) {
        const baseSize = (1.2 + Math.random() * 2.2) * scale;
        // High-detail icosahedron — 3 subdivisions = 320 triangles
        const geo = new THREE.IcosahedronGeometry(baseSize, 3);
        const posAttr = geo.attributes.position;

        for (let j = 0; j < posAttr.count; j++) {
            const vx = posAttr.getX(j);
            const vy = posAttr.getY(j);
            const vz = posAttr.getZ(j);
            const len = Math.sqrt(vx*vx + vy*vy + vz*vz) || 1;
            const nx = vx/len, ny = vy/len, nz_n = vz/len;

            // Three octaves of noise for realistic fractal surface
            const n1 = noise3(vx*0.5,  vy*0.5,  vz*0.5);
            const n2 = noise3(vx*1.4,  vy*1.4,  vz*1.4);
            const n3 = noise3(vx*3.0,  vy*3.0,  vz*3.0);
            const disp = n1*0.42 + n2*0.18 + n3*0.07;

            posAttr.setXYZ(j,
                vx + nx * disp * baseSize,
                vy + ny * disp * baseSize,
                vz + nz_n * disp * baseSize
            );
            // Flat base
            if (posAttr.getY(j) < -baseSize * 0.35) {
                posAttr.setY(j, -baseSize * 0.12);
            }
        }
        geo.computeVertexNormals();

        // Exact rock color without independent RGB drift
        const rockMat = new THREE.MeshStandardMaterial({
            color:     baseColorHex,
            roughness: 0.95,
            metalness: 0.08
        });

        const mesh = new THREE.Mesh(geo, rockMat);
        const offX = (Math.random() - 0.5) * baseSize * 1.4;
        const offZ = (Math.random() - 0.5) * baseSize * 1.4;
        mesh.position.set(offX, baseSize * 0.22, offZ);
        mesh.rotation.set(
            (Math.random()-0.5)*0.55,
            Math.random()*Math.PI*2,
            (Math.random()-0.5)*0.45
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        cluster.add(mesh);

        const d = Math.sqrt(offX*offX + offZ*offZ) + baseSize;
        if (d > maxRadius) maxRadius = d;
    }
    // Moss patch at base — tiny green disc
    const mossMat = new THREE.MeshStandardMaterial({ color: 0x2d5a1b, roughness: 1.0, metalness: 0.0 });
    const mossGeo = new THREE.CircleGeometry(maxRadius * 0.55, 8);
    const moss = new THREE.Mesh(mossGeo, mossMat);
    moss.rotation.x = -Math.PI / 2;
    moss.position.y = 0.02;
    moss.receiveShadow = true;
    cluster.add(moss);

    scene.add(cluster);
    obstacles.push({ x: x, z: z, radius: maxRadius, type: 'rock' });
}

// ---- Flower & decorative plant creators ----
const FLOWER_COLORS = [0xf9d71c, 0xff6b35, 0xe8439a, 0xffffff, 0xcc55ee, 0xff3333, 0xff9900];

function createFlower(x, z, colorHex) {
    const flowerGroup = new THREE.Group();
    flowerGroup.position.set(x, 0, z);
    flowerGroup.rotation.y = Math.random() * Math.PI * 2;

    // Stem
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2d6e1a, roughness: 0.9 });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 0.7 + Math.random()*0.4, 5), stemMat);
    stem.position.y = 0.35;
    flowerGroup.add(stem);

    // Petals
    const petalColor = colorHex || FLOWER_COLORS[Math.floor(Math.random()*FLOWER_COLORS.length)];
    const petalMat = new THREE.MeshStandardMaterial({
        color: petalColor, roughness: 0.7, metalness: 0.0,
        emissive: petalColor, emissiveIntensity: 0.08
    });
    const numPetals = 5 + Math.floor(Math.random()*3);
    for (let i = 0; i < numPetals; i++) {
        const angle = (i / numPetals) * Math.PI * 2;
        const petal = new THREE.Mesh(
            new THREE.SphereGeometry(0.12 + Math.random()*0.05, 5, 4),
            petalMat
        );
        petal.position.set(Math.cos(angle)*0.18, stem.position.y + 0.35 + stem.scale.y*0.35, Math.sin(angle)*0.18);
        petal.scale.set(1, 0.4, 1);
        flowerGroup.add(petal);
    }
    // Centre
    const centreMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.6 });
    const centre = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), centreMat);
    centre.position.y = stem.position.y + 0.36;
    flowerGroup.add(centre);

    scene.add(flowerGroup);
}

function createDecorativePlant(x, z, scale = 1.0) {
    const plantGroup = new THREE.Group();
    plantGroup.position.set(x, 0, z);
    plantGroup.scale.setScalar(scale);

    const stemMat = new THREE.MeshStandardMaterial({ color: 0x2a5c14, roughness: 0.9 });
    const leafColors = [0x2e7d1a, 0x388e23, 0x4a9a30, 0x226b10];
    const numLeaves = 4 + Math.floor(Math.random()*4);
    for (let i = 0; i < numLeaves; i++) {
        const angle = (i / numLeaves) * Math.PI * 2;
        const leafH = 0.5 + Math.random() * 0.9;
        const stem2 = new THREE.Mesh(
            new THREE.CylinderGeometry(0.03, 0.05, leafH, 4),
            stemMat
        );
        stem2.rotation.z = 0.5 + Math.random()*0.5;
        stem2.rotation.y = angle;
        stem2.position.set(
            Math.cos(angle)*0.1, leafH*0.5, Math.sin(angle)*0.1
        );
        plantGroup.add(stem2);

        const leafColor = leafColors[Math.floor(Math.random()*leafColors.length)];
        const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85, side: THREE.DoubleSide });
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18+Math.random()*0.12, 5, 4), leafMat);
        leaf.scale.set(1.8, 0.3, 1.0);
        leaf.position.set(
            Math.cos(angle)*(0.2+leafH*0.5),
            leafH + 0.1,
            Math.sin(angle)*(0.2+leafH*0.5)
        );
        leaf.rotation.z = -(0.4 + Math.random()*0.3);
        leaf.rotation.y = angle;
        leaf.castShadow = true;
        plantGroup.add(leaf);
    }
    scene.add(plantGroup);
}

// River curve formula — shared across the file
function getRiverX(z) {
    return 55 * Math.sin(z * 0.012) + 15 * Math.sin(z * 0.031);
}

let riverMaterial = null;
const bridges = [];

function createArmoredBridge(zCenter) {
    const bx = getRiverX(zCenter);
    const bGroup = new THREE.Group();
    bGroup.position.set(bx, 0, zCenter);

    const woodMat2 = new THREE.MeshStandardMaterial({ color: 0x6b4223, roughness: 0.92, metalness: 0.0 });
    const stoneMat = new THREE.MeshStandardMaterial({ color: 0x888880, roughness: 0.88, metalness: 0.05 });
    const ropeMat  = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.95 });

    const bridgeLen = 32; // spans the ~26-unit river with margin
    const bridgeW   = 10;
    const numPlanks = 14;

    // Removed massive stone abutments so they don't block the car

    // Arched wooden deck — planks following a cosine arch
    for (let i = 0; i < numPlanks; i++) {
        const t = (i / (numPlanks - 1)) - 0.5; // -0.5 to 0.5
        const plankX = t * bridgeLen;
        // arch height: highest at center
        const archY = 0.5 + 1.2 * (1 - 4 * t * t);
        const plank = new THREE.Mesh(
            new THREE.BoxGeometry(bridgeLen / numPlanks + 0.1, 0.35, bridgeW),
            woodMat2
        );
        plank.position.set(plankX, archY, 0);
        plank.castShadow = true;
        plank.receiveShadow = true;
        bGroup.add(plank);
    }

    // Suspension rope posts
    const postH = 3.5;
    for (let side = -1; side <= 1; side += 2) {
        // Main railing beam
        const rail = new THREE.Mesh(
            new THREE.CylinderGeometry(0.1, 0.1, bridgeLen, 6),
            ropeMat
        );
        rail.rotation.z = Math.PI / 2;
        rail.position.set(0, postH, side * (bridgeW / 2));
        bGroup.add(rail);

        // Vertical rope suspenders
        for (let i = 0; i < 8; i++) {
            const t = (i / 7) - 0.5;
            const px = t * bridgeLen;
            const archY = 0.5 + 1.2 * (1 - 4 * t * t);
            const ropeH = postH - archY;
            const rope = new THREE.Mesh(
                new THREE.CylinderGeometry(0.06, 0.06, ropeH, 4),
                ropeMat
            );
            rope.position.set(px, archY + ropeH / 2, side * (bridgeW / 2));
            bGroup.add(rope);
        }

        // Upright posts at each end
        for (const ex of [-bridgeLen/2, bridgeLen/2]) {
            const post = new THREE.Mesh(
                new THREE.CylinderGeometry(0.18, 0.22, postH + 1, 6),
                woodMat2
            );
            post.position.set(ex, (postH + 1) / 2, side * (bridgeW / 2));
            post.castShadow = true;
            bGroup.add(post);
        }
    }

    scene.add(bGroup);
    bridges.push({ z: zCenter, x: bx, widthX: bridgeLen + 8, widthZ: bridgeW + 2 });
}

function createNaturalEnvironment() {
    // ---- 1. Animated River ----
    const segments = 400; // Increased 5x for perfectly smooth high-resolution curves
    const riverWidth = 26;
    const riverVerts = [];
    const riverUVs   = [];
    const riverIdx   = [];

    for (let i = 0; i <= segments; i++) {
        const z = -260 + (i / segments) * 520;
        const cx = getRiverX(z);
        const u = i / segments;
        riverVerts.push(cx - riverWidth/2, 0, z);
        riverVerts.push(cx + riverWidth/2, 0, z);
        riverUVs.push(0, u);
        riverUVs.push(1, u);
        if (i < segments) {
            const a = i*2, b = i*2+1, c = i*2+2, d_idx = i*2+3;
            riverIdx.push(a, b, c, b, d_idx, c);
        }
    }

    const riverGeo = new THREE.BufferGeometry();
    riverGeo.setAttribute('position', new THREE.Float32BufferAttribute(riverVerts, 3));
    riverGeo.setAttribute('uv',       new THREE.Float32BufferAttribute(riverUVs,   2));
    riverGeo.setIndex(riverIdx);
    riverGeo.computeVertexNormals();

    riverMaterial = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0.0 } },
        vertexShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying float vDepth;
            void main() {
                vUv = uv;
                vec3 pos = position;
                // Multi-frequency ripple displacement
                pos.y += sin(pos.x * 0.45 + uTime * 1.8) * 0.14
                       + cos(pos.z * 0.38 + uTime * 1.3) * 0.10
                       + sin(pos.x * 1.2  + pos.z * 0.9 + uTime * 3.1) * 0.04;
                vDepth = pos.y + 0.5; // depth hint for coloring
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: `
            uniform float uTime;
            varying vec2 vUv;
            varying float vDepth;

            void main() {
                vec2 uv = vUv;

                // -- Primary flow waves (Solid stepped bands for cartoon look) --
                float wave = sin(uv.x * 16.0 + uTime * 3.5) * 0.5 + 0.5;
                float wave2 = sin(uv.y * 12.0 - uTime * 2.0) * 0.5 + 0.5;
                float combined = wave * 0.7 + wave2 * 0.3;
                
                // Hard step function for solid color banding
                float stepWave = smoothstep(0.48, 0.52, combined); 

                // -- Solid colors --
                vec3 shallowColor = vec3(0.08, 0.40, 0.75); // Bright stylized blue
                vec3 deepColor    = vec3(0.02, 0.22, 0.55); // Dark stylized navy
                vec3 waterColor   = mix(deepColor, shallowColor, stepWave);

                // -- Simple foam edge --
                float foam = smoothstep(0.04, 0.08, uv.x) * smoothstep(0.04, 0.08, 1.0 - uv.x);
                
                // If it's very close to edge, it's foam (whiteish)
                waterColor = mix(vec3(0.85, 0.90, 0.95), waterColor, foam);

                gl_FragColor = vec4(waterColor, 1.0); // Fully opaque
            }
        `,
        transparent: false,
        side: THREE.DoubleSide,
        depthWrite: true
    });

    const riverMesh = new THREE.Mesh(riverGeo, riverMaterial);
    riverMesh.position.y = 0.08;
    riverMesh.receiveShadow = false;
    scene.add(riverMesh);

    // ---- 2. Three Arched Bridges ----
    createArmoredBridge(-115);
    createArmoredBridge(10);
    createArmoredBridge(130);

    // ---- 3. Boundary Wall — ring of realistic rocks ----
    const numBoundary = 90;
    for (let i = 0; i < numBoundary; i++) {
        const angle = (i / numBoundary) * Math.PI * 2;
        const bx = Math.sin(angle) * 256;
        const bz = Math.cos(angle) * 256;
        createRealisticRock(bx, bz, 1.8 + Math.random() * 0.8);
    }

    // Helper — is point clear of river, start zone, AND bridge entrances?
    const isClear = (wx, wz) => {
        if (Math.sqrt(wx*wx + wz*wz) > 244) return false;
        if (Math.sqrt(wx*wx + (wz-75)*(wz-75)) < 22) return false; // start clear zone
        const rx = getRiverX(wz);
        if (Math.abs(wx - rx) < 18) return false; // inside river

        // Clear bridge entrances so car doesn't get stuck on rocks right at the start of a bridge
        for (let i = 0; i < bridges.length; i++) {
            const b = bridges[i];
            // Clear a wide box around the ends of the bridges
            if (Math.abs(wz - b.z) < 16 && Math.abs(wx - b.x) < 32) return false;
        }

        return true;
    };

    // ---- 4. River Bank Dense Vegetation + Flowers ----
    for (let z = -250; z <= 250; z += 6) {
        const cx = getRiverX(z);
        for (const side of [-1, 1]) {
            // Inner bank: mix of trees, rocks, reeds
            const bankX = cx + side * (14 + Math.random() * 7);
            if (isClear(bankX, z)) {
                const r = Math.random();
                if (r < 0.4) createPineTree(bankX, z, 1.0 + Math.random() * 0.7);
                else if (r < 0.65) createRealisticRock(bankX, z, 0.6 + Math.random() * 0.5);
                else if (r < 0.85) createBush(bankX, z, 0.9 + Math.random() * 0.5);
                else createDecorativePlant(bankX, z, 0.8 + Math.random()*0.5);
            }
            // Flowers right at bank edge
            const flX = cx + side * (13 + Math.random()*4);
            if (isClear(flX, z) && Math.random() < 0.45)
                createFlower(flX + (Math.random()-0.5)*2, z + (Math.random()-0.5)*2);

            // Second treeline layer
            const bank2X = cx + side * (22 + Math.random() * 10);
            if (isClear(bank2X, z) && Math.random() < 0.55)
                createPuffTree(bank2X, z, 0.9 + Math.random() * 0.6);
        }
    }

    // ---- 5. Massive Forest & Rock Population (Entire Map) ----
    // Dense scattering across the map
    for (let i = 0; i < 1200; i++) {
        const wx = (Math.random() - 0.5) * 480;
        const wz = (Math.random() - 0.5) * 490;
        
        // Skip if not in a clear playable zone
        if (!isClear(wx, wz)) continue;
        
        const r = Math.random();
        if (r < 0.45) {
            // High density of trees
            if (Math.random() < 0.5) createPineTree(wx, wz, 0.8 + Math.random() * 0.7);
            else createPuffTree(wx, wz, 0.8 + Math.random() * 0.7);
        } else if (r < 0.75) {
            // High density of rocks
            createRealisticRock(wx, wz, 0.5 + Math.random() * 1.5);
        } else if (r < 0.90) {
            // Bushes & Decorative Plants
            if (Math.random() < 0.5) createBush(wx, wz, 0.8 + Math.random() * 0.6);
            else createDecorativePlant(wx, wz, 0.8 + Math.random() * 0.6);
        } else {
            // Flowers
            createFlower(wx, wz);
        }
    }
}

// --------------------------------------------------------------------------
// Coin System Implementation
// --------------------------------------------------------------------------
const coinMat = new THREE.MeshPhysicalMaterial({
    color: 0xffd700,
    roughness: 0.1,
    metalness: 0.9,
    clearcoat: 1.0,
    emissive: 0xffa500,
    emissiveIntensity: 0.2
});

function spawnOneCoin() {
    let valid = false;
    let x = 0, z = 0;
    let attempts = 0;
    
    while (!valid && attempts < 100) {
        attempts++;
        x = (Math.random() - 0.5) * 480;
        z = (Math.random() - 0.5) * 480;
        
        const distFromCenter = Math.sqrt(x*x + z*z);
        if (distFromCenter > 245 || distFromCenter < 20) continue;

        const riverX = getRiverX(z);
        if (Math.abs(x - riverX) < 16) continue;

        let clear = true;
        for (let i = 0; i < obstacles.length; i++) {
            const obs = obstacles[i];
            const dx = x - obs.x;
            const dz = z - obs.z;
            if (Math.sqrt(dx*dx + dz*dz) < obs.radius + 4.0) {
                clear = false;
                break;
            }
        }
        if (clear) valid = true;
    }

    if (valid) {
        const coinGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 14);
        coinGeo.rotateX(Math.PI / 2);
        const coin = new THREE.Mesh(coinGeo, coinMat);
        coin.position.set(x, 0.6, z);
        coin.castShadow = true;
        scene.add(coin);
        coins.push(coin);
    }
}

function spawnInitialCoins(count = 35) {
    for (let i = 0; i < count; i++) {
        spawnOneCoin();
    }
}

function spawnGoldSparkles(pos) {
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    for (let i = 0; i < 12; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        scene.add(mesh);
        particles.push({
            mesh: mesh,
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.12,
                0.04 + Math.random() * 0.14,
                (Math.random() - 0.5) * 0.12
            ),
            age: 0,
            maxAge: 20 + Math.floor(Math.random() * 15),
            isDust: false
        });
    }
}

function spawnFloatingText(text, pos) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffe600';
    ctx.font = 'bold 40px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(255, 100, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, 64, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.copy(pos);
    sprite.position.y += 1.5;
    sprite.scale.set(4, 2, 1);
    scene.add(sprite);

    floatingTexts.push({ sprite: sprite, age: 0, maxAge: 40 });
}

function collectCoin(coin, index) {
    scene.remove(coin);
    coin.geometry.dispose();
    coins.splice(index, 1);
    
    coinCount++;
    const coinVal = document.getElementById('coinVal');
    if (coinVal) coinVal.textContent = coinCount;

    spawnGoldSparkles(coin.position);
    spawnFloatingText('+1', coin.position);
    audio.playCoinSound();
    updateUpgradeButtonState();
    spawnOneCoin();
}

// --------------------------------------------------------------------------
// Upgrade Logic & State
// --------------------------------------------------------------------------
function getUpgradeCost() {
    if (carLevel === 1) return 10;
    if (carLevel === 2) return 20;
    if (carLevel === 3) return 30;
    return Infinity;
}

function updateUpgradeButtonState() {
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (!upgradeBtn) return;
    
    const cost = getUpgradeCost();
    if (carLevel >= 4) {
        upgradeBtn.innerHTML = '<i class="fa-solid fa-crown"></i> MAX LEVEL';
        upgradeBtn.className = 'upgrade-btn disabled';
        upgradeBtn.disabled = true;
    } else {
        upgradeBtn.innerHTML = `<i class="fa-solid fa-bolt"></i> UPGRADE (${cost})`;
        if (coinCount >= cost) {
            upgradeBtn.className = 'upgrade-btn active-pulse';
            upgradeBtn.disabled = false;
        } else {
            upgradeBtn.className = 'upgrade-btn disabled';
            upgradeBtn.disabled = true;
        }
    }
}

function performUpgrade() {
    const cost = getUpgradeCost();
    if (coinCount >= cost && carLevel < 4) {
        coinCount -= cost;
        carLevel++;
        
        const coinVal = document.getElementById('coinVal');
        if (coinVal) coinVal.textContent = coinCount;

        const lvlVal = document.getElementById('lvlVal');
        if (lvlVal) lvlVal.textContent = carLevel;

        audio.playLevelUpSound();
        spawnUpgradeExplosion(carGroup.position);
        rebuildCarModel();
        updateUpgradeButtonState();
    }
}

function spawnUpgradeExplosion(pos) {
    const geo = new THREE.SphereGeometry(0.12, 6, 6);
    const colors = [0x00ffff, 0xff00ff, 0xffd700, 0xffffff];
    for (let i = 0; i < 40; i++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const mat = new THREE.MeshBasicMaterial({ color: color });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        mesh.position.y += 0.5;
        scene.add(mesh);
        
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.12 + Math.random() * 0.25;
        particles.push({
            mesh: mesh,
            vel: new THREE.Vector3(
                Math.sin(angle) * speed,
                0.04 + Math.random() * 0.16,
                Math.cos(angle) * speed
            ),
            age: 0,
            maxAge: 35 + Math.floor(Math.random() * 20),
            isDust: false
        });
    }
}

// ==========================================================================
// 4. Procedural Character Car Model (Disney Style)
// ==========================================================================
function createCuteCar() {
    carGroup = new THREE.Group();
    carGroup.position.set(0, 0.35, 75); // Start on the lower track
    carGroup.scale.setScalar(1.35); // Scale up by 1.35x
    scene.add(carGroup);

    // Car Body Group - Animates suspension pitch/roll separately
    carBodyGroup = new THREE.Group();
    carGroup.add(carBodyGroup);

    buildCarVisualsOnly();
}

function rebuildCarModel() {
    // Remove all children from carBodyGroup
    while (carBodyGroup.children.length > 0) {
        const obj = carBodyGroup.children[0];
        carBodyGroup.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) {
                obj.material.forEach(m => m.dispose());
            } else {
                obj.material.dispose();
            }
        }
    }

    // Remove wheels from carGroup
    carGroup.remove(rearLeftWheel);
    carGroup.remove(rearRightWheel);
    carGroup.remove(frontLeftWheel);
    carGroup.remove(frontRightWheel);

    // Update Speed settings per Level
    MAX_SPEED = 0.35 + (carLevel - 1) * 0.11;
    ACCELERATION = 0.006 + (carLevel - 1) * 0.002;

    buildCarVisualsOnly();
}

function buildCarVisualsOnly() {
    // --------------------------------------------------------------------------
    // Define level-specific configuration
    // --------------------------------------------------------------------------
    let bodyColor = 0x00d4ff; // default cyan
    let useRacingStripes = false;
    let stripeColor = 0xffffff;
    let useBlower = false;
    let blowerScale = 1.0;
    let useSidePipes = false;
    let spoilerType = 0; // 0=none, 1=ducktail, 2=elevated, 3=double decker
    let wheelType = 0; // 0=retro spoke, 1=sporty dark, 2=neon cyan disc, 3=gold deep dish
    let underglowColor = null;
    let glassColor = 0xffaa00; // orange tint
    
    if (carLevel === 1) {
        bodyColor = 0x00d4ff; // Turquoise Roadster
        spoilerType = 1; // ducktail
        wheelType = 0; // retro spoke
        glassColor = 0xffaa00;
    } else if (carLevel === 2) {
        bodyColor = 0xff2200; // Red Muscle Roadster
        useRacingStripes = true;
        stripeColor = 0xffffff;
        useBlower = true;
        blowerScale = 0.8;
        useSidePipes = true;
        spoilerType = 1; // ducktail
        wheelType = 1; // sporty dark
        glassColor = 0xffffff; // transparent clear
    } else if (carLevel === 3) {
        bodyColor = 0xaa00ff; // Purple Cyber-Cruiser
        useRacingStripes = true;
        stripeColor = 0xff00ff; // neon magenta stripes
        spoilerType = 2; // elevated sports wing
        wheelType = 2; // neon cyan disc
        underglowColor = 0xff00ff; // purple underglow
        glassColor = 0xbb00ff; // transparent purple
    } else if (carLevel === 4) {
        bodyColor = 0xffd700; // Gold Hyper-Racer
        useRacingStripes = true;
        stripeColor = 0x00ffff; // cyan neon stripes
        useBlower = true;
        blowerScale = 1.2; // massive blower
        spoilerType = 3; // double decker wing
        wheelType = 3; // gold deep dish
        underglowColor = 0x00ffff; // cyan underglow
        glassColor = 0x00ffff; // cyan glass
    }

    // --------------------------------------------------------------------------
    // Shared Materials definitions
    // --------------------------------------------------------------------------
    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
        color: bodyColor,
        roughness: carLevel === 4 ? 0.05 : 0.1, // super glossy for gold chrome
        metalness: carLevel === 4 ? 0.95 : 0.7,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        sheen: new THREE.Color(bodyColor)
    });
    
    const creamWhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xfbfaf0,
        roughness: 0.2,
        metalness: 0.05,
        clearcoat: 0.4,
        clearcoatRoughness: 0.1
    });

    const chromeMat = new THREE.MeshPhysicalMaterial({
        color: 0xf5f5f5,
        roughness: 0.05,
        metalness: 1.0,
        clearcoat: 1.0,
        clearcoatRoughness: 0.02
    });

    const tireMat = new THREE.MeshStandardMaterial({
        color: 0x1c1c1f,
        roughness: 0.9,
        metalness: 0.0
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
        color: glassColor,
        transparent: true,
        opacity: 0.55,
        roughness: 0.05,
        metalness: 0.1,
        clearcoat: 1.0
    });

    const eyesBaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilBlueMat = new THREE.MeshBasicMaterial({ color: 0x008ae6 });
    const pupilBlackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const wheelWhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xfafafa,
        roughness: 0.15,
        metalness: 0.05,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1
    });

    // --------------------------------------------------------------------------
    // 1. Main Chassis & Body
    // --------------------------------------------------------------------------
    const bodyGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
    bodyMesh.scale.set(0.9, 0.4, 1.45);
    bodyMesh.position.y = 0.35;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carBodyGroup.add(bodyMesh);

    // Chrome Side styling vent
    const ventGeo = new THREE.BoxGeometry(0.02, 0.15, 0.4);
    const leftVent = new THREE.Mesh(ventGeo, chromeMat);
    leftVent.position.set(-0.91, 0.35, -0.2);
    carBodyGroup.add(leftVent);

    const rightVent = leftVent.clone();
    rightVent.position.x = 0.91;
    carBodyGroup.add(rightVent);

    // Chrome Side rocker trims
    const sideTrimGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.2, 8);
    sideTrimGeo.rotateX(Math.PI / 2);
    const leftTrim = new THREE.Mesh(sideTrimGeo, chromeMat);
    leftTrim.position.set(-0.91, 0.22, 0);
    carBodyGroup.add(leftTrim);

    const rightTrim = leftTrim.clone();
    rightTrim.position.x = 0.91;
    carBodyGroup.add(rightTrim);

    // Side splitter wings for level 4
    if (carLevel === 4) {
        const splitterGeo = new THREE.BoxGeometry(0.12, 0.02, 2.0);
        const leftSplitter = new THREE.Mesh(splitterGeo, chromeMat);
        leftSplitter.position.set(-0.98, 0.12, 0);
        carBodyGroup.add(leftSplitter);

        const rightSplitter = leftSplitter.clone();
        rightSplitter.position.x = 0.98;
        carBodyGroup.add(rightSplitter);
    }

    // Door Handles
    const handleGeo = new THREE.BoxGeometry(0.01, 0.02, 0.12);
    const leftHandle = new THREE.Mesh(handleGeo, chromeMat);
    leftHandle.position.set(-0.915, 0.42, -0.1);
    carBodyGroup.add(leftHandle);

    const rightHandle = leftHandle.clone();
    rightHandle.position.x = 0.915;
    carBodyGroup.add(rightHandle);

    // Gas Cap
    const gasCapGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 12);
    gasCapGeo.rotateZ(Math.PI / 2);
    const gasCap = new THREE.Mesh(gasCapGeo, chromeMat);
    gasCap.position.set(-0.85, 0.45, -0.9);
    carBodyGroup.add(gasCap);

    // 2. Front Hood
    const hoodGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const hoodMesh = new THREE.Mesh(hoodGeo, bodyPaintMat);
    hoodMesh.scale.set(0.85, 0.35, 0.7);
    hoodMesh.position.set(0, 0.3, 0.88);
    hoodMesh.castShadow = true;
    carBodyGroup.add(hoodMesh);

    // Blower intake scoop (Level 2 & 4)
    if (useBlower) {
        const scoopGeo = new THREE.BoxGeometry(0.32 * blowerScale, 0.09 * blowerScale, 0.44 * blowerScale);
        const scoop = new THREE.Mesh(scoopGeo, chromeMat);
        scoop.position.set(0, 0.46, 0.9);
        scoop.rotation.x = -0.06;
        carBodyGroup.add(scoop);

        const scoopIntakeGeo = new THREE.PlaneGeometry(0.28 * blowerScale, 0.07 * blowerScale);
        const darkMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
        const scoopIntake = new THREE.Mesh(scoopIntakeGeo, darkMat);
        scoopIntake.position.set(0, 0.47, 1.11 * blowerScale);
        scoopIntake.rotation.x = -0.06;
        carBodyGroup.add(scoopIntake);
    }

    // Racing Stripes
    if (useRacingStripes) {
        const stripeMat = new THREE.MeshPhysicalMaterial({
            color: stripeColor,
            roughness: 0.15,
            metalness: 0.1,
            clearcoat: 1.0
        });
        const stripeLGeo = new THREE.BoxGeometry(0.08, 0.015, 2.6);
        const stripeL = new THREE.Mesh(stripeLGeo, stripeMat);
        stripeL.position.set(-0.16, 0.45, 0.05);
        stripeL.rotation.x = -0.04;
        carBodyGroup.add(stripeL);

        const stripeR = stripeL.clone();
        stripeR.position.x = 0.16;
        carBodyGroup.add(stripeR);
    }

    // 3. Open-Top Roadster Windshield & Safety Roll Hoops
    const windshieldFrameGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.3, 24, 1, true, -Math.PI / 2, Math.PI);
    const windshield = new THREE.Mesh(windshieldFrameGeo, glassMat);
    windshield.rotation.x = Math.PI / 2 + 0.18;
    windshield.position.set(0, 0.62, 0.28);
    carBodyGroup.add(windshield);

    const rimTorusGeo = new THREE.TorusGeometry(0.8, 0.018, 8, 32, Math.PI);
    const rim = new THREE.Mesh(rimTorusGeo, chromeMat);
    rim.position.set(0, 0.62, 0.28);
    rim.rotation.x = 0.18;
    rim.rotation.z = Math.PI;
    carBodyGroup.add(rim);

    // Headrests
    const headrestGeo = new THREE.SphereGeometry(0.18, 12, 12);
    const leftHeadrest = new THREE.Mesh(headrestGeo, creamWhiteMat);
    leftHeadrest.scale.set(1.0, 1.2, 0.8);
    leftHeadrest.position.set(-0.3, 0.62, -0.2);
    leftHeadrest.castShadow = true;
    carBodyGroup.add(leftHeadrest);

    const rightHeadrest = leftHeadrest.clone();
    rightHeadrest.position.x = 0.3;
    carBodyGroup.add(rightHeadrest);

    // Roll Hoops
    const rollHoopGeo = new THREE.TorusGeometry(0.18, 0.025, 8, 24, Math.PI);
    const leftRollHoop = new THREE.Mesh(rollHoopGeo, chromeMat);
    leftRollHoop.position.set(-0.3, 0.68, -0.26);
    carBodyGroup.add(leftRollHoop);

    const rightRollHoop = leftRollHoop.clone();
    rightRollHoop.position.x = 0.3;
    carBodyGroup.add(rightRollHoop);

    // 4. Expressive Eyes Setup (Preserving exactly the child indices for blinking)
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(0, 0.56, 0.54);
    eyeGroup.rotation.x = -0.36;
    carBodyGroup.add(eyeGroup);

    // Index 0: Left Eye White
    const eyeWhiteGeo = new THREE.CircleGeometry(0.18, 24);
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyesBaseMat);
    leftEyeWhite.position.set(-0.23, 0, 0);
    eyeGroup.add(leftEyeWhite);

    // Index 1: Right Eye White
    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyesBaseMat);
    rightEyeWhite.position.set(0.23, 0, 0);
    eyeGroup.add(rightEyeWhite);

    // Pupil setup
    const pupilBaseGeo = new THREE.CircleGeometry(0.09, 16);
    const pupilCoreGeo = new THREE.CircleGeometry(0.04, 16);
    const shineGeo = new THREE.CircleGeometry(0.018, 12);

    // Index 2: Left Pupil
    leftPupil = new THREE.Group();
    leftPupil.position.set(-0.23, 0, 0.005);
    const lpBlue = new THREE.Mesh(pupilBaseGeo, pupilBlueMat);
    leftPupil.add(lpBlue);
    const lpBlack = new THREE.Mesh(pupilCoreGeo, pupilBlackMat);
    lpBlack.position.z = 0.001;
    leftPupil.add(lpBlack);
    const lpShine = new THREE.Mesh(shineGeo, eyeHighlightMat);
    lpShine.position.set(0.028, 0.028, 0.002);
    leftPupil.add(lpShine);
    eyeGroup.add(leftPupil);

    // Index 3: Right Pupil
    rightPupil = new THREE.Group();
    rightPupil.position.set(0.23, 0, 0.005);
    const rpBlue = new THREE.Mesh(pupilBaseGeo, pupilBlueMat);
    rightPupil.add(rpBlue);
    const rpBlack = new THREE.Mesh(pupilCoreGeo, pupilBlackMat);
    rpBlack.position.z = 0.001;
    rightPupil.add(rpBlack);
    const rpShine = new THREE.Mesh(shineGeo, eyeHighlightMat);
    rpShine.position.set(0.028, 0.028, 0.002);
    rightPupil.add(rpShine);
    eyeGroup.add(rightPupil);

    // 5. Smiling Radiator Mouth
    const smileCanvas = document.createElement('canvas');
    smileCanvas.width = 512;
    smileCanvas.height = 256;
    const smCtx = smileCanvas.getContext('2d');
    smCtx.clearRect(0, 0, 512, 256);
    smCtx.fillStyle = '#1c1c1f';
    smCtx.strokeStyle = '#000000';
    smCtx.lineWidth = 12;
    smCtx.beginPath();
    smCtx.arc(256, 48, 160, 0, Math.PI);
    smCtx.fill();
    smCtx.stroke();
    smCtx.fillStyle = '#ffffff';
    smCtx.beginPath();
    if (smCtx.roundRect) {
        smCtx.roundRect(136, 48, 240, 40, 10);
    } else {
        smCtx.rect(136, 48, 240, 40);
    }
    smCtx.fill();
    smCtx.fillStyle = '#ff6b6b';
    smCtx.beginPath();
    smCtx.arc(256, 152, 56, 0, Math.PI);
    smCtx.fill();

    const mouthTex = new THREE.CanvasTexture(smileCanvas);
    const mouthGeo = new THREE.PlaneGeometry(0.72, 0.36);
    const mouthMat = new THREE.MeshStandardMaterial({
        map: mouthTex,
        transparent: true,
        roughness: 0.15
    });
    const mouth = new THREE.Mesh(mouthGeo, mouthMat);
    mouth.position.set(0, 0.1, 1.58);
    mouth.rotation.x = -0.04;
    carBodyGroup.add(mouth);

    // 6. Headlights (Horiz laser bars)
    const headlightBoxGeo = new THREE.BoxGeometry(0.3, 0.08, 0.15);
    const leftHousing = new THREE.Mesh(headlightBoxGeo, chromeMat);
    leftHousing.position.set(-0.55, 0.32, 1.45);
    leftHousing.rotation.y = 0.08;
    leftHousing.castShadow = true;
    carBodyGroup.add(leftHousing);

    const rightHousing = leftHousing.clone();
    rightHousing.position.x = 0.55;
    rightHousing.rotation.y = -0.08;
    carBodyGroup.add(rightHousing);

    // Glowing cyan/white laser bars
    const headlightLensGeo = new THREE.BoxGeometry(0.28, 0.04, 0.02);
    const lensMat = new THREE.MeshStandardMaterial({
        color: carLevel >= 3 ? 0x00ffff : 0xffffff,
        emissive: carLevel >= 3 ? 0x00ffff : 0xffffff,
        emissiveIntensity: 2.0,
        roughness: 0.05
    });

    const leftLens = new THREE.Mesh(headlightLensGeo, lensMat);
    leftLens.position.set(-0.55, 0.32, 1.53);
    leftLens.rotation.y = 0.08;
    carBodyGroup.add(leftLens);

    const rightLens = leftLens.clone();
    rightLens.position.x = 0.55;
    rightLens.rotation.y = -0.08;
    carBodyGroup.add(rightLens);

    // Volumetric Headlight Beams
    const beamGeo = new THREE.CylinderGeometry(0.06, 0.6, 6.0, 16, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 3.0);
    
    const beamMat = new THREE.MeshBasicMaterial({
        color: carLevel >= 3 ? 0x00ffff : 0xfffee4,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const leftBeam = new THREE.Mesh(beamGeo, beamMat);
    leftBeam.position.set(-0.55, 0.32, 1.5);
    leftBeam.rotation.y = 0.04;
    leftBeam.rotation.x = -0.02;
    carBodyGroup.add(leftBeam);
    
    const rightBeam = leftBeam.clone();
    rightBeam.position.x = 0.55;
    rightBeam.rotation.y = -0.04;
    carBodyGroup.add(rightBeam);

    // Splitter Lip
    const bumperGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.7, 10);
    bumperGeo.rotateZ(Math.PI / 2);
    const frontBumper = new THREE.Mesh(bumperGeo, chromeMat);
    frontBumper.position.set(0, 0.08, 1.58);
    frontBumper.castShadow = true;
    carBodyGroup.add(frontBumper);

    // Side Mirrors
    const mirrorStemGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.3, 8);
    const leftStem = new THREE.Mesh(mirrorStemGeo, chromeMat);
    leftStem.position.set(-0.8, 0.48, 0.32);
    leftStem.rotation.z = -Math.PI / 6;
    carBodyGroup.add(leftStem);

    const rightStem = leftStem.clone();
    rightStem.position.x = 0.8;
    rightStem.rotation.z = Math.PI / 6;
    carBodyGroup.add(rightStem);

    const mirrorHeadGeo = new THREE.SphereGeometry(0.09, 12, 12);
    const leftHead = new THREE.Mesh(mirrorHeadGeo, bodyPaintMat);
    leftHead.position.set(-0.88, 0.6, 0.32);
    leftHead.scale.set(1.3, 0.8, 0.9);
    carBodyGroup.add(leftHead);

    const rightHead = leftHead.clone();
    rightHead.position.x = 0.88;
    carBodyGroup.add(rightHead);

    // 7. Spoiler/Wing Setup (Based on Level)
    if (spoilerType === 1) {
        // Ducktail
        const spoilerGeo = new THREE.BoxGeometry(1.5, 0.05, 0.28);
        const spoiler = new THREE.Mesh(spoilerGeo, bodyPaintMat);
        spoiler.position.set(0, 0.48, -1.32);
        spoiler.rotation.x = 0.2;
        spoiler.castShadow = true;
        carBodyGroup.add(spoiler);

        const endPlateGeo = new THREE.BoxGeometry(0.02, 0.16, 0.32);
        const leftEndPlate = new THREE.Mesh(endPlateGeo, chromeMat);
        leftEndPlate.position.set(-0.75, 0.48, -1.32);
        carBodyGroup.add(leftEndPlate);

        const rightEndPlate = leftEndPlate.clone();
        rightEndPlate.position.x = 0.75;
        carBodyGroup.add(rightEndPlate);
    } else if (spoilerType === 2) {
        // Elevated Sports Wing
        const leftStrutGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8);
        leftStrutGeo.rotateX(0.1);
        const leftStrut = new THREE.Mesh(leftStrutGeo, chromeMat);
        leftStrut.position.set(-0.4, 0.55, -1.25);
        carBodyGroup.add(leftStrut);

        const rightStrut = leftStrut.clone();
        rightStrut.position.x = 0.4;
        carBodyGroup.add(rightStrut);

        const wingGeo = new THREE.BoxGeometry(1.6, 0.03, 0.32);
        const wing = new THREE.Mesh(wingGeo, bodyPaintMat);
        wing.position.set(0, 0.72, -1.25);
        wing.rotation.x = 0.05;
        wing.castShadow = true;
        carBodyGroup.add(wing);

        const endPlateGeo = new THREE.BoxGeometry(0.02, 0.22, 0.34);
        const leftEnd = new THREE.Mesh(endPlateGeo, chromeMat);
        leftEnd.position.set(-0.8, 0.72, -1.25);
        carBodyGroup.add(leftEnd);

        const rightEnd = leftEnd.clone();
        rightEnd.position.x = 0.8;
        carBodyGroup.add(rightEnd);
    } else if (spoilerType === 3) {
        // Double Decker wing
        const leftStrutGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 8);
        const leftStrut = new THREE.Mesh(leftStrutGeo, chromeMat);
        leftStrut.position.set(-0.4, 0.65, -1.25);
        carBodyGroup.add(leftStrut);

        const rightStrut = leftStrut.clone();
        rightStrut.position.x = 0.4;
        carBodyGroup.add(rightStrut);

        // Lower deck
        const wing1Geo = new THREE.BoxGeometry(1.6, 0.03, 0.3);
        const wing1 = new THREE.Mesh(wing1Geo, bodyPaintMat);
        wing1.position.set(0, 0.58, -1.25);
        wing1.castShadow = true;
        carBodyGroup.add(wing1);

        // Upper deck
        const wing2 = wing1.clone();
        wing2.position.y = 0.9;
        wing2.scale.set(1.1, 1.0, 1.0);
        carBodyGroup.add(wing2);

        const endPlateGeo = new THREE.BoxGeometry(0.02, 0.48, 0.36);
        const leftEnd = new THREE.Mesh(endPlateGeo, chromeMat);
        leftEnd.position.set(-0.88, 0.74, -1.25);
        carBodyGroup.add(leftEnd);

        const rightEnd = leftEnd.clone();
        rightEnd.position.x = 0.88;
        carBodyGroup.add(rightEnd);
    }

    // Exhaust pipes & Side Pipes
    if (useSidePipes) {
        const sidePipeGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 8);
        sidePipeGeo.rotateX(Math.PI / 2);
        const leftSidePipe = new THREE.Mesh(sidePipeGeo, chromeMat);
        leftSidePipe.position.set(-0.92, 0.16, 0);
        carBodyGroup.add(leftSidePipe);

        const rightSidePipe = leftSidePipe.clone();
        rightSidePipe.position.x = 0.92;
        carBodyGroup.add(rightSidePipe);
    } else {
        const tailpipeGeo = new THREE.CylinderGeometry(0.07, 0.07, 0.6, 12);
        tailpipeGeo.rotateX(Math.PI / 2);
        const leftTailpipe = new THREE.Mesh(tailpipeGeo, chromeMat);
        leftTailpipe.position.set(-0.45, 0.15, -1.38);
        carBodyGroup.add(leftTailpipe);

        const rightTailpipe = leftTailpipe.clone();
        rightTailpipe.position.x = 0.45;
        carBodyGroup.add(rightTailpipe);
    }

    // 8. Rear Tail Brake Lights (Driven by physics engine)
    const tailLightGeo = new THREE.BoxGeometry(0.3, 0.06, 0.04);
    const tailLightMat = new THREE.MeshStandardMaterial({
        color: 0x990000,
        emissive: 0xff0000,
        emissiveIntensity: 0.0,
        roughness: 0.1
    });

    const leftTailLight = new THREE.Mesh(tailLightGeo, tailLightMat);
    leftTailLight.position.set(-0.55, 0.32, -1.36);
    carBodyGroup.add(leftTailLight);

    const rightTailLight = leftTailLight.clone();
    rightTailLight.position.x = 0.55;
    carBodyGroup.add(rightTailLight);

    carBodyGroup.userData = {
        leftLight: leftTailLight,
        rightLight: rightTailLight
    };

    // Rear diffuser lip
    const rearBumperGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.5, 10);
    rearBumperGeo.rotateZ(Math.PI / 2);
    const rearBumper = new THREE.Mesh(rearBumperGeo, chromeMat);
    rearBumper.position.set(0, 0.1, -1.48);
    rearBumper.castShadow = true;
    carBodyGroup.add(rearBumper);

    // 9. Neon Underglow
    if (underglowColor !== null) {
        const underglowGeo = new THREE.PlaneGeometry(1.5, 2.5);
        const underglowMat = new THREE.MeshBasicMaterial({
            color: underglowColor,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
        });
        const underglow = new THREE.Mesh(underglowGeo, underglowMat);
        underglow.rotation.x = -Math.PI / 2;
        underglow.position.set(0, -0.32, 0);
        carBodyGroup.add(underglow);
    }

    // Front & Rear License Plates
    const plateBackingGeo = new THREE.BoxGeometry(0.44, 0.22, 0.02);
    const lpCanvas = document.createElement('canvas');
    lpCanvas.width = 128;
    lpCanvas.height = 64;
    const lpCtx = lpCanvas.getContext('2d');
    lpCtx.fillStyle = '#ffcc00';
    lpCtx.fillRect(0, 0, 128, 64);
    lpCtx.strokeStyle = '#111111';
    lpCtx.lineWidth = 4;
    lpCtx.strokeRect(2, 2, 124, 60);
    lpCtx.fillStyle = '#111111';
    lpCtx.font = 'bold 28px monospace';
    lpCtx.textAlign = 'center';
    lpCtx.textBaseline = 'middle';
    lpCtx.fillText('LVL ' + carLevel, 64, 32);
    
    const lpTex = new THREE.CanvasTexture(lpCanvas);
    const plateTextGeo = new THREE.PlaneGeometry(0.4, 0.18);
    const plateTextMat = new THREE.MeshStandardMaterial({ map: lpTex, roughness: 0.15 });

    const rearPlateGroup = new THREE.Group();
    rearPlateGroup.position.set(0, 0.2, -1.49);
    rearPlateGroup.rotation.y = Math.PI;
    const rearPlateBacking = new THREE.Mesh(plateBackingGeo, chromeMat);
    rearPlateGroup.add(rearPlateBacking);
    const rearPlateText = new THREE.Mesh(plateTextGeo, plateTextMat);
    rearPlateText.position.z = 0.011;
    rearPlateGroup.add(rearPlateText);
    carBodyGroup.add(rearPlateGroup);

    const frontPlateGroup = new THREE.Group();
    frontPlateGroup.position.set(0.4, 0.04, 1.59);
    const frontPlateBacking = new THREE.Mesh(plateBackingGeo, chromeMat);
    frontPlateGroup.add(frontPlateBacking);
    const frontPlateText = new THREE.Mesh(plateTextGeo, plateTextMat);
    frontPlateText.position.z = 0.011;
    frontPlateGroup.add(frontPlateText);
    carBodyGroup.add(frontPlateGroup);

    // 10. Wheels Setup
    const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.38, 18);
    wheelGeo.rotateZ(Math.PI / 2);

    const createCustomWheel = () => {
        const wGroup = new THREE.Group();
        
        // Tire
        const tire = new THREE.Mesh(wheelGeo, tireMat);
        tire.castShadow = true;
        wGroup.add(tire);

        if (wheelType === 0) {
            // Retro Solid White Dish Cover
            const dishGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.39, 14);
            dishGeo.rotateZ(Math.PI / 2);
            const dish = new THREE.Mesh(dishGeo, wheelWhiteMat);
            wGroup.add(dish);

            // Red stripe
            const stripeGeo = new THREE.TorusGeometry(0.22, 0.015, 8, 32);
            stripeGeo.rotateY(Math.PI / 2);
            const stripeOuter = new THREE.Mesh(stripeGeo, new THREE.MeshBasicMaterial({ color: 0xff0055 }));
            stripeOuter.position.x = 0.196;
            wGroup.add(stripeOuter);

            const centerCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 10);
            centerCapGeo.rotateZ(Math.PI / 2);
            const centerCap = new THREE.Mesh(centerCapGeo, chromeMat);
            wGroup.add(centerCap);
        } else if (wheelType === 1) {
            // Sporty Gunmetal Multi-Spoke
            const hubMat = new THREE.MeshPhysicalMaterial({
                color: 0x222225,
                roughness: 0.2,
                metalness: 0.8,
                clearcoat: 1.0
            });
            const hubGeo = new THREE.CylinderGeometry(WHEEL_RADIUS - 0.08, WHEEL_RADIUS - 0.08, 0.39, 16);
            hubGeo.rotateZ(Math.PI / 2);
            const hub = new THREE.Mesh(hubGeo, hubMat);
            wGroup.add(hub);

            const rimTorusGeo = new THREE.TorusGeometry(WHEEL_RADIUS - 0.08, 0.022, 8, 32);
            rimTorusGeo.rotateY(Math.PI / 2);
            const rimOuter = new THREE.Mesh(rimTorusGeo, chromeMat);
            rimOuter.position.x = 0.196;
            wGroup.add(rimOuter);

            const numSpokes = 6;
            const spokeGeo = new THREE.BoxGeometry(0.04, 0.08, WHEEL_RADIUS * 1.6);
            for (let s = 0; s < numSpokes; s++) {
                const angle = (s / numSpokes) * Math.PI;
                const spokeMesh = new THREE.Mesh(spokeGeo, chromeMat);
                spokeMesh.position.x = 0.197;
                spokeMesh.rotation.x = angle;
                wGroup.add(spokeMesh);
            }

            const caliperMat = new THREE.MeshStandardMaterial({ color: 0xff0000 });
            const caliperGeo = new THREE.BoxGeometry(0.08, 0.18, 0.08);
            const caliper = new THREE.Mesh(caliperGeo, caliperMat);
            caliper.position.set(0, 0.18, 0);
            wGroup.add(caliper);
        } else if (wheelType === 2) {
            // Neon Cyan solid disc wheel cover
            const coverGeo = new THREE.CylinderGeometry(WHEEL_RADIUS - 0.04, WHEEL_RADIUS - 0.04, 0.39, 16);
            coverGeo.rotateZ(Math.PI / 2);
            const coverMat = new THREE.MeshStandardMaterial({
                color: 0x111115,
                roughness: 0.1,
                metalness: 0.8
            });
            const cover = new THREE.Mesh(coverGeo, coverMat);
            wGroup.add(cover);

            const neonRingGeo = new THREE.TorusGeometry(WHEEL_RADIUS - 0.08, 0.02, 8, 32);
            neonRingGeo.rotateY(Math.PI / 2);
            const neonRingMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
            const neonRing = new THREE.Mesh(neonRingGeo, neonRingMat);
            neonRing.position.x = 0.197;
            wGroup.add(neonRing);
        } else if (wheelType === 3) {
            // Gold Deep Dish
            const goldAlloyMat = new THREE.MeshPhysicalMaterial({
                color: 0xffd700,
                roughness: 0.15,
                metalness: 0.95,
                clearcoat: 1.0
            });
            const hubGeo = new THREE.CylinderGeometry(WHEEL_RADIUS - 0.06, WHEEL_RADIUS - 0.06, 0.39, 16);
            hubGeo.rotateZ(Math.PI / 2);
            const hub = new THREE.Mesh(hubGeo, goldAlloyMat);
            wGroup.add(hub);

            const centerCapGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.41, 10);
            centerCapGeo.rotateZ(Math.PI / 2);
            const centerCap = new THREE.Mesh(centerCapGeo, chromeMat);
            wGroup.add(centerCap);

            const numSpokes = 8;
            const spokeGeo = new THREE.BoxGeometry(0.03, 0.06, WHEEL_RADIUS * 1.7);
            for (let s = 0; s < numSpokes; s++) {
                const angle = (s / numSpokes) * Math.PI;
                const spokeMesh = new THREE.Mesh(spokeGeo, chromeMat);
                spokeMesh.position.x = 0.198;
                spokeMesh.rotation.x = angle;
                wGroup.add(spokeMesh);
            }
        }

        return wGroup;
    };

    // Place wheels directly on carGroup
    rearLeftWheel = createCustomWheel();
    rearLeftWheel.position.set(-0.95, 0.1, -0.8);
    carGroup.add(rearLeftWheel);

    rearRightWheel = createCustomWheel();
    rearRightWheel.position.set(0.95, 0.1, -0.8);
    carGroup.add(rearRightWheel);

    frontLeftWheel = new THREE.Group();
    frontLeftWheel.position.set(-0.95, 0.1, 0.85);
    const flMesh = createCustomWheel();
    frontLeftWheel.add(flMesh);
    carGroup.add(frontLeftWheel);

    frontRightWheel = new THREE.Group();
    frontRightWheel.position.set(0.95, 0.1, 0.85);
    const frMesh = createCustomWheel();
    frontRightWheel.add(frMesh);
    carGroup.add(frontRightWheel);
}

// ==========================================================================
// 5. Particles Engine (Smoke & Skids)
// ==========================================================================
function spawnSmoke(pos, count = 1, isDust = false) {
    const geo = new THREE.SphereGeometry(isDust ? 0.18 : 0.12, 6, 6);
    const mat = new THREE.MeshBasicMaterial({
        color: isDust ? 0xd0a375 : 0xf0f0f0, // dust color vs white smoke
        transparent: true,
        opacity: 0.7
    });

    for (let i = 0; i < count; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        
        // Spawn slightly offset
        mesh.position.set(
            pos.x + (Math.random() - 0.5) * 0.2,
            pos.y + (Math.random() - 0.5) * 0.1,
            pos.z + (Math.random() - 0.5) * 0.2
        );
        scene.add(mesh);

        particles.push({
            mesh: mesh,
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.05 - (isDust ? 0 : Math.sin(heading) * speed * 0.2),
                0.04 + Math.random() * 0.06,
                (Math.random() - 0.5) * 0.05 - (isDust ? 0 : Math.cos(heading) * speed * 0.2)
            ),
            age: 0,
            maxAge: 35 + Math.floor(Math.random() * 20),
            isDust: isDust
        });
    }
}

function spawnExhaustFire(pos) {
    const geo = new THREE.SphereGeometry(0.1, 4, 4);
    const colors = [0xff3300, 0xffaa00, 0x00ffff]; // orange, yellow, cyan flames
    const color = colors[Math.floor(Math.random() * colors.length)];
    const mat = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0.95
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    scene.add(mesh);
    
    // Spawn velocity: shoots backward (opposite of heading) + upward
    const backX = -Math.sin(heading) * 0.12;
    const backZ = -Math.cos(heading) * 0.12;
    
    particles.push({
        mesh: mesh,
        vel: new THREE.Vector3(
            backX + (Math.random() - 0.5) * 0.04,
            0.02 + Math.random() * 0.06,
            backZ + (Math.random() - 0.5) * 0.04
        ),
        age: 0,
        maxAge: 10 + Math.floor(Math.random() * 8),
        isDust: false,
        isFire: true
    });
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age++;

        // Physics
        p.mesh.position.add(p.vel);
        
        // Fade & Scale
        const ratio = p.age / p.maxAge;
        if (p.isFire) {
            p.mesh.scale.setScalar(1.2 * (1.0 - ratio)); // shrink over time
            p.mesh.material.opacity = 0.95 * (1.0 - ratio);
        } else {
            p.mesh.scale.setScalar(1.0 + ratio * (p.isDust ? 2.5 : 1.8));
            p.mesh.material.opacity = 0.7 * (1.0 - ratio);
        }

        // Floating upward drift
        p.vel.y *= 0.96;
        p.vel.x += (Math.random() - 0.5) * 0.005;

        // Cleanup expired
        if (p.age >= p.maxAge) {
            scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            p.mesh.material.dispose();
            particles.splice(i, 1);
        }
    }
}

// ==========================================================================
// 6. User Control Listeners & Events (Invisible Joystick / Brake)
// ==========================================================================
let activeTouchId = null;
let brakeTouchId = null;
let joystickCenter = { x: 0, y: 0 };
let cachedRightZoneBounds = null;

function setupControlListeners() {
    // 1. Start Engine Button Click
    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        audio.init();
        audio.startEngineSequence();
        
        isPlaying = true;
        
        // Zoom-in camera start animation
        camera.position.set(0, 30, 100);
        
        startScreen.classList.add('hidden');
    });

    // 3. Mute Toggle
    muteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isMuted = audio.toggleMute();
        muteBtn.innerHTML = isMuted ? '<i class="fa-solid fa-volume-xmark"></i>' : '<i class="fa-solid fa-volume-high"></i>';
    });

    // 4. Reset Button
    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetCar();
    });

    // 4.5. Upgrade Button Click
    const upgradeBtn = document.getElementById('upgradeBtn');
    if (upgradeBtn) {
        upgradeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            performUpgrade();
        });
    }

    // 5. Touch / Pointer Event mapping for Simulated Dual-Controls
    // Right Zone: Invisible virtual joystick
    rightZone.addEventListener('pointerdown', (e) => {
        if (!isPlaying || !screenActive) return;
        if (activeTouchId !== null) return; // single touch on joystick
        e.preventDefault();

        activeTouchId = e.pointerId;
        rightZone.setPointerCapture(e.pointerId);

        isDriving = true;

        // Visual Joystick placement inside Screen coordinate bounds (scaled for transform support)
        cachedRightZoneBounds = rightZone.getBoundingClientRect();
        const bounds = cachedRightZoneBounds;
        const scale = bounds.width / rightZone.offsetWidth || 1;
        const localX = (e.clientX - bounds.left) / scale;
        const localY = (e.clientY - bounds.top) / scale;

        joystickCenter = { x: localX, y: localY };

        // Position ring container
        joyRing.style.left = `${localX}px`;
        joyRing.style.top = `${localY}px`;
        joyRing.style.display = 'flex';

        // Reset dot translate
        joyDot.style.transform = 'translate(0px, 0px)';
    });

    rightZone.addEventListener('pointermove', (e) => {
        if (activeTouchId !== e.pointerId || !isDriving) return;
        e.preventDefault();

        // Use cached bounds to prevent browser reflows (huge performance fix!)
        if (!cachedRightZoneBounds) {
            cachedRightZoneBounds = rightZone.getBoundingClientRect();
        }
        const bounds = cachedRightZoneBounds;
        const scale = bounds.width / rightZone.offsetWidth || 1;
        const localX = (e.clientX - bounds.left) / scale;
        const localY = (e.clientY - bounds.top) / scale;

        // Calculate drag offset
        let dx = localX - joystickCenter.x;
        let dy = localY - joystickCenter.y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        const maxRadius = 42; // Max pixel stretch

        if (dist > maxRadius) {
            dx = (dx / dist) * maxRadius;
            dy = (dy / dist) * maxRadius;
        }

        // Move dot visually
        joyDot.style.transform = `translate(${dx}px, ${dy}px)`;

        // Normalize input drives (-1.0 to 1.0)
        driveInputX = dx / maxRadius;
        driveInputY = dy / maxRadius; // drag up (negative dy) -> negative input Y (moves car along -Z away from camera)
    });

    const releaseJoystick = (e) => {
        if (activeTouchId !== e.pointerId) return;
        activeTouchId = null;
        isDriving = false;
        driveInputX = 0;
        driveInputY = 0;
        joyRing.style.display = 'none';
    };

    rightZone.addEventListener('pointerup', releaseJoystick);
    rightZone.addEventListener('pointercancel', releaseJoystick);

    // 6. Keyboard Desktop Controls
    window.addEventListener('keydown', (e) => {
        if (!isPlaying || !screenActive) return;
        
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
                keyDriveY = -1.0; // drives car along -Z (away from camera)
                break;
            case 'ArrowDown':
            case 'KeyS':
                keyDriveY = 1.0; // drives car along +Z (toward camera)
                break;
            case 'ArrowLeft':
            case 'KeyA':
                keyDriveX = -1.0;
                break;
            case 'ArrowRight':
            case 'KeyD':
                keyDriveX = 1.0;
                break;
            case 'KeyH':
                audio.playHonk();
                break;
        }
    });

    window.addEventListener('keyup', (e) => {
        switch (e.code) {
            case 'ArrowUp':
            case 'KeyW':
            case 'ArrowDown':
            case 'KeyS':
                keyDriveY = 0;
                break;
            case 'ArrowLeft':
            case 'KeyA':
            case 'ArrowRight':
            case 'KeyD':
                keyDriveX = 0;
                break;
        }
    });

    // 7. Camera Swipe-to-Rotate Control (Top Area)
    const cameraZone = document.getElementById('cameraZone');
    const iphoneScreen = document.body;
    let isRotatingCamera = false;
    let lastRotateX = 0;
    let lastRotateY = 0;

    cameraZone.addEventListener('pointerdown', (e) => {
        if (!isPlaying || !screenActive) return;
        if (Object.keys(activePointers).length >= 2) return; // Ignore if zooming

        isRotatingCamera = true;
        cameraZone.setPointerCapture(e.pointerId);
        lastRotateX = e.clientX;
        lastRotateY = e.clientY;
    });

    cameraZone.addEventListener('pointermove', (e) => {
        if (!isRotatingCamera || Object.keys(activePointers).length >= 2) return;

        const dx = e.clientX - lastRotateX;
        const dy = e.clientY - lastRotateY;

        // Orbit calculation
        cameraYaw -= dx * 0.0075;
        cameraPitch = Math.max(0.12, Math.min(Math.PI / 2.1, cameraPitch + dy * 0.0075));

        lastRotateX = e.clientX;
        lastRotateY = e.clientY;
    });

    const releaseCameraRotation = (e) => {
        isRotatingCamera = false;
    };
    cameraZone.addEventListener('pointerup', releaseCameraRotation);
    cameraZone.addEventListener('pointercancel', releaseCameraRotation);

    // Helper to calculate distance between two pointer touches
    function getPinchDist(pts) {
        const ids = Object.keys(pts);
        const p1 = pts[ids[0]];
        const p2 = pts[ids[1]];
        const dx = p1.x - p2.x;
        const dy = p1.y - p2.y;
        return Math.sqrt(dx*dx + dy*dy);
    }

    // 8. Pinch-to-Zoom Multitouch listeners (Active anywhere inside the screen)
    iphoneScreen.addEventListener('pointerdown', (e) => {
        if (!isPlaying || !screenActive) return;
        
        activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        
        if (Object.keys(activePointers).length === 2) {
            initialPinchDist = getPinchDist(activePointers);
            initialCameraRadius = cameraRadius;
            
            // Abort current driving inputs while zooming
            isDriving = false;
            isBraking = false;
            driveInputX = 0;
            driveInputY = 0;
            if (activeTouchId !== null) {
                joyRing.style.display = 'none';
                activeTouchId = null;
            }
            if (brakeTouchId !== null) {
                if (leftZone) leftZone.classList.remove('brake-active');
                brakeTouchId = null;
            }
        }
    });

    iphoneScreen.addEventListener('pointermove', (e) => {
        if (activePointers[e.pointerId]) {
            activePointers[e.pointerId] = { x: e.clientX, y: e.clientY };
        }

        if (Object.keys(activePointers).length === 2 && initialPinchDist) {
            const currentDist = getPinchDist(activePointers);
            if (currentDist > 5) {
                const ratio = initialPinchDist / currentDist;
                cameraRadius = Math.max(8, Math.min(65, initialCameraRadius * ratio));
            }
        }
    });

    const removePointer = (e) => {
        delete activePointers[e.pointerId];
        if (Object.keys(activePointers).length < 2) {
            initialPinchDist = null;
        }
    };
    iphoneScreen.addEventListener('pointerup', removePointer);
    iphoneScreen.addEventListener('pointercancel', removePointer);

    // 9. Desktop Mouse Wheel Zoom Support
    iphoneScreen.addEventListener('wheel', (e) => {
        if (!isPlaying || !screenActive) return;
        cameraRadius = Math.max(8, Math.min(65, cameraRadius + e.deltaY * 0.035));
    }, { passive: true });
}

function resetCar() {
    if (!carGroup) return;
    carGroup.position.set(0, 0.35, 75);
    speed = 0;
    heading = 0;
    steerAngle = 0;
    carGroup.rotation.set(0, 0, 0);
    carBodyGroup.rotation.set(0, 0, 0);
    audio.playHonk();
}

// Helper to wrap angle bounds efficiently
function angleDiff(a, b) {
    const diff = b - a;
    return Math.atan2(Math.sin(diff), Math.cos(diff));
}

// Resolution for collisions against trees, rocks and world obstacles
function resolveCollisions() {
    if (!carGroup) return;
    const carRadius = 0.7; // Base car half-width

    for (let i = 0; i < obstacles.length; i++) {
        const obs = obstacles[i];
        const dx = carGroup.position.x - obs.x;
        const dz = carGroup.position.z - obs.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 0.001;
        const minDist = carRadius + obs.radius;

        if (dist < minDist) {
            // Push car fully outside the obstacle
            const overlap = (minDist - dist) + 0.05; // small padding to prevent re-entry
            const nx = dx / dist;
            const nz = dz / dist;

            carGroup.position.x += nx * overlap;
            carGroup.position.z += nz * overlap;

            // Cancel the velocity component going INTO the obstacle (dot product)
            // This stops the car cleanly instead of a glitchy bounce
            const dot = speed * (Math.sin(heading) * (-nx) + Math.cos(heading) * (-nz));
            if (dot > 0) {
                speed *= 0.05; // nearly stop if heading into wall
            } else {
                speed *= 0.4; // sliding away — allow some bleed
            }

            if (Math.abs(speed) > 0.5) cameraShake = 0.6;
        }
    }
}

// ==========================================================================
// 7. Core Game Loop & Physics Update
// ==========================================================================
function updatePhysics() {
    if (!isPlaying || !screenActive) return;

    // A. Resolve Combined Inputs (Joystick + Keyboard)
    let finalInputX = driveInputX + keyDriveX;
    let finalInputY = driveInputY + keyDriveY;
    
    // Clamp composite input magnitude to 1.0 max
    let inputMag = Math.sqrt(finalInputX * finalInputX + finalInputY * finalInputY);
    if (inputMag > 1.0) {
        finalInputX /= inputMag;
        finalInputY /= inputMag;
        inputMag = 1.0;
    }

    const hasInput = inputMag > 0.08;

    // B. Steering & Rotational Heading Logic
    if (hasInput && !isBraking) {
        // Calculate camera forward and right vectors in horizontal X-Z plane
        const camForwardX = -Math.sin(cameraYaw);
        const camForwardZ = -Math.cos(cameraYaw);
        const camRightX = Math.cos(cameraYaw);
        const camRightZ = -Math.sin(cameraYaw);

        // Project inputs relative to camera perspective
        // Pushing UP (negative finalInputY) moves in camera forward direction.
        // Pushing DOWN (positive finalInputY) moves in camera backward direction.
        const moveVectorX = (finalInputX * camRightX) - (finalInputY * camForwardX);
        const moveVectorZ = (finalInputX * camRightZ) - (finalInputY * camForwardZ);

        // Calculate target heading angle based on visual move vector
        const targetHeading = Math.atan2(moveVectorX, moveVectorZ);
        
        // Shortest angle turn wrap
        const diff = angleDiff(heading, targetHeading);
        
        // Turn speed scales down slightly at maximum speed for control
        const turnSpeed = 0.085 * (1.0 - (speed / MAX_SPEED) * 0.25);
        heading += diff * turnSpeed;

        // Front steering visual wheel angling
        // Maps current steering frame yaw deflection (clamped +/- 32 degrees)
        const visualSteerTarget = Math.max(-0.55, Math.min(0.55, diff * 1.5));
        steerAngle = THREE.MathUtils.lerp(steerAngle, visualSteerTarget, 0.18);

        // Accelerate car
        speed += ACCELERATION * inputMag;
        if (speed > MAX_SPEED) speed = MAX_SPEED;
    } else {
        // Return front wheels to center alignment
        steerAngle = THREE.MathUtils.lerp(steerAngle, 0.0, 0.15);
        
        // Natural rolling friction deceleration
        speed *= DRAG;
        if (speed < 0.002) speed = 0;
    }

    // C. Resolve Brake decelerations (Brakes are disabled, keeping for physics drag compatibility)
    if (isBraking) {
        speed = Math.max(0.0, speed - BRAKE_DECEL);
    }

    // D. Update Position coordinates based on Heading & Speed
    // Move along current car heading
    const moveX = Math.sin(heading) * speed;
    const moveZ = Math.cos(heading) * speed;

    carGroup.position.x += moveX;
    carGroup.position.z += moveZ;
    
    // Resolve any obstacle or plant collisions before committing rotation
    resolveCollisions();

    // Check river crossing and Bridge Y tracking
    const riverX = getRiverX(carGroup.position.z);
    let targetY = 0;

    if (Math.abs(carGroup.position.x - riverX) < 16) {
        let onBridge = false;
        let activeBridge = null;
        for (let i = 0; i < bridges.length; i++) {
            const b = bridges[i];
            if (Math.abs(carGroup.position.z - b.z) < (b.widthZ / 2) + 2.5 &&
                Math.abs(carGroup.position.x - b.x) < (b.widthX / 2) + 2.5) {
                onBridge = true;
                activeBridge = b;
                break;
            }
        }

        if (onBridge && activeBridge) {
            // Calculate height on arch. Bridge is aligned along X axis.
            // Bridge length is 32 (spanning X). b.x is the center.
            const localX = carGroup.position.x - activeBridge.x;
            const bridgeLen = 32.0;
            const t = localX / bridgeLen; // normalizes roughly to [-0.5, 0.5]
            if (Math.abs(t) <= 0.55) {
                // Same cosine arch equation from createArmoredBridge
                targetY = 0.5 + 1.2 * (1 - 4 * t * t) + 0.35 / 2;
            }
        } else {
            speed *= 0.85; // High drag in water
            if (speed > 0.02 && Math.random() < 0.3) {
                spawnSmoke(carGroup.position, 1, false); // Water splash proxy
            }
        }
    }

    // Smoothly interpolate car Y position to climb up/down the bridge or ground
    carGroup.position.y += (targetY - carGroup.position.y) * 0.25;

    // Check coin collisions
    const carRadius = 1.6;
    const coinCollectRadius = carRadius + 0.8; // 2.4 units
    for (let i = coins.length - 1; i >= 0; i--) {
        const coin = coins[i];
        const dx = carGroup.position.x - coin.position.x;
        const dz = carGroup.position.z - coin.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist < coinCollectRadius) {
            collectCoin(coin, i);
        }
    }
    
    carGroup.rotation.y = heading;

    // Keep car locked within boundary boundary circle
    const currentDist = Math.sqrt(carGroup.position.x * carGroup.position.x + carGroup.position.z * carGroup.position.z);
    if (currentDist > 252) {
        // bounce back slightly
        carGroup.position.x = (carGroup.position.x / currentDist) * 252;
        carGroup.position.z = (carGroup.position.z / currentDist) * 252;
        speed *= -0.25; // bouncy collision!
    }

    // E. Visual wheel rotations
    // Spin wheels proportional to actual linear movement speed
    const rotationIncrement = speed / WHEEL_RADIUS;
    
    // Rotate the entire group for rear wheels (spins tire + solid white dish + chrome caps)
    rearLeftWheel.rotation.x += rotationIncrement;
    rearRightWheel.rotation.x += rotationIncrement;
    frontLeftWheel.children[0].rotation.x += rotationIncrement;
    frontRightWheel.children[0].rotation.x += rotationIncrement;

    // Turn front steering pivot wheel frames
    frontLeftWheel.rotation.y = steerAngle;
    frontRightWheel.rotation.y = steerAngle;

    // F. Disney Suspension Lean (Roll, Pitch, and Idle Breathing)
    const timeNow = Date.now();
    
    // 1. Idle Engine Breath (Soft bounce)
    let suspensionY = 0;
    let idlePitchOffset = 0;
    if (speed < 0.01) {
        suspensionY = Math.sin(timeNow * 0.012) * 0.022;
        // Cute tail wiggle
        carBodyGroup.rotation.y = Math.sin(timeNow * 0.008) * 0.015;
    } else {
        carBodyGroup.rotation.y = 0;
    }

    // 2. Acceleration / Deceleration Pitch (X-axis tilt)
    let targetPitch = 0;
    if (isBraking && speed > 0.02) {
        targetPitch = 0.13; // Nose dives forward hard
    } else if (hasInput) {
        // Squats back slightly on acceleration
        targetPitch = -speed * 0.12;
    }
    carBodyGroup.rotation.x = THREE.MathUtils.lerp(carBodyGroup.rotation.x, targetPitch, 0.14);

    // 3. Cornering Body Roll (Z-axis tilt)
    // Centrifugal roll tilt - leans OUT into the turn for cool animation action
    const targetRoll = -steerAngle * speed * 0.65;
    carBodyGroup.rotation.z = THREE.MathUtils.lerp(carBodyGroup.rotation.z, targetRoll, 0.15);

    // Position adjustment for suspension body height
    carBodyGroup.position.y = suspensionY;

    // G. Expressive Eyes Animations
    // Look left/right depending on steer rotation
    const targetPupilX = -steerAngle * 0.15;
    leftPupil.position.x = THREE.MathUtils.lerp(leftPupil.position.x, -0.3 + targetPupilX, 0.15);
    rightPupil.position.x = THREE.MathUtils.lerp(rightPupil.position.x, 0.3 + targetPupilX, 0.15);

    // Squint/height adjustment during braking (Surprise eyes!)
    const targetPupilY = isBraking && speed > 0.05 ? 0.05 : 0.0;
    leftPupil.position.y = THREE.MathUtils.lerp(leftPupil.position.y, targetPupilY, 0.15);
    rightPupil.position.y = THREE.MathUtils.lerp(rightPupil.position.y, targetPupilY, 0.15);

    // Blinking mechanism
    if (!isBlinking && timeNow - lastBlink > 4000 + Math.random() * 4000) {
        isBlinking = true;
        lastBlink = timeNow;
    }

    if (isBlinking) {
        const elapsedBlink = timeNow - lastBlink;
        if (elapsedBlink < blinkDuration) {
            // scale down Y
            blinkScaleY = THREE.MathUtils.lerp(1.0, 0.05, elapsedBlink / (blinkDuration / 2));
        } else if (elapsedBlink < blinkDuration * 2) {
            // scale back up Y
            blinkScaleY = THREE.MathUtils.lerp(0.05, 1.0, (elapsedBlink - blinkDuration) / (blinkDuration / 2));
        } else {
            isBlinking = false;
            blinkScaleY = 1.0;
        }
        
        leftPupil.parent.children[0].scale.y = blinkScaleY; // Left White
        leftPupil.parent.children[1].scale.y = blinkScaleY; // Right White
        leftPupil.scale.y = blinkScaleY; // Left Pupil
        rightPupil.scale.y = blinkScaleY; // Right Pupil
    }

    // H. Exhaust Smoke/Fire Puffs
    if (speed > 0.02 && timeNow % 6 < 2) {
        // Spawn smoke or fire depending on level
        let pipeL, pipeR;
        if (carLevel === 2) {
            pipeL = new THREE.Vector3(-0.92, 0.16, -0.6).applyMatrix4(carBodyGroup.matrixWorld);
            pipeR = new THREE.Vector3(0.92, 0.16, -0.6).applyMatrix4(carBodyGroup.matrixWorld);
        } else {
            pipeL = new THREE.Vector3(-0.45, 0.15, -1.5).applyMatrix4(carBodyGroup.matrixWorld);
            pipeR = new THREE.Vector3(0.45, 0.15, -1.5).applyMatrix4(carBodyGroup.matrixWorld);
        }

        if (carLevel === 4) {
            spawnExhaustFire(pipeL);
            spawnExhaustFire(pipeR);
        } else {
            spawnSmoke(pipeL, 1, false);
            spawnSmoke(pipeR, 1, false);
        }
    }

    // I. Brake Skid dust clouds & skid marks
    const tailLights = carBodyGroup.userData;
    if (isBraking && speed > 0.05) {
        // Turn tail brake lights bright neon red
        tailLights.leftLight.material.emissiveIntensity = 4.0;
        tailLights.rightLight.material.emissiveIntensity = 4.0;

        // Spawn tire dust particles at rear tires contact patch
        const tireL = new THREE.Vector3(-1.0, 0.0, -0.85).applyMatrix4(carGroup.matrixWorld);
        const tireR = new THREE.Vector3(1.0, 0.0, -0.85).applyMatrix4(carGroup.matrixWorld);
        spawnSmoke(tireL, 1, true);
        spawnSmoke(tireR, 1, true);
    } else {
        tailLights.leftLight.material.emissiveIntensity = 0.0;
        tailLights.rightLight.material.emissiveIntensity = 0.0;
    }

    // J. Update HUD widgets (Optimized to prevent DOM layout recalculations)
    const mph = Math.round(speed * 120);
    if (speedVal && speedVal.textContent !== mph.toString()) {
        speedVal.textContent = mph;
    }
    
    // Gear shift text based on speed thresholds
    let currentGear = 'N';
    if (isBraking && speed > 0.02) {
        currentGear = 'B';
    } else if (speed === 0) {
        currentGear = 'N';
    } else {
        const gear = Math.min(4, Math.floor(speed * 10) + 1);
        currentGear = gear.toString();
    }
    if (gearVal && gearVal.textContent !== currentGear) {
        gearVal.textContent = currentGear;
    }

    // K. Sound synthesis pitch modulations
    const speedRatio = speed / MAX_SPEED;
    audio.updateEngineSound(speedRatio);
    audio.updateBrakingSound(isBraking, speed);
}

function updateCamera() {
    if (!carGroup) return;

    let targetCamPos;
    
    if (!isPlaying) {
        // Dramatic revolving start sweep before engine tap
        const time = Date.now() * 0.0003;
        const orbitRadius = 140;
        targetCamPos = new THREE.Vector3(
            Math.sin(time) * orbitRadius,
            40,
            Math.cos(time) * orbitRadius
        );
        camera.position.lerp(targetCamPos, 0.05);
        camera.lookAt(0, 5, 0);
    } else {
        // 1. Recenter camera automatically while moving
        if (speed > 0.02) {
            // Recenter behind the car's heading.
            // Target yaw is heading + Math.PI (opposite of car forward direction)
            const diff = angleDiff(cameraYaw, heading + Math.PI);
            cameraYaw += diff * 0.015; // smooth auto recenter (slow pan)
            
            // Lerp pitch back to default
            cameraPitch = THREE.MathUtils.lerp(cameraPitch, defaultPitch, 0.015);
        }

        // 2. Calculate offset coordinates from spherical coordinates
        const camOffsetX = Math.sin(cameraYaw) * Math.cos(cameraPitch) * cameraRadius;
        const camOffsetY = Math.sin(cameraPitch) * cameraRadius;
        const camOffsetZ = Math.cos(cameraYaw) * Math.cos(cameraPitch) * cameraRadius;

        targetCamPos = carGroup.position.clone().add(new THREE.Vector3(camOffsetX, camOffsetY, camOffsetZ));
        
        // Smooth lerp (lag) feels fluid and professional
        camera.position.lerp(targetCamPos, 0.08);

        // Apply Screen Shake
        if (cameraShake > 0) {
            camera.position.x += (Math.random() - 0.5) * cameraShake;
            camera.position.y += (Math.random() - 0.5) * cameraShake;
            camera.position.z += (Math.random() - 0.5) * cameraShake;
            cameraShake *= 0.8;
            if (cameraShake < 0.05) cameraShake = 0;
        }

        camera.lookAt(carGroup.position.x, carGroup.position.y + 1.2, carGroup.position.z);
    }
}

function updateEntities() {
    // Spin clouds
    clouds.forEach(c => {
        c.position.x += c.userData.speed;
        
        // Wrap around boundaries
        if (c.position.x > 180) {
            c.position.x = -180;
            c.position.z = (Math.random() - 0.5) * 240;
        }
    });

    // Spin and float coins
    const timeNow = Date.now();
    coins.forEach(c => {
        c.rotation.y += 0.04;
        c.position.y = 0.6 + Math.sin(timeNow * 0.005 + c.position.x) * 0.15;
    });

    // Update floating texts
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        const ft = floatingTexts[i];
        ft.age++;
        ft.sprite.position.y += 0.02;
        ft.sprite.material.opacity = 1.0 - (ft.age / ft.maxAge);
        if (ft.age >= ft.maxAge) {
            scene.remove(ft.sprite);
            ft.sprite.material.map.dispose();
            ft.sprite.material.dispose();
            floatingTexts.splice(i, 1);
        }
    }

    // Update smoke/skid particles
    updateParticles();
}

function drawMinimap() {
    const canvas = document.getElementById('minimapCanvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Map world [-260,260] -> canvas [0,w]
    const mX = (val) => (val + 260) / 520 * w;
    const mZ = (val) => (val + 260) / 520 * h;

    // --- Background: grass zones ---
    ctx.fillStyle = '#228B22'; // Forest Green
    ctx.fillRect(0, 0, w, h);

    // River (blue fill)
    ctx.fillStyle = '#1a6fc4';
    ctx.beginPath();
    // Left bank path
    for (let z = -260; z <= 260; z += 8) {
        const rx = getRiverX(z) - 13;
        if (z === -260) ctx.moveTo(mX(rx), mZ(z));
        else ctx.lineTo(mX(rx), mZ(z));
    }
    // Right bank path (reverse)
    for (let z = 260; z >= -260; z -= 8) {
        const rx = getRiverX(z) + 13;
        ctx.lineTo(mX(rx), mZ(z));
    }
    ctx.closePath();
    ctx.fill();

    // River shimmer highlight
    ctx.strokeStyle = 'rgba(100,200,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let z = -260; z <= 260; z += 8) {
        const rx = getRiverX(z) - 3;
        if (z === -260) ctx.moveTo(mX(rx), mZ(z));
        else ctx.lineTo(mX(rx), mZ(z));
    }
    ctx.stroke();

    // Draw obstacles (rocks and trees)
    obstacles.forEach(obs => {
        const rad = obs.radius * (w / 520);
        ctx.beginPath();
        ctx.arc(mX(obs.x), mZ(obs.z), Math.max(1.5, rad), 0, Math.PI * 2);
        if (obs.type === 'rock') {
            ctx.fillStyle = '#222222'; // Dark grey for rocks
        } else {
            ctx.fillStyle = '#4CBB17'; // Kelly Green for trees
        }
        ctx.fill();
    });

    // Bridges
    ctx.fillStyle = '#8b6340';
    bridges.forEach(b => {
        const bw = (b.widthX * w) / 520;
        const bh = (b.widthZ * h) / 520;
        ctx.fillRect(mX(b.x) - bw / 2, mZ(b.z) - bh / 2, bw, bh);
    });

    // Coins (gold dots)
    ctx.fillStyle = '#ffd700';
    coins.forEach(c => {
        ctx.beginPath();
        ctx.arc(mX(c.position.x), mZ(c.position.z), 1.5, 0, Math.PI * 2);
        ctx.fill();
    });

    // Car player dot + heading arrow
    if (carGroup) {
        const px = mX(carGroup.position.x);
        const pz = mZ(carGroup.position.z);

        // Glow ring
        ctx.beginPath();
        ctx.arc(px, pz, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,80,80,0.35)';
        ctx.fill();

        // Car dot
        ctx.beginPath();
        ctx.arc(px, pz, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#ff3030';
        ctx.fill();

        // Direction arrow
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px, pz);
        ctx.lineTo(px + Math.sin(heading) * 7, pz + Math.cos(heading) * 7);
        ctx.stroke();
    }

    // Circular clip mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, w / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
}

// Main Game Render Loop
let _animClock = 0;
function animate() {
    requestAnimationFrame(animate);

    // Tick river water shader time
    _animClock += 0.016;
    if (riverMaterial) riverMaterial.uniforms.uTime.value = _animClock;

    // Engine updates
    updatePhysics();
    updateEntities();
    updateCamera();

    // Render viewport
    renderer.render(scene, camera);

    // Draw Minimap
    drawMinimap();
}

// Initial Kick-off
initEngine();
setupControlListeners();
