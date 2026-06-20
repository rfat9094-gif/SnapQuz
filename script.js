// 1. استيراد دالات الفايربيز المطلوبة من الـ CDN الحديث للإصدار v10
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, child, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// بيانات الفايربيز الحقيقية الخاصة بمشروعك
const firebaseConfigReal = {
  apiKey: "AIzaSyBuKqorLPtSOdbp45L5MsXcEF2-laHFx60",
  authDomain: "snapquiz-79f06.firebaseapp.com",
  databaseURL: "https://snapquiz-79f06-default-rtdb.firebaseio.com",
  projectId: "snapquiz-79f06",
  storageBucket: "snapquiz-79f06.firebasestorage.app",
  messagingSenderId: "634887130922",
  appId: "1:634887130922:web:8b31fd530ab2a8d2dd9853",
  measurementId: "G-6K12883PLH"
};

let db = null;

// محاولة تشغيل فايربيز بأمان بدون إيقاف كود الصفحة في البيئات المحلية
try {
    if (firebaseConfigReal.apiKey && firebaseConfigReal.apiKey !== "YOUR_API_KEY") {
        const app = initializeApp(firebaseConfigReal);
        db = getDatabase(app);
        console.log("تم اتصال Firebase بنجاح! 🔥");
    } else {
        console.log("وضع التجربة المحلي: اللعبة تعمل أوفلاين بكفاءة.");
    }
} catch (e) {
    console.log("تخطي الفايربيز لتفادي الكراش المحتمل:", e);
}

let gameState = {
    score: 0,
    correctAnswersCount: 0,
    wrongAnswersCount: 0,
    allBankQuestions: [], 
    activeQuestions: [],   
    currentQuestionIndex: 0,
    timer: null,
    timeLeft: 15,
    isSoundEnabled: true,
    currentLevel: 1,
    highScore: 0
};

// تم تحديث البنك الاحتياطي بكامل أسئلتك لضمان عمل الـ 10 أسئلة حتى أوفلاين!
const backupQuestions = [
    // أعلام الدول
    { "id": "c_1", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "مصر", "options": ["مصر", "سوريا", "العراق", "اليمن"], "image": "https://flagcdn.com/w320/eg.png" },
    { "id": "c_2", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "السعودية", "options": ["السعودية", "الكويت", "عمان", "قطر"], "image": "https://flagcdn.com/w320/sa.png" },
    { "id": "c_3", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "الإمارات", "options": ["الإمارات", "الأردن", "فلسطين", "السودان"], "image": "https://flagcdn.com/w320/ae.png" },
    { "id": "c_4", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "الأردن", "options": ["الأردن", "الكويت", "البحرين", "تونس"], "image": "https://flagcdn.com/w320/jo.png" },
    { "id": "c_5", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم？", "correctAnswer": "اليابان", "options": ["اليابان", "الصين", "كوريا الجنوبية", "فيتنام"], "image": "https://flagcdn.com/w320/jp.png" },
    { "id": "c_6", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "فرنسا", "options": ["فرنسا", "إيطاليا", "روسيا", "هولندا"], "image": "https://flagcdn.com/w320/fr.png" },
    { "id": "c_7", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "البرازيل", "options": ["البرازيل", "الأرجنتين", "كولومبيا", "المكسيك"], "image": "https://flagcdn.com/w320/br.png" },
    { "id": "c_8", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "المغرب", "options": ["المغرب", "الجزائر", "تونس", "ليبيا"], "image": "https://flagcdn.com/w320/ma.png" },
    { "id": "c_9", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "كندا", "options": ["كندا", "أمريكا", "أستراليا", "بريطانيا"], "image": "https://flagcdn.com/w320/ca.png" },
    { "id": "c_10", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "ألمانيا", "options": ["ألمانيا", "بلجيكا", "إسبانيا", "البرتغال"], "image": "https://flagcdn.com/w320/de.png" },
    { "id": "c_11", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "فلسطين", "options": ["فلسطين", "الأردن", "الكويت", "عمان"], "image": "https://flagcdn.com/w320/ps.png" },
    { "id": "c_12", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "إيطاليا", "options": ["إيطاليا", "المكسيك", "فرنسا", "إسبانيا"], "image": "https://flagcdn.com/w320/it.png" },
    
    // السيارات
    { "id": "car_1", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا شاشعار؟", "correctAnswer": "مرسيدس بنز", "options": ["مرسيدس بنز", "بي إم دبليو", "أودي", "فولكس فاجن"], "image": "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" },
    { "id": "car_2", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "بي إم دبليو", "options": ["بي إم دبليو", "مرسيدس بنز", "فورد", "هيونداي"], "image": "https://www.carlogos.org/car-logos/bmw-logo.png" },
    { "id": "car_3", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "تويوتا", "options": ["تويوتا", "هوندا", "نيسان", "مازدا"], "image": "https://www.carlogos.org/car-logos/toyota-logo.png" },
    { "id": "car_4", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "هيونداي", "options": ["هيونداي", "كيا", "هوندا", "سوزوكي"], "image": "https://www.carlogos.org/car-logos/hyundai-logo.png" },
    { "id": "car_5", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "فورد", "options": ["فورد", "شيفروليه", "جيب", "دودج"], "image": "https://www.carlogos.org/car-logos/ford-logo.png" },
    { "id": "car_6", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "لامبورغيني", "options": ["لامبورغيني", "فيراري", "بورشه", "بوجاتي"], "image": "https://www.carlogos.org/car-logos/lamborghini-logo.png" },
    { "id": "car_7", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "فيراري", "options": ["فيراري", "بورشه", "موجاتي", "موستانج"], "image": "https://www.carlogos.org/car-logos/ferrari-logo.png" },
    { "id": "car_8", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "أودي", "options": ["أودي", "بي إم دبليو", "تويوتا", "نيسان"], "image": "https://www.carlogos.org/car-logos/audi-logo.png" },
    { "id": "car_9", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "كيا", "options": ["كيا", "هيونداي", "تويوتا", "مازدا"], "image": "https://www.carlogos.org/car-logos/kia-logo.png" },
    { "id": "car_10", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "نيسان", "options": ["نيسان", "تويوتا", "هوندا", "ميتسوبيشي"], "image": "https://www.carlogos.org/car-logos/nissan-logo.png" },
    { "id": "car_11", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "هوندا", "options": ["هوندا", "تويوتا", "هيونداي", "سوزوكي"], "image": "https://www.carlogos.org/car-logos/honda-logo.png" },

    // المعالم
    { "id": "m_1", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "الأهرامات (مصر)", "options": ["الأهرامات (مصر)", "برج إيفل (فرنسا)", "سور الصين العظيم", "تاج محل (الهند)"], "image": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=500" },
    { "id": "m_2", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "برج إيفل (فرنسا)", "options": ["برج إيفل (فرنسا)", "برج بيزا المائل", "تمثال الحرية", "ساعة بيج بن"], "image": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500" },
    { "id": "m_3", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "تاج محل (الهند)", "options": ["تاج محل (الهند)", "البيت الأبيض", "مسرح الكولوسيوم", "البتراء (الأردن)"], "image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=500" },
    { "id": "m_4", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "تمثال الحرية (أمريكا)", "options": ["تمثال الحرية (أمريكا)", "تمثال المسيح الفادي", "برج خليفة", "برج إيفل"], "image": "https://images.unsplash.com/photo-1605130284535-11dd9ebc5277?w=500" },
    { "id": "m_5", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير？", "correctAnswer": "الكولوسيوم (إيطاليا)", "options": ["الكولوسيوم (إيطاليا)", "الأهرامات", "البتراء", "سور الصين العظيم"], "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500" },
    { "id": "m_6", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "برج خليفة (الإمارات)", "options": ["برج خليفة (الإمارات)", "برج إيفل", "ساعة بيج بن", "تاج محل"], "image": "https://images.unsplash.com/photo-1597655601841-214a4cfe8b2c?w=500" },
    { "id": "m_7", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "برج بيزا المائل (إيطاليا)", "options": ["برج بيزا المائل (إيطاليا)", "برج إيفل", "ساعة بيج بن", "البيت الأبيض"], "image": "https://images.unsplash.com/photo-1543872084-c7bd3822856f?w=500" },
    { "id": "m_8", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "سور الصين العظيم (الصين)", "options": ["سور الصين العظيم (الصين)", "تاج محل", "الكولوسيوم", "الأهرامات"], "image": "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=500" },

    // معلومات عامة
    { "id": "g_1", "category": "general", "question": "كم عدد كواكب المجموعة الشمسية؟", "correctAnswer": "8 كواكب", "options": ["8 كواكب", "9 كواكب", "7 كواكب", "6 كواكب"], "image": null },
    { "id": "g_2", "category": "general", "question": "ما هو أكبر المحيطات على كوكب الأرض؟", "correctAnswer": "المحيط الهادئ", "options": ["المحيط الهادئ", "المحيط الأطلسي", "المحيط الهندي", "المحيط المتجمد"], "image": null },
    { "id": "g_3", "category": "general", "question": "من هو العالم الذي اكتشف جاذبية الأرض؟", "correctAnswer": "إسحاق نيوتن", "options": ["إسحاق نيوتن", "ألبيرت أينشتاين", "غاليليو غاليلي", "توماس إديسون"], "image": null },
    { "id": "g_4", "category": "general", "question": "ما هو أطول نهر في العالم؟", "correctAnswer": "نهر النيل", "options": ["نهر النيل", "نهر الأمازون", "نهر الميسيسيبي", "نهر الدانوب"], "image": null },
    { "id": "g_5", "category": "general", "question": "ما هو الغاز الأساسي الذي يتنفسه الإنسان؟", "correctAnswer": "الأكسجين", "options": ["الأكسجين", "النيتروجين", "ثاني أكسيد الكربون", "الهيدروجين"], "image": null },
    { "id": "g_6", "category": "general", "question": "ما هي عاصمة جمهورية مصر العربية؟", "correctAnswer": "القاهرة", "options": ["القاهرة", "الإسكندرية", "الجيزة", "المنيا"], "image": null },
    { "id": "g_7", "category": "general", "question": "كم عدد قارات العالم؟", "correctAnswer": "7 قارات", "options": ["7 قارات", "6 قارات", "5 قارات", "8 قارات"], "image": null },
    { "id": "g_8", "category": "general", "question": "ما هو أسرع حيوان بري في العالم؟", "correctAnswer": "الفهد", "options": ["الفهد", "الأسد", "الغزال", "الحصان"], "image": null },
    { "id": "g_9", "category": "general", "question": "ما هي أكبر قارة في العالم من حيث المساحة؟", "correctAnswer": "آسيا", "options": ["آسيا", "أفريقيا", "أوروبا", "أمريكا الشمالية"], "image": null },
    { "id": "g_10", "category": "general", "question": "ما هو العنصر الأكثر وفرة في الغلاف الجوي للأرض؟", "correctAnswer": "النيتروجين", "options": ["النيتروجين", "الأكسجين", "الهيدروجين", "الأرجون"], "image": null },
    { "id": "g_11", "category": "general", "question": "ما هو أقرب كوكب إلى الشمس؟", "correctAnswer": "عطارد", "options": ["عطارد", "الزهرة", "المريخ", "المشتري"], "image": null },
    { "id": "g_12", "category": "general", "question": "ما هو العضو المسؤول عن ضخ الدم في جسم الإنسان؟", "correctAnswer": "القلب", "options": ["القلب", "الرئتين", "الكبد", "المخ"], "image": null }
];

const startScreen = document.getElementById('start-screen');
const triviaScreen = document.getElementById('trivia-screen');
const resultScreen = document.getElementById('result-screen');
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');
const hudScore = document.getElementById('hud-score');
const timerText = document.getElementById('timer-text');
const progressBar = document.getElementById('progress-bar');
const qCategory = document.getElementById('question-category');
const qText = document.getElementById('question-text');
const qImageContainer = document.getElementById('question-image-container');
const qImage = document.getElementById('question-image');
const answersGrid = document.getElementById('answers-grid');
const btnGoHome = document.getElementById('go-home-btn');

const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const tabPlayers = document.getElementById('tab-players');
const tabCountries = document.getElementById('tab-countries');
const leaderboardList = document.getElementById('leaderboard-list');
const playerNameInput = document.getElementById('player-name-input');
const playerCountryInput = document.getElementById('player-country-input');

let currentTab = 'players';

// تشغيل المستمعات والإعدادات فوراً
document.addEventListener("DOMContentLoaded", () => {
    loadSavedData(); 
    setupClickListeners();
});

function setupClickListeners() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const selectedCategory = card.dataset.cat;
            startSpecificCategory(selectedCategory);
        });
    });

    btnGoHome.onclick = () => {
        playSound('victory');
        switchScreen(startScreen);
    };
    
    themeToggle.onclick = toggleTheme;
    soundToggle.onclick = toggleSound;

    viewLeaderboardBtn.onclick = () => {
        leaderboardModal.style.display = 'flex';
        renderLeaderboard();
    };
    closeLeaderboardBtn.onclick = () => {
        leaderboardModal.style.display = 'none';
    };
    tabPlayers.onclick = () => {
        currentTab = 'players';
        tabPlayers.classList.add('active');
        tabCountries.classList.remove('active');
        renderLeaderboard();
    };
    tabCountries.onclick = () => {
        currentTab = 'countries';
        tabCountries.classList.add('active');
        tabPlayers.classList.remove('active');
        renderLeaderboard();
    };
}

function loadSavedData() {
    gameState.highScore = parseInt(localStorage.getItem('quiz_high_score')) || 0;
    gameState.currentLevel = parseInt(localStorage.getItem('quiz_player_level')) || 1;
    playerNameInput.value = localStorage.getItem('saved_player_name') || '';
    playerCountryInput.value = localStorage.getItem('saved_player_country') || 'مصر';
    
    const savedTheme = localStorage.getItem('game_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeToggle.innerText = savedTheme === 'dark' ? '🌙' : '☀️';

    const savedSound = localStorage.getItem('game_sound');
    if (savedSound !== null) {
        gameState.isSoundEnabled = savedSound === 'true';
        soundToggle.innerText = gameState.isSoundEnabled ? "🔊" : "🔇";
    }

    updateMainMenuStats();
}

function updateMainMenuStats() {
    const subtitle = document.querySelector('.game-subtitle');
    if (subtitle) {
        subtitle.innerHTML = `المستوى الحالي: <span class="level-badge">${gameState.currentLevel}</span> | أعلى نتيجة: ${gameState.highScore} نقطة`;
    }
}

// 🎯 التعديل الجوهري: الدالة تقوم بالسحب مباشرة من الفرع الخاص بالقسم داخل الفايربيز
async function startSpecificCategory(category) {
    switchScreen(triviaScreen);
    // إظهار نص مؤقت أثناء التحميل الحقيقي من الفايربيز
    qCategory.innerText = "جاري التحميل...";
    qText.innerText = "انتظر ثواني لجلب الأسئلة الحية المتجددة... ⏳";
    answersGrid.innerHTML = "";
    qImageContainer.classList.add('hidden');
    resetTimer();

    let loadedQuestions = [];

    // 1. محاولة جلب الداتا الحية من فرع الفايربيز الخاص بالقسم المختار مباشرة
    if (db) {
        try {
            console.log(`محاولة جلب أسئلة حية لقسم: ${category}`);
            const categoryRef = ref(db, category);
            const snapshot = await get(categoryRef);
            
            if (snapshot.exists()) {
                const data = snapshot.val();
                // الفايربيز بيرجع البيانات كـ Object أو Array، هنا بنحولها بالكامل لـ Array جاهز
                loadedQuestions = Object.values(data);
                console.log(`تم سحب ${loadedQuestions.length} سؤال حي من الفايربيز بنجاح! 🚀`);
            }
        } catch (error) {
            console.error("خطأ أثناء جلب الفايربيز، تحويل للوضع الاحتياطي الفوري:", error);
        }
    }

    // 2. حماية (Fallback): لو الفايربيز فاضي أو مفيش نت، اسحب فوراً من المصفوفة الثابتة
    if (loadedQuestions.length === 0) {
        console.log("العمل بالوضع الاحتياطي الأوفلاين السريع. 🛡️");
        loadedQuestions = backupQuestions.filter(q => q.category === category);
    }

    // 3. الخلط والاختيار العشوائي لـ 10 أسئلة
    let shuffled = shuffleArray([...loadedQuestions]);
    gameState.activeQuestions = shuffled.slice(0, 10); 
    
    // إعادة تعيين إحصائيات الجولة الحالية
    gameState.score = 0;
    gameState.correctAnswersCount = 0;
    gameState.wrongAnswersCount = 0;
    gameState.currentQuestionIndex = 0;

    // تشغيل السؤال الأول
    renderQuestion();
}

function renderQuestion() {
    resetTimer();
    if (gameState.currentQuestionIndex >= gameState.activeQuestions.length) {
        endGameSession();
        return;
    }

    const currentQuestion = gameState.activeQuestions[gameState.currentQuestionIndex];
    hudScore.innerHTML = `⭐ ${gameState.score} | <span class="level-badge">Lvl ${gameState.currentLevel}</span>`;
    qCategory.innerText = getCategoryArabicName(currentQuestion.category);
    qText.innerText = currentQuestion.question;

    if (currentQuestion.image) {
        qImage.src = currentQuestion.image;
        qImageContainer.classList.remove('hidden');
    } else {
        qImageContainer.classList.add('hidden');
    }

    const shuffledOptions = shuffleArray([...currentQuestion.options]);
    answersGrid.innerHTML = "";
    
    shuffledOptions.forEach(option => {
        const button = document.createElement('button');
        button.className = "answer-btn";
        button.innerText = option;
        button.addEventListener('click', () => checkPlayerAnswer(button, option, currentQuestion.correctAnswer));
        answersGrid.appendChild(button);
    });

    const progressPercent = (gameState.currentQuestionIndex / gameState.activeQuestions.length) * 100;
    progressBar.style.width = `${progressPercent}%`;
    startTimer();
}

function checkPlayerAnswer(selectedButton, selectedValue, correctAnswer) {
    clearInterval(gameState.timer);
    const allButtons = answersGrid.querySelectorAll('.answer-btn');
    allButtons.forEach(btn => btn.disabled = true);

    if (selectedValue === correctAnswer) {
        selectedButton.classList.add('correct');
        gameState.score += 10;
        gameState.correctAnswersCount++;
        playSound('correct');
    } else {
        selectedButton.classList.add('wrong');
        gameState.wrongAnswersCount++;
        playSound('wrong');
        allButtons.forEach(btn => {
            if (btn.innerText === correctAnswer) btn.classList.add('correct');
        });
    }

    setTimeout(() => {
        gameState.currentQuestionIndex++;
        renderQuestion();
    }, 1500);
}

function startTimer() {
    gameState.timeLeft = 15;
    timerText.innerText = gameState.timeLeft;
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        timerText.innerText = gameState.timeLeft;
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            handleTimeOut();
        }
    }, 1000);
}

function handleTimeOut() {
    gameState.wrongAnswersCount++;
    playSound('wrong');
    const currentQuestion = gameState.activeQuestions[gameState.currentQuestionIndex];
    const allButtons = answersGrid.querySelectorAll('.answer-btn');
    allButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === currentQuestion.correctAnswer) btn.classList.add('correct');
    });
    setTimeout(() => {
        gameState.currentQuestionIndex++;
        renderQuestion();
    }, 1500);
}

function resetTimer() { clearInterval(gameState.timer); }

function endGameSession() {
    console.log("جاري إظهار الإعلان البيني تلقائياً... 📺");
    alert("📺 فاصل إعلاني سريع... سيتم عرض النتيجة فوراً بعد الإعلان!");

    setTimeout(() => {
        switchScreen(resultScreen);
        playSound('victory');
        
        const pName = playerNameInput.value.trim() || 'لاعب مجهول';
        const pCountry = playerCountryInput.value;

        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            localStorage.setItem('quiz_high_score', gameState.highScore);
        }
        
        localStorage.setItem('saved_player_name', pName);
        localStorage.setItem('saved_player_country', pCountry);

        document.getElementById('res-score').innerText = gameState.score;
        document.getElementById('res-correct').innerText = gameState.correctAnswersCount;
        document.getElementById('res-wrong').innerText = gameState.wrongAnswersCount;
        updateMainMenuStats();

        if (db) {
            saveScoreToOnlineDatabase(pName, pCountry, gameState.score);
        }
    }, 2000); 
}

function saveScoreToOnlineDatabase(name, country, score) {
    if(score <= 0 || !db) return;
    const playerRef = ref(db, 'leaderboard/' + name);
    get(playerRef).then((snapshot) => {
        const data = snapshot.val();
        if (!data || score > data.score) {
            set(playerRef, {
                name: name, country: country, score: score,
                timestamp: Date.now()
            });
        }
    });
}

function renderLeaderboard() {
    leaderboardList.innerHTML = '<div style="text-align:center; padding:10px; font-size:12px;">جاري تحميل الترتيب...⏳</div>';
    if (!db) {
        leaderboardList.innerHTML = '<div class="leaderboard-item" style="justify-content:center;">لوحة الصدارة بحاجة لربط الفايربيز 🌍</div>';
        return;
    }
    
    const leaderboardRef = ref(db, 'leaderboard');
    
    get(leaderboardRef).then((snapshot) => {
        let players = [];
        
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => { 
                players.push(childSnapshot.val()); 
            });
            players.sort((a, b) => b.score - a.score);
            players = players.slice(0, 10);
        }

        if (currentTab === 'players') {
            leaderboardList.innerHTML = '';
            if(players.length === 0) {
                leaderboardList.innerHTML = '<div class="leaderboard-item" style="justify-content:center; font-size:13px; color:#a2a0ff; padding:20px 10px;">لا توجد نتائج بعد! كن أول المنافسين واكسر الرقم القياسي 🏆</div>';
                return;
            }
            players.forEach((p, idx) => {
                let medal = idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : `${idx + 1}. `;
                let countryFlags = { "مصر": "🇪🇬", "السعودية": "🇸🇦", "الإمارات": "🇦🇪", "الأردن": "🇯🇴" };
                let flag = countryFlags[p.country] || "🌍";
                
                leaderboardList.innerHTML += `<div class="leaderboard-item"><span>${medal} ${p.name} ${flag}</span><span>⭐ ${p.score}</span></div>`;
            });
        } else {
            leaderboardList.innerHTML = '';
            if(players.length === 0) {
                leaderboardList.innerHTML = '<div class="leaderboard-item" style="justify-content:center; font-size:13px; color:#a2a0ff; padding:20px 10px;">لا توجد دول في الصدارة بعد!</div>';
                return;
            }
            let countryScores = {};
            players.forEach(p => { countryScores[p.country] = (countryScores[p.country] || 0) + p.score; });
            
            let sortedCountries = Object.keys(countryScores).map(key => {
                return { country: key, score: countryScores[key] };
            }).sort((a,b) => b.score - a.score);

            let countryFlags = { "مصر": "🇪🇬", "السعودية": "🇸🇦", "الإمارات": "🇦🇪", "الأردن": "🇯🇴" };
            sortedCountries.forEach((c, idx) => {
                let flag = countryFlags[c.country] || "🌍";
                leaderboardList.innerHTML += `<div class="leaderboard-item"><span>${idx + 1}. ${c.country} ${flag}</span><span>⭐ ${c.score}</span></div>`;
            });
        }
    }).catch(err => {
        console.error("Firebase Error Details:", err);
        leaderboardList.innerHTML = '<div class="leaderboard-item" style="justify-content:center; color:#ff7676; padding:20px 10px;">لوحة الصدارة فارغة حالياً بانتظار أول سكور! 🎮</div>';
    });
}

function switchScreen(targetScreen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    targetScreen.classList.add('active');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function getCategoryArabicName(cat) {
    const names = { countries: "🌍 أعلام الدول", cars: "🚗 شعارات السيارات", monuments: "🏛️ معالم أثرية", general: "💡 معلومات عامة" };
    return names[cat] || "عام";
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    themeToggle.innerText = newTheme === 'dark' ? '🌙' : '☀️';
    localStorage.setItem('game_theme', newTheme);
}

function toggleSound() {
    gameState.isSoundEnabled = !gameState.isSoundEnabled;
    soundToggle.innerText = gameState.isSoundEnabled ? "🔊" : "🔇";
    localStorage.setItem('game_sound', gameState.isSoundEnabled);
}

function playSound(type) {
    if (!gameState.isSoundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'correct') {
            osc.frequency.setValueAtTime(523.25, ctx.currentTime);
            osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        } else if (type === 'wrong') {
            osc.frequency.setValueAtTime(196, ctx.currentTime);
            osc.frequency.setValueAtTime(146, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.25);
        } else if (type === 'victory') {
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            osc.frequency.setValueAtTime(784, ctx.currentTime + 0.15);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) { console.log("Audio API Blocked"); }
}
