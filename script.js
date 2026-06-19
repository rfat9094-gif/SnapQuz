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

// بنك أسئلة محلي فوري وضخم يشتغل فوراً عشان تجرب بيه الأزرار والخانات
const backupQuestions = [
    { id: "b_1", category: "countries", question: "إلى أي دولة ينتمي هذا العلم？", options: ["مصر", "سوريا", "العراق", "اليمن"], correctAnswer: "مصر", image: "https://flagcdn.com/w320/eg.png" },
    { id: "b_2", category: "countries", question: "إلى أي دولة ينتمي هذا العلم？", options: ["السعودية", "الكويت", "عمان", "قطر"], correctAnswer: "السعودية", image: "https://flagcdn.com/w320/sa.png" },
    { id: "b_3", category: "cars", question: "ما هي شركة السيارات صاحبة هذا الشعار؟", options: ["مرسيدس بنز", "بي إم دبليو", "أودي", "تويوتا"], correctAnswer: "مرسيدس بنز", image: "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" },
    { id: "b_4", category: "cars", question: "ما هي شركة السيارات صاحبة هذا الشعار؟", options: ["تويوتا", "هوندا", "نيسان", "مازدا"], correctAnswer: "تويوتا", image: "https://www.carlogos.org/car-logos/toyota-logo.png" },
    { id: "b_5", category: "monuments", question: "ما اسم هذا المعلم السياحي الشهير？", options: ["الأهرامات (مصر)", "برج إيفل", "تاج محل", "سور الصين"], correctAnswer: "الأهرامات (مصر)", image: "https://images.unsplash.com/photo-1539650116574-8efeb43e2750?w=500" },
    { id: "b_6", category: "monuments", question: "ما اسم هذا المعلم السياحي الشهير؟", options: ["برج إيفل (فرنسا)", "برج بيزا المائل", "تمثال الحرية", "ساعة بيج بن"], correctAnswer: "برج إيفل (فرنسا)", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=500" },
    { id: "b_7", category: "general", question: "ما هي عاصمة جمهورية مصر العربية؟", options: ["القاهرة", "الإسكندرية", "الجيزة", "المنيا"], correctAnswer: "القاهرة", image: null },
    { id: "b_8", category: "general", question: "كم عدد كواكب المجموعة الشمسية؟", options: ["8 كواكب", "9 كواكب", "7 كواكب", "6 كواكب"], correctAnswer: "8 كواكب", image: null }
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

// تشغيل المستمعات والإعدادات فوراً
document.addEventListener("DOMContentLoaded", () => {
    loadSavedData(); 
    setupClickListeners();
    setupBackupQuestions(); // ملء البنك احتياطياً فوراً لمنع تعليق الواجهة
    generateDynamicQuestions(); // جلب الأسئلة الخارجية من جيت هاب في الخلفية
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

function setupBackupQuestions() {
    gameState.allBankQuestions = [...backupQuestions];
}

async function generateDynamicQuestions() {
    if(githubRawUrl.includes("YOUR_USERNAME")) return;

    try {
        const response = await fetch(githubRawUrl);
        if (!response.ok) throw new Error("GitHub Not Stable");
        const data = await response.json();
        
        let generatedQuestions = [];

        ['countries', 'cars', 'monuments'].forEach(cat => {
            if(data[cat]) {
                data[cat].forEach(item => {
                    generatedQuestions.push({
                        id: item.id, category: cat, question: item.question,
                        options: item.options, correctAnswer: item.correctAnswer, image: item.image
                    });
                });
            }
        });

        if(data.general) {
            data.general.forEach(item => {
                generatedQuestions.push({
                    id: item.id, category: "general", question: item.question,
                    options: item.options, correctAnswer: item.correctAnswer, image: null
                });
            });
        }

        if (generatedQuestions.length > 10) {
            gameState.allBankQuestions = generatedQuestions;
            console.log("تم تحديث الأسئلة الحية من جيت هاب بنجاح! 🚀");
        }
    } catch (error) {
        console.log("تعذر جلب جيت هاب، العمل بالوضع الاحتياطي السريع.");
    }
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

function startSpecificCategory(category) {
    let categoryPool = gameState.allBankQuestions.filter(q => q.category === category);

    if (categoryPool.length === 0) {
        alert("القسم قيد التحميل أو غير متوفر حالياً...");
        return;
    }

    let shuffled = shuffleArray([...categoryPool]);
    
    // 🎯 التحديث الأول: تغيير عدد الأسئلة لتصبح 10 أسئلة بدلاً من 4 في الجولة
    gameState.activeQuestions = shuffled.slice(0, 10); 
    
    gameState.score = 0;
    gameState.correctAnswersCount = 0;
    gameState.wrongAnswersCount = 0;
    gameState.currentQuestionIndex = 0;

    switchScreen(triviaScreen);
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

// 🎯 التحديث الثاني: استدعاء فاصل إعلاني تلقائي عند انتهاء الأسئلة وقبل شاشة النتائج
function endGameSession() {
    console.log("جاري إظهار الإعلان البيني تلقائياً... 📺");
    
    // تنبيه تجريبي يمثل وقت الإعلان (يمكنك استبداله بكود شبكة الإعلانات الفعلي لاحقاً)
    alert("📺 فاصل إعلاني سريع... سيتم عرض النتيجة فوراً بعد الإعلان!");

    // ⏳ انتظار ثانيتين (وقت عرض الإعلان التخيلي) ثم الانتقال التلقائي للنتائج وحفظ النقاط
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
    
    const leaderboardQuery = query(ref(db, 'leaderboard'), orderByChild('score'), limitToLast(10));
    get(leaderboardQuery).then((snapshot) => {
        let players = [];
        snapshot.forEach((childSnapshot) => { players.push(childSnapshot.val()); });
        players.reverse();

        if (currentTab === 'players') {
            leaderboardList.innerHTML = '';
            if(players.length === 0) {
                leaderboardList.innerHTML = '<div class="leaderboard-item">لا توجد نتائج بعد!</div>';
                return;
            }
            players.forEach((p, idx) => {
                let medal = idx === 0 ? "🥇 " : idx === 1 ? "🥈 " : idx === 2 ? "🥉 " : `${idx + 1}. `;
                let countryFlags = { "مصر": "🇪🇬", "السعودية": "🇸🇦", "الإمارات": "🇦🇪", "الأردن": "🇯🇴" };
                let flag = countryFlags[p.country] || "🌍";
                
                leaderboardList.innerHTML += `<div class="leaderboard-item"><span>${medal} ${p.name} ${flag}</span><span>⭐ ${p.score}</span></div>`;
            });
        } else {
            let countryScores = {};
            players.forEach(p => { countryScores[p.country] = (countryScores[p.country] || 0) + p.score; });
            
            let sortedCountries = Object.keys(countryScores).map(key => {
                return { country: key, score: countryScores[key] };
            }).sort((a,b) => b.score - a.score);

            leaderboardList.innerHTML = '';
            let countryFlags = { "مصر": "🇪🇬", "السعودية": "🇸🇦", "الإمارات": "🇦🇪", "الأردن": "🇯🇴" };
            sortedCountries.forEach((c, idx) => {
                let flag = countryFlags[c.country] || "🌍";
                leaderboardList.innerHTML += `<div class="leaderboard-item"><span>${idx + 1}. ${c.country} ${flag}</span><span>⭐ ${c.score}</span></div>`;
            });
        }
    }).catch(err => {
        leaderboardList.innerHTML = '<div class="leaderboard-item">خطأ في جلب البيانات.</div>';
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
            gain.gain.setValueAtTime(0.1; ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.3);
        }
    } catch (e) { console.log("Audio API Blocked"); }
  }
      
