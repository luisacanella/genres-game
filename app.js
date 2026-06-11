import { 
  db, 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  limit, 
  serverTimestamp 
} from './firebase-config.js';

/* ==========================================================================
   GAME CONFIGURATION & LEVELS
   ========================================================================== */
const STAGES = [
  {
    speaker: "Mr. Sterling (The Boss)",
    npcEmoji: "👔",
    context: "Welcome to the office! I need you to send a formal status update right away. Make sure it's formal and sent to my corporate inbox.",
    sample: `Subject: Project Status Update - Week 24

Dear Mr. Sterling,

I am writing to provide you with the weekly update on the Horizon project. We have successfully completed the database migration and are on track for the user testing phase next week.

Please find the detailed report attached.

Best regards,
[Your Name]`,
    choices: ["e-mail", "Note", "Receipt", "Leaflet"],
    correct: 0
  },
  {
    speaker: "Pam (Office Assistant)",
    npcEmoji: "👩‍💼",
    context: "Hey! Can you help me? I don't know how to scan these documents to my email. Is there a guide on how to run this copy machine?",
    sample: `HOW TO SCAN TO EMAIL:
1. Place the document face down on the glass scanner.
2. Tap 'Scan' on the touchscreen menu.
3. Enter your email address and press 'Send'.
4. Wait for the green light before removing your document.`,
    choices: ["Article", "Instructions", "Letter", "Timetable"],
    correct: 1
  },
  {
    speaker: "Jim (Project Manager)",
    npcEmoji: "👨‍💼",
    context: "Hey there! I'm completely confused about our weekly schedule. When are the daily stand-up meetings and the client review session?",
    sample: `WEEKLY OFFICE SCHEDULE
Mon | 09:00 - Team Standup | 14:00 - Tech Sync
Tue | 10:00 - Client Call   | 16:00 - Design Review
Wed | 09:00 - Team Standup | 15:00 - Marketing Plan
Thu | 11:00 - QA Session    | 14:00 - Product Demo
Fri | 10:00 - Team Retrospective`,
    choices: ["Timetable", "Letter", "Receipt", "Article"],
    correct: 0
  },
  {
    speaker: "Dwight (Sales Representative)",
    npcEmoji: "🤓",
    context: "A client is coming for lunch! I need to know what sandwiches and drinks we can order from the bistro downstairs. Do you have their price list?",
    sample: `THE CORNER BISTRO
-- Sandwiches --
* Classic BLT ....... $7.50
* Turkey & Swiss ... $8.00
* Vegan Avocado .... $8.50
-- Hot Drinks --
* Espresso ......... $2.50
* Latte Art ........ $3.50`,
    choices: ["Leaflet", "Note", "Menu", "Letter"],
    correct: 2
  },
  {
    speaker: "Angela (Accountant)",
    npcEmoji: "👩‍💻",
    context: "I need the proof of payment for the client lunch to process your refund. Do you have the ticket showing the total amount paid, the date, and tax details?",
    sample: `THE CORNER BISTRO
104 Main Street, NY
------------------------
1x Classic BLT ...... $7.50
1x Latte Art ........ $3.50
------------------------
SUBTOTAL:           $11.00
TAX (8%):            $0.88
TOTAL:              $11.88
PAID via Visa *1234
THANK YOU!`,
    choices: ["Timetable", "E-mail", "Article", "Receipt"],
    correct: 3
  },
  {
    speaker: "Toby (HR Manager)",
    npcEmoji: "👨‍💼",
    context: "I went to your desk but you were in a meeting. I left a small yellow sticky note on your monitor with a quick HR reminder.",
    sample: `Don't forget: HR meeting tomorrow at 9 AM in Room B! Bring your ID.
- Toby`,
    choices: ["Note", "Leaflet", "Article", "Menu"],
    correct: 0
  },
  {
    speaker: "Stanley (Developer)",
    npcEmoji: "👨🏾‍💻",
    context: "Hey, sorry to disturb you, but I just sent you a quick, informal text message on your phone. Can you check it?",
    sample: `Hey man! u got a sec? where is the key for the server room? stuck outside lol 🔑`,
    choices: ["Letter", "text message", "Instructions", "Leaflet"],
    correct: 1
  },
  {
    speaker: "Phyllis (Marketing Specialist)",
    npcEmoji: "👩‍🏫",
    context: "We are going to a jobs fair tomorrow! I need that trifold paper brochure—also known as a leaflet—that introduces our company services to new graduates.",
    sample: `BUILDING THE FUTURE

Who We Are:
We are a leading tech agency specializing in modern web solutions.

Our Services:
* Web & Mobile Development
* UI/UX Design & Branding
* Cloud Infrastructure

Contact Us:
careers@techcorp.com | www.techcorp.com`,
    choices: ["Leaflet", "Receipt", "Timetable", "Note"],
    correct: 0
  },
  {
    speaker: "Ryan (Business Development)",
    npcEmoji: "🧑‍💼",
    context: "We need to send an official partnership request to the Director of Global Tech. I wrote a formal document on our company letterhead.",
    sample: `TechCorp Solutions
5th Avenue, New York

June 11, 2026

To: Director of Global Tech
Subject: Partnership Proposal

Dear Director,

I am writing to formally propose a strategic partnership between our organizations. We believe our expertise in web games aligns perfectly with your educational goals.

Sincerely,
Ryan Howard`,
    choices: ["text message", "Menu", "Letter", "Instructions"],
    correct: 2
  },
  {
    speaker: "Kelly (Customer Success)",
    npcEmoji: "👩‍🎤",
    context: "I just read a very interesting, structured analysis in the Business Tech Magazine about artificial intelligence in schools. Let me show you this piece.",
    sample: `THE RISE OF GAMIFIED LEARNING
By Dr. Marcus Vance

In recent years, educational institutions have increasingly adopted game mechanics to enhance student engagement. Research shows that gamified platforms can increase retention rates by up to 40% when combined with traditional curriculum...`,
    choices: ["Receipt", "Note", "Timetable", "Article"],
    correct: 3
  }
];

/* ==========================================================================
   GAME STATE VARIABLES
   ========================================================================== */
let gameState = {
  playerName: "",
  playerAvatar: "🧑‍💻",
  playerRole: "Developer",
  currentLevelIndex: 0,
  score: 0,
  streak: 0,
  hearts: 3,
  timeLeft: 45,
  timerInterval: null,
  isAnswering: false
};

const TIMER_DURATION = 45; // seconds

/* ==========================================================================
   AUDIO SYNTHESIZER (Web Audio API)
   ========================================================================== */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration) {
  try {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    console.warn("Audio synthesis not supported or blocked by browser policies.");
  }
}

function playSuccessSound() {
  playTone(523.25, 'sine', 0.1); // C5
  setTimeout(() => playTone(659.25, 'sine', 0.15), 80); // E5
}

function playErrorSound() {
  playTone(180, 'sawtooth', 0.3);
}

function playWalkSound() {
  playTone(300, 'triangle', 0.05);
}

function playWinSound() {
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  notes.forEach((freq, index) => {
    setTimeout(() => playTone(freq, 'sine', 0.15), index * 120);
  });
}

function playGameOverSound() {
  const notes = [392.00, 349.23, 311.13, 261.63]; // G4, F4, D#4, C4
  notes.forEach((freq, index) => {
    setTimeout(() => playTone(freq, 'sawtooth', 0.25), index * 180);
  });
}

/* ==========================================================================
   DOM ELEMENTS
   ========================================================================== */
// Screens
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const leaderboardScreen = document.getElementById('leaderboard-screen');

// Start Screen Elements
const playerNameInput = document.getElementById('player-name');
const avatarButtons = document.querySelectorAll('.avatar-btn');
const startBtn = document.getElementById('start-btn');
const viewLeaderboardBtn = document.getElementById('view-leaderboard-btn');

// Game Screen Elements
const hudAvatar = document.getElementById('hud-avatar');
const hudUsername = document.getElementById('hud-username');
const hudRole = document.getElementById('hud-role');
const hudStage = document.getElementById('hud-stage');
const hudScore = document.getElementById('hud-score');
const hudHearts = document.getElementById('hud-hearts');
const streakBadge = document.getElementById('streak-badge');

const officeScene = document.getElementById('office-scene');
const playerSprite = document.getElementById('player-sprite');
const playerSpriteEmoji = document.getElementById('player-sprite-emoji');
const playerBubble = document.getElementById('player-bubble');
const npcSpriteEmoji = document.getElementById('npc-sprite-emoji');
const npcNamePlate = document.getElementById('npc-name');

const dialogueSpeaker = document.getElementById('dialogue-speaker');
const dialogueText = document.getElementById('dialogue-text');
const documentViewer = document.getElementById('document-viewer');
const textSampleContent = document.getElementById('text-sample-content');
const timerBar = document.getElementById('timer-bar');
const timerSeconds = document.getElementById('timer-seconds');
const choiceButtons = document.querySelectorAll('.choice-btn');

// Leaderboard Screen Elements
const gameOverTitle = document.getElementById('game-over-title');
const finalAvatar = document.getElementById('final-avatar');
const finalUsername = document.getElementById('final-username');
const finalScoreValue = document.getElementById('final-score-value');
const completionStatus = document.getElementById('completion-status');
const leaderboardTbody = document.getElementById('leaderboard-tbody');
const restartBtn = document.getElementById('restart-btn');
const backHomeBtn = document.getElementById('back-home-btn');

/* ==========================================================================
   INTERACTIVE LOGIC
   ========================================================================== */

// Avatar selection change
avatarButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    avatarButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gameState.playerAvatar = btn.getAttribute('data-avatar');
    gameState.playerRole = btn.getAttribute('data-role');
    playWalkSound();
  });
});

// Start button click
startBtn.addEventListener('click', () => {
  const name = playerNameInput.value.trim();
  if (!name) {
    alert("Please enter your name or nickname to start!");
    playerNameInput.focus();
    return;
  }
  gameState.playerName = name;
  initGame();
});

// Back home button
backHomeBtn.addEventListener('click', () => {
  showScreen(startScreen);
});

// Restart button click
restartBtn.addEventListener('click', () => {
  initGame();
});

// View leaderboard from Start Screen
viewLeaderboardBtn.addEventListener('click', () => {
  // Mock final state for screen display logic or just show leaderboard with 0 score
  gameOverTitle.textContent = "GLOBAL RATINGS";
  gameOverTitle.classList.remove('lost');
  finalAvatar.textContent = "🏢";
  finalUsername.textContent = "Visitor";
  finalScoreValue.textContent = "0";
  completionStatus.textContent = "Viewing global stats";
  showScreen(leaderboardScreen);
});

// Setup Choice Clicks
choiceButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    if (gameState.isAnswering) return;
    const selectedIdx = parseInt(btn.getAttribute('data-choice'));
    handleAnswer(selectedIdx);
  });
});

/* ==========================================================================
   GAME STATE FLOW CONTROL
   ========================================================================== */

function showScreen(screen) {
  startScreen.classList.remove('active');
  gameScreen.classList.remove('active');
  leaderboardScreen.classList.remove('active');
  screen.classList.add('active');
}

function initGame() {
  gameState.currentLevelIndex = 0;
  gameState.score = 0;
  gameState.streak = 0;
  gameState.hearts = 3;
  gameState.isAnswering = false;

  // Sync HUD
  hudAvatar.textContent = gameState.playerAvatar;
  hudUsername.textContent = gameState.playerName;
  hudRole.textContent = gameState.playerRole;
  updateHud();

  showScreen(gameScreen);
  loadStage();
}

function updateHud() {
  hudStage.textContent = `${gameState.currentLevelIndex + 1} / ${STAGES.length}`;
  hudScore.textContent = gameState.score;
  hudHearts.textContent = "❤️".repeat(Math.max(0, gameState.hearts));
  
  if (gameState.streak >= 2) {
    streakBadge.textContent = `Streak x${(1 + (gameState.streak - 1) * 0.25).toFixed(2)}`;
    streakBadge.classList.remove('hidden');
  } else {
    streakBadge.classList.add('hidden');
  }
}

function loadStage() {
  if (gameState.currentLevelIndex >= STAGES.length) {
    endGame(true);
    return;
  }

  const stage = STAGES[gameState.currentLevelIndex];
  gameState.isAnswering = true;

  // Visual walking sequence
  playerSprite.classList.add('walking');
  playerBubble.textContent = "Walking to task...";
  playerBubble.classList.remove('hidden');
  
  // Animate walking (shifting sprite position slightly to simulate progress)
  const isEven = gameState.currentLevelIndex % 2 === 0;
  playerSprite.style.left = isEven ? '20%' : '10%';
  
  // Hide details while walking
  documentViewer.style.opacity = '0.3';
  choiceButtons.forEach(btn => btn.disabled = true);

  // Play walking ticking sounds
  let walkTicks = 0;
  const walkInterval = setInterval(() => {
    if (walkTicks < 5) {
      playWalkSound();
      walkTicks++;
    } else {
      clearInterval(walkInterval);
    }
  }, 200);

  setTimeout(() => {
    // Arrived at destination
    playerSprite.classList.remove('walking');
    playerBubble.classList.add('hidden');
    documentViewer.style.opacity = '1';
    
    // Set NPC properties
    npcSpriteEmoji.textContent = stage.npcEmoji;
    npcNamePlate.textContent = stage.speaker;
    
    // Set Dialogue
    dialogueSpeaker.textContent = `${stage.speaker}:`;
    dialogueText.textContent = `"${stage.context}"`;
    
    // Set Document Text
    textSampleContent.textContent = stage.sample;
    
    // Setup Answer choices (shuffled or fixed, let's keep consistent layout but load text)
    choiceButtons.forEach((btn, idx) => {
      btn.textContent = stage.choices[idx];
      btn.className = "choice-btn"; // Reset status colors
      btn.disabled = false;
    });

    gameState.isAnswering = false;
    startTimer();
  }, 1200);
}

/* ==========================================================================
   TIMER SYSTEM
   ========================================================================== */
function startTimer() {
  clearInterval(gameState.timerInterval);
  gameState.timeLeft = TIMER_DURATION;
  timerBar.style.width = '100%';
  timerBar.style.backgroundColor = 'var(--color-success)';
  timerSeconds.textContent = `⏳ ${TIMER_DURATION}s`;

  gameState.timerInterval = setInterval(() => {
    gameState.timeLeft -= 0.1;
    const pct = (gameState.timeLeft / TIMER_DURATION) * 100;
    timerBar.style.width = `${pct}%`;

    // Update time balloon text in seconds
    const secondsRounded = Math.ceil(gameState.timeLeft);
    timerSeconds.textContent = `⏳ ${secondsRounded}s`;

    // Visual warning as time ticks down
    if (gameState.timeLeft < 10) {
      timerBar.style.backgroundColor = 'var(--color-warning)';
    }
    if (gameState.timeLeft < 5) {
      timerBar.style.backgroundColor = 'var(--color-error)';
    }

    if (gameState.timeLeft <= 0) {
      clearInterval(gameState.timerInterval);
      timerSeconds.textContent = `⏳ 0s`;
      handleTimeout();
    }
  }, 100);
}

function handleTimeout() {
  if (gameState.isAnswering) return;
  gameState.isAnswering = true;
  
  playErrorSound();
  
  // Apply visual error classes
  const stage = STAGES[gameState.currentLevelIndex];
  choiceButtons.forEach((btn, idx) => {
    if (idx === stage.correct) {
      btn.classList.add('correct');
    }
    btn.disabled = true;
  });

  gameScreen.classList.add('screen-shake');
  setTimeout(() => gameScreen.classList.remove('screen-shake'), 400);

  gameState.streak = 0;
  gameState.hearts--;
  updateHud();

  setTimeout(() => {
    if (gameState.hearts <= 0) {
      endGame(false);
    } else {
      gameState.currentLevelIndex++;
      loadStage();
    }
  }, 2500);
}

/* ==========================================================================
   ANSWER EVALUATION
   ========================================================================== */
function handleAnswer(choiceIdx) {
  clearInterval(gameState.timerInterval);
  gameState.isAnswering = true;

  const stage = STAGES[gameState.currentLevelIndex];
  const isCorrect = choiceIdx === stage.correct;

  choiceButtons.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === stage.correct) {
      btn.classList.add('correct');
    } else if (idx === choiceIdx) {
      btn.classList.add('incorrect');
    }
  });

  if (isCorrect) {
    playSuccessSound();
    
    // Add point and multiplier pop animation
    hudScore.classList.add('score-animate');
    setTimeout(() => hudScore.classList.remove('score-animate'), 500);

    gameState.streak++;
    
    // Scoring engine calculation
    const baseScore = 100;
    const streakMult = 1 + (gameState.streak - 1) * 0.25; // x1.0, x1.25, x1.50...
    const timeBonus = Math.round(gameState.timeLeft * 3); // Max 90 points
    const earned = Math.round(baseScore * streakMult) + timeBonus;
    
    gameState.score += earned;
    updateHud();
  } else {
    playErrorSound();
    
    gameScreen.classList.add('screen-shake');
    setTimeout(() => gameScreen.classList.remove('screen-shake'), 400);

    gameState.streak = 0;
    gameState.hearts--;
    updateHud();
  }

  setTimeout(() => {
    if (gameState.hearts <= 0) {
      endGame(false);
    } else {
      gameState.currentLevelIndex++;
      loadStage();
    }
  }, 2200);
}

/* ==========================================================================
   GAME OVER / LEADERBOARD OPERATIONS
   ========================================================================== */
function endGame(isVictory) {
  clearInterval(gameState.timerInterval);
  
  if (isVictory) {
    playWinSound();
    gameOverTitle.textContent = "🎉 PROMOTED TO CEO!";
    gameOverTitle.classList.remove('lost');
    completionStatus.textContent = "Excellent! You solved all 10 stages correctly.";
    completionStatus.style.color = "var(--color-success)";
  } else {
    playGameOverSound();
    gameOverTitle.textContent = "💀 FIRED! (GAME OVER)";
    gameOverTitle.classList.add('lost');
    completionStatus.textContent = `You got fired at Stage ${gameState.currentLevelIndex + 1}.`;
    completionStatus.style.color = "var(--color-error)";
  }

  finalAvatar.textContent = gameState.playerAvatar;
  finalUsername.textContent = gameState.playerName;
  finalScoreValue.textContent = gameState.score;

  showScreen(leaderboardScreen);

  // Submit Score to Firebase
  submitScore(gameState.playerName, gameState.playerAvatar, gameState.playerRole, gameState.score);
}

async function submitScore(name, avatar, role, rating) {
  // Avoid blank entries or testing visits without starting
  if (!name || name === "Visitor") return;
  
  try {
    const scoresCol = collection(db, 'leaderboard');
    await addDoc(scoresCol, {
      nickname: name,
      avatar: avatar,
      role: role,
      score: rating,
      timestamp: serverTimestamp()
    });
    console.log("Score submitted successfully to Firestore!");
  } catch (error) {
    console.error("Failed to submit score: ", error);
  }
}

// Global leaderboard live sync setup
function setupLeaderboardSync() {
  const scoresCol = collection(db, 'leaderboard');
  const leaderboardQuery = query(
    scoresCol,
    orderBy('score', 'desc'),
    limit(10)
  );

  onSnapshot(leaderboardQuery, (snapshot) => {
    leaderboardTbody.innerHTML = "";
    
    if (snapshot.empty) {
      leaderboardTbody.innerHTML = `<tr><td colspan="4" class="text-center">No ratings yet. Be the first CEO!</td></tr>`;
      return;
    }

    let rank = 1;
    snapshot.forEach(doc => {
      const data = doc.data();
      const tr = document.createElement('tr');
      
      const rankCell = document.createElement('td');
      rankCell.textContent = `#${rank}`;
      if (rank === 1) rankCell.innerHTML = "🏆 1";
      if (rank === 2) rankCell.innerHTML = "🥈 2";
      if (rank === 3) rankCell.innerHTML = "🥉 3";
      
      const nameCell = document.createElement('td');
      nameCell.innerHTML = `<span style="font-size: 1.25rem; margin-right: 6px;">${data.avatar || '🧑‍💻'}</span> ${data.nickname || 'Anonymous'}`;
      
      const deptCell = document.createElement('td');
      deptCell.textContent = data.role || 'Corporate';
      
      const ratingCell = document.createElement('td');
      ratingCell.style.fontWeight = '700';
      ratingCell.textContent = data.score !== undefined ? data.score.toLocaleString() : '0';
      
      tr.appendChild(rankCell);
      tr.appendChild(nameCell);
      tr.appendChild(deptCell);
      tr.appendChild(ratingCell);
      
      leaderboardTbody.appendChild(tr);
      rank++;
    });
  }, (error) => {
    console.error("Leaderboard loading failed: ", error);
    leaderboardTbody.innerHTML = `<tr><td colspan="4" class="text-center" style="color: var(--color-error);">Error loading records.</td></tr>`;
  });
}

// Initialize Leaderboard query on boot
setupLeaderboardSync();
