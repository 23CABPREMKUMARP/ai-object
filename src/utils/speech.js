// Keep track of the current listener to avoid duplicates
let voicesListener = null;

// Global reference to prevent GC (Chrome bug fix)
let currentUtterance = null;
let lastSpeakTime = 0;

export const speak = (text, lang = 'en-US') => {
    if (!('speechSynthesis' in window)) return;

    // Fix: If we switch languages, force a hard cancel to prevent queue mix-ups
    const now = Date.now();
    if (window.speechSynthesis.speaking && (now - lastSpeakTime < 1000) && !text.includes('Warning') && !text.includes('voice not found')) {
        return;
    }

    window.speechSynthesis.cancel();
    lastSpeakTime = now;

    setTimeout(() => {
        const doSpeak = () => {
            const voices = window.speechSynthesis.getVoices();
            if (voices.length === 0) return;

            // 1. SELECT VOICE FIRST
            let selectedVoice = null;
            let finalLang = lang === 'ta' ? 'ta-IN' : 'en-IN';
            let finalText = text;

            if (lang === 'ta') {
                // Try to find a REAL Tamil voice
                const tamilVoice = voices.find(v =>
                    v.lang.toLowerCase().includes('ta') ||
                    v.name.toLowerCase().includes('tamil')
                );

                if (tamilVoice) {
                    selectedVoice = tamilVoice;
                    // Prefer female if multiple exist
                    const femaleTamil = voices.find(v =>
                        (v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil')) &&
                        (v.name.toLowerCase().includes('vani') || v.name.toLowerCase().includes('female'))
                    );
                    if (femaleTamil) selectedVoice = femaleTamil;
                } else {
                    // CRITICAL FIX: If no Tamil voice exists, DO NOT try to speak Tamil text with an English voice.
                    // It causes the engine to hang/stuck.
                    console.warn("No Tamil voice found. Falling back to English.");
                    finalText = "Tamil voice missing. Please install Vani voice in Mac Accessibility Settings.";
                    finalLang = 'en-IN';

                    // Pick best English Indian voice
                    const indianVoice = voices.find(v =>
                        v.lang.toLowerCase().includes('en-in') ||
                        v.lang.toLowerCase().includes('hi-in')
                    );
                    selectedVoice = indianVoice || voices.find(v => v.lang.includes('en'));
                }
            } else {
                // English selection
                selectedVoice = voices.find(v =>
                    v.lang.toLowerCase().includes('en-in') &&
                    (v.name.toLowerCase().includes('rishi') || v.name.toLowerCase().includes('female'))
                ) || voices.find(v => v.lang.includes('en'));
            }

            // 2. CONFIGURE UTTERANCE
            const utterance = new SpeechSynthesisUtterance(finalText);
            utterance.voice = selectedVoice;
            utterance.lang = selectedVoice ? selectedVoice.lang : finalLang;
            utterance.rate = 0.9;
            utterance.pitch = 1.0;

            // Store reference to prevent GC
            currentUtterance = utterance;
            utterance.onend = () => { if (currentUtterance === utterance) currentUtterance = null; };
            utterance.onerror = (e) => { console.error("Speech error:", e); };

            window.speechSynthesis.speak(utterance);
        };

        if (window.speechSynthesis.getVoices().length > 0) {
            doSpeak();
        } else {
            if (voicesListener) window.speechSynthesis.removeEventListener('voiceschanged', voicesListener);
            voicesListener = () => {
                doSpeak();
                window.speechSynthesis.removeEventListener('voiceschanged', voicesListener);
                voicesListener = null;
            };
            window.speechSynthesis.addEventListener('voiceschanged', voicesListener);
        }
    }, 50);
};

export const translations = {
    en: {
        person: "Person ahead",
        bicycle: "Bicycle ahead",
        car: "Car ahead",
        motorcycle: "Motorcycle ahead",
        airplane: "Airplane",
        bus: "Bus ahead",
        train: "Train",
        truck: "Truck ahead",
        boat: "Boat",
        'traffic light': "Traffic light",
        'fire hydrant': "Fire hydrant",
        'stop sign': "Stop sign",
        'parking meter': "Parking meter",
        bench: "Bench",
        bird: "Bird",
        cat: "Cat",
        dog: "Dog",
        horse: "Horse",
        sheep: "Sheep",
        cow: "Cow",
        elephant: "Elephant",
        bear: "Bear",
        zebra: "Zebra",
        giraffe: "Giraffe",
        backpack: "Backpack",
        umbrella: "Umbrella",
        handbag: "Handbag",
        tie: "Tie",
        suitcase: "Suitcase",
        frisbee: "Frisbee",
        skis: "Skis",
        snowboard: "Snowboard",
        'sports ball': "Sports ball",
        kite: "Kite",
        'baseball bat': "Baseball bat",
        'baseball glove': "Baseball glove",
        skateboard: "Skateboard",
        surfboard: "Surfboard",
        'tennis racket': "Tennis racket",
        bottle: "Bottle",
        'wine glass': "Wine glass",
        cup: "Cup",
        fork: "Fork",
        knife: "Knife",
        spoon: "Spoon",
        bowl: "Bowl",
        banana: "Banana",
        apple: "Apple",
        sandwich: "Sandwich",
        orange: "Orange",
        broccoli: "Broccoli",
        carrot: "Carrot",
        'hot dog': "Hot dog",
        pizza: "Pizza",
        donut: "Donut",
        cake: "Cake",
        chair: "Chair ahead",
        couch: "Couch",
        'potted plant': "Potted plant",
        bed: "Bed",
        'dining table': "Dining table",
        toilet: "Toilet",
        tv: "TV",
        laptop: "Laptop",
        mouse: "Mouse",
        remote: "Remote",
        keyboard: "Keyboard",
        'cell phone': "Cell phone",
        microwave: "Microwave",
        oven: "Oven",
        toaster: "Toaster",
        sink: "Sink",
        refrigerator: "Refrigerator",
        book: "Book",
        clock: "Clock",
        vase: "Vase",
        scissors: "Scissors",
        'teddy bear': "Teddy bear",
        'hair drier': "Hair drier",
        toothbrush: "Toothbrush",
        warning_close: "Warning! Obstacle very close. Please stop.",
        welcome: "AI Navigation System Started. Tap anywhere to change language."
    },
    ta: {
        person: "நபர்",
        bicycle: "மிதிவண்டி",
        car: "கார்",
        motorcycle: "மோட்டார் சைக்கிள்",
        bus: "பேருந்து",
        truck: "லாரி",
        'traffic light': "போக்குவரத்து விளக்கு",
        'stop sign': "நிறுத்து அடையாளம்",
        bench: "பெஞ்ச்",
        cat: "பூனை",
        dog: "நாய்",
        chair: "நாற்காலி",
        'cell phone': "கைபேசி",
        bottle: "பாட்டில்",
        laptop: "மடிக்கணினி",
        tv: "தொலைக்காட்சி",
        backpack: "முதுகுப்பை",
        umbrella: "குடை",
        handbag: "கைப்பை",
        tie: "டை",
        suitcase: "பெட்டி",
        cup: "கோப்பை",
        fork: "முள் கரண்டி",
        knife: "கத்தி",
        spoon: "கரண்டி",
        bowl: "கிண்ணம்",
        banana: "வாழைப்பழம்",
        apple: "ஆப்பிள்",
        sandwich: "சாண்ட்விச்",
        orange: "ஆரஞ்சு",
        broccoli: "ப்ரோக்கோலி",
        carrot: "கேரட்",
        pizza: "பீட்சா",
        donut: "டோனட்",
        cake: "கேக்",
        bed: "படுக்கை",
        'dining table': "உணவு மேசை",
        toilet: "கழிப்பறை",
        mouse: "மவுஸ்",
        remote: "ரிமோட்",
        keyboard: "விசைப்பலகை",
        book: "புத்தகம்",
        clock: "கடிகாரம்",
        vase: "பூச்சாடி",
        scissors: "கத்தரிக்கோல்",
        toothbrush: "பல் துலக்கி",
        warning_close: "எச்சரிக்கை! முன்னால் தடை உள்ளது. தயவுசெய்து நிற்கவும்.",
        welcome: "AI வழிசெலுத்தல் அமைப்பு தொடங்கியது. மொழியை மாற்ற எங்கு வேண்டுமானாலும் தட்டவும்."
    }
};
