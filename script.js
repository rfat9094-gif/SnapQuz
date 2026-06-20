import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
    highScore: 0
};

const backupQuestions = [
    { "id": "c_1", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "مصر", "options": ["مصر", "سوريا", "العراق", "اليمن"], "image": "https://flagcdn.com/w320/eg.png" },
    { "id": "c_2", "category": "countries", "question": "إلى أي دولة ينتمي هذا العلم؟", "correctAnswer": "السعودية", "options": ["السعودية", "الكويت", "عمان", "قطر"], "image": "https://flagcdn.com/w320/sa.png" },
    { "id": "car_1", "category": "cars", "question": "ما هي شركة السيارات صاحبة هذا الشعار؟", "correctAnswer": "مرسيدس بنز", "options": ["مرسيدس بنز", "بي إم دبليو", "أودي", "فولكس فاجن"], "image": "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" },
    { "id": "g_1", "category": "general", "question": "كم عدد كواكب المجموعة الشمسية؟", "correctAnswer": "8 كواكب", "options": ["8 كواكب", "9 كواكب", "7 كواكب", "6 كواكب"], "image": null }
];

const githubRawUrl = "https://raw.githubusercontent.com/rfat9094-git/SnapQuiz/main/لعبه/questions.json";

// العناصر الرئيسية من الـ HTML
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

// الأزرار الفرعية
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');
const btnGoHome = document.getElementById('go-home-btn');

// تشغيل محرك اللعبة
initGameEngine();

function initGameEngine() {
    gameState.highScore = parseInt(localStorage.getItem('quiz_high_score')) || 0;
    gameState.allBankQuestions = [...backupQuestions];
    
    // ربط كروت الأقسام بالنقرات
    document.querySelectorAll('.category-card').forEach(card => {
        card.addEventListener('click', () => {
            const selectedCategory = card.getAttribute('data-cat');
            startSpecificCategory(selectedCategory);
        });
    });

    if(btnGoHome) btnGoHome.onclick = () => switchScreen(startScreen);
    if(themeToggle) themeToggle.onclick = toggleTheme;
    if(soundToggle) soundToggle.onclick = toggleSound;

    loadOnlineQuestions();
}

async function loadOnlineQuestions() {
    try {
        const response = await fetch(githubRawUrl);
        if (response.ok) {
            const data = await response.json();
            let remoteQuestions = [];
            ['countries', 'cars', 'monuments', 'general'].forEach(cat => {
                if (data[cat]) {
                    data[cat].forEach(item => {
                        remoteQuestions.push({
                            id: item.id, category: cat, question: item.question,
                            options: item.options || [], correctAnswer: item.correctAnswer || item.answer, 
                            image: item.image || null
                        });
                    });
                }
            });
            if(remoteQuestions.length > 0) gameState.allBankQuestions = [...remoteQuestions, ...backupQuestions];
        }
    } catch (e) { console.log("تحميل احتياطي من محلي"); }
}

function startSpecificCategory(category) {
    let categoryPool = gameState.allBankQuestions.filter(q => q.category === category);
    if(categoryPool.length === 0) categoryPool = [...gameState.allBankQuestions];

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
    if(questionCategory) questionCategory.innerText = currentQuestion.category;
    
    if (currentQuestion.image && questionImage) {
        questionImage.src = currentQuestion.image;
        if(questionImageContainer) questionImageContainer.classList.remove('hidden');
    } else {
        if(questionImageContainer) questionImageContainer.classList.add('hidden');
    }

    // بناء الأزرار (الخيارات)
    if(answersGrid) {
        answersGrid.innerHTML = "";
        let opts = currentQuestion.options && currentQuestion.options.length > 0 ? [...currentQuestion.options] : [currentQuestion.correctAnswer];
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

function endGameSession() {
    switchScreen(resultScreen);
    playSound('victory');
    
    const resScore = document.getElementById('res-score');
    const resCorrect = document.getElementById('res-correct');
    const resWrong = document.getElementById('res-wrong');
    
    if(resScore) resScore.innerText = gameState.score;
    if(resCorrect) resCorrect.innerText = gameState.correctAnswersCount;
    if(resWrong) resWrong.innerText = gameState.wrongAnswersCount;
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
