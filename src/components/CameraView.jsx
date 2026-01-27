import React, { useRef, useEffect, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { speak, translations } from '../utils/speech';

const CameraView = ({ lang, isMuted }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [model, setModel] = useState(null);

    // Use refs to avoid closure stale state in the rAF loop
    const langRef = useRef(lang);
    const isMutedRef = useRef(isMuted);
    const lastAnnouncedRef = useRef("");
    const announcementTimeRef = useRef(0);

    useEffect(() => {
        langRef.current = lang;
    }, [lang]);

    useEffect(() => {
        isMutedRef.current = isMuted;
    }, [isMuted]);

    useEffect(() => {
        const loadModel = async () => {
            try {
                const loadedModel = await cocossd.load();
                setModel(loadedModel);
            } catch (err) {
                console.error("Failed to load model:", err);
            }
        };
        loadModel();
    }, []); // Only load model once

    useEffect(() => {
        if (model && !isMuted) {
            // Cancel any pending announcements before speaking welcome
            speak(translations[lang].welcome, lang);
        }
    }, [lang, model]); // Trigger welcome when language changes or model finishes loading

    useEffect(() => {
        if (videoRef.current) {
            navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
                audio: false
            }).then(stream => {
                videoRef.current.srcObject = stream;
            }).catch(err => console.error("Camera access denied:", err));
        }
    }, [videoRef]);

    const detect = async () => {
        if (model && videoRef.current && videoRef.current.readyState === 4) {
            const video = videoRef.current;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            videoRef.current.width = videoWidth;
            videoRef.current.height = videoHeight;
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;

            const detections = await model.detect(video);

            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, videoWidth, videoHeight);

            detections.forEach(prediction => {
                const [x, y, width, height] = prediction.bbox;
                const text = prediction.class;
                const currentLang = langRef.current;
                const currentIsMuted = isMutedRef.current;

                // Draw bounding box
                ctx.strokeStyle = '#00f2fe';
                ctx.lineWidth = 4;
                ctx.strokeRect(x, y, width, height);

                // Helper to get translation with fallback for specific breeds/types
                const getTranslation = (text, lang) => {
                    const lower = text.toLowerCase().trim();
                    if (translations[lang][lower]) return translations[lang][lower];

                    // Fuzzy matching for common categories
                    if (lower.includes('dog') || lower.includes('terrier') || lower.includes('retriever') || lower.includes('shepherd') || lower.includes('hound') || lower.includes('pug') || lower.includes('beagle')) {
                        return translations[lang]['dog'];
                    }
                    if (lower.includes('cat') || lower.includes('kitten') || lower.includes('tabby')) {
                        return translations[lang]['cat'];
                    }
                    if (lower.includes('bird') || lower.includes('eagle') || lower.includes('owl') || lower.includes('parrot')) {
                        return translations[lang]['bird'];
                    }

                    return text;
                };

                // Draw label background
                const displayName = getTranslation(text, currentLang);
                ctx.fillStyle = '#00f2fe';
                const textWidth = ctx.measureText(displayName).width;
                ctx.fillRect(x, y - 25, textWidth + 10, 25);

                // Draw label text
                ctx.fillStyle = '#0f172a';
                ctx.font = '18px Arial';
                ctx.fillText(displayName, x + 5, y - 7);

                // Logic for announcement
                const currentTime = Date.now();
                const area = width * height;
                const screenArea = videoWidth * videoHeight;
                const areaRatio = area / screenArea;

                // Use ref values instead of state to avoid stale closure
                const announcementTime = announcementTimeRef.current;
                const lastAnnounced = lastAnnouncedRef.current;

                // Debug info
                ctx.fillStyle = currentLang === 'ta' ? '#ffeb3b' : '#ffffff';
                ctx.font = '16px Arial';
                ctx.fillText(`Lang: ${currentLang} | Voice: ${currentIsMuted ? 'Muted' : 'Active'}`, 10, 30);

                // Calculate Direction based on center X
                const centerX = x + width / 2;
                const relativeX = centerX / videoWidth;
                let direction = 'front'; // default
                if (relativeX < 0.35) direction = 'left';
                else if (relativeX > 0.65) direction = 'right';

                // Determine Risk Level
                let risk = 'low';
                if (areaRatio > 0.4) risk = 'high';
                else if (areaRatio > 0.15) risk = 'medium';

                // Helper to generate colloquial Tamil sentences
                const generateTamilSentence = (objName, dir, riskLevel, originalObjClass) => {
                    const dirText = {
                        'front': 'முன்னால்',
                        'left': 'இடது பக்கம்',
                        'right': 'வலது பக்கம்'
                    }[dir];

                    const isVehicle = ['car', 'truck', 'bus', 'motorcycle', 'bicycle', 'train'].includes(originalObjClass.toLowerCase());
                    const isPerson = originalObjClass.toLowerCase() === 'person';

                    // High Risk (Very Close)
                    if (riskLevel === 'high') {
                        return `கவனம், ${dirText} ${objName} மிகவும் அருகில் இருக்கிறது, இப்போது நிறுத்துங்கள்.`;
                    }

                    // Medium Risk (Near)
                    if (riskLevel === 'medium') {
                        if (isVehicle) {
                            return `கவனம், ${dirText} ${objName} வருகிறது, சற்று விலகி இருங்கள்.`;
                        } else if (isPerson) {
                            return `${dirText} ${objName} இருக்கிறார், கொஞ்சம் மெதுவாக நடக்கவும்.`;
                        }
                        return `${dirText} ${objName} இருக்கிறது, பார்த்து நடக்கவும்.`;
                    }

                    // Low Risk (Far)
                    return `${dirText}, ${objName} தெரிகிறது.`;
                };

                // Logic to trigger speech
                const timeSinceLastAnnouncement = currentTime - announcementTime;

                // Always announce High Risk warnings immediately if enough time passed (3s)
                if (risk === 'high' && !currentIsMuted && timeSinceLastAnnouncement > 3000) {
                    const safeName = getTranslation(text, currentLang);
                    const alert = currentLang === 'ta'
                        ? generateTamilSentence(safeName, direction, risk, text)
                        : `Warning! ${safeName} very close in ${direction}. Stop immediately.`;

                    speak(alert, currentLang);
                    announcementTimeRef.current = currentTime;
                    lastAnnouncedRef.current = text + '_high_risk';

                    // Normal announcements (debounce 5s)
                } else if (prediction.score > 0.6 && !currentIsMuted && timeSinceLastAnnouncement > 5000) {
                    const translatedName = getTranslation(text, currentLang);

                    if (translatedName !== lastAnnounced || timeSinceLastAnnouncement > 8000) {
                        let announcement = "";

                        if (currentLang === 'ta') {
                            announcement = generateTamilSentence(translatedName, direction, risk, text);
                        } else {
                            // English fallback natural sentences
                            const dirStr = direction === 'front' ? 'ahead' : `on your ${direction}`;
                            announcement = `${translatedName} detected ${dirStr}.`;
                        }

                        speak(announcement, currentLang);
                        lastAnnouncedRef.current = translatedName;
                        announcementTimeRef.current = currentTime;
                    }
                }
            });
        }
        requestAnimationFrame(detect);
    };

    useEffect(() => {
        if (model) {
            const id = requestAnimationFrame(detect);
            return () => cancelAnimationFrame(id);
        }
    }, [model]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                }}
            />
            <canvas
                ref={canvasRef}
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                }}
            />
            {!model && (
                <div className="glass" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '2rem',
                    borderRadius: '1rem',
                    textAlign: 'center'
                }}>
                    <h2 style={{ marginBottom: '1rem' }}>
                        {lang === 'en' ? 'Initializing AI...' : 'AI தொடக்கம்...'}
                    </h2>
                    <div className="loader"></div>
                </div>
            )}
            <div className="scanner-line"></div>
        </div>
    );
};

export default CameraView;
