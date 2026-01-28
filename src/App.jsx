import React, { useState } from 'react';
import CameraView from './components/CameraView';
import { Languages, ShieldAlert } from 'lucide-react';

function App() {
    const [lang, setLang] = useState('en');
    const [showIntro, setShowIntro] = useState(true);
    const [introFade, setIntroFade] = useState(false);

    const toggleLang = () => {
        const newLang = lang === 'en' ? 'ta' : 'en';
        setLang(newLang);
    };

    const handleIntroEnd = () => {
        setIntroFade(true);
        setTimeout(() => {
            setShowIntro(false);
        }, 1500); // Sync with CSS transition
    };

    return (
        <div
            className="app-container"
            style={{
                position: 'fixed',
                inset: 0,
                background: '#000',
                overflow: 'hidden'
            }}
            onClick={() => {
                const video = document.querySelector('video');
                if (video) video.play().catch(() => { });
            }}
        >
            <CameraView lang={lang} onIntroEnd={handleIntroEnd} />

            {/* Intro / Loading Screen */}
            {showIntro && (
                <div className={`intro-screen ${introFade ? 'fade-out' : ''}`}>
                    <div className="intro-logo-container">
                        <div className="intro-pulse-ring"></div>
                        <div className="intro-scan-arc"></div>
                        <img
                            src="/logo.png"
                            alt="VisionAid"
                            style={{ width: '160px', height: '160px', objectFit: 'contain', position: 'relative', zIndex: 10, filter: 'drop-shadow(0 0 20px var(--primary-glow))' }}
                        />
                    </div>
                    <div className="intro-text">
                        {lang === 'en' ? 'VisionAid is starting...' : 'VisionAid தொடங்குகிறது...'}
                    </div>
                </div>
            )}

            {/* Top Bar */}
            <div style={{
                position: 'absolute',
                top: '40px',
                left: '40px',
                right: '40px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 1000
            }}>
                <div className="status-active">
                    <div className="status-dot"></div>
                    ACTIVE
                </div>
            </div>

            {/* Independent Logo */}
            <div className="logo-container">
                <img src="/logo.png" alt="VisionAid" className="logo-img logo-glow" />
            </div>

            {/* 3D Hero Element */}
            <div className="hero-visual">
                <div className="detection-waves">
                    <div className="wave"></div>
                    <div className="wave"></div>
                    <div className="wave"></div>
                </div>
                <div className="camera-3d rotate-3d">
                    <div className="camera-lens"></div>
                </div>
                <div className="glass" style={{ padding: '0.8rem 2.5rem', borderRadius: '2rem', border: '1.5px solid var(--primary)' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 800, letterSpacing: '0.2em', color: '#fff' }}>
                        SCANNING SURROUNDINGS...
                    </span>
                </div>
            </div>

            {/* HUD Decorations */}
            <div className="hud-corner top-left" />
            <div className="hud-corner top-right" />
            <div className="hud-corner bottom-left" />
            <div className="hud-corner bottom-right" />

            {/* Side Control */}
            <div style={{
                position: 'absolute',
                top: '120px',
                left: '40px',
                zIndex: 100
            }}>
                <button
                    onClick={toggleLang}
                    className="glass btn-large"
                    style={{
                        background: lang === 'ta' ? 'rgba(255, 31, 31, 0.2)' : 'rgba(255,255,255,0.05)',
                        borderColor: lang === 'ta' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'
                    }}
                >
                    <Languages size={24} color={lang === 'ta' ? 'var(--primary)' : '#fff'} />
                    <span style={{ color: lang === 'ta' ? 'var(--primary)' : '#fff' }}>
                        {lang === 'en' ? 'English' : 'தமிழ்'}
                    </span>
                </button>
            </div>

            {/* Bottom Status / Warning */}
            <div style={{
                position: 'absolute',
                bottom: '60px',
                left: '40px',
                right: '40px',
                zIndex: 100,
                display: 'flex',
                flexDirection: 'column',
                gap: '20px'
            }}>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '25px' }}>
                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <div className="pulse" style={{ width: 14, height: 14, borderRadius: '50%', background: 'var(--primary)', boxShadow: '0 0 20px var(--primary)' }}></div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.15em' }}>SIGHT OPTIMAL</span>
                    </div>
                    <div className="glass" style={{ padding: '1.25rem', borderRadius: '1.5rem', display: 'flex', alignItems: 'center', gap: '15px' }}>
                        <ShieldAlert size={24} color="var(--primary)" />
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, letterSpacing: '0.15em' }}>SECURE PROTECT</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
