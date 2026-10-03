import { Suspense, lazy, useEffect, useMemo } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';
import { pad, useClock } from '../hooks.js';

// three.js is the heavy part of the bundle; split it out so the loader paints first.
const ParticleField = lazy(() => import('./ParticleField.jsx'));

const NAME = 'Devansh';
const GREETING = 'hi, i am';
const EASE_OUT = [0.16, 1, 0.3, 1];
const PARALLAX_X = 34; // px of travel per unit of depth
const PARALLAX_Y = 22;
const IDLE_AFTER = 2500; // ms without input before the scene drifts on its own

const MARKERS = [
  { left: '9%', top: '18%', label: '01 / 47.21' },
  { left: '84%', top: '24%', label: '02 / 12.08' },
  { left: '14%', top: '76%', label: '03 / 88.40' },
  { left: '78%', top: '72%', label: '04 / 30.65' },
  { left: '50%', top: '12%', label: '' },
  { left: '62%', top: '86%', label: '' },
];

const clamp = (v) => Math.max(-1, Math.min(1, v));

function Layer({ depth, sx, sy, tilt = 0, className = '', children }) {
  const x = useTransform(sx, (v) => v * -PARALLAX_X * depth);
  const y = useTransform(sy, (v) => v * -PARALLAX_Y * depth);
  const rotateY = useTransform(sx, (v) => v * tilt);
  const rotateX = useTransform(sy, (v) => v * -tilt);
  return (
    <motion.div className={`layer ${className}`} style={{ x, y, rotateX, rotateY }}>
      {children}
    </motion.div>
  );
}

// Each letter sits at its own depth (outer letters closer) so the word breathes as you move.
function Letter({ char, index, sx, sy, start, reduce }) {
  const offset = Math.abs(index - (NAME.length - 1) / 2) * 0.12;
  const x = useTransform(sx, (v) => v * -PARALLAX_X * offset);
  const y = useTransform(sy, (v) => v * -PARALLAX_Y * offset);
  return (
    <motion.span className="name__slot" style={{ x, y }}>
      <motion.span
        className="name__letter"
        initial={reduce ? { opacity: 0 } : { y: '115%', rotateX: -80, opacity: 0 }}
        animate={start ? { y: '0%', rotateX: 0, opacity: 1 } : undefined}
        transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.55 + index * 0.07 }}
        whileHover={{ y: '-8%', transition: { duration: 0.25 } }}
      >
        {char}
      </motion.span>
    </motion.span>
  );
}

const fadeIn = (start, delay, extra = {}) => ({
  initial: { opacity: 0, ...extra },
  animate: start ? { opacity: 1, scale: 1, scaleX: 1 } : undefined,
  transition: { duration: 1.1, ease: EASE_OUT, delay },
});

export default function Hero({ start, onSceneReady }) {
  const reduce = useReducedMotion();
  const clock = useClock(1000);
  const isTouch = useMemo(() => window.matchMedia('(hover: none)').matches, []);

  // Normalised pointer in [-1, 1], smoothed by springs and shared with the 3D scene.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 45, damping: 18, mass: 0.9 };
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);

  const px = useMotionValue(-9999);
  const py = useMotionValue(-9999);
  const spotlight = useMotionTemplate`radial-gradient(560px circle at ${px}px ${py}px, rgba(94, 242, 255, 0.075), transparent 65%)`;

  useEffect(() => {
    let lastInput = -Infinity;
    let raf;
    const onPointer = (e) => {
      lastInput = performance.now();
      mx.set(clamp((e.clientX / window.innerWidth) * 2 - 1));
      my.set(clamp((e.clientY / window.innerHeight) * 2 - 1));
      px.set(e.clientX);
      py.set(e.clientY);
    };
    const onOrient = (e) => {
      if (e.gamma == null || e.beta == null) return;
      lastInput = performance.now();
      mx.set(clamp(e.gamma / 25));
      my.set(clamp((e.beta - 45) / 25));
    };
    const drift = (t) => {
      if (!reduce && t - lastInput > IDLE_AFTER) {
        mx.set(Math.sin(t * 0.00035) * 0.55);
        my.set(Math.sin(t * 0.00027 + 1.3) * 0.35);
      }
      raf = requestAnimationFrame(drift);
    };
    window.addEventListener('pointermove', onPointer);
    window.addEventListener('deviceorientation', onOrient);
    raf = requestAnimationFrame(drift);
    return () => {
      window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('deviceorientation', onOrient);
      cancelAnimationFrame(raf);
    };
  }, [mx, my, px, py, reduce]);

  return (
    <main className="hero">
      <Suspense fallback={null}>
        <ParticleField sx={sx} sy={sy} start={start} onReady={onSceneReady} />
      </Suspense>

      <div className="hero__stage">
        <Layer depth={0.25} sx={sx} sy={sy}>
          <motion.div className="ghost" aria-hidden="true" {...fadeIn(start, 0.2, { scale: 1.15 })}>
            {NAME.toUpperCase()}
          </motion.div>
        </Layer>

        <Layer depth={0.6} sx={sx} sy={sy}>
          <motion.span className="orb orb--a" {...fadeIn(start, 0.1, { scale: 0.6 })} />
          <motion.span className="orb orb--b" {...fadeIn(start, 0.3, { scale: 0.6 })} />
        </Layer>

        <Layer depth={1} tilt={7} sx={sx} sy={sy} className="layer--headline">
          <h1 className="headline">
            <span className="hello">
              {GREETING.split('').map((c, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={start ? { opacity: 1 } : undefined}
                  transition={{ duration: 0.01, delay: 0.25 + i * 0.055 }}
                >
                  {c}
                </motion.span>
              ))}
              <span className="caret" aria-hidden="true" />
            </span>
            <span className="name" aria-label={NAME}>
              {NAME.split('').map((c, i) => (
                <Letter key={i} char={c} index={i} sx={sx} sy={sy} start={start} reduce={reduce} />
              ))}
            </span>
          </h1>
          <motion.div className="underline" aria-hidden="true" {...fadeIn(start, 1.25, { scaleX: 0 })} />
        </Layer>

        <Layer depth={2.2} sx={sx} sy={sy}>
          {MARKERS.map((m, i) => (
            <motion.span
              key={i}
              className="marker"
              style={{ left: m.left, top: m.top }}
              {...fadeIn(start, 1.4 + i * 0.08)}
            >
              <i />
              {m.label}
            </motion.span>
          ))}
        </Layer>
      </div>

      {!isTouch && <motion.div className="spotlight" style={{ background: spotlight }} />}
      <div className="grain" />
      <div className="vignette" />

      <motion.div className="frame" {...fadeIn(start, 1.5)}>
        <span className="frame__item frame__item--tl">
          <b>DN</b> <span className="muted">// devanshnigam.in</span>
        </span>
        <span className="frame__item frame__item--tr">
          <span className="pulse" /> online{' '}
          <span className="muted">
            {pad(clock.getHours())}:{pad(clock.getMinutes())}:{pad(clock.getSeconds())}
          </span>
        </span>
        <span className="frame__item frame__item--bl muted">© {clock.getFullYear()}</span>
        <span className="frame__item frame__item--br muted">
          {isTouch ? 'tilt or drag to explore' : 'move your cursor'} ✦
        </span>
      </motion.div>
    </main>
  );
}
