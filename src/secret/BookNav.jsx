import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { roman } from './roman.js';

const EASE_OUT = [0.16, 1, 0.3, 1];

// Always on screen: where you are, how far through, and a way to the contents.
export function BookBar({ pages, index, onPrev, onNext, onContents, nudge }) {
  const page = pages[index];
  const last = pages.length - 1;

  return (
    <nav className="bookbar" aria-label="Pages">
      <div className="bookbar__progress" aria-hidden="true">
        <motion.span
          animate={{ scaleX: (index + 1) / pages.length }}
          transition={{ duration: 0.6, ease: EASE_OUT }}
        />
      </div>

      <button type="button" className="bookbar__turn" onClick={onPrev} disabled={index === 0} aria-label="Previous page">
        ‹
      </button>

      <button
        type="button"
        className="bookbar__where"
        onClick={onContents}
        aria-label={`${page.kicker ? `${page.kicker}, ` : ''}${page.label}. Page ${index + 1} of ${pages.length}. Open contents.`}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={page.id}
            className="bookbar__label"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
          >
            <small>
              {page.kicker ? `${page.kicker} · ` : ''}
              {roman(index + 1).toLowerCase()} of {roman(pages.length).toLowerCase()}
            </small>
            <em>{page.label}</em>
          </motion.span>
        </AnimatePresence>
        <span className="bookbar__contents" aria-hidden="true">
          Contents ☰
        </span>
      </button>

      <button
        type="button"
        className={`bookbar__turn${nudge ? ' bookbar__turn--nudge' : ''}`}
        onClick={onNext}
        disabled={index === last}
        aria-label="Next page"
      >
        ›
      </button>
    </nav>
  );
}

// The table of contents, slid up over the page; picking an entry flips straight to it.
export function Contents({ open, pages, index, onPick, onClose }) {
  const current = useRef(null);

  useEffect(() => {
    if (open) current.current?.focus({ preventScroll: true });
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            className="contents__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
          <motion.section
            key="sheet"
            className="contents"
            role="dialog"
            aria-modal="true"
            aria-label="Contents"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.45, ease: EASE_OUT }}
          >
            <header className="contents__head">
              <h2>Contents</h2>
              <button type="button" className="contents__close" onClick={onClose} aria-label="Close contents">
                ×
              </button>
            </header>
            <ol className="contents__list">
              {pages.map((p, i) => (
                <li key={p.id}>
                  <button
                    type="button"
                    ref={i === index ? current : undefined}
                    className={i === index ? 'is-current' : ''}
                    aria-current={i === index ? 'page' : undefined}
                    onClick={() => onPick(i)}
                  >
                    <span className="contents__mark" aria-hidden="true">
                      {i === index ? '❧' : ''}
                    </span>
                    <span className="contents__entry">
                      {p.kicker && <small>{p.kicker}</small>}
                      <em>{p.label}</em>
                    </span>
                    <span className="contents__leader" aria-hidden="true" />
                    <span className="contents__num">{roman(i + 1).toLowerCase()}</span>
                  </button>
                </li>
              ))}
            </ol>
          </motion.section>
        </>
      )}
    </AnimatePresence>
  );
}
