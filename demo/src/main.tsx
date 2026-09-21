import 'maplibre-gl/dist/maplibre-gl.css';
import 'qompick-core/styles.css';
import './app.css';
import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { LocationPicker } from 'qompick-core';
import { LocationPickerView } from 'qompick-react';
import { QOM_SUGGEST, QOM_VENUES } from './data.js';

function useLog(): { lines: string[]; push: (s: string) => void } {
  const [lines, setLines] = useState<string[]>([]);
  return {
    lines,
    push: (s: string) =>
      setLines((p) => [`${new Date().toLocaleTimeString()} ${s}`, ...p].slice(0, 30)),
  };
}

function Vanilla({
  id,
  title,
  opts,
}: {
  id: string;
  title: string;
  opts: Omit<ConstructorParameters<typeof LocationPicker>[0], 'container'>;
}): React.JSX.Element {
  const log = useLog();
  useEffect(() => {
    const host = document.getElementById(id);
    if (!host) return;
    const push = (s: string): void => log.push(s);
    const p = new LocationPicker({
      ...opts,
      container: host,
      onLocationChange: (l) => push(`location ${l.lat.toFixed(4)},${l.lng.toFixed(4)}`),
      onAddressResolved: (l) => push(`address: ${l.address || '—'}`),
      onConfirm: (l) => push(`confirm ${l.lat.toFixed(5)},${l.lng.toFixed(5)}`),
      onError: (e) => push(`error ${e.message}`),
    });
    return () => p.destroy();
  }, [id]);
  return (
    <section className="panel">
      <h2>{title}</h2>
      <div id={id} className="pick-host" />
      <div className="log">
        {log.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </section>
  );
}

function ReactPanel(): React.JSX.Element {
  const log = useLog();
  return (
    <section className="panel">
      <h2>6 — React adapter</h2>
      <LocationPickerView
        search={{ suggestions: QOM_SUGGEST }}
        markers={QOM_VENUES}
        onLocationChange={(l) => log.push(`react location ${l.lat.toFixed(4)}`)}
        onConfirm={(l) => log.push(`react confirm ${l.address}`)}
        onError={(e) => log.push(`react error ${e.message}`)}
      />
      <div className="log">
        {log.lines.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </section>
  );
}

function App(): React.JSX.Element {
  return (
    <main className="demo">
      <h1>qompick demo</h1>
      <Vanilla
        id="p-default"
        title="1 — defaults (Qom, venues on)"
        opts={{ search: { suggestions: QOM_SUGGEST }, markers: QOM_VENUES }}
      />
      <Vanilla
        id="p-theme"
        title="2 — custom theme"
        opts={{
          theme: { brand: '#16a34a', brandDark: '#15803d' },
          search: { suggestions: QOM_SUGGEST },
        }}
      />
      <Vanilla
        id="p-marker"
        title="3 — custom marker"
        opts={{ marker: { color: '#e11d48', size: 40 }, search: { suggestions: QOM_SUGGEST } }}
      />
      <Vanilla
        id="p-minimal"
        title="4 — minimal (no GPS/search)"
        opts={{ controls: { gps: false, searchTrigger: false }, search: { enabled: false } }}
      />
      <Vanilla id="p-en" title="5 — English LTR" opts={{ i18n: { locale: 'en', dir: 'ltr' } }} />
      <ReactPanel />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
