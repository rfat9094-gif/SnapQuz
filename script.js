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

try {
    if (firebaseConfigReal.apiKey && firebaseConfigReal.apiKey !== "YOUR_API_KEY") {
        const app = initializeApp(firebaseConfigReal);
        db = getDatabase(app);
        console.log("تم اتصال Firebase بنجاح! 🔥");
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

// البنك الاحتياطي للأسئلة
const backupQuestions = [
    { "id": "c_1", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "مصر", "options": ["مصر", "سوريا", "العراق", "اليمن"], "image": "https://flagcdn.com/w320/eg.png" },
    { "id": "c_2", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم？", "correctAnswer": "السعودية", "options": ["السعودية", "الكويت", "عمان", "قطر"], "image": "https://flagcdn.com/w320/sa.png" },
    { "id": "car_1", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "مرسيدس بنز", "options": ["مرسيدس بنز", "بي إم دبليو", "أودي", "فولكس فاجن"], "image": "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" },
    { "id": "g_1", "category": "general", "question": "كم عدد كواكب المجموعة الشمسية؟", "correctAnswer": "8 كواكب", "options": ["8 كواكب", "9 كواكب", "7 كواكب", "6 كواكب"], "image": null }
];

const githubRawUrl = "https://raw.githubusercontent.com/rfat9094-git/SnapQuiz/main/لعبه/questions.json";

// تنفيذ الكود بعد تحميل الصفحة بالكامل لضمان قراءة الـ HTML
document.addEventListener("DOMContentLoaded", () => {
    initGameEngine();
});

// إذا كانت الصفحة محملة بالفعل
if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(initGameEngine, 1);
}

function initGameEngine() {
    loadSavedData(); 
    setupClickListeners();
    setupBackupQuestions(); 
    generateDynamicQuestions(); 
}

function setupClickListeners() {
    document.querySelectorAll('.category-card').forEach(card => {
        card.onclick = () => {
            const selectedCategory = card.dataset.cat || card.getAttribute('data-category');
            if(selectedCategory) startSpecificCategory(selectedCategory);
        };
    });

    const btnGoHome = document.getElementById('go-home-btn');
    if(btnGoHome) {
        btnGoHome.onclick = () => {
            const startScreen = document.getElementById('start-screen');
            if(startScreen) switchScreen(startScreen);
        };
    }
}

function setupBackupQuestions() {
    gameState.allBankQuestions = [...backupQuestions];
}

async function generateDynamicQuestions() {
    if (githubRawUrl) {
        try {
            const response = await fetch(githubRawUrl);
            if (response.ok) {
                const data = await response.json();
                let generatedQuestions = [];
                ['countries', 'cars', 'monuments', 'general'].forEach(cat => {
                    if (data[cat]) {
                        data[cat].forEach(item => {
                            generatedQuestions.push({
                                id: item.id, category: cat, question: item.question,
                                options: item.options || [], correctAnswer: item.correctAnswer || item.answer, 
                                image: item.image || null
                            });
                        });
                    }
                });
                if(generatedQuestions.length > 0) {
                    gameState.allBankQuestions = [...generatedQuestions, ...backupQuestions];
                }
            }
        } catch (error) { console.log("جيت هاب أوفلاين"); }
    }
}

function loadSavedData() {
    gameState.highScore = parseInt(localStorage.getItem('quiz_high_score')) || 0;
    gameState.currentLevel = parseInt(localStorage.getItem('quiz_player_level')) || 1;
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
    if (categoryPool.length === 0) categoryPool = [...gameState.allBankQuestions];

    let shuffled = shuffleArray([...categoryPool]);
    gameState.activeQuestions = shuffled.slice(0, 10); 
    
    gameState.score = 0;
    gameState.correctAnswersCount = 0;
    gameState.wrongAnswersCount = 0;
    gameState.currentQuestionIndex = 0;

    const triviaScreen = document.getElementById('trivia-screen') || document.querySelector('.screen-trivia') || document.querySelector('.trivia-screen');
    if(triviaScreen) {
        switchScreen(triviaScreen);
        renderQuestion();
    } else {
        alert("خطأ: لم يتم العثور على شاشة اللعبة في الـ HTML");
    }
}

// 🛠️ دالة الفحص والإصلاح التلقائي لشبكة الأزرار والعداد
function enforceGameElements() {
    const triviaScreen = document.getElementById('trivia-screen') || document.querySelector('.screen-trivia') || document.querySelector('.trivia-screen');
    if (!triviaScreen) return null;

    // 1. التأكد من وجود مكان للأسئلة
    let qText = document.getElementById('question-text') || triviaScreen.querySelector('h2') || triviaScreen.querySelector('.question-text');
    if (!qText) {
        qText = document.createElement('h2');
        qText.id = "question-text";
        triviaScreen.insertBefore(qText, triviaScreen.firstChild);
    }

    // 2. التأكد من وجود حاوية للأزرار (الخانات)
    let answersGrid = document.getElementById('answers-grid') || document.getElementById('answers-container') || triviaScreen.querySelector('.answers-grid') || triviaScreen.querySelector('.answers-container');
    if (!answersGrid) {
        answersGrid = document.createElement('div');
        answersGrid.id = "answers-grid";
        answersGrid.className = "answers-grid";
        // تنسيق سريع لضمان الظهور كشبكة أزرار مرتبة حتى لو انعدم الستاين
        answersGrid.style.display = "grid";
        answersGrid.style.gridTemplateColumns = "1fr 1fr";
        answersGrid.style.gap = "12px";
        answersGrid.style.margin = "20px auto";
        answersGrid.style.width = "90%";
        triviaScreen.appendChild(answersGrid);
    }

    // 3. التأكد من وجود عنصر العداد
    let timerText = document.getElementById('timer-text') || document.getElementById('timer') || triviaScreen.querySelector('.timer-text') || triviaScreen.querySelector('.timer');
    if (!timerText) {
        timerText = document.createElement('div');
        timerText.id = "timer-text";
        timerText.className = "timer-text";
        timerText.style.fontSize = "24px";
        timerText.style.fontWeight = "bold";
        timerText.style.textAlign = "center";
        timerText.style.margin = "10px";
        triviaScreen.insertBefore(timerText, qText);
    }

    return { qText, answersGrid, timerText };
}

function renderQuestion() {
    resetTimer();
    
    // تشغيل الإصلاح الذاتي فوراً
    const elements = enforceGameElements();
    if (!elements) return;

    if (gameState.currentQuestionIndex >= gameState.activeQuestions.length) {
        endGameSession();
        return;
    }

    const currentQuestion = gameState.activeQuestions[gameState.currentQuestionIndex];
    
    // عرض نص السؤال
    elements.qText.innerText = currentQuestion.question;

    // معالجة الصورة إن وجدت
    const qImage = document.getElementById('question-image') || document.querySelector('.question-image img');
    if (qImage) {
        if (currentQuestion.image) {
            qImage.src = currentQuestion.image;
            if(qImage.parentElement) qImage.parentElement.classList.remove('hidden');
        } else {
            if(qImage.parentElement) qImage.parentElement.classList.add('hidden');
        }
    }

    // تجهيز الخيارات
    let shuffledOptions = currentQuestion.options && currentQuestion.options.length > 0 ? [...currentQuestion.options] : ["أ", "ب", "ج", "د"];
    shuffledOptions = shuffleArray([...shuffledOptions]);

    // مسح الخانات القديمة وبناء أزرار الاختيارات الجديدة
    elements.answersGrid.innerHTML = "";
    shuffledOptions.forEach(option => {
        const button = document.createElement('button');
        button.className = "answer-btn";
        button.innerText = option;
        button.style.padding = "14px";
        button.style.fontSize = "16px";
        button.style.cursor = "pointer";
        button.onclick = () => checkPlayerAnswer(button, option, currentQuestion.correctAnswer);
        elements.answersGrid.appendChild(button);
    });

    startTimer();
}

function checkPlayerAnswer(selectedButton, selectedValue, correctAnswer) {
    clearInterval(gameState.timer);
    const elements = enforceGameElements();
    const allButtons = elements ? elements.answersGrid.querySelectorAll('.answer-btn') : [];
    allButtons.forEach(btn => btn.disabled = true);

    if (selectedValue === correctAnswer) {
        selectedButton.classList.add('correct');
        selectedButton.style.backgroundColor = "#2ec4b6"; // لون أخضر احتياطي للتأكيد البصري
        gameState.score += 10;
        gameState.correctAnswersCount++;
        playSound('correct');
    } else {
        selectedButton.classList.add('wrong');
        selectedButton.style.backgroundColor = "#e71d36"; // لون أحمر احتياطي
        gameState.wrongAnswersCount++;
        playSound('wrong');
        allButtons.forEach(btn => {
            if (btn.innerText === correctAnswer) {
                btn.classList.add('correct');
                btn.style.backgroundColor = "#2ec4b6";
            }
        });
    }

    setTimeout(() => {
        gameState.currentQuestionIndex++;
        renderQuestion();
    }, 1500);
}

function startTimer() {
    gameState.timeLeft = 15;
    const elements = enforceGameElements();
    
    if(elements && elements.timerText) {
        elements.timerText.innerText = gameState.timeLeft;
    }

    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        const el = enforceGameElements();
        if(el && el.timerText) {
            el.timerText.innerText = gameState.timeLeft;
        }
        
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
    const elements = enforceGameElements();
    const allButtons = elements ? elements.answersGrid.querySelectorAll('.answer-btn') : [];
    
    allButtons.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === currentQuestion.correctAnswer) {
            btn.classList.add('correct');
            btn.style.backgroundColor = "#2ec4b6";
        }
    });
    
    setTimeout(() => {
        gameState.currentQuestionIndex++;
        renderQuestion();
    }, 1500);
}

function resetTimer() { clearInterval(gameState.timer); }

function endGameSession() {
    const resultScreen = document.getElementById('result-screen') || document.querySelector('.result-screen');
    if(resultScreen) {
        switchScreen(resultScreen);
        playSound('victory');
        
        const resScore = document.getElementById('res-score');
        if(resScore) resScore.innerText = gameState.score;
    } else {
        alert(`انتهت اللعبة! نتيجتك هي: ${gameState.score}`);
        const startScreen = document.getElementById('start-screen');
        if(startScreen) switchScreen(startScreen);
    }
}

function switchScreen(targetScreen) {
    if(!targetScreen) return;
    document.querySelectorAll('.screen, [class*="screen"]').forEach(s => {
        s.classList.remove('active');
        s.style.display = "none"; // إخفاء تام لباقي الشاشات
    });
    targetScreen.classList.add('active');
    targetScreen.style.display = "block"; // إظهار الشاشة المطلوبة فورا
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
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
            gain.gain.setValueAtTime(0.1, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.15);
        } else if (type === 'wrong') {
            osc.frequency.setValueAtTime(146, ctx.currentTime);
            gain.gain.setValueAtTime(0.15, ctx.currentTime);
            osc.start(); osc.stop(ctx.currentTime + 0.2);
        }
    } catch (e) { console.log("Audio Error"); }
}
