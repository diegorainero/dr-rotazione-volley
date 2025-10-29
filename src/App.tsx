import React from 'react';
import VolleyballCourt from './components/VolleyballCourt';

function App() {
  return (
    <div className='min-h-screen flex flex-col items-center justify-center bg-green-100'>
      <h1 className='text-2xl font-bold mb-4'>
        Analizzatore Rotazioni Pallavolo
      </h1>
      <VolleyballCourt />
    </div>
  );
}

export default App;
