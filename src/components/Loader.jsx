import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { pad, useClock, useInterval, useScramble } from '../hooks.js';

const BOOT_LOG = [
  [0, 'init core modules'],
  [11, 'mounting /home/devansh'],
  [26, 'compiling shaders'],
  [40, 'spawning particle field'],
  [57, 'syncing parallax layers'],
  [72, 'warming up gpu'],
  [86, 'establishing uplink'],
];
const SEGMENTS = 32;
const TICKS = 60;
const RING_R = 84;
const RING_C = 2 * Math.PI * RING_R;
const EASE_SHUTTER = [0.76, 0, 0.24, 1];

const hexLine = () =>
  `0x${pad(((Math.random() * 0xffff) | 0).toString(16), 4)}  ` +
  Array.from({ length: 6 }, () => pad(((Math.random() * 256) | 0).toString(16))).join(' ');

export default function Loader({ ready, onReveal, onDone }) {
  const reduce = useReducedMotion();
  const minDuration = reduce ? 900 : 3200;

  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('loading'); // loading → granted → exit
  const [hex, setHex] = useState(() => Array.from({ length: 5 }, hexLine));
  const [glitchKey, setGlitchKey] = useState(0);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const clock = useClock(1000);

  // Time-based progress that stalls at 94% until the real assets are ready,
  // advancing in uneven jumps so it feels like actual work.
  useEffect(() => {
    let raf;
    let lastStep = 0;
    const t0 = performance.now();
    const tick = (now) => {
      if (now - lastStep > 40 + Math.random() * 90) {
        lastStep = now;
        const t = Math.min(1, (now - t0) / minDuration);
        const eased = 1 - Math.pow(1 - t, 2.4);
        const cap = readyRef.current ? 100 : 94;
        setProgress((p) => Math.max(p, Math.min(cap, Math.round(eased * 100))));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [minDuration]);

  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  useEffect(() => {
    if (progress === 100 && phase === 'loading') setPhase('granted');
  }, [progress, phase]);

  useEffect(() => {
    if (phase !== 'granted') return;
    const t = setTimeout(() => {
      setPhase('exit');
      onRevealRef.current();
    }, reduce ? 200 : 700);
    return () => clearTimeout(t);
  }, [phase, reduce]);

  useInterval(() => setHex((h) => [...h.slice(1), hexLine()]), phase === 'exit' ? null : 110);
  useInterval(() => setGlitchKey((k) => k + 1), phase === 'loading' ? 2600 : null);

  const status = useScramble(phase === 'loading' ? 'LOADING' : 'ACCESS GRANTED', glitchKey, 650);
  const exiting = phase === 'exit';
  const granted = phase !== 'loading';
  const lit = Math.round((progress / 100) * SEGMENTS);

  return (
    <div className="loader" aria-live="polite" aria-label={`Loading ${progress}%`}>
      <motion.div
        className="loader__panel loader__panel--top"
        animate={{ y: exiting ? '-100%' : 0 }}
        transition={{ duration: 0.95, ease: EASE_SHUTTER, delay: 0.35 }}
      />
      <motion.div
        className="loader__panel loader__panel--bottom"
        animate={{ y: exiting ? '100%' : 0 }}
        transition={{ duration: 0.95, ease: EASE_SHUTTER, delay: 0.35 }}
        onAnimationComplete={() => exiting && onDone()}
      />

      <motion.div
        className="loader__content"
        animate={exiting ? { opacity: 0, scale: 0.94, filter: 'blur(8px)' } : { opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeIn' }}
      >
        <div className="loader__grid" />
        <div className="loader__sweep" />
        <div className="scanlines" />

        <span className="bracket bracket--tl" />
        <span className="bracket bracket--tr" />
        <span className="bracket bracket--bl" />
        <span className="bracket bracket--br" />

        <header className="loader__top">
          <span>
            <b>DEVANSH</b>.SYS <span className="muted">// boot sequence</span>
          </span>
          <span className="muted">
            {pad(clock.getHours())}:{pad(clock.getMinutes())}:{pad(clock.getSeconds())}
          </span>
        </header>

        <div className="hud">
          <div className={`ring${granted ? ' ring--granted' : ''}`}>
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <g className="spin spin--slow">
                <circle cx="100" cy="100" r="97" className="ring__dash" />
              </g>
              <g className="spin spin--rev">
                {Array.from({ length: TICKS }, (_, i) => (
                  <line
                    key={i}
                    x1="100"
                    y1={i % 5 === 0 ? 8 : 11}
                    x2="100"
                    y2="15"
                    transform={`rotate(${(360 / TICKS) * i} 100 100)`}
                    className={i % 5 === 0 ? 'ring__tick ring__tick--major' : 'ring__tick'}
                  />
                ))}
              </g>
              <circle cx="100" cy="100" r={RING_R} className="ring__track" />
              <circle
                cx="100"
                cy="100"
                r={RING_R}
                className="ring__progress"
                strokeDasharray={RING_C}
                strokeDashoffset={RING_C * (1 - progress / 100)}
                transform="rotate(-90 100 100)"
              />
              <g className="spin spin--fast">
                <circle cx="100" cy="100" r="72" className="ring__orbit" />
              </g>
            </svg>
            <div className="ring__value">
              {pad(progress, 3)}
              <small>%</small>
            </div>
          </div>

          <div className={`status${granted ? ' status--granted' : ''}`}>{status}</div>

          <div className="segments" aria-hidden="true">
            {Array.from({ length: SEGMENTS }, (_, i) => (
              <span key={i} className={i < lit ? 'on' : ''} />
            ))}
          </div>
        </div>

        <ul className="loader__log">
          {BOOT_LOG.map(([at, label], i) => {
            if (progress < at) return null;
            const next = BOOT_LOG[i + 1]?.[0] ?? 100;
            const ok = progress >= next;
            return (
              <li key={label}>
                <span className="muted">&gt;</span> {label}
                <span className="dots" />
                <span className={ok ? 'ok' : 'pending'}>{ok ? 'ok' : '...'}</span>
              </li>
            );
          })}
        </ul>

        <pre className="loader__hex" aria-hidden="true">
          {hex.join('\n')}
        </pre>
      </motion.div>

      <motion.div
        className="loader__flash"
        initial={{ scaleX: 0, opacity: 0 }}
        animate={exiting ? { scaleX: [0, 1, 1], opacity: [0, 1, 0] } : {}}
        transition={{ duration: 1, times: [0, 0.35, 1], ease: 'easeOut' }}
      />
    </div>
  );
}
