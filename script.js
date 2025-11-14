// script.js 
// Bind to DOMContentLoaded to avoid null reference errors
window.addEventListener('DOMContentLoaded', () => {

  /* ------------------ Element Reference ------------------ */
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const submitBtn = document.getElementById('submitBtn');
  const restartBtn = document.getElementById('restartBtn');
  const skipBtn = document.getElementById('skipBtn');
  const answerInput = document.getElementById('answerInput');
  const questionText = document.getElementById('questionText');
  const qNumEl = document.getElementById('qNum');
  const totalQEl = document.getElementById('totalQ');
  const diffLabel = document.getElementById('diffLabel');
  const timeEl = document.getElementById('time');
  const feedbackEl = document.getElementById('feedback');
  const scoreEl = document.getElementById('score');
  const progressBar = document.getElementById('progressBar');
  const bestScoreEl = document.getElementById('bestScore');
  const totalSelect = document.getElementById('totalSelect');
  const modeSelect = document.getElementById('modeSelect');
  const typesList = document.getElementById('typesList');
  const recommendation = document.getElementById('recommendation');
  const questionBox = document.getElementById('questionBox');

  // Graceful degradation if the page structure changes
  if (!questionText || !answerInput || !submitBtn || !startBtn) {
    console.warn('Required DOM elements not found, script.js has stopped initializing. Please check if the HTML matches the ID names.。');
    return;
  }

  /* ------------------ Game Status ------------------ */
  let totalQuestions = Number(totalSelect?.value || 15);
  let currentQuestion = 0;
  let score = 0;
  let questionData = []; // {text,answer,difficulty,points,timeLimit,type}
  let timer = null;
  let timeLeft = 0;
  let acceptingAnswer = false;
  let bestScore = Number(localStorage.getItem('mathQuestBest') || 0);
  bestScoreEl && (bestScoreEl.textContent = bestScore);

  // difficulty config
  const TIME_LIMITS = { easy: 180, medium: 240, hard: 300 };
  const POINTS = { easy: 1, medium: 2, hard: 3 };

  /* ------------------ Audio (WebAudio) ------------------ */
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = AudioCtx ? new AudioCtx() : null;
  function playTone(freq, duration = 0.12) {
    if (!ctx) return;
    try {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = freq;
      g.gain.value = 0.02;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => { o.stop(); }, duration * 1000);
    } catch (e) {
      // Some browsers may block AudioContext without user interaction
    }
  }
  function playCorrect() { playTone(880, 0.14); setTimeout(()=>playTone(1320,0.08), 70); }
  function playWrong() { playTone(500, 0.18); setTimeout(() => playTone(300, 0.12), 120); } 
  function playUrgent() { playTone(600, 0.06); setTimeout(()=>playTone(700,0.06), 60); }

  /* ------------------ Tools Algorithms ------------------ */
  function fmtTime(sec) {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  }
  function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  /* ------------------ Type of questions ------------------ */
  function genBasic(difficulty) {
    const a = rand(1, difficulty);
    const b = rand(1, difficulty);
    const ops = ['+', '-', '×'];
    const op = ops[rand(0, ops.length - 1)];
    let text, answer;
    if (op === '+') { answer = a + b; text = `${a} + ${b} = ?`; }
    if (op === '-') { answer = a - b; text = `${a} - ${b} = ?`; }
    if (op === '×') { answer = a * b; text = `${a} × ${b} = ?`; }
    return { text, answer, type: 'basic' };
  }
  function genDivision(difficulty) {
    const b = rand(2, Math.max(2, Math.floor(difficulty / 2)));
    const ans = rand(2, Math.min(12, Math.max(2, Math.floor(difficulty / 2))));
    const a = b * ans;
    return { text: `${a} ÷ ${b} = ?`, answer: ans, type: 'division' };
  }
  function genTwoStep(difficulty) {
    const a = rand(2, difficulty), b = rand(1, Math.max(2, Math.floor(difficulty / 2))), c = rand(1, Math.max(2, Math.floor(difficulty / 3)));
    const pattern = rand(1, 3);
    let text, ans;
    if (pattern === 1) { ans = (a + b) * c; text = `(${a} + ${b}) × ${c} = ?`; }
    else if (pattern === 2) { ans = a * b + c; text = `${a} × ${b} + ${c} = ?`; }
    else { ans = a * (b - c); text = `${a} × (${b} - ${c}) = ?`; }
    return { text, answer: ans, type: 'two-step' };
  }
  function genThreeStep(difficulty) {
    const x = rand(2, Math.max(3, difficulty)), y = rand(2, Math.max(3, Math.floor(difficulty / 2))), z = rand(1, Math.max(2, Math.floor(difficulty / 3)));
    const text = `${x} × ${y} + ${z} - ${Math.floor(z / 2)} = ?`;
    const answer = x * y + z - Math.floor(z / 2);
    return { text, answer, type: 'three-step' };
  }
  function genSequence(difficulty) {
    const start = rand(1, Math.max(3, difficulty));
    const diff = rand(1, Math.max(1, Math.floor(difficulty / 5)));
    const len = rand(4, 6);
    const seq = Array.from({ length: len }, (_, i) => start + i * diff);
    const missing = rand(0, len - 1);
    const answer = seq[missing];
    const display = seq.map((v, i) => i === missing ? '...' : v).join(', ');
    return { text: `Find the missing number: ${display}`, answer: answer, type: 'sequence' };
  }
  function genEquation(difficulty) {
    const a = rand(1, Math.max(2, Math.floor(difficulty / 5)));
    const x = rand(1, Math.max(1, Math.floor(difficulty / 4)));
    const b = rand(0, Math.max(1, Math.floor(difficulty / 3)));
    const c = a * x + b;
    const text = `${a}x + ${b} = ${c}. Solve x = ?`;
    return { text, answer: x, type: 'equation' };
  }

  function genOne(difficultyLabel) {
    const difficultyNum = difficultyLabel === 'easy' ? 10 : (difficultyLabel === 'medium' ? 30 : 60);
    const r = Math.random();
    if (r < 0.30) return { ...genBasic(difficultyNum), difficulty: difficultyLabel, points: POINTS[difficultyLabel], timeLimit: TIME_LIMITS[difficultyLabel] };
    if (r < 0.50) return { ...genDivision(difficultyNum), difficulty: difficultyLabel, points: POINTS[difficultyLabel], timeLimit: TIME_LIMITS[difficultyLabel] };
    if (r < 0.70) return { ...genTwoStep(difficultyNum), difficulty: difficultyLabel, points: POINTS[difficultyLabel], timeLimit: TIME_LIMITS[difficultyLabel] };
    if (r < 0.82) return { ...genThreeStep(difficultyNum), difficulty: difficultyLabel, points: POINTS[difficultyLabel], timeLimit: TIME_LIMITS[difficultyLabel] };
    if (r < 0.92) return { ...genSequence(difficultyNum), difficulty: difficultyLabel, points: POINTS[difficultyLabel], timeLimit: TIME_LIMITS[difficultyLabel] };
    return { ...genEquation(difficultyNum), difficulty: difficultyLabel, points: POINTS[difficultyLabel], timeLimit: TIME_LIMITS[difficultyLabel] };
  }

  /* ------------------ Bulid Questions Set ------------------ */
  function buildQuestions() {
    const mode = (modeSelect?.value) || 'ramp';
    totalQuestions = Number(totalSelect?.value || 15);
    questionData = [];
    if (mode === 'ramp') {
      const n = totalQuestions;
      const eCount = Math.ceil(n / 3);
      const mCount = Math.ceil(n / 3);
      const hCount = n - eCount - mCount;
      for (let i = 0; i < eCount; i++) questionData.push(genOne('easy'));
      for (let i = 0; i < mCount; i++) questionData.push(genOne('medium'));
      for (let i = 0; i < hCount; i++) questionData.push(genOne('hard'));
    } else if (mode === 'mixed') {
      for (let i = 0; i < totalQuestions; i++) {
        const p = Math.random();
        if (p < 0.4) questionData.push(genOne('easy'));
        else if (p < 0.8) questionData.push(genOne('medium'));
        else questionData.push(genOne('hard'));
      }
    } else {
      for (let i = 0; i < totalQuestions; i++) questionData.push(genOne('hard'));
    }
    updateTypesBox(mode);
  }

  function updateTypesBox(mode) {
    const typesSet = new Set(questionData.map(q => q.type));
    if (typesList) {
      typesList.innerHTML = '';
      typesSet.forEach(t => {
        const li = document.createElement('li');
        li.textContent = t;
        typesList.appendChild(li);
      });
    }
    if (recommendation) {
      if (mode === 'ramp') recommendation.textContent = 'Recommendation: Suitable for school practice and daily review (Form 1–Form 4). Gradually increasing the difficulty helps to build a solid foundation.';
      else if (mode === 'mixed') recommendation.textContent = 'Suggestion: Suitable for SPM (Form 5) preparation and mixed practice, balancing speed and thinking.';
      else recommendation.textContent = 'Recommendation: The advanced mode is suitable for competition training or in-depth Mathematical Olympiad study.';
    }
  }

  /* ------------------ Show Questions & Timer ------------------ */
  function showQuestion() {
    const q = questionData[currentQuestion];
    if (!q) return;
    questionText.textContent = q.text;
    diffLabel && (diffLabel.textContent = (q.difficulty || '—').toUpperCase());
    qNumEl && (qNumEl.textContent = currentQuestion + 1);
    totalQEl && (totalQEl.textContent = totalQuestions);
    timeLeft = q.timeLimit || TIME_LIMITS.medium;
    timeEl && (timeEl.textContent = fmtTime(timeLeft));
    startTimer();
    acceptingAnswer = true;
    if (answerInput) { answerInput.disabled = false; answerInput.focus(); }
    feedbackEl && (feedbackEl.textContent = '');
    const pct = Math.round(((currentQuestion) / totalQuestions) * 100);
    progressBar && (progressBar.style.width = pct + '%');
  }

  function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
      timeLeft--;
      timeEl && (timeEl.textContent = fmtTime(timeLeft));
      if (timeLeft === 30) {
        playUrgent();
        timeEl && (timeEl.style.color = '#fecaca');
      }
      if (timeLeft <= 0) {
        clearInterval(timer);
        acceptingAnswer = false;
        provideFeedback(false, `Time up! Answer: ${questionData[currentQuestion].answer}`);
        setTimeout(nextQuestion, 1200);
      }
    }, 1000);
  }

  /* ------------------ Feedback & Sumbit Process ------------------ */
  function provideFeedback(isCorrect, text) {
    if (!feedbackEl) return;
    feedbackEl.textContent = text;
    feedbackEl.style.color = isCorrect ? 'var(--success)' : 'var(--danger)';
    if (!questionBox) return;
    questionBox.classList.remove('correct', 'wrong');
    // reflow for animation
    void questionBox.offsetWidth;
    questionBox.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  function submitAnswer() {
    if (!acceptingAnswer) return;
    const raw = (answerInput.value || '').toString().trim();
    if (raw === '') {
      feedbackEl.textContent = 'Please enter an answer or press Skip to skip the question';
      return;
    }

    // process answer as number
    const user = Number(raw);
    const q = questionData[currentQuestion];
    acceptingAnswer = false;
    if (answerInput) { answerInput.disabled = true; }
    clearInterval(timer);

    const correct = (user === q.answer);
    if (correct) {
      score += q.points;
      scoreEl && (scoreEl.textContent = score);
      provideFeedback(true, `Correct! +${q.points}`);
      playCorrect();
    } else {
      provideFeedback(false, `Wrong. Answer: ${q.answer}`);
      playWrong();
    }

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('mathQuestBest', String(bestScore));
      bestScoreEl && (bestScoreEl.textContent = bestScore);
    }

    setTimeout(nextQuestion, 900);
  }

  function skipQuestion() {
    if (!acceptingAnswer) return;
    acceptingAnswer = false;
    clearInterval(timer);
    provideFeedback(false, `Skipped. Answer: ${questionData[currentQuestion].answer}`);
    playWrong();
    setTimeout(nextQuestion, 700);
  }

  function nextQuestion() {
    if (questionBox) questionBox.classList.remove('correct', 'wrong');
    currentQuestion++;
    if (currentQuestion >= totalQuestions) {
      endGame();
      return;
    }
    if (answerInput) answerInput.value = '';
    showQuestion();
  }

  function endGame() {
    clearInterval(timer);
    acceptingAnswer = false;
    if (answerInput) answerInput.disabled = true;
    questionText.textContent = 'Game Over！';
    feedbackEl.textContent = `Score：${score} / ${totalQuestions * POINTS.hard} (Reference limit)`;
    progressBar && (progressBar.style.width = '100%');
    restartBtn && restartBtn.classList.remove('hidden');
    startBtn && (startBtn.disabled = false);
    submitBtn && (submitBtn.disabled = true);
    skipBtn && (skipBtn.disabled = true);

    saveToLeaderboard(score);
    renderLeaderboard();
  }

  /* ------------------ Leaderboard (localStorage) ------------------ */
  function saveToLeaderboard(score) {
    let name = prompt('Enter a name to save the leaderboard (optional)') || 'Anonymous';
    name = name.trim() || 'Anonymous';
    const board = JSON.parse(localStorage.getItem('mathQuestBoard') || '[]');
    board.push({ name, score, date: new Date().toISOString() });
    board.sort((a, b) => b.score - a.score);
    localStorage.setItem('mathQuestBoard', JSON.stringify(board.slice(0, 10)));
  }

  function renderLeaderboard() {
    const board = JSON.parse(localStorage.getItem('mathQuestBoard') || '[]');
    const el = document.createElement('div');
    el.className = 'result leader';
    el.innerHTML = `<strong>Ranking Top ${board.length}</strong><ol>` + board.map(b => `<li>${escapeHtml(b.name)} — ${b.score} <small style="color:#9fb4d9">(${new Date(b.date).toLocaleString()})</small></li>`).join('') + `</ol>`;
    const old = document.querySelector('.right .result.leader');
    if (old) old.remove();
    const right = document.querySelector('.right');
    if (right) right.appendChild(el);
    // also console.log for visibility
    console.table(board);
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"'`]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '`': '&#96;' })[s]);
  }

  /* ------------------ Start / Restart / Init ------------------ */
  function startGame() {
    // show loading overlay briefly if exists
    if (overlay) {
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
    }
    // small delay to mimic loading, then init
    setTimeout(() => {
      if (overlay) {
        overlay.classList.add('hidden');
        overlay.setAttribute('aria-hidden', 'true');
      }
      startBtn && (startBtn.disabled = true);
      restartBtn && restartBtn.classList.add('hidden');
      submitBtn && (submitBtn.disabled = false);
      skipBtn && (skipBtn.disabled = false);
      score = 0;
      scoreEl && (scoreEl.textContent = score);
      currentQuestion = 0;
      buildQuestions();
      renderLeaderboard();
      showQuestion();
    }, 400); // 400ms
  }

  function restartGame() {
    clearInterval(timer);
    score = 0;
    scoreEl && (scoreEl.textContent = 0);
    currentQuestion = 0;
    startBtn && (startBtn.disabled = false);
    restartBtn && restartBtn.classList.add('hidden');
    submitBtn && (submitBtn.disabled = false);
    skipBtn && (skipBtn.disabled = false);
    questionText.textContent = 'Press Start to begin the game';
    feedbackEl.textContent = '';
    progressBar && (progressBar.style.width = '0%');
  }

  /* ------------------ Event Binding (Security Check) ------------------ */
  if (startBtn) startBtn.addEventListener('click', startGame);
  if (submitBtn) submitBtn.addEventListener('click', submitAnswer);
  if (restartBtn) restartBtn.addEventListener('click', restartGame);
  if (skipBtn) skipBtn.addEventListener('click', skipQuestion);
  if (answerInput) answerInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') submitAnswer(); });

  if (totalSelect) totalSelect.addEventListener('change', () => {
    totalQuestions = Number(totalSelect.value);
    totalQEl && (totalQEl.textContent = totalQuestions);
  });

  if (modeSelect) modeSelect.addEventListener('change', () => {
    buildQuestions();
    updateTypesBox(modeSelect.value);
  });

  /* ------------------ Initialize UI ------------------ */
  (function init() {
    totalQEl && (totalQEl.textContent = totalQuestions);
    qNumEl && (qNumEl.textContent = 0);
    scoreEl && (scoreEl.textContent = 0);
    progressBar && (progressBar.style.width = '0%');
    renderLeaderboard();
  })();

}); // end DOMContentLoaded
