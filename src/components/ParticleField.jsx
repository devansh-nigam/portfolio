import { Component, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const BG = '#04050a';
const Z_NEAR = 4;
const Z_FAR = -40;

const starVertex = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  attribute float aSeed;
  varying float vSeed;
  varying float vFade;

  void main() {
    vec3 p = position;
    // Stream toward the camera and wrap around the far plane.
    float span = ${(Z_NEAR - Z_FAR).toFixed(1)};
    p.z = mod(p.z - ${Z_FAR.toFixed(1)} + uTime * (0.5 + aSeed * 0.9), span) + ${Z_FAR.toFixed(1)};
    p.x += sin(uTime * 0.2 + aSeed * 20.0) * 0.18;
    p.y += cos(uTime * 0.25 + aSeed * 13.0) * 0.18;

    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;

    float size = mix(1.0, 3.4, pow(aSeed, 4.0));
    gl_PointSize = size * uPixelRatio * (16.0 / -mv.z);

    vFade = smoothstep(${Z_FAR.toFixed(1)}, -26.0, p.z) * (1.0 - smoothstep(1.5, ${Z_NEAR.toFixed(1)}, p.z));
    vSeed = aSeed;
  }
`;

const starFragment = /* glsl */ `
  uniform float uTime;
  varying float vSeed;
  varying float vFade;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = pow(smoothstep(0.5, 0.0, d), 1.7);
    vec3 cyan = vec3(0.37, 0.95, 1.0);
    vec3 violet = vec3(0.61, 0.42, 1.0);
    vec3 col = vSeed < 0.45 ? cyan : (vSeed < 0.8 ? violet : vec3(1.0));
    float twinkle = 0.6 + 0.4 * sin(uTime * 2.2 + vSeed * 60.0);
    gl_FragColor = vec4(col, a * vFade * twinkle);
  }
`;

const gridVertex = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const gridFragment = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorld;

  float gridLine(vec2 c) {
    vec2 g = abs(fract(c - 0.5) - 0.5) / fwidth(c);
    return 1.0 - min(min(g.x, g.y), 1.0);
  }

  void main() {
    vec2 c = vec2(vWorld.x, vWorld.z + uTime * 1.4) * 0.5;
    float line = gridLine(c);
    float fade = smoothstep(${Z_FAR.toFixed(1)}, -8.0, vWorld.z) * (1.0 - smoothstep(2.0, 7.0, vWorld.z));
    fade *= 1.0 - smoothstep(6.0, 22.0, abs(vWorld.x));
    vec3 col = mix(vec3(0.61, 0.42, 1.0), vec3(0.37, 0.95, 1.0), smoothstep(-30.0, 0.0, vWorld.z));
    gl_FragColor = vec4(col, line * fade * 0.4);
  }
`;

function Stars({ count }) {
  const material = useRef();
  const { positions, seeds } = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 30;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 18;
      positions[i * 3 + 2] = Z_FAR + Math.random() * (Z_NEAR - Z_FAR);
      seeds[i] = Math.random();
    }
    return { positions, seeds };
  }, [count]);
  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uPixelRatio: { value: Math.min(window.devicePixelRatio, 1.75) } }),
    []
  );

  useFrame(({ clock }) => {
    material.current.uniforms.uTime.value = clock.elapsedTime;
  });

  return (
    <points frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[seeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={starVertex}
        fragmentShader={starFragment}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function GridFloor() {
  const material = useRef();
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame(({ clock }) => {
    material.current.uniforms.uTime.value = clock.elapsedTime;
  });
  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, -3.2, -16]}>
      <planeGeometry args={[60, 48]} />
      <shaderMaterial
        ref={material}
        uniforms={uniforms}
        vertexShader={gridVertex}
        fragmentShader={gridFragment}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

// Camera follows the shared pointer springs and dollies in once the intro starts.
function Rig({ sx, sy, start, onReady }) {
  const signalled = useRef(false);
  useFrame(({ camera }) => {
    const targetZ = start ? 6 : 13;
    camera.position.z += (targetZ - camera.position.z) * 0.025;
    camera.position.x = sx.get() * 1.4;
    camera.position.y = 0.3 - sy.get() * 0.9;
    camera.lookAt(0, 0, -12);
    if (!signalled.current) {
      signalled.current = true;
      onReady();
    }
  });
  return null;
}

class WebGLBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function ParticleField({ sx, sy, start, onReady }) {
  const count = window.innerWidth < 700 ? 1400 : 2800;
  return (
    <WebGLBoundary onError={onReady}>
      <Canvas
        className="hero__canvas"
        dpr={[1, 1.75]}
        camera={{ position: [0, 0.3, 13], fov: 60, near: 0.1, far: 100 }}
        gl={{ antialias: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => gl.setClearColor(BG)}
      >
        <Stars count={count} />
        <GridFloor />
        <Rig sx={sx} sy={sy} start={start} onReady={onReady} />
      </Canvas>
    </WebGLBoundary>
  );
}
