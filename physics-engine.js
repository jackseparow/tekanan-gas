// --- INITIALIZATION ---
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- PHYSICS VARIABLES ---
let temperature = 300; // Kelvin
let particles = [];
const radius = 2; // Jari-jari tabung
const height = 5; // Tinggi tabung
let totalImpulse = 0;

// --- 3D OBJECTS ---
// 1. Tabung Transparan
const tubeGeo = new THREE.CylinderGeometry(radius, radius, height, 32, 1, true);
const tubeMat = new THREE.MeshPhongMaterial({ 
    color: 0xffffff, transparent: true, opacity: 0.2, side: THREE.DoubleSide 
});
const tube = new THREE.Mesh(tubeGeo, tubeMat);
scene.add(tube);

// 2. Alas & Tutup Tabung
const capGeo = new THREE.CircleGeometry(radius, 32);
const capMat = new THREE.MeshPhongMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });
const bottomCap = new THREE.Mesh(capGeo, capMat);
bottomCap.rotation.x = -Math.PI / 2;
bottomCap.position.y = -height/2;
scene.add(bottomCap);

const topCap = bottomCap.clone();
topCap.rotation.x = Math.PI / 2;
topCap.position.y = height/2;
scene.add(topCap);

// 3. Pemanas (Visual Bunsen Burner)
const heaterGeo = new THREE.SphereGeometry(0.4, 16, 16);
const heaterMat = new THREE.MeshBasicMaterial({ color: 0xff4d00 });
const heater = new THREE.Mesh(heaterGeo, heaterMat);
scene.add(heater);

// 4. Cahaya
const light = new THREE.PointLight(0xffffff, 1, 100);
light.position.set(5, 5, 5);
scene.add(light);
scene.add(new THREE.AmbientLight(0x404040));

camera.position.set(0, 2, 8);

// --- LOGIKA POMPA & PARTIKEL ---
window.pumpAir = function() {
    for(let i=0; i<10; i++) {
        const p = {
            mesh: new THREE.Mesh(
                new THREE.SphereGeometry(0.08), 
                new THREE.MeshBasicMaterial({ color: 0x00d2ff })
            ),
            vel: new THREE.Vector3(
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1,
                (Math.random() - 0.5) * 0.1
            )
        };
        p.mesh.position.set(0, 0, 0);
        scene.add(p.mesh);
        particles.push(p);
    }
    document.getElementById('particle-val').innerText = particles.length;
};

// --- CORE PHYSICS LOOP ---
function updatePhysics() {
    // 1. Update Suhu berdasarkan Posisi Pemanas
    const sliderVal = parseFloat(document.getElementById('heat-slider').value);
    heater.position.x = sliderVal;
    heater.position.y = -height/2 - 0.5;

    // Hitung jarak pemanas ke pusat bawah tabung
    const distToCenter = Math.abs(sliderVal);
    if (distToCenter < 1.5) {
        temperature += 0.8; // Memanas
        heater.material.color.setHex(0xff0000);
    } else {
        temperature = Math.max(300, temperature - 0.3); // Mendingin ke suhu ruang
        heater.material.color.setHex(0xff4d00);
    }

    // 2. Hitung Tekanan & Update Partikel
    let frameImpulse = 0;
    const speedFactor = Math.sqrt(temperature / 300) * 0.5;

    particles.forEach(p => {
        p.mesh.position.add(p.vel.clone().multiplyScalar(speedFactor));

        // Tabrakan Dinding Silinder (Radial)
        const distSq = p.mesh.position.x**2 + p.mesh.position.z**2;
        if (distSq > (radius - 0.1)**2) {
            // Normal vektor dari pusat silinder ke partikel
            const normal = new THREE.Vector3(p.mesh.position.x, 0, p.mesh.position.z).normalize();
            p.vel.reflect(normal);
            frameImpulse += speedFactor;
        }

        // Tabrakan Atas/Bawah (Y-axis)
        if (Math.abs(p.mesh.position.y) > (height/2 - 0.1)) {
            p.vel.y *= -1;
            frameImpulse += speedFactor;
        }

        // Ubah warna partikel berdasarkan suhu (Biru ke Merah)
        const heatRatio = Math.min(1, (temperature - 300) / 1000);
        p.mesh.material.color.setHSL(0.6 * (1 - heatRatio), 1, 0.5);
    });

    // Hitung Tekanan: P = (Impuls / Waktu) / Luas Permukaan
    // Kita gunakan pendekatan visual sederhana
    const pressure = (frameImpulse * particles.length * 0.01).toFixed(2);
    document.getElementById('pressure-val').innerText = pressure + " kPa";
    document.getElementById('temp-val').innerText = Math.round(temperature) + " K";
}

window.resetSim = function() {
    particles.forEach(p => scene.remove(p.mesh));
    particles = [];
    temperature = 300;
    document.getElementById('particle-val').innerText = "0";
};

function animate() {
    requestAnimationFrame(animate);
    updatePhysics();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();
