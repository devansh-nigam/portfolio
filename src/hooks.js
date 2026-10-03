import { useEffect, useRef, useState } from 'react';

const GLYPHS = '!<>-_\\/[]{}=+*^?#$%&01ABCDEFXZ';
const randGlyph = () => GLYPHS[(Math.random() * GLYPHS.length) | 0];

// Decodes `text` from random glyphs, left to right. Re-runs whenever `text` or `key` changes.
export function useScramble(text, key = 0, duration = 700) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    let raf;
    const t0 = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - t0) / duration);
      const revealed = Math.floor(t * text.length);
      let s = '';
      for (let i = 0; i < text.length; i++) {
        s += i < revealed || text[i] === ' ' ? text[i] : randGlyph();
      }
      setOut(s);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, key, duration]);

  return out;
}

export function useInterval(fn, ms) {
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => {
    if (ms == null) return;
    const id = setInterval(() => fnRef.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function useClock(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useInterval(() => setNow(new Date()), ms);
  return now;
}

export const pad = (n, len = 2) => String(n).padStart(len, '0');
