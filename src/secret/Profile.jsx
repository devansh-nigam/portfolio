import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BookBar, Contents } from './BookNav.jsx';
import { roman } from './roman.js';

const EASE_OUT = [0.16, 1, 0.3, 1];
const FLIP = { duration: 0.8, ease: [0.645, 0.045, 0.355, 1] };
const SWIPE_MIN = 45; // px of horizontal travel that counts as a page turn

// "a, b and c"
const prose = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

// Turning forward, the current leaf swings off its left edge on top while the next waits beneath.
// Turning back, the previous leaf swings in from the left on top of the current one.
const leafVariants = {
  enter: (dir) => (dir > 0 ? { rotateY: 0, zIndex: 1 } : { rotateY: -120, zIndex: 3 }),
  center: { rotateY: 0, zIndex: 2, transition: FLIP },
  exit: (dir) =>
    dir > 0 ? { rotateY: -120, zIndex: 3, transition: FLIP } : { rotateY: 0, zIndex: 1, transition: { duration: FLIP.duration } },
};

// Light falls off as a leaf lifts away; the page underneath sits in its shadow until uncovered.
const shadeVariants = {
  enter: (dir) => ({ opacity: dir > 0 ? 0.45 : 0.6 }),
  center: { opacity: 0, transition: FLIP },
  exit: (dir) => ({ opacity: dir > 0 ? 0.6 : 0.45, transition: FLIP }),
};

const fadeVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, transition: { duration: 0.25 } },
};

function Fleuron() {
  return (
    <div className="fleuron" aria-hidden="true">
      <span />❦<span />
    </div>
  );
}

// A photograph mounted in the book with paper corners. Tap to show the next plate.
function Plate({ photos, name }) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const next = (e) => {
    if (count < 2) return;
    e.stopPropagation();
    setIndex((i) => (i + 1) % count);
  };

  return (
    <figure className="plate" style={{ rotate: index % 2 ? '1.2deg' : '-1.6deg' }}>
      <div
        className="plate__mount"
        onClick={next}
        role={count > 1 ? 'button' : undefined}
        aria-label={count > 1 ? 'Next photograph' : undefined}
      >
        {count > 0 ? (
          <AnimatePresence initial={false}>
            <motion.img
              key={index}
              src={photos[index]}
              alt={`${name}, photograph ${index + 1} of ${count}`}
              className="plate__img"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              draggable={false}
            />
          </AnimatePresence>
        ) : (
          <div className="plate__empty">{name?.[0]}</div>
        )}
        <i className="plate__corner plate__corner--tl" />
        <i className="plate__corner plate__corner--tr" />
        <i className="plate__corner plate__corner--bl" />
        <i className="plate__corner plate__corner--br" />
      </div>
      {count > 0 && (
        <figcaption>
          Plate {roman(index + 1)} of {roman(count)}
          {count > 1 && <span> · tap the photograph for the next</span>}
        </figcaption>
      )}
    </figure>
  );
}

function ChapterPage({ n, title, text, dropCap }) {
  return (
    <section className={`chapter${dropCap ? ' chapter--dropcap' : ''}`}>
      <p className="chapter__num">Chapter {roman(n)}</p>
      <h2 className="chapter__title">{title}</h2>
      <Fleuron />
      <p>{text}</p>
    </section>
  );
}

// Turns the profile into an ordered list of pages; sections the profile leaves out are skipped.
function buildPages(profile, photos) {
  const { name, age, tagline, facts, about, lookingFor, prompts, interests, greenFlags, song, contact } = profile;
  const pages = [];
  let chapter = 0;

  pages.push({
    id: 'title',
    label: 'Title page',
    body: (turned) => (
      <header className="titlepage">
        <p className="titlepage__pre">The Pages of</p>
        <h1 className="titlepage__name">{name}</h1>
        {age && <p className="titlepage__age">aged {age}</p>}
        {tagline && <p className="titlepage__tagline">“{tagline}”</p>}
        <Fleuron />
        <AnimatePresence>
          {!turned && (
            <motion.p
              className="turn-hint"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 1.2, duration: 0.8 }}
            >
              swipe to turn the page <span aria-hidden="true">⟶</span>
            </motion.p>
          )}
        </AnimatePresence>
      </header>
    ),
  });

  pages.push({
    id: 'photos',
    label: 'Photographs',
    body: () => <Plate photos={photos} name={name} />,
  });

  if (facts?.length) {
    pages.push({
      id: 'particulars',
      label: 'Particulars',
      body: () => (
        <section className="particulars">
          <h2>Particulars</h2>
          <Fleuron />
          <ul>
            {facts.map((f, i) => (
              <li key={i}>{f.text}</li>
            ))}
          </ul>
        </section>
      ),
    });
  }

  const chapters = [
    about && { title: 'About me', text: about, dropCap: true },
    ...(prompts ?? []).map((p) => ({ title: p.q, text: p.a })),
    lookingFor && { title: 'What I’m looking for', text: lookingFor },
  ].filter(Boolean);

  for (const c of chapters) {
    const n = ++chapter;
    pages.push({
      id: `chapter-${n}`,
      kicker: `Chapter ${roman(n)}`,
      label: c.title,
      body: () => <ChapterPage n={n} {...c} />,
    });
  }

  if (interests?.length || greenFlags?.length || song?.title) {
    pages.push({
      id: 'odds',
      label: 'Odds & ends',
      body: () => (
        <section className="odds">
          <h2 className="odds__title">Odds &amp; Ends</h2>
          <Fleuron />
          {interests?.length > 0 && (
            <div className="aside">
              <h3>Fond of</h3>
              <p>{prose(interests)}.</p>
            </div>
          )}
          {greenFlags?.length > 0 && (
            <div className="aside">
              <h3>In my favour</h3>
              <ul>
                {greenFlags.map((t, i) => (
                  <li key={i}>{t}</li>
                ))}
              </ul>
            </div>
          )}
          {song?.title && (
            <div className="aside">
              <h3>Presently on repeat</h3>
              <p>
                {song.url ? (
                  <a href={song.url} target="_blank" rel="noreferrer">
                    <em>{song.title}</em>
                  </a>
                ) : (
                  <em>{song.title}</em>
                )}
                {song.artist && <>, by {song.artist}</>}
              </p>
            </div>
          )}
        </section>
      ),
    });
  }

  pages.push({
    id: 'yours',
    label: 'Yours, truly',
    body: () => (
      <footer className="closing">
        {contact?.length > 0 && (
          <>
            <p className="closing__lead">If these pages found you well, write to me —</p>
            <ul className="closing__links">
              {contact.map((c, i) => (
                <li key={i}>
                  <a href={c.url} target="_blank" rel="noreferrer">
                    {c.label}
                    {c.handle && <small> {c.handle}</small>}
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="closing__yours">yours,</p>
        <p className="closing__signature">{name}</p>
        <p className="closing__fin">Fin.</p>
        <p className="closing__colophon">sealed with wax &amp; AES-256 · {new Date().getFullYear()}</p>
      </footer>
    ),
  });

  return pages;
}

export default function Profile({ profile, photos }) {
  const reduce = useReducedMotion();
  const pages = useMemo(() => buildPages(profile, photos), [profile, photos]);
  const [[index, dir], setPage] = useState([0, 1]);
  const [turned, setTurned] = useState(false);
  const [contentsOpen, setContentsOpen] = useState(false);
  const lastTurn = useRef(0);
  const swipe = useRef(null);

  useEffect(() => {
    document.title = `The Pages of ${profile.name}`;
  }, [profile.name]);

  const goTo = useCallback(
    (target) => {
      const now = performance.now();
      if (target === index || target < 0 || target >= pages.length || now - lastTurn.current < 350) return;
      lastTurn.current = now;
      setPage([target, target > index ? 1 : -1]);
      setTurned(true);
    },
    [index, pages.length]
  );

  const next = useCallback(() => goTo(index + 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') setContentsOpen(false);
      if (contentsOpen) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') next();
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') prev();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, prev, contentsOpen]);

  // Horizontal swipes turn pages; vertical drags are left alone so a long page can still scroll.
  const onPointerDown = (e) => {
    swipe.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    if (!swipe.current) return;
    const dx = e.clientX - swipe.current.x;
    const dy = e.clientY - swipe.current.y;
    swipe.current = null;
    if (Math.abs(dx) < SWIPE_MIN || Math.abs(dx) < Math.abs(dy) * 1.2) return;
    if (dx < 0) next();
    else prev();
  };

  const page = pages[index];

  return (
    <motion.main className="book" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, ease: EASE_OUT }}>
      <div
        className="stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        <div className="stage__book">
          <AnimatePresence initial={false} custom={dir}>
            <motion.article
              key={page.id}
              className="leaf"
              custom={dir}
              variants={reduce ? fadeVariants : leafVariants}
              initial="enter"
              animate="center"
              exit="exit"
              style={{ originX: 0 }}
              aria-label={`${page.kicker ? `${page.kicker}: ` : ''}${page.label}, page ${index + 1} of ${pages.length}`}
            >
              <div className="leaf__scroll">
                <p className="leaf__head">The Pages of {profile.name}</p>
                <div className="leaf__body">{page.body(turned)}</div>
                <p className="leaf__folio">— {roman(index + 1).toLowerCase()} —</p>
              </div>
              {!reduce && <motion.div className="leaf__shade" custom={dir} variants={shadeVariants} />}
            </motion.article>
          </AnimatePresence>
        </div>
      </div>

      <BookBar
        pages={pages}
        index={index}
        onPrev={prev}
        onNext={next}
        onContents={() => setContentsOpen(true)}
        nudge={!turned}
      />

      <Contents
        open={contentsOpen}
        pages={pages}
        index={index}
        onPick={(i) => {
          setContentsOpen(false);
          goTo(i);
        }}
        onClose={() => setContentsOpen(false)}
      />
    </motion.main>
  );
}
