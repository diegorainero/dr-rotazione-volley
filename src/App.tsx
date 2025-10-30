import React, { useState } from 'react';
import VolleyballCourt from './components/VolleyballCourt';
import AppInfo from './components/AppInfo';
import { MigrationPanel } from './components/MigrationPanel';
import { CloudStatus } from './components/CloudStatus';
import './utils/firestoreTest'; // Import test utilities

function App() {
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);

  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-green-100'>
      <div className='flex items-center gap-4 mb-4'>
        <h1 className='text-2xl font-bold'>Analizzatore Rotazioni Pallavolo</h1>
        <CloudStatus onOpenMigration={() => setShowMigrationPanel(true)} />
      </div>

      <VolleyballCourt />

      {/* Info app e deployment */}
      <AppInfo />

      {/* Pannello migrazione */}
      {showMigrationPanel && (
        <MigrationPanel onClose={() => setShowMigrationPanel(false)} />
      )}
    </div>
  );
}

export default App;
