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

// البنك الاحتياطي
const backupQuestions = [
    // أعلام الدول
    { "id": "c_1", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "مصر", "options": ["مصر", "سوريا", "العراق", "اليمن"], "image": "https://flagcdn.com/w320/eg.png" },
    { "id": "c_2", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "السعودية", "options": ["السعودية", "الكويت", "عمان", "قطر"], "image": "https://flagcdn.com/w320/sa.png" },
    { "id": "c_3", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "الإمارات", "options": ["الإمارات", "الأردن", "فلسطين", "السودان"], "image": "https://flagcdn.com/w320/ae.png" },
    { "id": "c_4", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "الأردن", "options": ["الأردن", "الكويت", "البحرين", "تونس"], "image": "https://flagcdn.com/w320/jo.png" },
    { "id": "c_5", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "اليابان", "options": ["اليابان", "الصين", "كوريا الجنوبية", "فيتنام"], "image": "https://flagcdn.com/w320/jp.png" },
    { "id": "c_6", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم？", "correctAnswer": "فرنسا", "options": ["فرنسا", "إيطاليا", "روسيا", "هولندا"], "image": "https://flagcdn.com/w320/fr.png" },
    { "id": "c_7", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "البرازيل", "options": ["البرازيل", "الأرجنتين", "كولومبيا", "المكسيك"], "image": "https://flagcdn.com/w320/br.png" },
    { "id": "c_8", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "المغرب", "options": ["المغرب", "الجزائر", "تونس", "ليبيا"], "image": "https://flagcdn.com/w320/ma.png" },
    { "id": "c_9", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "كندا", "options": ["كندا", "أمريكا", "أستراليا", "بريطانيا"], "image": "https://flagcdn.com/w320/ca.png" },
    { "id": "c_10", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "ألمانيا", "options": ["ألمانيا", "بلجيكا", "إسبانيا", "البرتغال"], "image": "https://flagcdn.com/w320/de.png" },
    { "id": "c_11", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "فلسطين", "options": ["فلسطين", "الأردن", "الكويت", "عمان"], "image": "https://flagcdn.com/w320/ps.png" },
    { "id": "c_12", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "إيطاليا", "options": ["إيطاليا", "المكسيك", "فرنسا", "إسبانيا"], "image": "https://flagcdn.com/w320/it.png" },
    
    // السيارات
    { "id": "car_1", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "مرسيدس بنز", "options": ["مرسيدس بنز", "بي إم دبليو", "أودي", "فولكس فاجن"], "image": "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" },
    { "id": "car_2", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "بي إم دبليو", "options": ["بي إم دبليو", "مرسيدس بنز", "فورد", "هيونداي"], "image": "https://www.carlogos.org/car-logos/bmw-logo.png" },
    { "id": "car_3", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار？", "correctAnswer": "تويوتا", "options": ["تويوتا", "هوندا", "نيسان", "مازدا"], "image": "https://www.carlogos.org/car-logos/toyota-logo.png" },
    { "id": "car_4", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "هيونداي", "options": ["هيونداي", "كيا", "هوندا", "سوزوكي"], "image": "https://www.carlogos.org/car-logos/hyundai-logo.png" },
    { "id": "car_5", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "فورد", "options": ["فورد", "شيفروليه", "جيب", "دودج"], "image": "https://www.carlogos.org/car-logos/ford-logo.png" },
    { "id": "car_6", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "لامبورغيني", "options": ["لامبورغيني", "فيراري", "بورشه", "بوجاتي"], "image": "https://www.carlogos.org/car-logos/lamborghini-logo.png" },
    { "id": "car_7", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "فيراري", "options": ["فيراري", "بورشه", "موجاتي", "موستانج"], "image": "https://www.carlogos.org/car-logos/ferrari-logo.png" },
    { "id": "car_8", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "أودي", "options": ["أودي", "بي إم دبليو", "تويوتا", "نيسان"], "image": "https://www.carlogos.org/car-logos/audi-logo.png" },
    { "id": "car_9", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "كيا", "options": ["كيا", "هيونداي", "تويوتا", "مازدا"], "image": "https://www.carlogos.org/car-logos/kia-logo.png" },
    { "id": "car_10", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار？", "correctAnswer": "نيسان", "options": ["نيسان", "تويوتا", "هوندا", "ميتسوبيشي"], "image": "https://www.carlogos.org/car-logos/nissan-logo.png" },
    { "id": "car_11", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "هوندا", "options": ["هوندا", "تويوتا", "هيونداي", "سوزوكي"], "image": "https://www.carlogos.org/car-logos/honda-logo.png" },

    // المعالم
    { "id": "m_1", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "الأهرامات (مصر)", "options": ["الأهرامات (مصر)", "برج إيفل (فرنسا)", "سور الصين العظيم", "تاج محل (الهند)"], "image": "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=500" },
    { "id": "m_2", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "برج إيفل (فرنسا)", "options": ["برج إيفل (فرنسا)", "برج بيزا المائل", "تمثال الحرية", "ساعة بيج بن"], "image": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500" },
    { "id": "m_3", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "تاج محل (الهند)", "options": ["تاج محل (الهند)", "البيت الأبيض", "مسرح الكولوسيوم", "البتراء (الأردن)"], "image": "https://images.unsplash.com/photo-1564507592333-c60657eea523?w=500" },
    { "id": "m_4", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "تمثال الحرية (أمريكا)", "options": ["تمثال الحرية (أمريكا)", "تمثال المسيح الفادي", "برج خليفة", "برج إيفل"], "image": "https://images.unsplash.com/photo-1605130284535-11dd9ebc5277?w=500" },
    { "id": "m_5", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير؟", "correctAnswer": "الكولوسيوم (إيطاليا)", "options": ["الكولوسيوم (إيطاليا)", "الأهرامات", "البتراء", "سور الصين العظيم"], "image": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=500" },
    { "id": "m_6", "category": "monuments", "question": "ما اسم هذا المعلم السياحي الشهير？", "correctAnswer": "برج خليفة (الإمارات)", "options": ["برج خليفة (الإمارات)", "برج إيفل", "ساعة بيج بن", "تاج محل"], "image": "https://images.unsplash.com/photo-1597655601841-214a4cfe8b2c?w=500" },
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

const githubRawUrl = "https://raw.githubusercontent.com/rfat9094-git/SnapQuiz/main/لعبه/questions.json";
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

document.addEventListener("DOMContentLoaded", () => {
    loadSavedData(); 
    setupClickListeners();
    setupBackupQuestions(); 
    generateDynamicQuestions(); 
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
