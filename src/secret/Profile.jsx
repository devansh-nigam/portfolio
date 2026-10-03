import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const EASE_OUT = [0.16, 1, 0.3, 1];
const ROMAN = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];

const roman = (n) => {
  let out = '';
  for (const [v, s] of ROMAN) while (n >= v) (out += s), (n -= v);
  return out;
};

// "a, b and c"
const prose = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`);

// Sections settle onto the page like ink as they scroll into view.
const ink = {
  initial: { opacity: 0, y: 18, filter: 'blur(3px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.9, ease: EASE_OUT },
};

function Fleuron() {
  return (
    <motion.div className="fleuron" aria-hidden="true" {...ink}>
      <span />❦<span />
    </motion.div>
  );
}

function Chapter({ n, title, children, dropCap = false }) {
  return (
    <motion.section className={`chapter${dropCap ? ' chapter--dropcap' : ''}`} {...ink}>
      <p className="chapter__num">Chapter {roman(n)}</p>
      <h2 className="chapter__title">{title}</h2>
      {children}
    </motion.section>
  );
}

// A photograph mounted in the book with paper corners. Tap to turn to the next plate.
function Plate({ photos, name }) {
  const [index, setIndex] = useState(0);
  const count = photos.length;
  const turn = () => count > 1 && setIndex((i) => (i + 1) % count);

  return (
    <motion.figure
      className="plate"
      initial={{ opacity: 0, y: 24, rotate: -4 }}
      animate={{ opacity: 1, y: 0, rotate: index % 2 ? 1.2 : -1.6 }}
      transition={{ duration: 1, ease: EASE_OUT }}
    >
      <div className="plate__mount" onClick={turn} role={count > 1 ? 'button' : undefined} aria-label={count > 1 ? 'Next photograph' : undefined}>
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
              transition={{ duration: 0.7 }}
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
          {count > 1 && <span> · tap to turn</span>}
        </figcaption>
      )}
    </motion.figure>
  );
}

export default function Profile({ profile, photos }) {
  const { name, age, tagline, facts, about, lookingFor, prompts, interests, greenFlags, song, contact } = profile;

  useEffect(() => {
    document.title = `The Pages of ${name}`;
  }, [name]);

  let chapter = 0;

  return (
    <motion.main className="book" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.9 }}>
      <article className="page">
        <motion.header
          className="titlepage"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE_OUT, delay: 0.1 }}
        >
          <p className="running-head">a private volume, opened just for you</p>
          <p className="titlepage__pre">The Pages of</p>
          <h1 className="titlepage__name">{name}</h1>
          {age && <p className="titlepage__age">aged {age}</p>}
          {tagline && <p className="titlepage__tagline">“{tagline}”</p>}
        </motion.header>

        <Plate photos={photos} name={name} />

        {facts?.length > 0 && (
          <motion.section className="particulars" {...ink}>
            <h2>Particulars</h2>
            <p>
              {facts.map((f, i) => (
                <span key={i}>
                  {i > 0 && <b aria-hidden="true"> ❧ </b>}
                  {f.text}
                </span>
              ))}
            </p>
          </motion.section>
        )}

        <Fleuron />

        {about && (
          <Chapter n={++chapter} title="About me" dropCap>
            <p>{about}</p>
          </Chapter>
        )}

        {prompts?.map((p, i) => (
          <Chapter key={i} n={++chapter} title={p.q}>
            <p>{p.a}</p>
          </Chapter>
        ))}

        {lookingFor && (
          <Chapter n={++chapter} title="What I’m looking for">
            <p>{lookingFor}</p>
          </Chapter>
        )}

        {(interests?.length > 0 || greenFlags?.length > 0 || song?.title) && <Fleuron />}

        {interests?.length > 0 && (
          <motion.section className="aside" {...ink}>
            <h3>Fond of</h3>
            <p>{prose(interests)}.</p>
          </motion.section>
        )}

        {greenFlags?.length > 0 && (
          <motion.section className="aside" {...ink}>
            <h3>In my favour</h3>
            <ul>
              {greenFlags.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ul>
          </motion.section>
        )}

        {song?.title && (
          <motion.section className="aside" {...ink}>
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
          </motion.section>
        )}

        <Fleuron />

        <motion.footer className="closing" {...ink}>
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
        </motion.footer>
      </article>
    </motion.main>
  );
}
