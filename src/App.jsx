import React, { useState, useEffect } from 'react';
import CameraView from './components/CameraView';
import { Languages, Volume2, VolumeX, Info, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const [lang, setLang] = useState('en');
  const [isMuted, setIsMuted] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);

  const toggleLang = () => {
    const newLang = lang === 'en' ? 'ta' : 'en';
    setLang(newLang);
  };

  return (
    <div className="app-container" style={{ position: 'fixed', inset: 0, background: '#000' }}>
      <CameraView lang={lang} isMuted={isMuted} />

      {/* Top Controls */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        zIndex: 100
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={toggleLang}
          className="glass btn-large"
          style={{ padding: '1rem', background: lang === 'ta' ? 'var(--primary)' : 'rgba(255,255,255,0.1)', color: lang === 'ta' ? '#000' : '#fff' }}
        >
          <Languages size={24} />
          {lang === 'en' ? 'English' : 'தமிழ்'}
        </motion.button>

        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsMuted(!isMuted)}
          className="glass btn-large"
          style={{ padding: '1rem', background: isMuted ? 'var(--danger)' : 'rgba(255,255,255,0.1)' }}
        >
          {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </motion.button>
      </div>

      {/* Bottom Status / Warning */}
      <div style={{
        position: 'absolute',
        bottom: '40px',
        left: '20px',
        right: '20px',
        zIndex: 100,
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <AnimatePresence>
          {showOverlay && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="glass"
              style={{
                padding: '1.5rem',
                borderRadius: '1.5rem',
                border: '2px solid var(--primary)',
                textAlign: 'center'
              }}
            >
              <h1 style={{ fontSize: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                {lang === 'en' ? 'VISION ASSIST' : 'பார்வை உதவி'}
              </h1>
              <p style={{ opacity: 0.8, fontSize: '0.9rem' }}>
                {lang === 'en'
                  ? 'Detecting surrounding objects in real-time. Please use with caution.'
                  : 'நிகழ்நேரத்தில் பொருட்களைக் கண்டறிதல். எச்சரிக்கையுடன் பயன்படுத்தவும்.'}
              </p>
              <button
                onClick={() => setShowOverlay(false)}
                style={{
                  marginTop: '1rem',
                  background: 'none',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '2rem',
                  cursor: 'pointer'
                }}
              >
                {lang === 'en' ? 'Got it' : 'சரி'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 10px #4ade80' }}></div>
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>LIVE ANALYTICS</span>
          </div>
          <div className="glass" style={{ padding: '1rem', borderRadius: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <ShieldAlert size={18} color="var(--warning)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>SAFETY ON</span>
          </div>
        </div>
      </div>

      {/* Decorative HUD Elements */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '20px',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        opacity: 0.5
      }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: '2px', height: '40px', background: 'var(--primary)' }}></div>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        top: '50%',
        right: '20px',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '40px',
        opacity: 0.5
      }}>
        {[1, 2, 3].map(i => (
          <div key={i} style={{ width: '2px', height: '40px', background: 'var(--primary)' }}></div>
        ))}
      </div>
    </div>
  );
}

export default App;
