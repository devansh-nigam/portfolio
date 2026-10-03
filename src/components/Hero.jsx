import { useEffect, useMemo } from 'react';
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from 'framer-motion';

const NAME = 'Devansh';
const GREETING = 'Hello, I am';
const EASE_OUT = [0.16, 1, 0.3, 1];
const PARALLAX_X = 30; // px of travel per unit of depth
const PARALLAX_Y = 20;
const IDLE_AFTER = 2500; // ms without input before the page drifts on its own
const MOTES = 26;

// Faint handwriting behind everything, like the previous owner's notes bleeding through.
const MANUSCRIPT = [
  'Dear reader, these pages are still being written,',
  'and you have found them a little early.',
  'Stay a while; turn a page or two.',
  'Every story worth reading begins with a hello.',
  'Dear reader, these pages are still being written,',
  'and you have found them a little early.',
  'Stay a while; turn a page or two.',
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

function CompassRose() {
  const points = Array.from({ length: 16 }, (_, i) => i * 22.5);
  return (
    <svg className="compass" viewBox="-100 -100 200 200" aria-hidden="true">
      <circle r="96" />
      <circle r="90" />
      <circle r="62" className="compass__dash" />
      <circle r="30" />
      {points.map((a, i) => (
        <path
          key={a}
          d={i % 4 === 0 ? 'M0 -88 L7 -7 L0 0 L-7 -7 Z' : i % 2 === 0 ? 'M0 -64 L5 -5 L0 0 L-5 -5 Z' : 'M0 -46 L3 -3 L0 0 L-3 -3 Z'}
          transform={`rotate(${a})`}
          className={i % 4 === 0 ? 'compass__point compass__point--major' : 'compass__point'}
        />
      ))}
      {Array.from({ length: 72 }, (_, i) => (
        <line key={i} x1="0" y1={i % 6 === 0 ? -96 : -93} x2="0" y2="-90" transform={`rotate(${i * 5})`} />
      ))}
    </svg>
  );
}

const fadeIn = (start, delay, extra = {}) => ({
  initial: { opacity: 0, ...extra },
  animate: start ? { opacity: 1, y: 0, scale: 1, scaleX: 1, rotate: 0 } : undefined,
  transition: { duration: 1.4, ease: EASE_OUT, delay },
});

export default function Hero({ start }) {
  const reduce = useReducedMotion();
  const isTouch = useMemo(() => window.matchMedia('(hover: none)').matches, []);
  const motes = useMemo(
    () =>
      Array.from({ length: MOTES }, () => ({
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: 2 + Math.random() * 4,
        duration: 10 + Math.random() * 14,
        delay: -Math.random() * 20,
        drift: 20 + Math.random() * 50,
      })),
    []
  );

  // Normalised pointer in [-1, 1], smoothed by springs.
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 40, damping: 18, mass: 1 };
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);

  const px = useMotionValue(-9999);
  const py = useMotionValue(-9999);
  const candle = useMotionTemplate`radial-gradient(420px circle at ${px}px ${py}px, var(--candle), transparent 70%)`;

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
        mx.set(Math.sin(t * 0.0003) * 0.5);
        my.set(Math.sin(t * 0.00023 + 1.3) * 0.35);
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
    <main className="home">
      <div className="home__stage">
        <Layer depth={0.2} sx={sx} sy={sy}>
          {/* The fade lives on the wrapper so it can't override the manuscript's own faintness and tilt. */}
          <motion.div aria-hidden="true" {...fadeIn(start, 0.1)}>
            <div className="manuscript">
              {MANUSCRIPT.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          </motion.div>
        </Layer>

        <Layer depth={0.5} sx={sx} sy={sy}>
          <motion.div className="compass-wrap" {...fadeIn(start, 0.2, { scale: 0.85, rotate: -30 })}>
            <CompassRose />
          </motion.div>
        </Layer>

        <Layer depth={1} tilt={5} sx={sx} sy={sy} className="layer--headline">
          <h1 className="headline">
            <span className="hello">
              {GREETING.split('').map((c, i) => (
                <motion.span
                  key={i}
                  initial={{ opacity: 0 }}
                  animate={start ? { opacity: 1 } : undefined}
                  transition={{ duration: 0.3, delay: 0.35 + i * 0.05 }}
                >
                  {c}
                </motion.span>
              ))}
            </span>
            {/* Revealed left to right, so the name looks written in by hand. */}
            <motion.span
              className="name"
              initial={{ clipPath: 'inset(-20% 100% -30% -5%)' }}
              animate={start ? { clipPath: 'inset(-20% -5% -30% -5%)' } : undefined}
              transition={{ duration: reduce ? 0.6 : 2.2, ease: [0.45, 0.05, 0.35, 1], delay: 0.9 }}
            >
              {NAME}
            </motion.span>
          </h1>
          <motion.div className="ornament" aria-hidden="true" {...fadeIn(start, 2.6, { scaleX: 0 })}>
            <span />❦<span />
          </motion.div>
          <motion.p className="tagline" {...fadeIn(start, 2.9, { y: 8 })}>
            a personal volume, still being written
          </motion.p>
        </Layer>

        <Layer depth={1.8} sx={sx} sy={sy}>
          <motion.div className="motes" aria-hidden="true" {...fadeIn(start, 1)}>
            {motes.map((m, i) => (
              <i
                key={i}
                style={{
                  left: m.left,
                  top: m.top,
                  width: m.size,
                  height: m.size,
                  animationDuration: `${m.duration}s`,
                  animationDelay: `${m.delay}s`,
                  '--drift': `${m.drift}px`,
                }}
              />
            ))}
          </motion.div>
        </Layer>
      </div>

      {!isTouch && <motion.div className="candle" style={{ background: candle }} />}

      <motion.div className="page-frame" aria-hidden="true" {...fadeIn(start, 1.6)}>
        <span className="page-frame__corner page-frame__corner--tl">❦</span>
        <span className="page-frame__corner page-frame__corner--tr">❦</span>
        <span className="page-frame__corner page-frame__corner--bl">❦</span>
        <span className="page-frame__corner page-frame__corner--br">❦</span>
      </motion.div>

      <motion.div className="marginalia" {...fadeIn(start, 1.8)}>
        <span className="marginalia__head">The Pages of Devansh</span>
        <span className="marginalia__bl">est. MMXXVI</span>
        <span className="marginalia__folio">— i —</span>
        <span className="marginalia__br">{isTouch ? 'tilt or drag the page' : 'move your cursor'} ❧</span>
      </motion.div>
    </main>
  );
}
