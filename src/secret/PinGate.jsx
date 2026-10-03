import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useAnimationControls } from 'framer-motion';
import { useInterval } from '../hooks.js';
import { decryptPhoto, decryptProfile, loadVault, unlock } from './vault.js';

const LENGTH = 4;
const LOCKOUT_AFTER = 5;
const LOCKOUT_MS = 30_000;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'];
const EASE_OUT = [0.16, 1, 0.3, 1];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Wax seal with an irregular, dripped edge. Cracks and falls away once the right key is given.
function WaxSeal({ status, controls }) {
  const broken = status === 'granted';
  return (
    <motion.div
      className="seal"
      animate={controls}
      style={{ originY: 0.5 }}
    >
      <motion.svg
        viewBox="0 0 120 120"
        aria-hidden="true"
        animate={broken ? { y: [0, -4, 60], rotate: [0, -6, 24], opacity: [1, 1, 0] } : { y: 0, rotate: 0, opacity: 1 }}
        transition={broken ? { duration: 1.1, times: [0, 0.35, 1], ease: 'easeIn', delay: 0.35 } : { duration: 0.3 }}
      >
        <defs>
          <radialGradient id="wax" cx="38%" cy="32%" r="75%">
            <stop offset="0%" stopColor="#c8433a" />
            <stop offset="55%" stopColor="#962520" />
            <stop offset="100%" stopColor="#5e1310" />
          </radialGradient>
        </defs>
        <path
          className="seal__blob"
          d="M60 6c9 0 13 6 21 7s14-1 19 6 2 13 6 20 10 11 8 20-9 11-10 19 3 15-4 21-14 2-21 6-10 11-19 11-12-7-20-9-16 1-21-6-1-13-6-20-11-11-9-19 8-12 8-20-4-14 3-20 13-2 21-6S51 6 60 6Z"
          fill="url(#wax)"
        />
        <circle cx="60" cy="61" r="33" className="seal__ring" />
        <circle cx="60" cy="61" r="28" className="seal__ring seal__ring--inner" />
        <text x="60" y="76" textAnchor="middle" className="seal__letter">D</text>
        <motion.path
          d="M64 14 L57 38 L68 52 L54 70 L63 86 L56 108"
          className="seal__crack"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: broken ? 1 : 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
        />
      </motion.svg>
    </motion.div>
  );
}

export default function PinGate({ onUnlock }) {
  const [digits, setDigits] = useState('');
  const [status, setStatus] = useState('idle'); // idle | checking | wrong | granted | error
  const [message, setMessage] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState(0);
  const [now, setNow] = useState(Date.now());
  const shake = useAnimationControls();
  const wobble = useAnimationControls();
  const busy = useRef(false);

  const lockedFor = Math.max(0, Math.ceil((lockedUntil - now) / 1000));
  useInterval(() => setNow(Date.now()), lockedUntil > now ? 250 : null);

  const submit = useCallback(
    async (pin) => {
      busy.current = true;
      setStatus('checking');
      try {
        const vault = await loadVault();
        // Hold the "turning" state long enough to read, even on fast machines.
        const [key] = await Promise.all([unlock(vault, pin), wait(900)]);
        if (!key) {
          const n = attempts + 1;
          setAttempts(n);
          setStatus('wrong');
          shake.start({ x: [0, -12, 10, -7, 5, -2, 0], transition: { duration: 0.5 } });
          wobble.start({ rotate: [0, -9, 8, -5, 3, 0], transition: { duration: 0.6 } });
          if (n % LOCKOUT_AFTER === 0) setLockedUntil(Date.now() + LOCKOUT_MS);
          await wait(900);
          setDigits('');
          setStatus('idle');
          return;
        }
        setStatus('granted');
        const profile = await decryptProfile(vault, key);
        const [photos] = await Promise.all([
          Promise.all(profile.photos.map((p) => decryptPhoto(key, p))),
          import('./Profile.jsx'),
          wait(1500),
        ]);
        onUnlock({ profile, photos });
      } catch (e) {
        setStatus('error');
        setMessage(e.message === 'vault-missing' ? 'These pages are yet unwritten.' : 'The binding slipped. Try once more.');
        setDigits('');
      } finally {
        busy.current = false;
      }
    },
    [attempts, onUnlock, shake, wobble]
  );

  const press = useCallback(
    (key) => {
      if (busy.current || status === 'wrong' || status === 'granted' || lockedFor > 0) return;
      if (status === 'error') setStatus('idle');
      if (key === 'del') {
        setDigits((d) => d.slice(0, -1));
        return;
      }
      const next = (digits + key).slice(0, LENGTH);
      setDigits(next);
      if (next.length === LENGTH) submit(next);
    },
    [digits, status, lockedFor, submit]
  );

  useEffect(() => {
    const onKey = (e) => {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') press('del');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const left = LOCKOUT_AFTER - (attempts % LOCKOUT_AFTER);
  const statusText =
    lockedFor > 0
      ? `The clasp rests. Wait ${lockedFor}s.`
      : status === 'checking'
        ? 'The lock turns…'
        : status === 'wrong'
          ? 'The lock will not yield.'
          : status === 'granted'
            ? 'The seal is broken.'
            : status === 'error'
              ? message
              : attempts > 0
                ? `${left} more ${left === 1 ? 'try' : 'tries'} before the clasp rests.`
                : 'Awaiting the key.';

  return (
    <motion.main
      className={`cover cover--${status}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ rotateY: -105, opacity: 0.6, transition: { duration: 1.1, ease: [0.65, 0, 0.35, 1] } }}
      style={{ originX: 0, transformPerspective: 1800 }}
      transition={{ duration: 0.8 }}
    >
      <div className="cover__frame" aria-hidden="true">
        <span className="cover__corner cover__corner--tl">❦</span>
        <span className="cover__corner cover__corner--tr">❦</span>
        <span className="cover__corner cover__corner--bl">❦</span>
        <span className="cover__corner cover__corner--br">❦</span>
      </div>

      <div className="cover__scroll">
        <motion.div
          className="cover__panel"
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, ease: EASE_OUT, delay: 0.15 }}
        >
          <p className="cover__kicker">A Private Volume</p>
          <h1 className="cover__title">
            <span>The Pages of</span>
            Devansh
          </h1>

          <WaxSeal status={status} controls={wobble} />

          <p className="cover__sub">This book opens only with the four-figure key you were given.</p>

          <motion.div className="slots" animate={shake} role="status" aria-label={`${digits.length} of ${LENGTH} figures entered`}>
            {Array.from({ length: LENGTH }, (_, i) => (
              <span key={i} className={`slot${i < digits.length ? ' slot--filled' : ''}${i === digits.length && status === 'idle' ? ' slot--active' : ''}`}>
                {i < digits.length && (
                  <motion.i initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.25 }}>
                    ✦
                  </motion.i>
                )}
              </span>
            ))}
          </motion.div>

          <div className="cover__status" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={statusText}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25 }}
              >
                {statusText}
              </motion.span>
            </AnimatePresence>
          </div>

          <div className="keypad">
            {KEYS.map((k, i) =>
              k === '' ? (
                <span key={i} />
              ) : (
                <motion.button
                  key={i}
                  type="button"
                  className={`key${k === 'del' ? ' key--del' : ''}`}
                  onClick={() => press(k)}
                  whileTap={{ scale: 0.9 }}
                  disabled={lockedFor > 0 || status === 'checking' || status === 'granted'}
                  aria-label={k === 'del' ? 'erase' : k}
                >
                  {k === 'del' ? '⌫' : k}
                </motion.button>
              )
            )}
          </div>

          <p className="cover__hint">No key? Ask Devansh, nicely.</p>
        </motion.div>
      </div>
    </motion.main>
  );
}
