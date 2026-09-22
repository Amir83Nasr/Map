import 'qompick-react/styles.css';
import './app.css';
import { createRoot } from 'react-dom/client';
import { LocationPickerView } from 'qompick-react';
import { QOM_SUGGEST, QOM_VENUES } from './data.js';

function Site(): React.JSX.Element {
  return (
    <main className="demo">
      <LocationPickerView
        controls={{ developers: true }}
        map={{ glyphs: 'fonts/{fontstack}/{range}.pbf' }}
        search={{ suggestions: QOM_SUGGEST }}
        markers={QOM_VENUES}
        style={{ height: '100%' }}
      />
    </main>
  );
}

createRoot(document.getElementById('root')!).render(<Site />);
