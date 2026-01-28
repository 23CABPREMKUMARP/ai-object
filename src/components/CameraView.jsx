import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocossd from '@tensorflow-models/coco-ssd';
import { speak, translations } from '../utils/speech';

const CameraView = ({ lang, onIntroEnd }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [model, setModel] = useState(null);

    // Use refs to avoid closure stale state in the rAF loop
    const langRef = useRef(lang);
    const [environment, setEnvironment] = useState('scanning');
    const [isLowLight, setIsLowLight] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    // Tracking for multi-frame confirmation and suppression
    // Map of class name -> { count, lastSeen, lastAnnounced, lastData }
    const detectionHistoryRef = useRef(new Map());
    const hasSpokenIntroRef = useRef(false);

    useEffect(() => {
        langRef.current = lang;
    }, [lang]);


    useEffect(() => {
        const loadModel = async () => {
            try {
                await tf.ready();
                // Set backend to webgl for maximum speed, then load model
                if (tf.getBackend() !== 'webgl') {
                    await tf.setBackend('webgl').catch(() => tf.setBackend('cpu'));
                }
                const loadedModel = await cocossd.load({ base: 'lite_mobilenet_v2' });
                setModel(loadedModel);

                // Warm-up prediction to speed up first real detection
                const dummy = tf.zeros([1, 300, 300, 3]);
                await loadedModel.detect(dummy);
                dummy.dispose();
                console.log("AI Model warmed up and ready.");
            } catch (err) {
                console.error("Failed to load model:", err);
            }
        };
        loadModel();
    }, []); // Only load model once

    useEffect(() => {
        if (model && !hasSpokenIntroRef.current) {
            speak(translations[lang].welcome, lang, 'normal', () => {
                if (onIntroEnd) onIntroEnd();
            });
            hasSpokenIntroRef.current = true;
        }
    }, [lang, model, onIntroEnd]);

    useEffect(() => {
        const startCamera = async () => {
            if (!videoRef.current) return;

            // Check for Secure Context (Required for camera)
            if (!window.isSecureContext && window.location.hostname !== 'localhost') {
                setCameraError("Secure context (HTTPS) required for camera access.");
                return;
            }

            const constraintOptions = [
                { video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
                { video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
                { video: true, audio: false }
            ];

            for (const options of constraintOptions) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia(options);
                    if (videoRef.current) {
                        videoRef.current.srcObject = stream;
                        await videoRef.current.play();
                        setCameraError(null);
                        console.log("Camera started successfully");
                        return;
                    }
                } catch (err) {
                    console.warn(`Failed with options:`, options, err);
                }
            }
            setCameraError("Camera access denied. Please enable camera in settings.");
        };

        startCamera();

        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = videoRef.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        };
    }, []);

    const detect = useCallback(async () => {
        if (model && videoRef.current && videoRef.current.readyState === 4) {
            const video = videoRef.current;
            const videoWidth = video.videoWidth;
            const videoHeight = video.videoHeight;

            videoRef.current.width = videoWidth;
            videoRef.current.height = videoHeight;
            canvasRef.current.width = videoWidth;
            canvasRef.current.height = videoHeight;

            // 1. GET DETECTIONS WITH LOW CONFIDENCE TOLERANCE
            const detections = await model.detect(video);
            const ctx = canvasRef.current.getContext('2d');
            ctx.clearRect(0, 0, videoWidth, videoHeight);

            const currentTime = Date.now();
            const currentDetectionsInFrame = new Map();

            // Lighting & Environment Context
            const ContextRules = {
                indoor: ['chair', 'door', 'wall', 'stairs', 'table', 'couch', 'tv', 'person'],
                outdoor: ['car', 'bus', 'truck', 'motorcycle', 'bicycle', 'person', 'pole', 'pit', 'pothole', 'stop sign'],
                scanning: ['person', 'car', 'truck', 'bus', 'motorcycle', 'bicycle', 'dog', 'chair', 'stairs']
            };

            let brightness = 0;
            try {
                const tempCanvas = document.createElement('canvas');
                tempCanvas.width = 50; tempCanvas.height = 50;
                const tempCtx = tempCanvas.getContext('2d');
                tempCtx.drawImage(video, 0, 0, 50, 50);
                const imageData = tempCtx.getImageData(0, 0, 50, 50);
                for (let i = 0; i < imageData.data.length; i += 4) {
                    brightness += (imageData.data[i] + imageData.data[i + 1] + imageData.data[i + 2]) / 3;
                }
                brightness /= 2500;
                setIsLowLight(brightness < 40);
            } catch (err) {
                console.warn("Lighting check failed", err);
            }

            // 2. PROCESS EVERY DETECTION
            let indoorScore = 0;
            let outdoorScore = 0;

            detections.forEach(prediction => {
                const className = prediction.class;
                const score = prediction.score;

                // Track for environment switching
                const indoorClasses = ['chair', 'couch', 'bed', 'table', 'tv', 'refrigerator'];
                const outdoorClasses = ['car', 'bus', 'truck', 'motorcycle', 'bicycle', 'stop sign'];
                if (indoorClasses.includes(className)) indoorScore++;
                if (outdoorClasses.includes(className)) outdoorScore++;

                // FILTER: Ignore completely irrelevant scores
                if (score < 0.6) return;

                // FILTER: Context-aware filtering
                const relevantObjects = ContextRules[environment] || ContextRules.scanning;
                if (!relevantObjects.includes(className) && score < 0.85) return;

                const [x, y, width, height] = prediction.bbox;
                const centerX = x + width / 2;
                const centerY = y + height / 2;
                const areaRatio = (width * height) / (videoWidth * videoHeight);

                // Horizontal Positioning (5 Zones for precision)
                const relX = (x + width / 2) / videoWidth;
                let zone = "";
                if (relX < 0.2) zone = currentLang === 'ta' ? "மிகவும் இடப்பக்கம்" : "far left";
                else if (relX < 0.4) zone = currentLang === 'ta' ? "இடப்பக்கம்" : "left";
                else if (relX < 0.6) zone = currentLang === 'ta' ? "நேராக" : "right ahead";
                else if (relX < 0.8) zone = currentLang === 'ta' ? "வலப்பக்கம்" : "right";
                else zone = currentLang === 'ta' ? "மிகவும் வலப்பக்கம்" : "far right";

                // Initialize or update tracking
                if (!detectionHistoryRef.current.has(className)) {
                    detectionHistoryRef.current.set(className, {
                        count: 0,
                        lastSeen: currentTime,
                        lastAnnounced: 0,
                        lastBbox: [x, y, width, height],
                        motion: 'static',
                        distance: 'far',
                        zone: zone,
                        score: score
                    });
                }

                const history = detectionHistoryRef.current.get(className);
                const prevBbox = history.lastBbox;

                // SMOOTHING: Simple weighted average for bbox to reduce jitter
                history.lastBbox = [
                    prevBbox[0] * 0.7 + x * 0.3,
                    prevBbox[1] * 0.7 + y * 0.3,
                    prevBbox[2] * 0.7 + width * 0.3,
                    prevBbox[3] * 0.7 + height * 0.3
                ];

                history.score = score;
                history.zone = zone;

                // A. Stability Check
                const dx = Math.abs(centerX - (prevBbox[0] + prevBbox[2] / 2));
                const dy = Math.abs(centerY - (prevBbox[1] + prevBbox[3] / 2));
                const isStable = dx < 60 && dy < 60;

                if (isStable) history.count = Math.min(history.count + 1, 5);
                else history.count = Math.max(0, history.count - 1);

                // B. Motion Detection (Dynamic scaling)
                const areaDiff = areaRatio - (prevBbox[2] * prevBbox[3]) / (videoWidth * videoHeight);
                if (areaDiff > 0.025) history.motion = 'approaching';
                else if (dx > 40) history.motion = 'lateral';
                else history.motion = 'static';

                // C. Distance & Urgency
                let urgency = 'low';
                let distance = 'far';
                if (areaRatio > 0.4) { distance = 'very close'; urgency = 'high'; }
                else if (areaRatio > 0.15) { distance = 'near'; urgency = 'medium'; }

                history.lastSeen = currentTime;
                history.distance = distance;
                history.urgency = urgency;

                const count = (currentDetectionsInFrame.get(className) || 0) + 1;
                currentDetectionsInFrame.set(className, count);

                // D. Visual Feedback
                const isUncertain = score < 0.75;
                const displayLabel = isUncertain ? (langRef.current === 'ta' ? 'தடை' : 'Obstacle') : (translations[langRef.current][className] || className);

                const color = urgency === 'high' ? 'var(--danger)' : (isUncertain ? 'var(--warning)' : 'var(--primary)');
                ctx.strokeStyle = color;
                ctx.lineWidth = urgency === 'high' ? 6 : 3;
                if (isUncertain) ctx.setLineDash([10, 5]);

                // Add outer glow to the box
                ctx.shadowColor = color;
                ctx.shadowBlur = 15;
                ctx.strokeRect(x, y, width, height);
                ctx.setLineDash([]);
                ctx.shadowBlur = 0;

                // Label styling
                ctx.fillStyle = color;
                const labelText = `${displayLabel.toUpperCase()} ${history.motion === 'approaching' ? '⚠️' : ''}`;
                const textMetrics = ctx.measureText(labelText);

                ctx.fillRect(x, y - 35, textMetrics.width + 30, 35);
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 18px Outfit';
                ctx.shadowBlur = 0;
                ctx.fillText(labelText, x + 15, y - 10);
            });

            // Update Environment state
            if (indoorScore > outdoorScore + 1) setEnvironment('indoor');
            else if (outdoorScore > indoorScore + 1) setEnvironment('outdoor');

            // 3. ANNOUNCEMENT ENGINE
            const historyMap = detectionHistoryRef.current;

            // Path Analysis: Check where screen is most clear
            let leftScore = 0; let rightScore = 0;
            detections.forEach(p => {
                const centerX = p.bbox[0] + p.bbox[2] / 2;
                if (centerX < videoWidth / 2) leftScore += p.bbox[2] * p.bbox[3];
                else rightScore += p.bbox[2] * p.bbox[3];
            });

            const currentLang = langRef.current;
            const recommendedAction = leftScore > rightScore ?
                (currentLang === 'ta' ? 'வலப்பக்கம் செல்லவும்' : 'Move right') :
                (currentLang === 'ta' ? 'இடப்பக்கம் செல்லவும்' : 'Move left');

            for (const [className, data] of historyMap.entries()) {
                if (currentTime - data.lastSeen > 1200) {
                    data.count = 0;
                    historyMap.delete(className);
                    continue;
                }

                if (data.count >= 2) { // Faster confirmation for better feeling
                    const timeSinceLast = currentTime - data.lastAnnounced;
                    const isApproaching = data.motion === 'approaching';
                    const isNewUrgency = data.urgency !== data.prevUrgency;
                    const score = data.score;

                    // COLLISION RISK: Critical priority
                    if (data.urgency === 'high' && isApproaching && timeSinceLast > 1200) {
                        const warning = currentLang === 'ta' ? "நில்லுங்கள். ஆபத்து." : "Stop. Danger ahead.";
                        speak(warning, currentLang, 'high');
                        data.lastAnnounced = currentTime;
                        data.prevUrgency = data.urgency;
                        continue;
                    }

                    // Announcement Debounce
                    const debounce = data.urgency === 'high' ? 2500 : 4500;

                    if (timeSinceLast > debounce || isNewUrgency) {
                        let text = "";
                        const dir = data.zone;

                        // TIER 1: Clear Object (High Confidence)
                        if (score >= 0.7) {
                            const name = translations[currentLang][className] || className;
                            const action = data.urgency === 'high' ? (currentLang === 'ta' ? 'கவனமாக இருக்கவும்' : 'Be very careful') : recommendedAction;

                            if (currentLang === 'ta') {
                                text = `${dir} ${name} உள்ளது. ${action}.`;
                            } else {
                                text = `${name} is ${dir}. ${action}.`;
                            }
                        }
                        // TIER 2: Probable Obstacle
                        else if (score >= 0.5) {
                            if (currentLang === 'ta') {
                                text = `${dir} ஏதோ ஒரு தடை உள்ளது. ${recommendedAction}.`;
                            } else {
                                text = `Something is at your ${dir}. ${recommendedAction}.`;
                            }
                        }

                        if (text) {
                            speak(text, currentLang, data.urgency === 'high' ? 'high' : 'normal');
                            data.lastAnnounced = currentTime;
                            data.prevUrgency = data.urgency;
                        }
                    }
                }
            }
        }
        requestAnimationFrame(detect);
    }, [model, environment]);


    useEffect(() => {
        if (model) {
            const id = requestAnimationFrame(detect);
            return () => cancelAnimationFrame(id);
        }
    }, [model, detect]);

    return (
        <div style={{ position: 'relative', width: '100%', height: '100%', background: '#000' }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: isLowLight ? 0.6 : 1
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

            {/* Dynamic Status (Low Light Only) */}
            {isLowLight && (
                <div className="glass pulse" style={{
                    position: 'absolute',
                    top: '120px',
                    left: '40px',
                    padding: '0.6rem 1.25rem',
                    borderRadius: '1.25rem',
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    color: 'var(--warning)',
                    letterSpacing: '0.15em',
                    border: '1px solid var(--warning)',
                    boxShadow: '0 0 25px rgba(250, 204, 21, 0.2)',
                    zIndex: 100
                }}>
                    LOW LIGHT DETECTED
                </div>
            )}

            {!model && (
                <div className="glass" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '3.5rem',
                    borderRadius: '2.5rem',
                    textAlign: 'center',
                    border: '2px solid var(--primary)',
                    boxShadow: '0 0 60px rgba(255, 31, 31, 0.2)'
                }}>
                    <h2 style={{ marginBottom: '2rem', color: 'var(--primary)', letterSpacing: '0.25em', fontSize: '1.2rem' }}>
                        {lang === 'en' ? 'INITIALIZING AI' : 'பார்வை தொடங்குகிறது'}
                    </h2>
                    <div className="loader"></div>
                </div>
            )}
            {cameraError && (
                <div className="glass" style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '2rem',
                    borderRadius: '2rem',
                    textAlign: 'center',
                    border: '1px solid var(--danger)',
                    boxShadow: '0 0 50px rgba(255, 8, 68, 0.3)',
                    zIndex: 1000
                }}>
                    <h2 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>
                        {lang === 'en' ? 'CAMERA ERROR' : 'கேமரா பிழை'}
                    </h2>
                    <p style={{ opacity: 0.8, fontSize: '0.9rem', marginBottom: '1.5rem' }}>{cameraError}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="glass"
                        style={{ padding: '0.75rem 2rem', borderRadius: '1rem', cursor: 'pointer', color: '#fff' }}
                    >
                        {lang === 'en' ? 'RETRY' : 'மீண்டும் முயற்சி'}
                    </button>
                </div>
            )}
            <div className="scanner-line"></div>
        </div>
    );
};

export default CameraView;
