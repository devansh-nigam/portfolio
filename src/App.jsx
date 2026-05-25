import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export default function App() {
  const mountRef = useRef(null);
  const [speed, setSpeed] = useState(0.0005);
  const speedRef = useRef(speed);
  speedRef.current = speed;

  useEffect(() => {
    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.01, 1000);
    camera.position.set(0, 0, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000010);
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.4;
    controls.zoomSpeed = 0.8;
    controls.minDistance = 1.2;
    controls.maxDistance = 10;
    controls.enablePan = false;

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      'https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/planets/earth_atmos_2048.jpg'
    );

    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshPhongMaterial({ map: earthTexture, shininess: 5 });
    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    scene.add(new THREE.AmbientLight(0xffffff, 0.45));
    const sun = new THREE.DirectionalLight(0xffffff, 1);
    sun.position.set(5, 3, 5);
    scene.add(sun);

    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 1500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i++) {
      starPositions[i] = (Math.random() - 0.5) * 200;
    }
    starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starsGeometry,
      new THREE.PointsMaterial({ color: 0xffffff, size: 0.25 })
    );
    scene.add(stars);

    let frameId;
    const animate = () => {
      globe.rotation.y += speedRef.current;
      controls.update();
      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };
    animate();

    const handleResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      mount.removeChild(renderer.domElement);
      geometry.dispose();
      material.dispose();
      earthTexture.dispose();
      starsGeometry.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div style={{ position: 'relative', width: '100vw', height: '100vh' }}>
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
      <div
        style={{
          position: 'absolute',
          bottom: 10,
          left: 10,
          right: 10,
          color: '#fff',
          fontFamily: 'monospace',
          fontSize: 13,
          background: 'rgba(0,0,0,0.65)',
          padding: '12px 14px',
          borderRadius: 12,
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: 10,
          maxWidth: 'calc(100% - 20px)',
          minWidth: 0,
        }}
      >
        <label htmlFor="speed" style={{ minWidth: 110, flexShrink: 0 }}>
          rotation speed
        </label>
        <input
          id="speed"
          type="range"
          min="-0.02"
          max="0.02"
          step="0.0001"
          value={speed}
          onChange={(e) => setSpeed(parseFloat(e.target.value))}
          style={{ flex: 1, minWidth: 0 }}
        />
        <span style={{ width: 72, textAlign: 'right', flexShrink: 0 }}>
          {speed.toFixed(4)}
        </span>
        <button
          onClick={() => setSpeed(0)}
          style={{
            background: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          stop
        </button>
        <button
          onClick={() => setSpeed(0.0005)}
          style={{
            background: '#222',
            color: '#fff',
            border: '1px solid #444',
            borderRadius: 6,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          reset
        </button>
      </div>
    </div>
  );
}
