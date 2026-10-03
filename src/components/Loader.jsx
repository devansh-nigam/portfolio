import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';

const STEPS = [
  [0, 'Mixing the ink…'],
  [24, 'Setting the type…'],
  [48, 'Binding the pages…'],
  [72, 'Pressing the gold leaf…'],
  [100, 'Turning to the first page…'],
];
const EASE_OUT = [0.16, 1, 0.3, 1];

// The closed book: progress is a gold rule that fills while the fonts load,
// then the cover swings open on its spine to reveal the page underneath.
export default function Loader({ ready, onReveal, onDone }) {
  const reduce = useReducedMotion();
  const minDuration = reduce ? 700 : 2600;

  const [progress, setProgress] = useState(0);
  const [opening, setOpening] = useState(false);
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const onRevealRef = useRef(onReveal);
  onRevealRef.current = onReveal;

  // Time-based, stalls at 94% until the fonts are actually ready.
  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / minDuration);
      const eased = 1 - Math.pow(1 - t, 2.2);
      const cap = readyRef.current ? 100 : 94;
      setProgress((p) => Math.max(p, Math.min(cap, Math.round(eased * 100))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [minDuration]);

  useEffect(() => {
    if (progress < 100 || opening) return;
    const t = setTimeout(() => {
      setOpening(true);
      onRevealRef.current();
    }, reduce ? 150 : 650);
    return () => clearTimeout(t);
  }, [progress, opening, reduce]);

  const step = [...STEPS].reverse().find(([at]) => progress >= at)[1];

  return (
    <motion.div
      className="cover loader"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Opening the book"
      style={{ originX: 0, transformPerspective: 1800 }}
      animate={opening ? (reduce ? { opacity: 0 } : { rotateY: -105, opacity: 0.5 }) : { rotateY: 0, opacity: 1 }}
      transition={{ duration: reduce ? 0.4 : 1.25, ease: [0.65, 0, 0.35, 1] }}
      onAnimationComplete={() => opening && onDone()}
    >
      <div className="cover__frame" aria-hidden="true">
        <span className="cover__corner cover__corner--tl">❦</span>
        <span className="cover__corner cover__corner--tr">❦</span>
        <span className="cover__corner cover__corner--bl">❦</span>
        <span className="cover__corner cover__corner--br">❦</span>
      </div>

      <motion.div
        className="cover__panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, ease: EASE_OUT }}
      >
        <p className="cover__kicker">A Personal Volume</p>
        <h1 className="cover__title">
          <span>The Pages of</span>
          Devansh
        </h1>

        <div className="gilt-rule" aria-hidden="true">
          <span className="gilt-rule__track">
            <motion.span
              className="gilt-rule__fill"
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.25, ease: 'linear' }}
            />
          </span>
          <span className="gilt-rule__gem">❦</span>
          <span className="gilt-rule__track gilt-rule__track--right">
            <motion.span
              className="gilt-rule__fill"
              animate={{ scaleX: progress / 100 }}
              transition={{ duration: 0.25, ease: 'linear' }}
            />
          </span>
        </div>

        <p className="loader__folio">{progress}</p>

        <div className="loader__step">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={step}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.3 }}
            >
              {step}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>

      <p className="loader__imprint">MMXXVI</p>
    </motion.div>
  );
}
