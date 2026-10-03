import { useCallback, useEffect, useState } from 'react';
import Loader from './components/Loader.jsx';
import Hero from './components/Hero.jsx';

// Never hold the loader hostage: if fonts or WebGL stall, reveal anyway.
const READY_TIMEOUT = 7000;

export default function App() {
  const [fontsReady, setFontsReady] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [loaderDone, setLoaderDone] = useState(false);

  useEffect(() => {
    if (document.fonts) document.fonts.ready.then(() => setFontsReady(true));
    else setFontsReady(true);
    const t = setTimeout(() => {
      setFontsReady(true);
      setSceneReady(true);
    }, READY_TIMEOUT);
    return () => clearTimeout(t);
  }, []);

  const onSceneReady = useCallback(() => setSceneReady(true), []);

  return (
    <>
      <Hero start={revealed} onSceneReady={onSceneReady} />
      {!loaderDone && (
        <Loader
          ready={fontsReady && sceneReady}
          onReveal={() => setRevealed(true)}
          onDone={() => setLoaderDone(true)}
        />
      )}
    </>
  );
}
