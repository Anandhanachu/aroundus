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
        this.engineOsc1 = null;
        this.engineOsc2 = null;
        this.engineGain = null;
        this.idleFilter = null;
        
        this.screechOsc = null;
        this.screechGain = null;
        this.screechFilter = null;
        
        this.muted = false;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;

        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();

            // Main Engine hum chain
            this.engineOsc1 = this.ctx.createOscillator();
            this.engineOsc2 = this.ctx.createOscillator();
            this.engineGain = this.ctx.createGain();
            this.idleFilter = this.ctx.createBiquadFilter();

            // Oscillator 1 - Sawtooth for rough engine vibrations
            this.engineOsc1.type = 'sawtooth';
            this.engineOsc1.frequency.setValueAtTime(40, this.ctx.currentTime);

            // Oscillator 2 - Triangle for a warm body rumble
            this.engineOsc2.type = 'triangle';
            this.engineOsc2.frequency.setValueAtTime(80, this.ctx.currentTime);

            // Lowpass filter to make it sound muffled/cartoonish
            this.idleFilter.type = 'lowpass';
            this.idleFilter.frequency.setValueAtTime(140, this.ctx.currentTime);

            this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            // Connections
            this.engineOsc1.connect(this.idleFilter);
            this.engineOsc2.connect(this.idleFilter);
            this.idleFilter.connect(this.engineGain);
            this.engineGain.connect(this.ctx.destination);

            this.engineOsc1.start();
            this.engineOsc2.start();

            // Brake Screech chain
            this.screechOsc = this.ctx.createOscillator();
            this.screechGain = this.ctx.createGain();
            this.screechFilter = this.ctx.createBiquadFilter();

            this.screechOsc.type = 'triangle';
            this.screechOsc.frequency.setValueAtTime(1800, this.ctx.currentTime);

            this.screechFilter.type = 'bandpass';
            this.screechFilter.frequency.setValueAtTime(2000, this.ctx.currentTime);
            this.screechFilter.Q.setValueAtTime(2.0, this.ctx.currentTime);

            this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

            this.screechOsc.connect(this.screechFilter);
            this.screechFilter.connect(this.screechGain);
            this.screechGain.connect(this.ctx.destination);

            this.screechOsc.start();

            this.initialized = true;
            console.log("Audio Engine Initialized Successfully.");
        } catch (e) {
            console.warn("Web Audio API not supported or blocked: ", e);
        }
    }

    startEngineSequence() {
        if (!this.initialized) this.init();
        if (this.muted || !this.ctx) return;

        // Resume context if suspended (browser security)
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }

        const now = this.ctx.currentTime;

        // Rev Up Sound Sequence
        this.engineGain.gain.setValueAtTime(0.0, now);
        this.engineGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        this.engineGain.gain.exponentialRampToValueAtTime(0.07, now + 1.2);

        this.engineOsc1.frequency.setValueAtTime(35, now);
        this.engineOsc1.frequency.exponentialRampToValueAtTime(190, now + 0.4);
        this.engineOsc1.frequency.exponentialRampToValueAtTime(55, now + 1.2);

        this.engineOsc2.frequency.setValueAtTime(70, now);
        this.engineOsc2.frequency.exponentialRampToValueAtTime(380, now + 0.4);
        this.engineOsc2.frequency.exponentialRampToValueAtTime(110, now + 1.2);

        this.idleFilter.frequency.setValueAtTime(120, now);
        this.idleFilter.frequency.exponentialRampToValueAtTime(450, now + 0.4);
        this.idleFilter.frequency.exponentialRampToValueAtTime(160, now + 1.2);
    }

    updateEngineSound(speedRatio) {
        if (!this.initialized || this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Map pitch: 55Hz (idle) to 200Hz (full throttle)
        const targetPitch = 55 + (speedRatio * 145);
        this.engineOsc1.frequency.setTargetAtTime(targetPitch, now, 0.08);
        this.engineOsc2.frequency.setTargetAtTime(targetPitch * 2, now, 0.08);

        // Filter opens up as speed increases, letting high frequencies out
        const filterCutoff = 150 + (speedRatio * 600);
        this.idleFilter.frequency.setTargetAtTime(filterCutoff, now, 0.1);

        // Volume rises slightly at speed
        const volume = 0.06 + (speedRatio * 0.08);
        this.engineGain.gain.setTargetAtTime(volume, now, 0.15);
    }

    updateBrakingSound(isBraking, speed) {
        if (!this.initialized || this.muted || !this.ctx) return;

        const now = this.ctx.currentTime;
        if (isBraking && speed > 0.05) {
            // Volume modulated by vehicle speed
            const targetVolume = Math.min(speed * 0.2, 0.08);
            this.screechGain.gain.setTargetAtTime(targetVolume, now, 0.05);

            // Frequency drops slightly as car stops
            const targetScreechFreq = 1600 + (speed * 800);
            this.screechOsc.frequency.setTargetAtTime(targetScreechFreq, now, 0.05);
            this.screechFilter.frequency.setTargetAtTime(targetScreechFreq + 200, now, 0.05);
        } else {
            this.screechGain.gain.setTargetAtTime(0.0, now, 0.05);
        }
    }

    playHonk() {
        if (!this.initialized || this.muted || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        const osc1 = this.ctx.createOscillator();
        const osc2 = this.ctx.createOscillator();
        const honkGain = this.ctx.createGain();

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(392, now); // G4 Note
        
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(395, now); // De-tuned for cartoon beep

        honkGain.gain.setValueAtTime(0, now);
        honkGain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        honkGain.gain.setValueAtTime(0.12, now + 0.18);
        honkGain.gain.linearRampToValueAtTime(0, now + 0.22);
        honkGain.gain.setValueAtTime(0, now + 0.25);
        honkGain.gain.linearRampToValueAtTime(0.12, now + 0.27);
        honkGain.gain.setValueAtTime(0.12, now + 0.43);
        honkGain.gain.linearRampToValueAtTime(0, now + 0.47);

        osc1.connect(honkGain);
        osc2.connect(honkGain);
        honkGain.connect(this.ctx.destination);

        osc1.start();
        osc2.start();
        osc1.stop(now + 0.5);
        osc2.stop(now + 0.5);
    }

    toggleMute() {
        this.muted = !this.muted;
        if (this.muted) {
            if (this.engineGain) this.engineGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
            if (this.screechGain) this.screechGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
        } else {
            if (this.engineGain) this.engineGain.gain.setValueAtTime(0.07, this.ctx.currentTime);
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
let sunLight;

// Game State
let isPlaying = false;
let screenActive = true;
let speed = 0;
let heading = 0;
let steerAngle = 0;

// Config Constants
const ACCELERATION = 0.007;
const BRAKE_DECEL = 0.016;
const DRAG = 0.955;
const MAX_SPEED = 0.45;
const WHEEL_RADIUS = 0.45;

// Inputs
let driveInputX = 0; // Joystick X (-1 to 1)
let driveInputY = 0; // Joystick Y (-1 to 1)
let keyDriveX = 0;   // Keyboard X
let keyDriveY = 0;   // Keyboard Y
let isBraking = false;
let isDriving = false;

// Entities
const particles = [];
const clouds = [];
const cacti = [];
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
const powerBtn = document.getElementById('powerBtn');
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
    // Scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x80c5de); // Stylized desert sky
    scene.fog = new THREE.FogExp2(0x80c5de, 0.007); // Soft horizon fading

    // Camera
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.copy(cameraOffset);

    // Renderer
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(window.devicePixelRatio);
    resizeCanvas();

    // Lights
    const ambientLight = new THREE.AmbientLight(0xfff3e0, 0.5); // Warm desert tint
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x80c5de, 0xe0a96d, 0.4);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xfff3e0, 0.8);
    sunLight.position.set(40, 60, 20);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 0.5;
    sunLight.shadow.camera.far = 250;
    
    // Bounds for directional shadows (keeps them crisp near the car)
    const d = 60;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    // Cool-toned fill light from opposite side for premium 3D contrast
    const fillLight = new THREE.DirectionalLight(0x80c5de, 0.45);
    fillLight.position.set(-40, 30, -20);
    scene.add(fillLight);

    // Build the World
    createDesertFloor();
    createDesertBoundary();
    createCuteCacti();
    createClouds();
    createRoadDecorations();

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
function createDesertFloor() {
    // Generate Ground Texture Procedurally
    const canvasTex = document.createElement('canvas');
    canvasTex.width = 1024;
    canvasTex.height = 1024;
    const ctx = canvasTex.getContext('2d');

    // 1. Sand color base
    ctx.fillStyle = '#e6b882';
    ctx.fillRect(0, 0, 1024, 1024);

    // 2. Add soft sand variations (dust paths)
    ctx.fillStyle = '#dfac75';
    for (let i = 0; i < 40; i++) {
        ctx.beginPath();
        const rx = Math.random() * 1024;
        const ry = Math.random() * 1024;
        const rad = 40 + Math.random() * 80;
        ctx.arc(rx, ry, rad, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3. Draw racetrack (Oval ring)
    ctx.beginPath();
    ctx.ellipse(512, 512, 380, 260, 0, 0, Math.PI * 2);
    ctx.strokeStyle = '#3e3d45'; // Dark grey asphalt
    ctx.lineWidth = 120;
    ctx.stroke();

    // 4. White outer/inner boundary lines
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#f0f0f5';
    
    // Outer border
    ctx.beginPath();
    ctx.ellipse(512, 512, 437, 317, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Inner border
    ctx.beginPath();
    ctx.ellipse(512, 512, 323, 203, 0, 0, Math.PI * 2);
    ctx.stroke();

    // 5. Yellow dashed lane marker (center of track)
    ctx.strokeStyle = '#fcdb38';
    ctx.lineWidth = 4;
    ctx.setLineDash([20, 25]);
    ctx.beginPath();
    ctx.ellipse(512, 512, 380, 260, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // 6. Draw a Checkered Start Grid
    // We place it at the bottom center of the oval (X = 512, Y = 772)
    const gridX = 512;
    const gridY = 772;
    const gridW = 20;
    const gridH = 120;
    
    ctx.save();
    ctx.translate(gridX, gridY);
    ctx.rotate(0); // Road direction here is perfectly horizontal
    
    // Draw grid checker boxes
    const boxSize = 10;
    for (let r = 0; r < 2; r++) {
        for (let c = -6; c < 6; c++) {
            ctx.fillStyle = (r + c) % 2 === 0 ? '#111111' : '#eeeeee';
            ctx.fillRect(c * boxSize, r * boxSize - 10, boxSize, boxSize);
        }
    }
    ctx.restore();

    // 7. Add cute painted arrow markers on the road
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Fredoka';
    ctx.textAlign = 'center';
    
    // Left side arrow
    ctx.save();
    ctx.translate(132, 512);
    ctx.rotate(Math.PI / 2);
    ctx.fillText('▲ GO ▲', 0, 0);
    ctx.restore();

    // Right side arrow
    ctx.save();
    ctx.translate(892, 512);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('▲ GO ▲', 0, 0);
    ctx.restore();

    // Create Three.js Texture
    const texture = new THREE.CanvasTexture(canvasTex);
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    const floorGeo = new THREE.PlaneGeometry(350, 350);
    const floorMat = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.85,
        metalness: 0.05
    });

    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);
}

function createDesertBoundary() {
    // Generate low-poly mountain canyon walls at the map limits
    const rockMat = new THREE.MeshStandardMaterial({
        color: 0xc86438, // Warm reddish desert rock color
        roughness: 0.9,
        metalness: 0.0
    });

    const numRocks = 45;
    for (let i = 0; i < numRocks; i++) {
        // Position them in a ring surrounding the track (radius between 130 and 170)
        const angle = (i / numRocks) * Math.PI * 2 + (Math.random() * 0.1);
        const dist = 125 + Math.random() * 40;
        const x = Math.sin(angle) * dist;
        const z = Math.cos(angle) * dist;

        // Custom low-poly cylindrical rock geometry
        const height = 15 + Math.random() * 30;
        const radiusTop = 6 + Math.random() * 12;
        const radiusBottom = 10 + Math.random() * 15;
        const geo = new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 5, 2);
        
        // Deform geometry slightly for organic look
        const pos = geo.attributes.position;
        for (let j = 0; j < pos.count; j++) {
            const vx = pos.getX(j);
            const vy = pos.getY(j);
            const vz = pos.getZ(j);
            
            // Random noise per vertex
            if (vy > -height / 2) {
                pos.setX(j, vx + (Math.random() - 0.5) * 2.0);
                pos.setZ(j, vz + (Math.random() - 0.5) * 2.0);
            }
        }
        geo.computeVertexNormals();

        const rock = new THREE.Mesh(geo, rockMat);
        rock.position.set(x, height / 2, z);
        rock.castShadow = true;
        rock.receiveShadow = true;
        
        // Random Y rotation
        rock.rotation.y = Math.random() * Math.PI;
        scene.add(rock);
    }
}

function createCuteCacti() {
    const greenMat = new THREE.MeshStandardMaterial({
        color: 0x388e3c, // Vibrant cactus green
        roughness: 0.9,
        metalness: 0.0
    });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x8d6e63, roughness: 0.8 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff4081, roughness: 0.6 }); // Pink flower

    const numCacti = 38;
    for (let i = 0; i < numCacti; i++) {
        // Place cacti randomly, but avoid the racetrack zone
        // Racetrack lies roughly between radius 75 and radius 120 (mapped from canvas)
        // Canvas: 380 +/- 60 pixels = 320px to 440px -> 320*0.293 = 93 units to 128 units
        let valid = false;
        let x = 0, z = 0, dist = 0;
        
        while (!valid) {
            x = (Math.random() - 0.5) * 220;
            z = (Math.random() - 0.5) * 220;
            dist = Math.sqrt(x*x + z*z);
            
            // Allow inside track center (dist < 60) or outside track (dist > 140)
            if (dist < 65 || (dist > 145 && dist < 210)) {
                valid = true;
            }
        }

        const cactusGroup = new THREE.Group();
        cactusGroup.position.set(x, 0, z);

        // Scale variation
        const scale = 0.7 + Math.random() * 0.7;
        cactusGroup.scale.set(scale, scale, scale);

        // Main trunk
        const trunkGeo = new THREE.CylinderGeometry(0.2, 0.25, 2.5, 8);
        const trunk = new THREE.Mesh(trunkGeo, greenMat);
        trunk.position.y = 1.25;
        trunk.castShadow = true;
        cactusGroup.add(trunk);

        // Left arm
        const leftArmGroup = new THREE.Group();
        leftArmGroup.position.set(-0.2, 1.2, 0);
        
        const horizGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.6, 8);
        const horizPart = new THREE.Mesh(horizGeo, greenMat);
        horizPart.rotation.z = Math.PI / 2;
        horizPart.position.x = -0.2;
        leftArmGroup.add(horizPart);

        const vertGeo = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8);
        const vertPart = new THREE.Mesh(vertGeo, greenMat);
        vertPart.position.set(-0.5, 0.45, 0);
        vertPart.castShadow = true;
        leftArmGroup.add(vertPart);
        cactusGroup.add(leftArmGroup);

        // Right arm (slightly higher)
        const rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.2, 1.6, 0);

        const horizPartR = new THREE.Mesh(horizGeo, greenMat);
        horizPartR.rotation.z = -Math.PI / 2;
        horizPartR.position.x = 0.2;
        rightArmGroup.add(horizPartR);

        const vertPartR = new THREE.Mesh(vertGeo, greenMat);
        vertPartR.position.set(0.5, 0.45, 0);
        vertPartR.castShadow = true;
        rightArmGroup.add(vertPartR);
        cactusGroup.add(rightArmGroup);

        // Flower on top
        const flowerGeo = new THREE.SphereGeometry(0.18, 8, 8);
        const flower = new THREE.Mesh(flowerGeo, flowerMat);
        flower.position.set(0, 2.55, 0);
        cactusGroup.add(flower);

        // Add a small soil patch at base
        const soilGeo = new THREE.CylinderGeometry(0.6, 0.75, 0.1, 8);
        const soil = new THREE.Mesh(soilGeo, woodMat);
        soil.position.y = 0.05;
        cactusGroup.add(soil);

        scene.add(cactusGroup);
        cacti.push(cactusGroup);
    }
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
        
        // Random layout coordinates
        const x = (Math.random() - 0.5) * 240;
        const z = (Math.random() - 0.5) * 240;
        const y = 25 + Math.random() * 12;
        
        cloudGroup.position.set(x, y, z);

        // Build fluffy puff geometry using overlapping spheres
        const numPuffs = 4 + Math.floor(Math.random() * 4);
        for (let j = 0; j < numPuffs; j++) {
            const size = 2.0 + Math.random() * 2.5;
            const geo = new THREE.SphereGeometry(size, 8, 8);
            const puff = new THREE.Mesh(geo, cloudMat);
            
            // Offset puffs relative to cloud center
            puff.position.set(
                (j - numPuffs/2) * 2.2,
                (Math.random() - 0.2) * 1.0,
                (Math.random() - 0.5) * 1.5
            );
            cloudGroup.add(puff);
        }

        // Float velocity
        cloudGroup.userData = {
            speed: 0.015 + Math.random() * 0.03
        };

        scene.add(cloudGroup);
        clouds.push(cloudGroup);
    }
}

function createRoadDecorations() {
    // Route 66 Shield Sign
    const signGroup = new THREE.Group();
    signGroup.position.set(-5, 0, 50); // Set near track inside
    
    // Wooden pole
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.5, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.9 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.y = 1.75;
    pole.castShadow = true;
    signGroup.add(pole);

    // Cute shield plate
    const signCanvas = document.createElement('canvas');
    signCanvas.width = 128;
    signCanvas.height = 128;
    const ctx = signCanvas.getContext('2d');

    // Draw route 66 badge shield
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(64, 10);
    ctx.bezierCurveTo(110, 10, 115, 45, 115, 60);
    ctx.bezierCurveTo(115, 95, 80, 118, 64, 122);
    ctx.bezierCurveTo(48, 118, 13, 95, 13, 60);
    ctx.bezierCurveTo(13, 45, 18, 10, 64, 10);
    ctx.fill();

    ctx.lineWidth = 6;
    ctx.strokeStyle = '#0f1c3f';
    ctx.stroke();

    ctx.fillStyle = '#c62828';
    ctx.font = 'bold 22px Fredoka';
    ctx.textAlign = 'center';
    ctx.fillText('ROUTE', 64, 42);

    ctx.fillStyle = '#0f1c3f';
    ctx.font = 'bold 44px Fredoka';
    ctx.fillText('66', 64, 85);

    const signTex = new THREE.CanvasTexture(signCanvas);
    const shieldGeo = new THREE.BoxGeometry(1.2, 1.2, 0.08);
    const shieldMat = new THREE.MeshStandardMaterial({
        map: signTex,
        roughness: 0.2,
        metalness: 0.1
    });

    const shield = new THREE.Mesh(shieldGeo, shieldMat);
    shield.position.set(0, 3.2, 0.05);
    shield.rotation.y = Math.PI / 6; // Angle slightly to face road
    shield.castShadow = true;
    signGroup.add(shield);

    scene.add(signGroup);
}

// ==========================================================================
// 4. Procedural Character Car Model (Disney Style)
// ==========================================================================
function createCuteCar() {
    carGroup = new THREE.Group();
    carGroup.position.set(0, 0.35, 75); // Start on the lower track
    scene.add(carGroup);

    // Car Body Group - Animates suspension pitch/roll separately
    carBodyGroup = new THREE.Group();
    carGroup.add(carBodyGroup);

    // Materials - UPGRADED to physical materials for rich glossiness & reflections
    const bodyPaintMat = new THREE.MeshPhysicalMaterial({
        color: 0xff4d6d, // Cute Figaro Light Cherry Red
        roughness: 0.12,
        metalness: 0.15,
        clearcoat: 1.0,
        clearcoatRoughness: 0.05,
        sheen: 0.8,
        sheenColor: new THREE.Color(0xff88a8),
        sheenRoughness: 0.15
    });
    
    const creamWhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xfbfaf0, // Retro cream white for canopy and mirrors
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

    const glassMat = new THREE.MeshStandardMaterial({
        color: 0xffffff, // Windshield white base
        roughness: 0.1,
        metalness: 0.1
    });

    const eyesBaseMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const pupilBlueMat = new THREE.MeshBasicMaterial({ color: 0x008ae6 }); // Cute blue eyes
    const pupilBlackMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeHighlightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const wheelWhiteMat = new THREE.MeshPhysicalMaterial({
        color: 0xfafafa, // White dish wheel covers
        roughness: 0.15,
        metalness: 0.05,
        clearcoat: 0.3,
        clearcoatRoughness: 0.1
    });

    // 1. Lower Chassis (Rounded bubble body using a stretched sphere instead of a box!)
    const bodyGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const bodyMesh = new THREE.Mesh(bodyGeo, bodyPaintMat);
    bodyMesh.scale.set(0.9, 0.45, 1.45); // Stretched along Z, squashed vertically
    bodyMesh.position.y = 0.42;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    carBodyGroup.add(bodyMesh);

    // Chrome Side Beltline Trim Strip
    const sideTrimGeo = new THREE.CylinderGeometry(0.015, 0.015, 2.0, 8);
    sideTrimGeo.rotateX(Math.PI / 2); // align along Z
    
    const leftTrim = new THREE.Mesh(sideTrimGeo, chromeMat);
    leftTrim.position.set(-0.91, 0.45, 0);
    carBodyGroup.add(leftTrim);
    
    const rightTrim = leftTrim.clone();
    rightTrim.position.x = 0.91;
    carBodyGroup.add(rightTrim);

    // Chrome Door Handles and Bases
    const handleGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.18, 8);
    handleGeo.rotateX(Math.PI / 2);
    
    const leftHandle = new THREE.Mesh(handleGeo, chromeMat);
    leftHandle.position.set(-0.925, 0.52, -0.1);
    carBodyGroup.add(leftHandle);
    
    const rightHandle = leftHandle.clone();
    rightHandle.position.x = 0.925;
    carBodyGroup.add(rightHandle);
    
    const handleBaseGeo = new THREE.BoxGeometry(0.01, 0.03, 0.22);
    const leftHandleBase = new THREE.Mesh(handleBaseGeo, chromeMat);
    leftHandleBase.position.set(-0.92, 0.52, -0.1);
    carBodyGroup.add(leftHandleBase);
    
    const rightHandleBase = leftHandleBase.clone();
    rightHandleBase.position.x = 0.92;
    carBodyGroup.add(rightHandleBase);

    // Chrome Gas Cap (placed on rear left flank)
    const gasCapGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.015, 12);
    gasCapGeo.rotateZ(Math.PI / 2);
    const gasCap = new THREE.Mesh(gasCapGeo, chromeMat);
    gasCap.position.set(-0.85, 0.52, -1.0);
    carBodyGroup.add(gasCap);

    // 2. Front Hood (Stretched sphere for bubbly retro hood!)
    const hoodGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const hoodMesh = new THREE.Mesh(hoodGeo, bodyPaintMat);
    hoodMesh.scale.set(0.85, 0.36, 0.7); // Stretched forward
    hoodMesh.position.set(0, 0.36, 0.88);
    hoodMesh.castShadow = true;
    carBodyGroup.add(hoodMesh);

    // Chrome hood center trim strip
    const hoodStripGeo = new THREE.CylinderGeometry(0.012, 0.012, 0.85, 8);
    hoodStripGeo.rotateX(Math.PI / 2); // align along Z
    const hoodStrip = new THREE.Mesh(hoodStripGeo, chromeMat);
    hoodStrip.position.set(0, 0.54, 0.92);
    hoodStrip.rotation.x = 0.22; // Match hood slope
    carBodyGroup.add(hoodStrip);
    
    // Hood Emblem/Badge
    const badgeGroup = new THREE.Group();
    badgeGroup.position.set(0, 0.46, 1.34);
    badgeGroup.rotation.x = 0.25; // align with hood slope
    
    const badgeBackingGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 12);
    badgeBackingGeo.rotateX(Math.PI / 2);
    const badgeBacking = new THREE.Mesh(badgeBackingGeo, chromeMat);
    badgeGroup.add(badgeBacking);
    
    const badgeWingGeo = new THREE.BoxGeometry(0.18, 0.02, 0.01);
    const badgeWing = new THREE.Mesh(badgeWingGeo, chromeMat);
    badgeWing.position.z = 0.005;
    badgeGroup.add(badgeWing);
    
    carBodyGroup.add(badgeGroup);

    // 3. Two-Tone Cream White Canopy Roof (Nissan Figaro signature - bubbly dome!)
    const canopyGeo = new THREE.SphereGeometry(1.0, 24, 24);
    const canopy = new THREE.Mesh(canopyGeo, creamWhiteMat);
    canopy.scale.set(0.72, 0.44, 0.88); // Bubbly dome
    canopy.position.set(0, 0.78, -0.15);
    canopy.castShadow = true;
    carBodyGroup.add(canopy);

    // Windshield chrome frame outline
    const windshieldFrameGeo = new THREE.BoxGeometry(1.1, 0.56, 0.03);
    const windshieldFrame = new THREE.Mesh(windshieldFrameGeo, chromeMat);
    windshieldFrame.position.set(0, 0.84, 0.47);
    windshieldFrame.rotation.x = -0.42;
    carBodyGroup.add(windshieldFrame);

    // Windshield frame (White base for eyes)
    const windshieldGeo = new THREE.PlaneGeometry(1.05, 0.52);
    const windshield = new THREE.Mesh(windshieldGeo, glassMat);
    // Placed on the front slope of the canopy sphere
    windshield.position.set(0, 0.84, 0.48);
    windshield.rotation.x = -0.42; // slightly steeper slope
    carBodyGroup.add(windshield);

    // Windshield Eyelid Brow in body paint color (gives character expressions)
    const browGeo = new THREE.BoxGeometry(1.08, 0.12, 0.02);
    const brow = new THREE.Mesh(browGeo, bodyPaintMat);
    brow.position.set(0, 1.02, 0.41);
    brow.rotation.x = -0.42;
    carBodyGroup.add(brow);

    // Expressive Eyes Setup
    const eyeGroup = new THREE.Group();
    eyeGroup.position.set(0, 0.84, 0.49);
    eyeGroup.rotation.x = -0.42;
    carBodyGroup.add(eyeGroup);

    // Eye whites
    const eyeWhiteGeo = new THREE.CircleGeometry(0.18, 24);
    
    const leftEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyesBaseMat);
    leftEyeWhite.position.set(-0.23, 0, 0);
    eyeGroup.add(leftEyeWhite);

    const rightEyeWhite = new THREE.Mesh(eyeWhiteGeo, eyesBaseMat);
    rightEyeWhite.position.set(0.23, 0, 0);
    eyeGroup.add(rightEyeWhite);

    // Pupil structures
    const pupilBaseGeo = new THREE.CircleGeometry(0.09, 16);
    const pupilCoreGeo = new THREE.CircleGeometry(0.04, 16);
    const shineGeo = new THREE.CircleGeometry(0.018, 12);

    // Left Pupil
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

    // Right Pupil
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

    // 4. Nissan Figaro Front Grille (Oval Chrome Mesh)
    const grilleCanvas = document.createElement('canvas');
    grilleCanvas.width = 128;
    grilleCanvas.height = 64;
    const gCtx = grilleCanvas.getContext('2d');
    gCtx.fillStyle = '#1a1a1a';
    gCtx.fillRect(0, 0, 128, 64);
    
    // Draw chrome grid
    gCtx.strokeStyle = '#d5d5d5';
    gCtx.lineWidth = 3.5;
    for (let i = -64; i < 128; i += 16) {
        gCtx.beginPath();
        gCtx.moveTo(i, 0);
        gCtx.lineTo(i + 64, 64);
        gCtx.stroke();
        
        gCtx.beginPath();
        gCtx.moveTo(i + 64, 0);
        gCtx.lineTo(i, 64);
        gCtx.stroke();
    }

    const grilleTex = new THREE.CanvasTexture(grilleCanvas);
    const grilleGeo = new THREE.BoxGeometry(0.9, 0.34, 0.04);
    const grilleMat = new THREE.MeshStandardMaterial({
        map: grilleTex,
        roughness: 0.1,
        metalness: 0.8
    });
    const grille = new THREE.Mesh(grilleGeo, grilleMat);
    grille.position.set(0, 0.22, 1.51);
    carBodyGroup.add(grille);

    // Chrome border trim around the grille (bubbly rounded border)
    const trimGeo = new THREE.BoxGeometry(0.98, 0.4, 0.02);
    const trim = new THREE.Mesh(trimGeo, chromeMat);
    trim.position.set(0, 0.22, 1.50);
    carBodyGroup.add(trim);

    // 5. Classic Figaro Round Headlights (Bubbly spheres!)
    const lightHousingGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const leftHousing = new THREE.Mesh(lightHousingGeo, chromeMat);
    leftHousing.scale.set(1.0, 1.0, 1.2); // Point forward
    leftHousing.position.set(-0.55, 0.44, 1.35);
    leftHousing.castShadow = true;
    carBodyGroup.add(leftHousing);

    const rightHousing = leftHousing.clone();
    rightHousing.position.x = 0.55;
    carBodyGroup.add(rightHousing);

    // Headlight Chrome Eyelids (Visors)
    const eyelidGeo = new THREE.SphereGeometry(0.23, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    eyelidGeo.rotateX(-Math.PI / 2); // align forward
    
    const leftEyelid = new THREE.Mesh(eyelidGeo, chromeMat);
    leftEyelid.position.set(-0.55, 0.44, 1.35);
    leftEyelid.rotation.x = 0.22; // Tilt down over headlight slightly
    carBodyGroup.add(leftEyelid);
    
    const rightEyelid = leftEyelid.clone();
    rightEyelid.position.x = 0.55;
    carBodyGroup.add(rightEyelid);

    // Glowing headlight lens
    const lensGeo = new THREE.SphereGeometry(0.16, 12, 12);
    const lensMat = new THREE.MeshStandardMaterial({
        color: 0xfffee4,
        emissive: 0xfffaab,
        emissiveIntensity: 0.8,
        roughness: 0.05
    });

    const leftLens = new THREE.Mesh(lensGeo, lensMat);
    leftLens.position.set(-0.55, 0.44, 1.5);
    leftLens.scale.set(1.0, 1.0, 0.3); // Flatten lens
    carBodyGroup.add(leftLens);

    const rightLens = leftLens.clone();
    rightLens.position.x = 0.55;
    carBodyGroup.add(rightLens);

    // Volumetric Headlight Beams (soft cone of light)
    const beamGeo = new THREE.CylinderGeometry(0.12, 0.6, 4.0, 16, 1, true);
    beamGeo.rotateX(Math.PI / 2);
    beamGeo.translate(0, 0, 2.0); // Shift so pivot is at headlight
    
    const beamMat = new THREE.MeshBasicMaterial({
        color: 0xfffee4,
        transparent: true,
        opacity: 0.08,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    
    const leftBeam = new THREE.Mesh(beamGeo, beamMat);
    leftBeam.position.set(-0.55, 0.44, 1.48);
    leftBeam.rotation.y = 0.04; // angle slightly outward
    leftBeam.rotation.x = -0.02; // angle slightly downward
    carBodyGroup.add(leftBeam);
    
    const rightBeam = leftBeam.clone();
    rightBeam.position.x = 0.55;
    rightBeam.rotation.y = -0.04;
    carBodyGroup.add(rightBeam);

    // 6. Retro Chrome Front Bumper Bar (with rounded end caps)
    const bumperGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.7, 10);
    bumperGeo.rotateZ(Math.PI / 2); // Make horizontal
    const frontBumper = new THREE.Mesh(bumperGeo, chromeMat);
    frontBumper.position.set(0, 0.12, 1.6);
    frontBumper.castShadow = true;
    carBodyGroup.add(frontBumper);

    // End caps
    const capGeo = new THREE.SphereGeometry(0.045, 8, 8);
    const leftCap = new THREE.Mesh(capGeo, chromeMat);
    leftCap.position.set(-0.85, 0.12, 1.6);
    carBodyGroup.add(leftCap);

    const rightCap = leftCap.clone();
    rightCap.position.x = 0.85;
    carBodyGroup.add(rightCap);

    // 7. Side Mirrors (Mounted on door/canopy sides)
    const mirrorStemGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.34, 8);
    const leftStem = new THREE.Mesh(mirrorStemGeo, chromeMat);
    leftStem.position.set(-0.8, 0.58, 0.32);
    leftStem.rotation.z = -Math.PI / 8; // Angle outward
    carBodyGroup.add(leftStem);

    const rightStem = leftStem.clone();
    rightStem.position.x = 0.8;
    rightStem.rotation.z = Math.PI / 8;
    carBodyGroup.add(rightStem);

    const mirrorHeadGeo = new THREE.SphereGeometry(0.11, 12, 12);
    const leftHead = new THREE.Mesh(mirrorHeadGeo, creamWhiteMat);
    leftHead.position.set(-0.89, 0.72, 0.32);
    leftHead.scale.set(1.25, 0.85, 1.0); // Oval/ Figaro shape
    carBodyGroup.add(leftHead);

    const rightHead = leftHead.clone();
    rightHead.position.x = 0.89;
    carBodyGroup.add(rightHead);

    // 8. Smiling Radiator Mouth (High-Res 512x256 vector-smooth style)
    const smileCanvas = document.createElement('canvas');
    smileCanvas.width = 512;
    smileCanvas.height = 256;
    const smCtx = smileCanvas.getContext('2d');
    smCtx.clearRect(0, 0, 512, 256);

    // Happy open mouth smile with thick black border
    smCtx.fillStyle = '#1c1c1f';
    smCtx.strokeStyle = '#000000';
    smCtx.lineWidth = 12;
    
    smCtx.beginPath();
    smCtx.arc(256, 48, 160, 0, Math.PI);
    smCtx.fill();
    smCtx.stroke();

    // Teeth
    smCtx.fillStyle = '#ffffff';
    smCtx.beginPath();
    if (smCtx.roundRect) {
        smCtx.roundRect(136, 48, 240, 40, 10);
    } else {
        smCtx.rect(136, 48, 240, 40);
    }
    smCtx.fill();

    // Tongue
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
    mouth.position.set(0, 0.1, 1.62); // Mounted right in front of bumper bar
    mouth.rotation.x = 0.02;
    carBodyGroup.add(mouth);

    // 9. Shiny Chrome Exhaust pipe at rear
    const tailpipeGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.7, 8);
    const tailpipe = new THREE.Mesh(tailpipeGeo, chromeMat);
    tailpipe.rotation.x = Math.PI / 2;
    tailpipe.position.set(-0.55, 0.12, -1.45);
    carBodyGroup.add(tailpipe);

    // 10. Glowing Brake Lights at rear corners (bubbly rounded capsules!)
    const tailLightGeo = new THREE.SphereGeometry(0.11, 12, 12);
    const tailLightMat = new THREE.MeshStandardMaterial({
        color: 0x990000,
        emissive: 0xff0000,
        emissiveIntensity: 0.0,
        roughness: 0.1
    });

    const leftTailLight = new THREE.Mesh(tailLightGeo, tailLightMat);
    leftTailLight.scale.set(1.2, 0.8, 0.6); // flattened capsule
    leftTailLight.position.set(-0.68, 0.36, -1.35);
    carBodyGroup.add(leftTailLight);

    const rightTailLight = leftTailLight.clone();
    rightTailLight.position.x = 0.68;
    carBodyGroup.add(rightTailLight);

    carBodyGroup.userData = {
        leftLight: leftTailLight,
        rightLight: rightTailLight
    };

    // Rear Chrome Bumper Bar
    const rearBumperGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.6, 10);
    rearBumperGeo.rotateZ(Math.PI / 2);
    const rearBumper = new THREE.Mesh(rearBumperGeo, chromeMat);
    rearBumper.position.set(0, 0.14, -1.55);
    rearBumper.castShadow = true;
    carBodyGroup.add(rearBumper);
    
    const rearLeftCap = new THREE.Mesh(capGeo, chromeMat);
    rearLeftCap.position.set(-0.8, 0.14, -1.55);
    carBodyGroup.add(rearLeftCap);
    
    const rearRightCap = rearLeftCap.clone();
    rearRightCap.position.x = 0.8;
    carBodyGroup.add(rearRightCap);

    // FRONT & REAR LICENSE PLATES
    const plateBackingGeo = new THREE.BoxGeometry(0.44, 0.22, 0.02);
    
    const lpCanvas = document.createElement('canvas');
    lpCanvas.width = 128;
    lpCanvas.height = 64;
    const lpCtx = lpCanvas.getContext('2d');
    lpCtx.fillStyle = '#ffcc00'; // Retro JDM yellow
    lpCtx.fillRect(0, 0, 128, 64);
    lpCtx.strokeStyle = '#111111';
    lpCtx.lineWidth = 4;
    lpCtx.strokeRect(2, 2, 124, 60);
    lpCtx.fillStyle = '#111111';
    lpCtx.font = 'bold 28px monospace';
    lpCtx.textAlign = 'center';
    lpCtx.textBaseline = 'middle';
    lpCtx.fillText('CUTE 66', 64, 32);
    
    const lpTex = new THREE.CanvasTexture(lpCanvas);
    const plateTextGeo = new THREE.PlaneGeometry(0.4, 0.18);
    const plateTextMat = new THREE.MeshStandardMaterial({ map: lpTex, roughness: 0.15 });

    // Rear Plate Group
    const rearPlateGroup = new THREE.Group();
    rearPlateGroup.position.set(0, 0.24, -1.58);
    rearPlateGroup.rotation.y = Math.PI; // Face backwards
    
    const rearPlateBacking = new THREE.Mesh(plateBackingGeo, chromeMat);
    rearPlateGroup.add(rearPlateBacking);
    
    const rearPlateText = new THREE.Mesh(plateTextGeo, plateTextMat);
    rearPlateText.position.z = 0.011;
    rearPlateGroup.add(rearPlateText);
    carBodyGroup.add(rearPlateGroup);

    // Front Plate Group (mounted offset to side, JDM Figaro style)
    const frontPlateGroup = new THREE.Group();
    frontPlateGroup.position.set(0.4, 0.04, 1.63);
    
    const frontPlateBacking = new THREE.Mesh(plateBackingGeo, chromeMat);
    frontPlateGroup.add(frontPlateBacking);
    
    const frontPlateText = new THREE.Mesh(plateTextGeo, plateTextMat);
    frontPlateText.position.z = 0.011;
    frontPlateGroup.add(frontPlateText);
    carBodyGroup.add(frontPlateGroup);

    // 11. Retro Nissan Figaro Wheels Setup (Tires, white dish, chrome cap, red pinstripe torus)
    const wheelGeo = new THREE.CylinderGeometry(WHEEL_RADIUS, WHEEL_RADIUS, 0.38, 18);
    wheelGeo.rotateZ(Math.PI / 2);

    const createFigaroWheel = () => {
        const wGroup = new THREE.Group();
        
        // Tire
        const tire = new THREE.Mesh(wheelGeo, tireMat);
        tire.castShadow = true;
        wGroup.add(tire);

        // Retro Solid White Dish Hubcap
        const dishGeo = new THREE.CylinderGeometry(0.32, 0.32, 0.39, 14);
        dishGeo.rotateZ(Math.PI / 2);
        const dish = new THREE.Mesh(dishGeo, wheelWhiteMat);
        wGroup.add(dish);

        // Red Pinstripe Torus (on outer & inner dish faces)
        const stripeGeo = new THREE.TorusGeometry(0.22, 0.015, 8, 32);
        stripeGeo.rotateY(Math.PI / 2); // face along cylinder caps
        
        const stripeOuter = new THREE.Mesh(stripeGeo, bodyPaintMat);
        stripeOuter.position.x = 0.196;
        wGroup.add(stripeOuter);
        
        const stripeInner = new THREE.Mesh(stripeGeo, bodyPaintMat);
        stripeInner.position.x = -0.196;
        wGroup.add(stripeInner);

        // Chrome Center Hubcap
        const centerCapGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 10);
        centerCapGeo.rotateZ(Math.PI / 2);
        const centerCap = new THREE.Mesh(centerCapGeo, chromeMat);
        wGroup.add(centerCap);

        return wGroup;
    };

    // Place wheels directly on carGroup
    rearLeftWheel = createFigaroWheel();
    rearLeftWheel.position.set(-0.95, 0.1, -0.8);
    carGroup.add(rearLeftWheel);

    rearRightWheel = createFigaroWheel();
    rearRightWheel.position.set(0.95, 0.1, -0.8);
    carGroup.add(rearRightWheel);

    frontLeftWheel = new THREE.Group();
    frontLeftWheel.position.set(-0.95, 0.1, 0.85);
    const flMesh = createFigaroWheel();
    frontLeftWheel.add(flMesh);
    carGroup.add(frontLeftWheel);

    frontRightWheel = new THREE.Group();
    frontRightWheel.position.set(0.95, 0.1, 0.85);
    const frMesh = createFigaroWheel();
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

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.age++;

        // Physics
        p.mesh.position.add(p.vel);
        
        // Fade & Scale
        const ratio = p.age / p.maxAge;
        p.mesh.scale.setScalar(1.0 + ratio * (p.isDust ? 2.5 : 1.8));
        p.mesh.material.opacity = 0.7 * (1.0 - ratio);

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

    // 2. Power Button (Sleep Toggle)
    powerBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        screenActive = !screenActive;
        if (screenActive) {
            screenOff.classList.remove('active');
            // Wake up engine hum
            if (isPlaying) {
                audio.startEngineSequence();
            }
        } else {
            screenOff.classList.add('active');
            // Mute everything instantly on lock
            if (audio.initialized) {
                if (audio.engineGain) audio.engineGain.gain.setValueAtTime(0, audio.ctx.currentTime);
                if (audio.screechGain) audio.screechGain.gain.setValueAtTime(0, audio.ctx.currentTime);
            }
        }
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

    // 5. Touch / Pointer Event mapping for Simulated Dual-Controls
    // Right Zone: Invisible virtual joystick
    rightZone.addEventListener('pointerdown', (e) => {
        if (!isPlaying || !screenActive) return;
        if (activeTouchId !== null) return; // single touch on joystick

        activeTouchId = e.pointerId;
        rightZone.setPointerCapture(e.pointerId);

        isDriving = true;

        // Visual Joystick placement inside Screen coordinate bounds (cached for performance)
        cachedRightZoneBounds = rightZone.getBoundingClientRect();
        const bounds = cachedRightZoneBounds;
        const localX = e.clientX - bounds.left;
        const localY = e.clientY - bounds.top;

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

        // Use cached bounds to prevent browser reflows (huge performance fix!)
        if (!cachedRightZoneBounds) {
            cachedRightZoneBounds = rightZone.getBoundingClientRect();
        }
        const bounds = cachedRightZoneBounds;
        const localX = e.clientX - bounds.left;
        const localY = e.clientY - bounds.top;

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

    // Left Zone: Touch & Hold Brake
    leftZone.addEventListener('pointerdown', (e) => {
        if (!isPlaying || !screenActive) return;
        
        brakeTouchId = e.pointerId;
        leftZone.setPointerCapture(e.pointerId);
        
        isBraking = true;
        leftZone.classList.add('brake-active');
    });

    const releaseBrake = (e) => {
        if (brakeTouchId !== e.pointerId) return;
        brakeTouchId = null;
        isBraking = false;
        leftZone.classList.remove('brake-active');
    };

    leftZone.addEventListener('pointerup', releaseBrake);
    leftZone.addEventListener('pointercancel', releaseBrake);

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
            case 'Space':
                isBraking = true;
                e.preventDefault(); // Stop window scrolling
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
            case 'Space':
                isBraking = false;
                break;
        }
    });

    // 7. Camera Swipe-to-Rotate Control (Top Area)
    const cameraZone = document.getElementById('cameraZone');
    const iphoneScreen = document.getElementById('iphoneScreen');
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
                leftZone.classList.remove('brake-active');
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

    // C. Resolve Brake decelerations
    if (isBraking) {
        speed = Math.max(0.0, speed - BRAKE_DECEL);
    }

    // D. Update Position coordinates based on Heading & Speed
    // Move along current car heading
    const moveX = Math.sin(heading) * speed;
    const moveZ = Math.cos(heading) * speed;

    carGroup.position.x += moveX;
    carGroup.position.z += moveZ;
    carGroup.rotation.y = heading;

    // Keep car locked within boundary boundary circle
    const currentDist = Math.sqrt(carGroup.position.x * carGroup.position.x + carGroup.position.z * carGroup.position.z);
    if (currentDist > 165) {
        // bounce back slightly
        carGroup.position.x = (carGroup.position.x / currentDist) * 165;
        carGroup.position.z = (carGroup.position.z / currentDist) * 165;
        speed *= -0.25; // bouncy collision!
        audio.playHonk(); // cute warning beep
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

    // H. Exhaust Smoke Puffs
    if (speed > 0.02 && timeNow % 6 < 2) {
        // Spawn smoke from exhaust pipes at rear
        // We calculate world coordinate offsets of tailpipes
        const pipeL = new THREE.Vector3(-0.6, 0.15, -1.6).applyMatrix4(carBodyGroup.matrixWorld);
        const pipeR = new THREE.Vector3(0.6, 0.15, -1.6).applyMatrix4(carBodyGroup.matrixWorld);
        spawnSmoke(pipeL, 1, false);
        spawnSmoke(pipeR, 1, false);
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
    if (speedVal.textContent !== mph.toString()) {
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
    if (gearVal.textContent !== currentGear) {
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

    // Update smoke/skid particles
    updateParticles();
}

// Main Game Render Loop
function animate() {
    requestAnimationFrame(animate);

    // Engine updates
    updatePhysics();
    updateEntities();
    updateCamera();

    // Render viewport
    renderer.render(scene, camera);
}

// Initial Kick-off
initEngine();
setupControlListeners();
