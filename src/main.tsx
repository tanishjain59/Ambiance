import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import TitlePage from './components/TitlePage';
import GeneratePage from './components/GeneratePage';
import MixerPage from './components/MixerPage';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/generate" element={<GeneratePage />} />
        <Route path="/mix" element={<MixerPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
); 