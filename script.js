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

const githubRawUrl = "https://raw.githubusercontent.com/rfat9094-git/SnapQuiz/main/%D9%84%D8%B9%D8%A8%D9%87/questions.json";

// 🔥 بنك احتياطي ممتد (لو جيت هاب باظ أو كيش، اللعبة هتعرض 10 أسئلة جديدة تلقائياً)
const backupQuestions = [
    { "id": "b_c1", "category": "countries", "question": "ما هي عاصمة اليابان؟", "correctAnswer": "طوكيو", "options": ["طوكيو", "سيول", "بكين", "بانكوك"], "image": null },
    { "id": "b_c2", "category": "countries", "question": "إلى أي دولة ينتمي علم مصر؟", "correctAnswer": "مصر", "options": ["مصر", "سوريا", "العراق", "ليبيا"], "image": "https://flagcdn.com/w320/eg.png" },
    { "id": "b_car1", "category": "cars", "question": "ما هي دولة منشأ سيارات بي إم دبليو؟", "correctAnswer": "ألمانيا", "options": ["ألمانيا", "إيطاليا", "اليابان", "أمريكا"], "image": null },
    { "id": "b_car2", "category": "cars", "question": "ما شعار شركة مرسيدس؟", "correctAnswer": "النجمة الثلاثية", "options": ["النجمة الثلاثية", "الحصان القافز", "الحلقات الأربعة", "الأسد"], "image": "https://www.carlogos.org/car-logos/mercedes-benz-logo.png" },
    { "id": "b_m1", "category": "monuments", "question": "أين يوجد تمثال الحرية؟", "correctAnswer": "أمريكا", "options": ["أمريكا", "فرنسا", "بريطانيا", "إيطاليا"], "image": null },
    { "id": "b_g1", "category": "general", "question": "ما هو أكبر كواكب المجموعة الشمسية؟", "correctAnswer": "المشتري", "options": ["المشتري", "زحل", "الأرض", "المريخ"], "image": null },
    { "id": "b_g2", "category": "general", "question": "كم عدد قارات العالم؟", "correctAnswer": "7", "options": ["7", "6", "5", "8"], "image": null }
];

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
const themeToggle = document.getElementById('theme-toggle');
const soundToggle = document.getElementById('sound-toggle');
const btnGoHome = document.getElementById('go-home-btn');

initGameEngine();

function initGameEngine() {
    gameState.highScore = parseInt(localStorage.getItem('quiz_high_score')) || 0;
    gameState.allBankQuestions = [...backupQuestions];
    
    document.querySelectorAll('.category-card').forEach(card => {
        card.onclick = () => {
            const selectedCategory = card.getAttribute('data-cat');
            startSpecificCategory(selectedCategory);
        };
    });

    if(btnGoHome) btnGoHome.onclick = () => switchScreen(startScreen);
    if(themeToggle) themeToggle.onclick = toggleTheme;
    if(soundToggle) soundToggle.onclick = toggleSound;

    loadOnlineQuestions();
}

async function loadOnlineQuestions() {
    try {
        // حيلة كسر الكاش لضمان عدم قراءة المتصفح لأي نسخة قديمة
        const response = await fetch(`${githubRawUrl}?v=${Date.now()}`, { cache: "no-store" });
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
                gameState.allBankQuestions = [...remoteQuestions, ...backupQuestions];
                console.log("🚀 جيت هاب استجاب وجاب الأسئلة الحية بنجاح!");
            }
        }
    } catch (e) { 
        console.log("جيت هاب معلق أو الملف فيه خطأ صيغة، اللعبة شغالة بالاحتياطي الجديد والمطور."); 
    }
}

function startSpecificCategory(category) {
    let categoryPool = gameState.allBankQuestions.filter(q => q.category === category);
    if(categoryPool.length === 0) categoryPool = [...gameState.allBankQuestions];

    // اختيار 10 أسئلة كاملة
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

    if(answersGrid) {
        answersGrid.innerHTML = "";
        let opts = currentQuestion.options && currentQuestion.options.length > 0 ? [...currentQuestion.options] : [currentQuestion.correctAnswer];
        if(opts.length < 4) opts = [currentQuestion.correctAnswer, "خيار ب", "خيار ج", "خيار د"];
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
        progressBar.style.width = `${(gameState.currentQuestionIndex / gameState.activeQuestions.length) * 100}%`;
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
    } else {
        selectedButton.classList.add('wrong');
        gameState.wrongAnswersCount++;
        allButtons.forEach(btn => { if (btn.innerText === correctAnswer) btn.classList.add('correct'); });
    }

    setTimeout(() => { gameState.currentQuestionIndex++; renderQuestion(); }, 1500);
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
    if(document.getElementById('res-score')) document.getElementById('res-score').innerText = gameState.score;
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
}

function toggleSound() {
    gameState.isSoundEnabled = !gameState.isSoundEnabled;
}
