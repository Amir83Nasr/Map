import 'maplibre-gl/dist/maplibre-gl.css';
import 'qompick-core/styles.css';
import './app.css';
import { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { LocationPicker } from 'qompick-core';
import { QOM_SUGGEST, QOM_VENUES } from './data.js';

function Site(): React.JSX.Element {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!host.current) return;
    const p = new LocationPicker({
      container: host.current,
      search: { suggestions: QOM_SUGGEST },
      markers: QOM_VENUES,
    });
    return () => p.destroy();
  }, []);
  return (
    <main className="demo">
      <div ref={host} className="site-host" />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Site />);
