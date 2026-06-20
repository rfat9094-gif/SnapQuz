import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// 1. إعدادات الفايربيز الخاصة بك (تأكد أنها مطابقة لبيانات مشروعك)
const firebaseConfig = {
    databaseURL: "https://snapquiz-79f06-default-rtdb.firebaseio.com"
};

// تهيئة الفايربيز
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 2. متغيرات اللعبة الأساسية
let allQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let timerInterval = null;
let timeLeft = 15; // زمن السؤال 15 ثانية

// الأسئلة الاحتياطية (في حال حدوث أي مشكلة في الشبكة)
const backupQuestions = [
    {
        question: "ما هو الطراز الكلاسيكي الشهير من سيارات مرسيدس-بنز الذي لُقب بـ 'أجنحة النورس'؟",
        answer: "300 SL Gullwing",
        category: "cars",
        options: ["300 SL Gullwing", "E-Class", "S-Class", "C-Class"]
    },
    {
        question: "ما هي عاصمة كندا؟",
        answer: "أوتاوا",
        category: "countries",
        options: ["أوتاوا", "تورونتو", "مونتريال", "فانكوفر"]
    }
];

// 3. بدء اللعبة عند تحميل الصفحة
document.addEventListener("DOMContentLoaded", () => {
    fetchQuestionsFromFirebase();
});

// 4. جلب الأسئلة من الفايربيز
async function fetchQuestionsFromFirebase() {
    try {
        // بنسحب من فرع questions اللي ظهر في قاعدة بياناتك
        const dbRef = ref(db, "questions");
        const snapshot = await get(dbRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            // تحويل الكائن (Object) القادم من فايربيز إلى مصفوفة (Array)
            allQuestions = Object.keys(data).map(key => data[key]);
            console.log("تم سحب أسئلة حية من الفايربيز بنجاح! 🚀", allQuestions);
        } else {
            console.warn("لم يتم العثور على فرع questions، تشغيل الوضع الاحتياطي.");
            allQuestions = backupQuestions;
        }
    } catch (error) {
        console.error("خطأ في الاتصال بالفايربيز، تشغيل الوضع الاحتياطي: ", error);
        allQuestions = backupQuestions;
    }

    // ترتيب الأسئلة بشكل عشوائي وبدء عرض أول سؤال
    allQuestions.sort(() => Math.random() - 0.5);
    currentQuestionIndex = 0;
    score = 0;
    loadQuestion();
}

// 5. تجهيز وتحميل السؤال الحالي
function loadQuestion() {
    // إيقاف أي عداد قديم شغال لمنع تداخل الأوقات
    clearInterval(timerInterval);

    if (currentQuestionIndex >= allQuestions.length) {
        endGame();
        return;
    }

    const currentQuestionObj = allQuestions[currentQuestionIndex];

    // تحديد نص السؤال والقسم
    const questionTextElement = document.getElementById("question-text") || document.querySelector(".question-text") || document.querySelector("h2");
    if (questionTextElement) {
        questionTextElement.innerText = currentQuestionObj.question;
    }

    // توليد وتجهيز الـ 4 اختيارات بشكل آمن
    let choices = [];
    if (currentQuestionObj.options && currentQuestionObj.options.length > 0) {
        choices = [...currentQuestionObj.options];
    } else {
        // حل ذكي: لو الفايربيز مفيش فيه خيارات، هناخد الإجابة الصح ونحط معاها 3 إجابات تانية عشوائية
        choices.push(currentQuestionObj.answer);
        const alternativeAnswers = allQuestions
            .document?.map(q => q.answer)
            .filter(ans => ans !== currentQuestionObj.answer) || [];
        
        // خلط الإجابات البديلة واختيار 3 منها
        alternativeAnswers.sort(() => Math.random() - 0.5);
        for (let i = 0; i < Math.min(3, alternativeAnswers.length); i++) {
            choices.push(alternativeAnswers[i]);
        }
        
        // لو لسه مكملوش 4 خيارات، بنكملهم من الخيارات الاحتياطية
        const defaultFallbacks = ["مرسيدس", "تويوتا", "فورد", "بي إم دبليو", "أوتاوا", "باريس", "القاهرة"];
        while (choices.length < 4) {
            let randomFallback = defaultFallbacks[Math.floor(Math.random() * defaultFallbacks.length)];
            if (!choices.includes(randomFallback)) {
                choices.push(randomFallback);
            }
        }
    }

    // ترتيب الاختيارات الأربعة بشكل عشوائي عشان الإجابة الصح مكانها يتغير كل مرة
    choices.sort(() => Math.random() - 0.5);

    // عرض الاختيارات في الأزرار
    // الكود بيبحث عن عناصر تحتوي على كلاس الـ زر أو الـ Container الخاص بها
    const answersContainer = document.getElementById("answers-container") || document.querySelector(".answers-container");
    
    if (answersContainer) {
        answersContainer.innerHTML = ""; // تنظيف الأزرار القديمة
        choices.forEach(choice => {
            const button = document.createElement("button");
            button.className = "answer-btn"; // الكلاس الخاص بتنسيق أزرارك في الـ CSS
            button.style.display = "block";
            button.style.width = "100%";
            button.innerText = choice;
            button.onclick = () => handleAnswerSelection(choice, currentQuestionObj.answer);
            answersContainer.appendChild(button);
        });
    } else {
        // طريقة بديلة لو الأزرار ثابتة في الـ HTML ولها IDs محددة (مثل btn1, btn2...)
        for (let i = 0; i < 4; i++) {
            const btn = document.getElementById(`btn${i+1}`);
            if (btn && choices[i]) {
                btn.innerText = choices[i];
                btn.onclick = () => handleAnswerSelection(choices[i], currentQuestionObj.answer);
            }
        }
    }

    // تشغيل العداد الخاص بالسؤال
    startTimer(currentQuestionObj.answer);
}

// 6. تشغيل العداد (15 ثانية)
function startTimer(correctAnswer) {
    timeLeft = 15;
    const timerElement = document.getElementById("timer") || document.querySelector(".timer-text") || document.querySelector(".lvl-container + div") || document.querySelector(".score-box + div") || document.querySelector("div[class*='15']");
    
    // محاولة العثور على عنصر العداد لتحديث الرقم الرقمي (زي الـ 15 الظاهرة في الصورة)
    const updateVisualTimer = (time) => {
        const targetElement = document.getElementById("timer") || document.querySelector(".score-box span") || document.querySelector("div:has(> span)");
        // البحث عن العنصر اللي جواه رقم 15 حالياً وتحديثه
        let elements = document.querySelectorAll('div, span, p');
        elements.forEach(el => {
            if (el.innerText == timeLeft + 1 || el.innerText == timeLeft || el.innerText == "15" || el.className.includes("timer")) {
                // إذا كان العنصر يحتوي على رقم العداد فقط
                if(!isNaN(el.innerText.trim())) {
                     el.innerText = time;
                }
            }
        });
    };

    updateVisualTimer(timeLeft);

    timerInterval = setInterval(() => {
        timeLeft--;
        updateVisualTimer(timeLeft);

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            console.log("انتهى الوقت!");
            // إذا انتهى الوقت نعتبر الإجابة خاطئة وننتقل للسؤال التالي
            handleAnswerSelection("", correctAnswer);
        }
    }, 1000);
}

// 7. التحقق من الإجابة والانتقال للسؤال التالي
function handleAnswerSelection(selectedChoice, correctAnswer) {
    clearInterval(timerInterval); // إيقاف العداد فوراً عند الضغط

    if (selectedChoice === correctAnswer) {
        score += 10;
        console.log("إجابة صحيحة! 🎉");
        // تحديث السكور في الواجهة لو عندك عنصر له ID أو كلاس سكور
        updateScoreUI();
    } else {
        console.log("إجابة خاطئة أو انتهى الوقت. ❌");
    }

    // الانتقال للسؤال التالي بعد ثانية واحدة لمنح المستخدم فرصة لرؤية النتيجة
    setTimeout(() => {
        currentQuestionIndex++;
        loadQuestion();
    }, 1000);
}

// تحديث الواجهة الخاصة بالنقاط
function updateScoreUI() {
    let elements = document.querySelectorAll('span, div');
    elements.forEach(el => {
        if(el.innerText.includes("Lvl 1") || el.innerText.includes("★")) {
            // تحديث النجوم أو النقاط بجانب الـ Lvl
            el.innerHTML = `Lvl 1 | ${score} ★`;
        }
    });
}

// 8. نهاية اللعبة
function endGame() {
    clearInterval(timerInterval);
    const questionTextElement = document.getElementById("question-text") || document.querySelector(".question-text") || document.querySelector("h2");
    if (questionTextElement) {
        questionTextElement.innerText = `انتهت اللعبة! مجموع نقاطك هو: ${score}`;
    }
    const answersContainer = document.getElementById("answers-container") || document.querySelector(".answers-container");
    if (answersContainer) {
        answersContainer.innerHTML = `<button class="answer-btn" onclick="location.reload()">إعادة اللعب من جديد 🔄</button>`;
    }
}
