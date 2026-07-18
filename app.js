import { soundManager } from './sound.js';

// SVGs for game items
const DIAMOND_SVG = `
<svg viewBox="0 0 24 24" fill="rgba(46, 204, 113, 0.2)" stroke="#2ecc71" stroke-width="1.8" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <polygon points="6 3 18 3 22 9 12 21 2 9 6 3"></polygon>
  <polyline points="2 9 22 9"></polyline>
  <polyline points="12 21 6 3"></polyline>
  <polyline points="12 21 18 3"></polyline>
  <polyline points="6 9 12 21 18 9"></polyline>
  <circle cx="12" cy="9" r="1.5" fill="#2ecc71" opacity="0.8"></circle>
</svg>`;

const BOMB_SVG = `
<svg viewBox="0 0 24 24" fill="rgba(231, 76, 60, 0.2)" stroke="#e74c3c" stroke-width="1.8" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
  <circle cx="11" cy="14" r="7"></circle>
  <path d="M15 7.5l2-2" stroke-linecap="round"></path>
  <path d="M14.5 9.5c0.5-0.5 1-1 1-1.5" stroke-linecap="round"></path>
  <rect x="9.5" y="6" width="3" height="1.5" rx="0.5" fill="#e74c3c"></rect>
  <!-- Sparkling Fuse -->
  <path d="M18 4.5c0.5-0.5 0.5-1 0-1.5s-1-0.5-1.5 0" stroke="#f1c40f" stroke-width="1.5" stroke-linecap="round"></path>
  <line x1="17.5" y1="3" x2="16.5" y2="2" stroke="#f1c40f" stroke-width="1.5" stroke-linecap="round"></line>
  <line x1="19" y1="4" x2="20" y2="4.5" stroke="#f1c40f" stroke-width="1.5" stroke-linecap="round"></line>
  <circle cx="18" cy="3" r="1" fill="#f1c40f"></circle>
</svg>`;

// Game State variables
let balance = 100.00;
let currentWager = 10.00;
let crateCount = 10;
let bombIndex = -1;
let revealedCrates = new Set(); // Stores indices of clicked crates
let gameStatus = 'IDLE'; // 'IDLE', 'PLAYING', 'LOST', 'WON'
let multipliersData = { B: 3, J: 20.0, list: [] };

// Transition state to prevent click overlapping during zoom animations
let isTransitioning = false;

// Mouse Drag State
let isMouseDown = false;

// Leaderboard storage
let leaderboard = [];

// DOM Elements
let elBalance, elWagerInput, elCrateSlider, elCrateSliderVal, elCrateGrid;
let elStartBtn, elCashoutBtn, elActiveBetDisplay, elCurrentWinDisplay;
let elNetProfitDisplay, elBreakEvenDisplay, elMultipliersList;
let elLeaderboardList, elMuteBtn, elInfoBannerText;

// Modals
let elLostScreen, elCashoutScreen, elJackpotScreen, elRestartScreen;
let elLostWinnings, elLostWager, elLostCrates, elLostMult;
let elCashWinnings, elCashWager, elCashCrates, elCashMult;
let elJpWinnings, elJpWager, elJpCrates, elJpMult;

// Initialize configurations for each crate counts (6 to 16)
function getGameConfig(N) {
  const configs = {
    6:  { B: 2, J: 8.0 },
    7:  { B: 2, J: 10.0 },
    8:  { B: 2, J: 12.0 },
    9:  { B: 3, J: 16.0 },
    10: { B: 3, J: 20.0 },
    11: { B: 3, J: 25.0 },
    12: { B: 4, J: 35.0 },
    13: { B: 4, J: 45.0 },
    14: { B: 5, J: 60.0 },
    15: { B: 5, J: 80.0 },
    16: { B: 6, J: 120.0 }
  };
  return configs[N] || { B: 3, J: 20.0 };
}

// Generate multipliers list for active layout
function generateMultipliers(N) {
  const config = getGameConfig(N);
  const B = config.B;
  const J = config.J;
  const list = [];
  
  for (let k = 1; k < N; k++) {
    let m = 0.0;
    if (k < B) {
      // Linear spacing below 1.0
      if (B === 2) {
        m = 0.85; // For 6, 7, 8 crates, break-even is 2. 1st step is 0.85x.
      } else {
        // Linearly space from 0.50 up to 0.90
        m = 0.50 + (0.40 * (k - 1) / (B - 2));
      }
    } else if (k === B) {
      m = 1.05; // Break even step yields +5% net profit
    } else if (k === N - 1) {
      m = J; // Jackpot step
    } else {
      // Exponential/convex growth interpolation
      const progress = (k - B) / (N - 1 - B);
      m = 1.05 + (J - 1.05) * Math.pow(progress, 1.8);
    }
    list.push(parseFloat(m.toFixed(2)));
  }
  return { B, J, list };
}

// Get columns based on N
function getGridColumns(N) {
  const cols = {
    6: 3, 7: 4, 8: 4, 9: 3, 10: 5, 11: 4, 12: 4, 13: 5, 14: 5, 15: 5, 16: 4
  };
  return cols[N] || 4;
}

// App startup initialization
window.addEventListener('DOMContentLoaded', () => {
  cacheDOM();
  loadLeaderboard();
  updateMultipliersData();
  setupEventListeners();
  renderLeaderboard();
  resetBoard();
});

// Cache elements
function cacheDOM() {
  elBalance = document.getElementById('balance-display');
  elWagerInput = document.getElementById('wager-amount');
  elCrateSlider = document.getElementById('crate-slider');
  elCrateSliderVal = document.getElementById('crate-count-val');
  elCrateGrid = document.getElementById('crate-grid');
  
  elStartBtn = document.getElementById('btn-start');
  elCashoutBtn = document.getElementById('btn-cashout');
  
  elActiveBetDisplay = document.getElementById('active-bet-display');
  elCurrentWinDisplay = document.getElementById('current-win-display');
  elNetProfitDisplay = document.getElementById('net-profit-display');
  elBreakEvenDisplay = document.getElementById('break-even-display');
  
  elMultipliersList = document.getElementById('multipliers-list');
  elLeaderboardList = document.getElementById('leaderboard-list');
  elMuteBtn = document.getElementById('btn-mute');
  elInfoBannerText = document.getElementById('info-banner-text');

  // Modals
  elLostScreen = document.getElementById('lost-screen');
  elLostWinnings = document.getElementById('lost-winnings');
  elLostWager = document.getElementById('lost-wager');
  elLostCrates = document.getElementById('lost-crates');
  elLostMult = document.getElementById('lost-mult');

  elCashoutScreen = document.getElementById('cashout-screen');
  elCashWinnings = document.getElementById('cash-winnings');
  elCashWager = document.getElementById('cash-wager');
  elCashCrates = document.getElementById('cash-crates');
  elCashMult = document.getElementById('cash-mult');

  elJackpotScreen = document.getElementById('jackpot-screen');
  elJpWinnings = document.getElementById('jp-winnings');
  elJpWager = document.getElementById('jp-wager');
  elJpCrates = document.getElementById('jp-crates');
  elJpMult = document.getElementById('jp-mult');

  elRestartScreen = document.getElementById('restart-screen');
}

// Setup events
function setupEventListeners() {
  // Global mouse handlers for drag-to-select detection
  document.addEventListener('mousedown', () => {
    isMouseDown = true;
  });
  document.addEventListener('mouseup', () => {
    isMouseDown = false;
  });

  // Touch handlers for drag-to-select support on mobile
  elCrateGrid.addEventListener('touchmove', (e) => {
    if (gameStatus !== 'PLAYING' || isTransitioning) return;
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (el && el.classList.contains('crate') && !el.classList.contains('revealed') && !el.classList.contains('disabled')) {
      const mockEvent = { currentTarget: el };
      handleCrateClick(mockEvent);
    }
  });

  // Slider input
  elCrateSlider.addEventListener('input', (e) => {
    if (gameStatus === 'PLAYING') return;
    crateCount = parseInt(e.target.value);
    elCrateSliderVal.textContent = crateCount;
    updateMultipliersData();
    resetBoard();
  });

  // Wager validation on input blur
  elWagerInput.addEventListener('blur', () => {
    let val = parseFloat(elWagerInput.value);
    if (isNaN(val) || val < 1.0) val = 1.0;
    if (val > balance) val = balance;
    elWagerInput.value = val.toFixed(2);
    currentWager = val;
  });

  // Start round
  elStartBtn.addEventListener('click', startRound);

  // Cash out
  elCashoutBtn.addEventListener('click', cashOut);

  // Mute button
  elMuteBtn.addEventListener('click', () => {
    const isMuted = soundManager.toggleMute();
    elMuteBtn.innerHTML = isMuted 
      ? `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"></path></svg>`
      : `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 010 7.07M19.07 4.93a10 10 0 010 14.14"></path></svg>`;
    soundManager.playClick();
  });

  // Setup quick bets
  document.querySelectorAll('.btn-short').forEach(btn => {
    btn.addEventListener('click', (e) => {
      if (gameStatus === 'PLAYING') return;
      soundManager.playClick();
      const action = e.target.dataset.action;
      let val = parseFloat(elWagerInput.value) || 1.0;
      
      switch (action) {
        case 'min': val = 1.0; break;
        case 'max': val = balance; break;
        case 'half': val = Math.max(1.0, val / 2); break;
        case 'double': val = Math.min(balance, val * 2); break;
        case 'add1': val = Math.min(balance, val + 1); break;
        case 'add5': val = Math.min(balance, val + 5); break;
        case 'add10': val = Math.min(balance, val + 10); break;
        case 'add25': val = Math.min(balance, val + 25); break;
      }
      
      elWagerInput.value = val.toFixed(2);
      currentWager = val;
    });
  });

  // Modals Close button hooks
  document.querySelectorAll('.btn-overlay-close').forEach(btn => {
    btn.addEventListener('click', (e) => {
      soundManager.playClick();
      const screenId = e.target.closest('.overlay-screen').id;
      document.getElementById(screenId).classList.remove('active');
      
      if (screenId === 'restart-screen') {
        balance = 100.00;
        updateHUD();
        resetBoard();
      } else {
        resetBoard();
      }
    });
  });
}

// Update local config
function updateMultipliersData() {
  multipliersData = generateMultipliers(crateCount);
  renderMultipliersPanel();
  
  // Show break even info text
  elBreakEvenDisplay.innerHTML = `Open <span>${multipliersData.B} crates</span> to break even & profit!`;
}

// Render active multiplier panel list
function renderMultipliersPanel() {
  elMultipliersList.innerHTML = '';
  // Render backward, so highest yields are at the top
  for (let i = multipliersData.list.length - 1; i >= 0; i--) {
    const k = i + 1;
    const m = multipliersData.list[i];
    
    const row = document.createElement('div');
    row.className = 'multiplier-row';
    row.id = `mult-row-${k}`;
    
    if (k === multipliersData.B) {
      row.classList.add('break-even');
    }
    if (k === crateCount - 1) {
      row.classList.add('jackpot');
    }
    
    let tag = '';
    if (k === multipliersData.B) tag = `<span class="tag-be">Break-Even</span>`;
    if (k === crateCount - 1) tag = `<span class="tag-jp">JACKPOT</span>`;
    
    row.innerHTML = `
      <div class="mult-crates">
        <span>${k} Crates</span>
        ${tag}
      </div>
      <div class="mult-val">${m}x</div>
    `;
    elMultipliersList.appendChild(row);
  }
}

// Create clean Board
function resetBoard() {
  gameStatus = 'IDLE';
  revealedCrates.clear();
  bombIndex = -1;
  isTransitioning = false;
  isMouseDown = false;
  
  elCrateGrid.innerHTML = '';
  const cols = getGridColumns(crateCount);
  elCrateGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  for (let i = 0; i < crateCount; i++) {
    const crate = document.createElement('div');
    crate.className = 'crate';
    crate.dataset.index = i;
    
    // Drag-to-select bindings
    crate.addEventListener('mousedown', (e) => {
      isMouseDown = true;
      handleCrateClick(e);
    });
    crate.addEventListener('mouseenter', (e) => {
      if (isMouseDown) {
        handleCrateClick(e);
      }
    });
    
    elCrateGrid.appendChild(crate);
  }
  
  elStartBtn.disabled = false;
  elCashoutBtn.disabled = true;
  elWagerInput.disabled = false;
  elCrateSlider.disabled = false;
  
  // Quick wager buttons
  document.querySelectorAll('.btn-short').forEach(b => b.disabled = false);

  updateHUD();
}

// Update numerical scoring values in HUD
function updateHUD() {
  elBalance.textContent = `$${balance.toFixed(2)}`;
  
  if (gameStatus === 'PLAYING') {
    elActiveBetDisplay.textContent = `$${currentWager.toFixed(2)}`;
    
    const k = revealedCrates.size;
    if (k > 0) {
      const m = multipliersData.list[k - 1];
      const win = currentWager * m;
      const profit = win - currentWager;
      
      elCurrentWinDisplay.textContent = `$${win.toFixed(2)}`;
      
      if (profit >= 0) {
        elNetProfitDisplay.textContent = `+$${profit.toFixed(2)}`;
        elNetProfitDisplay.className = 'hud-value green';
      } else {
        elNetProfitDisplay.textContent = `-$${Math.abs(profit).toFixed(2)}`;
        elNetProfitDisplay.className = 'hud-value red';
      }
    } else {
      elCurrentWinDisplay.textContent = '$0.00';
      elNetProfitDisplay.textContent = '$0.00';
      elNetProfitDisplay.className = 'hud-value';
    }
  } else {
    elActiveBetDisplay.textContent = '$0.00';
    elCurrentWinDisplay.textContent = '$0.00';
    elNetProfitDisplay.textContent = '$0.00';
    elNetProfitDisplay.className = 'hud-value';
  }
  
  // Toggle colors based on balance state
  if (balance <= 0) {
    elBalance.className = 'hud-value red';
  } else {
    elBalance.className = 'hud-value balance-display';
  }
}

// Start Game round
function startRound() {
  let val = parseFloat(elWagerInput.value);
  if (isNaN(val) || val < 1.0) {
    alert("Wager must be at least $1.00");
    return;
  }
  if (val > balance) {
    alert("Wager exceeds balance!");
    return;
  }
  
  soundManager.playClick();
  
  balance -= val;
  currentWager = val;
  gameStatus = 'PLAYING';
  isTransitioning = false;
  
  // Generate random bomb placement
  bombIndex = Math.floor(Math.random() * crateCount);
  
  elStartBtn.disabled = true;
  elWagerInput.disabled = true;
  elCrateSlider.disabled = true;
  
  // Disable quick wagers
  document.querySelectorAll('.btn-short').forEach(b => b.disabled = true);

  updateHUD();
  elInfoBannerText.innerHTML = `Round active! Pick a crate to begin. Avoid the single bomb.`;
}

// Handle Crate clicks
function handleCrateClick(e) {
  if (gameStatus !== 'PLAYING') return;
  if (isTransitioning) return;
  
  const crateEl = e.currentTarget;
  const idx = parseInt(crateEl.dataset.index);
  
  if (revealedCrates.has(idx) || crateEl.classList.contains('disabled')) return;
  
  const rect = crateEl.getBoundingClientRect();
  
  // Determine if it was the bomb or a safe box
  if (idx === bombIndex) {
    // 1. Bomb Clicked - Lock grid and show full-screen zoom animation
    isTransitioning = true;
    toggleGridInteractivity(false);
    
    soundManager.playExplosion();
    document.body.classList.add('screen-shake');
    
    // Zoom Animation
    const wrapper = document.getElementById('anim-item-wrapper');
    wrapper.innerHTML = BOMB_SVG;
    
    // Set animations start/end vectors (starts and ends on selected crate)
    wrapper.style.setProperty('--start-x', `${rect.left}px`);
    wrapper.style.setProperty('--start-y', `${rect.top}px`);
    wrapper.style.setProperty('--start-w', `${rect.width}px`);
    wrapper.style.setProperty('--start-h', `${rect.height}px`);
    wrapper.style.setProperty('--end-x', `${rect.left}px`);
    wrapper.style.setProperty('--end-y', `${rect.top}px`);
    wrapper.style.setProperty('--end-w', `${rect.width}px`);
    wrapper.style.setProperty('--end-h', `${rect.height}px`);
    
    wrapper.className = 'zoom-bomb-anim';
    
    wrapper.addEventListener('animationend', () => {
      wrapper.className = '';
      wrapper.innerHTML = '';
      document.body.classList.remove('screen-shake');
      
      crateEl.classList.add('revealed', 'revealed-bomb');
      crateEl.innerHTML = `<div class="crate-inner-item bomb">${BOMB_SVG}</div>`;
      
      gameStatus = 'LOST';
      revealRemainingBoard();
      
      // Update sidebar
      updateHUD();
      
      // Trigger modal after slight delay
      setTimeout(() => {
        isTransitioning = false;
        showLostScreen();
      }, 600);
    }, { once: true });
    
  } else {
    // 2. Safe Crate Opened - Instant Local Reveal
    soundManager.playOpenSafe();
    revealedCrates.add(idx);
    
    // Highlight sidebar row
    const k = revealedCrates.size;
    highlightSidebarMultiplier(k);
    
    // Reveal diamond immediately in crate with local pop animation
    crateEl.classList.add('revealed', 'revealed-safe');
    crateEl.innerHTML = `<div class="crate-inner-item diamond">${DIAMOND_SVG}</div>`;
    
    spawnFloatingDollar(rect.left + rect.width / 2, rect.top);
    
    // Update HUD
    updateHUD();
    
    // Enable cash out since safe crate is opened
    elCashoutBtn.disabled = false;
    
    // Check if jackpot reached
    if (revealedCrates.size === crateCount - 1) {
      triggerJackpot();
    } else {
      const m = multipliersData.list[revealedCrates.size - 1];
      if (revealedCrates.size < multipliersData.B) {
        elInfoBannerText.innerHTML = `Opened ${revealedCrates.size}/${crateCount}. Current yield: ${m}x (Need ${multipliersData.B} to profit!)`;
      } else {
        elInfoBannerText.innerHTML = `Opened ${revealedCrates.size}/${crateCount}. Current yield: ${m}x (PROFIT ZONE!)`;
      }
    }
  }
}

// Disable/Enable clicking board
function toggleGridInteractivity(enable) {
  const crates = document.querySelectorAll('.crate');
  crates.forEach(c => {
    if (enable) {
      c.classList.remove('disabled');
    } else {
      c.classList.add('disabled');
    }
  });
}

// Highlight the current step in the sidebar
function highlightSidebarMultiplier(step) {
  document.querySelectorAll('.multiplier-row').forEach(row => {
    row.classList.remove('active');
  });
  const activeRow = document.getElementById(`mult-row-${step}`);
  if (activeRow) {
    activeRow.classList.add('active');
  }
}

// Reveal all other cards on round finish (including bomb location!)
function revealRemainingBoard() {
  toggleGridInteractivity(false);
  const crates = document.querySelectorAll('.crate');
  crates.forEach(c => {
    const idx = parseInt(c.dataset.index);
    if (revealedCrates.has(idx)) return; // already solved
    
    if (idx === bombIndex) {
      // Highlight unclicked bomb
      c.classList.add('revealed', 'revealed-unclicked-bomb');
      c.innerHTML = `<div class="crate-inner-item bomb">${BOMB_SVG}</div>`;
    } else {
      // Dimmed diamond showing what could have been
      c.classList.add('revealed');
      c.innerHTML = `<div class="crate-inner-item diamond" style="opacity: 0.35">${DIAMOND_SVG}</div>`;
    }
  });
}

// Cash Out Action
function cashOut() {
  if (gameStatus !== 'PLAYING' || revealedCrates.size === 0) return;
  
  soundManager.playCashOut();
  gameStatus = 'WON';
  
  const k = revealedCrates.size;
  const m = multipliersData.list[k - 1];
  const winnings = currentWager * m;
  const profit = winnings - currentWager;
  
  balance += winnings;
  
  // Log High Score
  addHighScore(currentWager, m, profit);
  
  revealRemainingBoard();
  updateHUD();
  
  // Show screen
  showCashoutScreen(winnings, currentWager, k, m);
}

// Trigger Jackpot (all safe crates solved)
function triggerJackpot() {
  soundManager.playJackpotWin();
  gameStatus = 'WON';
  
  const k = crateCount - 1;
  const m = multipliersData.J;
  const winnings = currentWager * m;
  const profit = winnings - currentWager;
  
  balance += winnings;
  
  // Add to Highscores
  addHighScore(currentWager, m, profit);
  
  // Reveal bomb
  revealRemainingBoard();
  updateHUD();
  
  // Spawn Confetti
  triggerConfettiRain();
  
  // Display Screen
  showJackpotScreen(winnings, currentWager, k, m);
}

// Show Modals
function showLostScreen() {
  elLostWinnings.textContent = '$0.00';
  elLostWager.textContent = `$${currentWager.toFixed(2)}`;
  elLostCrates.textContent = `${revealedCrates.size} crates`;
  
  const m = revealedCrates.size > 0 ? multipliersData.list[revealedCrates.size - 1] : 0.0;
  elLostMult.textContent = `${m.toFixed(2)}x`;
  
  elLostScreen.classList.add('active');
  
  // Check if player is bankrupt
  if (balance <= 0.01) {
    setTimeout(() => {
      elLostScreen.classList.remove('active');
      showRestartScreen();
    }, 1500);
  }
}

function showCashoutScreen(winnings, wager, crates, mult) {
  elCashWinnings.textContent = `$${winnings.toFixed(2)}`;
  elCashWager.textContent = `$${wager.toFixed(2)}`;
  elCashCrates.textContent = `${crates}/${crateCount} crates`;
  elCashMult.textContent = `${mult.toFixed(2)}x`;
  
  elCashoutScreen.classList.add('active');
}

function showJackpotScreen(winnings, wager, crates, mult) {
  elJpWinnings.textContent = `$${winnings.toFixed(2)}`;
  elJpWager.textContent = `$${wager.toFixed(2)}`;
  elJpCrates.textContent = `${crates}/${crateCount} crates`;
  elJpMult.textContent = `${mult.toFixed(2)}x`;
  
  elJackpotScreen.classList.add('active');
}

function showRestartScreen() {
  elRestartScreen.classList.add('active');
}

// Create dollar particle floating upward
function spawnFloatingDollar(x, y) {
  const p = document.createElement('div');
  p.className = 'floating-dollar';
  p.textContent = '+$';
  p.style.left = `${x}px`;
  p.style.top = `${y}px`;
  document.body.appendChild(p);
  
  setTimeout(() => p.remove(), 1200);
}

// Confetti generator for jackpot screen
function triggerConfettiRain() {
  const colors = ['#f1c40f', '#e67e22', '#2ecc71', '#3498db', '#9b59b6', '#e74c3c'];
  for (let i = 0; i < 120; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'particle';
      p.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      p.style.width = `${Math.random() * 8 + 6}px`;
      p.style.height = `${Math.random() * 12 + 6}px`;
      p.style.left = `${Math.random() * 100}vw`;
      p.style.top = `-20px`;
      
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 4;
      let posY = -20;
      let posX = parseFloat(p.style.left);
      
      document.body.appendChild(p);
      
      const interval = setInterval(() => {
        posY += speed;
        posX += Math.sin(posY / 30) * 2;
        p.style.top = `${posY}px`;
        p.style.left = `${posX}px`;
        p.style.transform = `rotate(${posY * 2}deg)`;
        
        if (posY > window.innerHeight + 20) {
          clearInterval(interval);
          p.remove();
        }
      }, 16);
    }, i * 35);
  }
}

// Local Storage high score management
function loadLeaderboard() {
  try {
    const raw = localStorage.getItem('hiddenCratesLeaderboard');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        leaderboard = parsed;
      } else {
        leaderboard = [];
      }
    }
  } catch (e) {
    console.error("Failed to load leaderboard from storage", e);
    leaderboard = [];
  }
}

function saveLeaderboard() {
  try {
    localStorage.setItem('hiddenCratesLeaderboard', JSON.stringify(leaderboard));
  } catch (e) {
    console.error("Failed to save leaderboard to storage", e);
  }
}

function addHighScore(wager, mult, profit) {
  // Only register scores with positive profit
  if (profit <= 0) return;
  
  const score = {
    wager,
    mult,
    profit,
    date: new Date().toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })
  };
  
  leaderboard.push(score);
  // Sort descending by profit
  leaderboard.sort((a, b) => b.profit - a.profit);
  // Slice top 3
  leaderboard = leaderboard.slice(0, 3);
  
  saveLeaderboard();
  renderLeaderboard();
}

function renderLeaderboard() {
  elLeaderboardList.innerHTML = '';
  
  // Calculate Peak Multiplier stat of the 3 leaderboard runs
  const elPeakVal = document.getElementById('leaderboard-peak-val');
  const peak = leaderboard.length > 0 ? Math.max(...leaderboard.map(s => s.mult)) : 0.0;
  if (elPeakVal) {
    elPeakVal.textContent = peak > 0 ? `${peak.toFixed(2)}x` : '0.00x';
  }
  
  if (leaderboard.length === 0) {
    elLeaderboardList.innerHTML = `<div class="leaderboard-empty">No high scores registered yet. Double down and cash out!</div>`;
    return;
  }
  
  leaderboard.forEach((score, index) => {
    const row = document.createElement('div');
    row.className = `leaderboard-row rank-${index + 1}`;
    row.innerHTML = `
      <div class="leaderboard-rank">#${index + 1}</div>
      <div class="leaderboard-date">${score.date}</div>
      <div class="leaderboard-profit">+$${score.profit.toFixed(2)}</div>
    `;
    elLeaderboardList.appendChild(row);
  });
}
