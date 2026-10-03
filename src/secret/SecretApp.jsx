import { Suspense, lazy, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import PinGate from './PinGate.jsx';
import ThemeToggle from '../components/ThemeToggle.jsx';

// PinGate imports this module itself once a PIN checks out, so the profile code never
// downloads for someone without a valid PIN; by the time it renders here it's cached.
const Profile = lazy(() => import('./Profile.jsx'));

export default function SecretApp() {
  const [content, setContent] = useState(null);

  return (
    <>
      <ThemeToggle />
      <AnimatePresence mode="wait">
        {content ? (
          <Suspense key="profile" fallback={null}>
            <Profile profile={content.profile} photos={content.photos} />
          </Suspense>
        ) : (
          <PinGate key="gate" onUnlock={setContent} />
        )}
      </AnimatePresence>
    </>
  );
}
