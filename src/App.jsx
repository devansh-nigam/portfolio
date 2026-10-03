import { useEffect, useState } from 'react';
import Loader from './components/Loader.jsx';
import Hero from './components/Hero.jsx';
import ThemeToggle from './components/ThemeToggle.jsx';

// Never hold the loader hostage: if the fonts stall, open the book anyway.
const READY_TIMEOUT = 6000;

export default function App() {
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);

  useEffect(() => {
    if (document.fonts) document.fonts.ready.then(() => setReady(true));
    else setReady(true);
    const t = setTimeout(() => setReady(true), READY_TIMEOUT);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <ThemeToggle />
      <Hero start={revealed} />
      {!loaderDone && (
        <Loader ready={ready} onReveal={() => setRevealed(true)} onDone={() => setLoaderDone(true)} />
      )}
    </>
  );
}
