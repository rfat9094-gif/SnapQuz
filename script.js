import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get, query, orderByChild, limitToLast } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const app = initializeApp(firebaseConfigReal);
const db = getDatabase(app);

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
    highScore: 0,
    playerName: "لاعب مجهول",
    playerCountry: "مصر"
};

// الرابط المباشر لملف الأسئلة على جيت هاب
const githubRawUrl = "https://raw.githubusercontent.com/rfat9094-git/SnapQuiz/main/%D9%84%D8%B2%D8%A8%D9%87/questions.json";

// بنك احتياطي بدائي جداً كحماية أوفلاين
const backupQuestions = [
    { "id": "b_1", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "مصر", "options": ["مصر", "سوريا", "العراق", "اليمن"], "image": "https://flagcdn.com/w320/eg.png" }
];

// عناصر الـ HTML الأساسية
const startScreen = document.getElementById('start-screen');
const triviaScreen = document.getElementById('trivia-screen');
const resultScreen = document.getElementById('result-screen');
const answersGrid = document.getElementById('answers-grid');
const timerText = document.getElementById('timer-text');
const questionText = document.getElementById('question-text');
const questionCategory = document.getElementById('question-category');
const questionImage = document.getElementById('question-image');
const questionImageContainer = document.getElementById('question-image-container');
const progressBar = document.getElementById('progress-bar');

// أزرار التحكم العلوية والجانبية
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');
const btnGoHome = document.getElementById('go-home-btn');
const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');

// عناصر لوحة الصدارة (Modal)
const leaderboardModal = document.getElementById('leaderboard-modal');
const closeLeaderboardBtn = document.getElementById('close-leaderboard-btn');
const leaderboardList = document.getElementById('leaderboard-list');
const tabPlayers = document.getElementById('tab-players');
const tabCountries = document.getElementById('tab-countries');

initGameEngine();

function initGameEngine() {
    gameState.highScore = parseInt(localStorage.getItem('quiz_high_score')) || 0;
    gameState.allBankQuestions = [...backupQuestions];
    
    // ربط كروت الأقسام وبدء اللعب
    document.querySelectorAll('.category-card').forEach(card => {
        card.onclick = () => {
            // حفظ الاسم والدولة المدخلين عند الضغط وبدء اللعبة
            const nameInput = document.getElementById('player-name-input');
            const countryInput = document.getElementById('player-country-input');
            if(nameInput && nameInput.value.trim() !== "") gameState.playerName = nameInput.value.trim();
            if(countryInput) gameState.playerCountry = countryInput.value;

            const selectedCategory = card.getAttribute('data-cat');
            startSpecificCategory(selectedCategory);
        };
    });

    if(btnGoHome) btnGoHome.onclick = () => switchScreen(startScreen);
    if(themeToggle) themeToggle.onclick = toggleTheme;
    if(soundToggle) soundToggle.onclick = toggleSound;

    // تشغيل وإظهار لوحة الصدارة
    if(viewLeaderboardBtn) viewLeaderboardBtn.onclick = openLeaderboard;
    if(closeLeaderboardBtn) closeLeaderboardBtn.onclick = () => { if(leaderboardModal) leaderboardModal.style.display = 'none'; };
    
    if(tabPlayers) tabPlayers.onclick = () => switchLeaderboardTab('players');
    if(tabCountries) tabCountries.onclick = () => switchLeaderboardTab('countries');

    // جلب الأسئلة أونلاين فوراً عند فتح التطبيق
    loadOnlineQuestions();
}

// 🔥 1. جلب الأسئلة أونلاين مع تدمير الكاش نهائياً
async function loadOnlineQuestions() {
    try {
        // حيلة كسر الكاش المزدوجة بالـ Headers والـ Timestamp المتغير بالملي ثانية
        const forceFreshUrl = `${githubRawUrl}?cacheBust=${Date.now()}`;
        const response = await fetch(forceFreshUrl, { 
            method: 'GET',
            headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
        });

        if (response.ok) {
            const data = await response.json();
            let remoteQuestions = [];
            
            const categories = ['countries', 'cars', 'monuments', 'general'];
            categories.forEach(cat => {
                if (data[cat] && Array.isArray(data[cat])) {
                    data[cat].forEach(item => {
                        remoteQuestions.push({
                            id: item.id || Math.random().toString(),
                            category: cat, 
                            question: item.question,
                            options: item.options || [],
                            correctAnswer: item.correctAnswer || item.answer,
                            image: item.image || null
                        });
                    });
                }
            });
            
            if(remoteQuestions.length > 6) {
                gameState.allBankQuestions = [...remoteQuestions];
                console.log(`📡 تم تحديث وجلب الأسئلة الحية أونلاين: ${remoteQuestions.length} سؤال جاهز.`);
            }
        }
    } catch (e) { 
        console.log("حدث خطأ بالشبكة أو جيت هاب، تم تحويل الوضع للاحتياطي مؤقتاً.", e);
        gameState.allBankQuestions = [...backupQuestions];
    }
}

function startSpecificCategory(category) {
    let categoryPool = gameState.allBankQuestions.filter(q => q.category === category);
    if(categoryPool.length === 0) categoryPool = [...gameState.allBankQuestions];

    // جلب 10 أسئلة عشوائية كاملة للتحدي
    gameState.activeQuestions = shuffleArray([...categoryPool]).slice(0, 10);
    gameState.score = 0;
    gameState.correctAnswersCount = 0;
    gameState.wrongAnswersCount = 0;
    gameState.currentQuestionIndex = 0;

    switchScreen(triviaScreen);
    renderQuestion();
}

function renderQuestion() {
    clearInterval(gameState.timer);
    if (gameState.currentQuestionIndex >= gameState.activeQuestions.length) {
        endGameSession();
        return;
    }

    const currentQuestion = gameState.activeQuestions[gameState.currentQuestionIndex];
    if(questionText) questionText.innerText = currentQuestion.question;
    if(questionCategory) {
        const arabicNames = { countries: "🌍 أعلام الدول", cars: "🚗 شعارات السيارات", monuments: "🏛️ معالم أثرية", general: "💡 معلومات عامة" };
        questionCategory.innerText = arabicNames[currentQuestion.category] || "عام";
    }
    
    if (currentQuestion.image && questionImage) {
        questionImage.src = currentQuestion.image;
        if(questionImageContainer) questionImageContainer.classList.remove('hidden');
    } else {
        if(questionImageContainer) questionImageContainer.classList.add('hidden');
    }

    if(answersGrid) {
        answersGrid.innerHTML = "";
        let opts = currentQuestion.options && currentQuestion.options.length > 0 ? [...currentQuestion.options] : [currentQuestion.correctAnswer];
        if(opts.length < 4) opts = [currentQuestion.correctAnswer, "خيار خطأ 1", "خيار خطأ 2", "خيار خطأ 3"];
        opts = shuffleArray([...opts]);

        opts.forEach(option => {
            const button = document.createElement('button');
            button.className = "answer-btn";
            button.innerText = option;
            button.onclick = () => checkPlayerAnswer(button, option, currentQuestion.correctAnswer);
            answersGrid.appendChild(button);
        });
    }

    if (progressBar) {
        const progressPercent = (gameState.currentQuestionIndex / gameState.activeQuestions.length) * 100;
        progressBar.style.width = `${progressPercent}%`;
    }
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
    if(timerText) timerText.innerText = gameState.timeLeft;
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        if(timerText) timerText.innerText = gameState.timeLeft;
        if (gameState.timeLeft <= 0) {
            clearInterval(gameState.timer);
            gameState.wrongAnswersCount++;
            gameState.currentQuestionIndex++;
            renderQuestion();
        }
    }, 1000);
}

// 🔥 2. إنهاء الجلسة وحفظ النتيجة في الفايربيز أونلاين وتحديث السجلات
async function endGameSession() {
    switchScreen(resultScreen);
    playSound('victory');
    
    const resScore = document.getElementById('res-score');
    const resCorrect = document.getElementById('res-correct');
    const resWrong = document.getElementById('res-wrong');
    if(resScore) resScore.innerText = gameState.score;
    if(resCorrect) resCorrect.innerText = gameState.correctAnswersCount;
    if(resWrong) resWrong.innerText = gameState.wrongAnswersCount;

    // رفع السكور الحقيقي للفايربيز بـ اسم اللاعب ودولته
    if (gameState.score > 0) {
        try {
            const userId = gameState.playerName + "_" + Math.floor(Math.random() * 10000);
            await set(ref(db, 'leaderboard/players/' + userId), {
                name: gameState.playerName,
                country: gameState.playerCountry,
                score: gameState.score,
                timestamp: Date.now()
            });

            // تحديث نقاط الدول تراكمياً
            const countryRef = ref(db, 'leaderboard/countries/' + gameState.playerCountry);
            const countrySnap = await get(countryRef);
            let currentCountryScore = 0;
            if(countrySnap.exists()) currentCountryScore = countrySnap.val().score || 0;
            await set(countryRef, { score: currentCountryScore + gameState.score });
        } catch(e) { console.log("خطأ في رفع السكور للفايربيز:", e); }
    }
}

// 🔥 3. تشغيل لوحة الصدارة أونلاين وجلب البيانات الحية وعرضها بالـ Modal
function openLeaderboard() {
    if(leaderboardModal) leaderboardModal.style.display = 'flex';
    switchLeaderboardTab('players');
}

async function switchLeaderboardTab(type) {
    if(type === 'players') {
        if(tabPlayers) tabPlayers.classList.add('active');
        if(tabCountries) tabCountries.classList.remove('active');
        if(leaderboardList) leaderboardList.innerHTML = "<p style='color:#fff; text-align:center;'>جاري تحميل اللاعبين...</p>";
        
        try {
            const playerSnap = await get(ref(db, 'leaderboard/players'));
            if(playerSnap.exists()) {
                let playersArray = [];
                Object.keys(playerSnap.val()).forEach(key => { playersArray.push(playerSnap.val()[key]); });
                // ترتيب تصاعدي حسب السكور ثم عكسه للحصول على الأعلى
                playersArray.sort((a, b) => b.score - a.score);
                
                if(leaderboardList) {
                    leaderboardList.innerHTML = "";
                    playersArray.slice(0, 5).forEach((p, idx) => {
                        const row = document.createElement('div');
                        row.className = "stat-item";
                        row.style.margin = "5px 0";
                        row.innerHTML = `<span>#${idx+1} ${p.name} (${p.country})</span> <span style='font-weight:bold; color:#a855f7;'>⭐ ${p.score}</span>`;
                        leaderboardList.appendChild(row);
                    });
                }
            } else { if(leaderboardList) leaderboardList.innerHTML = "<p style='color:#aaa; text-align:center;'>لا يوجد لاعبين مسجلين بعد.</p>"; }
        } catch(e) { if(leaderboardList) leaderboardList.innerHTML = "<p style='color:#ef4444; text-align:center;'>خطأ في الاتصال باللوحة</p>"; }

    } else {
        if(tabCountries) tabCountries.classList.add('active');
        if(tabPlayers) tabPlayers.classList.remove('active');
        if(leaderboardList) leaderboardList.innerHTML = "<p style='color:#fff; text-align:center;'>جاري تحميل ترتيب الدول...</p>";

        try {
            const countrySnap = await get(ref(db, 'leaderboard/countries'));
            if(countrySnap.exists()) {
                let countriesArray = [];
                Object.keys(countrySnap.val()).forEach(key => { countriesArray.push({ name: key, score: countrySnap.val()[key].score }); });
                countriesArray.sort((a, b) => b.score - a.score);

                if(leaderboardList) {
                    leaderboardList.innerHTML = "";
                    countriesArray.slice(0, 5).forEach((c, idx) => {
                        const row = document.createElement('div');
                        row.className = "stat-item";
                        row.style.margin = "5px 0";
                        row.innerHTML = `<span>#${idx+1} ${c.name}</span> <span style='font-weight:bold; color:#10b981;'>⭐ ${c.score}</span>`;
                        leaderboardList.appendChild(row);
                    });
                }
            } else { if(leaderboardList) leaderboardList.innerHTML = "<p style='color:#aaa; text-align:center;'>لا توجد نتائج مسجلة للدول.</p>"; }
        } catch(e) { if(leaderboardList) leaderboardList.innerHTML = "<p style='color:#ef4444; text-align:center;'>خطأ في جلب بيانات الدول</p>"; }
    }
}

function switchScreen(targetScreen) {
    if(!targetScreen) return;
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

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    if(themeToggle) themeToggle.innerText = newTheme === 'dark' ? '🌙' : '☀️';
}

function toggleSound() {
    gameState.isSoundEnabled = !gameState.isSoundEnabled;
    if(soundToggle) soundToggle.innerText = gameState.isSoundEnabled ? "🔊" : "🔇";
}

function playSound(type) {
    if (!gameState.isSoundEnabled) return;
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'correct') {
            osc.frequency.setValueAtTime(523, ctx.currentTime);
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'wrong') {
            osc.frequency.setValueAtTime(146, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        }
    } catch (e) {}
}
