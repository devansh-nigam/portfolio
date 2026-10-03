import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// A ribbon bookmark hanging from the top edge; tap it to switch day paper / candlelight.
// The initial theme is set by an inline script in each page's index.html before first paint.
export default function ThemeToggle() {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme || 'day');
  const next = theme === 'day' ? 'night' : 'day';

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem('book-theme', next);
    } catch {
      // Private mode or blocked storage: the toggle still works for this visit.
    }
    setTheme(next);
  };

  return (
    <motion.button
      type="button"
      className="ribbon"
      onClick={toggle}
      aria-label={next === 'night' ? 'Read by candlelight' : 'Read in daylight'}
      title={next === 'night' ? 'read by candlelight' : 'read in daylight'}
      whileHover={{ y: 6 }}
      whileTap={{ y: 12 }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 6 }}
          transition={{ duration: 0.2 }}
        >
          {theme === 'day' ? '☾' : '☀'}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}
