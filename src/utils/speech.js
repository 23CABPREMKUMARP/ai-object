// Keep track of the current listener to avoid duplicates
let voicesListener = null;

let currentUtterance = null;
let isSpeakingLocked = false;
let speechQueue = [];

export const speak = (text, lang = 'en-US', priority = 'normal', onEnd = null) => {
    if (!('speechSynthesis' in window)) return;

    const isUrgent = text.includes('Warning') || text.includes('Stop') || priority === 'high';

    // 1. Interrupt ONLY if urgent and speaking isn't locked by another urgent message
    if (isUrgent && window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        speechQueue = []; // Clear queue for urgent messages
        isSpeakingLocked = false;
    } else if (window.speechSynthesis.speaking || isSpeakingLocked) {
        // Prevent duplicate queuing of the same message within a short time
        if (speechQueue.some(item => item.text === text)) return;

        // Don't queue more than 2 messages to avoid backlog
        if (speechQueue.length < 2) {
            speechQueue.push({ text, lang, priority, onEnd });
        }
        return;
    }

    const doSpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length === 0) {
            // Wait for voices if not ready
            if (!voicesListener) {
                voicesListener = () => {
                    doSpeak();
                    window.speechSynthesis.removeEventListener('voiceschanged', voicesListener);
                    voicesListener = null;
                };
                window.speechSynthesis.addEventListener('voiceschanged', voicesListener);
            }
            return;
        }

        let selectedVoice = null;
        let finalLang = lang === 'ta' ? 'ta-IN' : 'en-IN';
        let finalText = text;

        if (lang === 'ta') {
            const tamilVoice = voices.find(v => v.lang.toLowerCase().includes('ta') || v.name.toLowerCase().includes('tamil'));
            if (tamilVoice) {
                selectedVoice = tamilVoice;
                const femaleTamil = voices.find(v => (v.lang.toLowerCase().includes('ta')) && (v.name.toLowerCase().includes('vani') || v.name.toLowerCase().includes('female')));
                if (femaleTamil) selectedVoice = femaleTamil;
            } else {
                finalText = "Tamil voice missing.";
                finalLang = 'en-IN';
                selectedVoice = voices.find(v => v.lang.toLowerCase().includes('en-in')) || voices.find(v => v.lang.includes('en'));
            }
        } else {
            selectedVoice = voices.find(v => v.lang.toLowerCase().includes('en-in') && (v.name.toLowerCase().includes('rishi') || v.name.toLowerCase().includes('female')))
                || voices.find(v => v.lang.includes('en'));
        }

        const utterance = new SpeechSynthesisUtterance(finalText);
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice ? selectedVoice.lang : finalLang;
        utterance.rate = 0.95;
        utterance.pitch = 1.0;

        currentUtterance = utterance;
        isSpeakingLocked = true;

        utterance.onend = () => {
            isSpeakingLocked = false;
            if (currentUtterance === utterance) currentUtterance = null;

            // Execute callback
            if (onEnd) onEnd();

            // Process next in queue
            if (speechQueue.length > 0) {
                const next = speechQueue.shift();
                speak(next.text, next.lang, next.priority, next.onEnd);
            }
        };

        utterance.onerror = (e) => {
            console.error("Speech error:", e);
            isSpeakingLocked = false;
            currentUtterance = null;
            if (onEnd) onEnd();
        };

        window.speechSynthesis.speak(utterance);
    };

    doSpeak();
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
        stairs: "Stairs",
        door: "Door",
        pole: "Pole",
        wall: "Wall",
        pit: "Pit",
        pothole: "Pothole",
        drain: "Drain",
        obstacle: "Obstacle",
        warning_close: "Warning! Obstacle very close. Please stop.",
        welcome: "Hello. VisionAid is now active. The camera is scanning your surroundings. I will guide you with voice alerts and safe paths."
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
        stairs: "படிக்கட்டு",
        door: "கதவு",
        pole: "தூண்",
        wall: "சுவர்",
        pit: "குழி",
        pothole: "பள்ளம்",
        drain: "சாக்கடை",
        obstacle: "தடை",
        warning_close: "எச்சரிக்கை! முன்னால் தடை உள்ளது. தயவுசெய்து நிற்கவும்.",
        welcome: "வணக்கம். VisionAid தொடங்கப்பட்டுள்ளது. கேமரா சுற்றுப்புறத்தை கண்காணிக்கிறது. தடைகள் மற்றும் பாதுகாப்பான பாதையை நான் குரலில் தெரிவிப்பேன்."
    }
};
