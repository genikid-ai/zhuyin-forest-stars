(function () {
  "use strict";

  /* ==================== 1. 注音題庫資料 ==================== */
  const ZHUYIN_UPPER = [
    "ㄅ", "ㄆ", "ㄇ", "ㄈ",
    "ㄉ", "ㄊ", "ㄋ", "ㄌ",
    "ㄍ", "ㄎ", "ㄏ",
    "ㄐ", "ㄑ", "ㄒ",
    "ㄓ", "ㄔ", "ㄕ", "ㄖ"
  ]; // 中上：18 個

  const ZHUYIN_LOWER = [
    "ㄗ", "ㄘ", "ㄙ",
    "ㄧ", "ㄨ", "ㄩ",
    "ㄚ", "ㄛ", "ㄜ", "ㄝ",
    "ㄞ", "ㄟ", "ㄠ", "ㄡ",
    "ㄢ", "ㄣ", "ㄤ", "ㄥ", "ㄦ"
  ]; // 中下：19 個

  const ZHUYIN_ALL = [...ZHUYIN_UPPER, ...ZHUYIN_LOWER]; // 全部：37 個

  const SCOPE_CONFIG = {
    upper: { label: "中上 ㄅ～ㄖ", symbols: ZHUYIN_UPPER },
    lower: { label: "中下 ㄗ～ㄦ", symbols: ZHUYIN_LOWER },
    all:   { label: "全部 ㄅ～ㄦ", symbols: ZHUYIN_ALL }
  };

  const CHEER_PHRASES_LEFT = ["好棒喔！⭐", "太厲害了！✨", "唸得好清楚！🌟", "給你一顆星！💛"];
  const CHEER_PHRASES_RIGHT = ["耶！答對了！🎉", "超級棒！⭐", "拍拍手！👏", "森林之星！🌟"];
  const ENCOURAGE_PHRASES = ["換一題挑戰！💛", "試試看這個！✨", "沒關係，加油！🌿"];

  /* ==================== 2. 溫暖繪本風森林動物插畫 ==================== */
  const ANIMAL_ASSETS = {
    bear:  { src: "assets/animal-bear.png",  alt: "繪本小熊" },
    bunny: { src: "assets/animal-bunny.png", alt: "繪本小兔" },
    fox:   { src: "assets/animal-fox.png",   alt: "繪本小狐狸" },
    owl:   { src: "assets/animal-owl.png",   alt: "繪本小貓頭鷹" }
  };

  function renderAnimalMarkup(key) {
    const info = ANIMAL_ASSETS[key];
    return `<img class="animal-img" src="${info.src}" alt="${info.alt}" draggable="false" />`;
  }

  // 預先載入四隻繪本動物，切換與過關零延遲
  Object.values(ANIMAL_ASSETS).forEach((item) => {
    const img = new Image();
    img.src = item.src;
  });

  const ANIMAL_PAIRS = [
    ["bear", "bunny"],
    ["fox", "owl"],
    ["bunny", "fox"],
    ["owl", "bear"]
  ];

  /* ==================== 3. 純合成童趣音效（無注音語音） ==================== */
  const SoundFX = {
    ctx: null,
    enabled: true,

    ensureContext() {
      if (!this.enabled) return null;
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        this.ctx = new AudioCtx();
      }
      if (this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    },

    playTone(freq, startTime, duration, type = "sine", peakGain = 0.16) {
      const ctx = this.ctx;
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(peakGain, startTime + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + duration + 0.02);
    },

    playClick() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      this.playTone(540, t, 0.075, "triangle", 0.12);
    },

    playStar() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      // 輕快木琴摘星四連音 C5 - E5 - G5 - C6
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((n, i) => {
        this.playTone(n, t + i * 0.068, 0.28, "triangle", 0.16);
        this.playTone(n * 2, t + i * 0.068, 0.18, "sine", 0.05);
      });
    },

    playRetry() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      // 溫和鼓勵的雙音木琴（完全不刺耳）
      this.playTone(392.0, t, 0.14, "sine", 0.11);
      this.playTone(440.0, t + 0.1, 0.18, "sine", 0.11);
    },

    playVictory() {
      const ctx = this.ensureContext();
      if (!ctx) return;
      const t = ctx.currentTime;
      const melody = [
        { f: 523.25, d: 0.16, at: 0.0 },
        { f: 659.25, d: 0.16, at: 0.12 },
        { f: 783.99, d: 0.18, at: 0.24 },
        { f: 1046.5, d: 0.45, at: 0.38 },
        { f: 783.99, d: 0.16, at: 0.56 },
        { f: 1046.5, d: 0.65, at: 0.7 }
      ];
      melody.forEach((m) => {
        this.playTone(m.f, t + m.at, m.d, "triangle", 0.16);
        this.playTone(m.f * 1.5, t + m.at, m.d * 0.7, "sine", 0.045);
      });
    }
  };

  /* ==================== 4. 遊戲狀態 ==================== */
  const state = {
    scope: "upper",        // upper | lower | all
    countMode: "5",        // "5" | "10" | "all"
    order: "random",       // random | sequential
    fontMode: "sans",      // sans | kai
    pairIndex: 0,
    sequentialOffset: { upper: 0, lower: 0, all: 0 },

    screen: "home",        // home | game | victory
    queue: [],             // 本回合尚未完成的注音佇列
    reservePool: [],       // 同範圍內尚未抽出的替補注音池（換題用）
    totalTarget: 5,
    earnedStars: 0,
    completedSymbols: [],  // 本輪依序唸對的注音
    skippedSymbols: new Set(), // 本輪換掉的注音（不重複出現）
    isAnimating: false,
    currentScale: 1
  };

  /* ==================== 5. DOM 參照 ==================== */
  const el = {
    stage: document.getElementById("stage"),
    fxLayer: document.getElementById("fx-layer"),
    confettiCanvas: document.getElementById("confetti-canvas"),

    screenHome: document.getElementById("screen-home"),
    screenGame: document.getElementById("screen-game"),
    screenVictory: document.getElementById("screen-victory"),

    scopeCards: document.querySelectorAll(".scope-card"),
    countBtns: document.querySelectorAll("#count-options .pill-btn"),
    btnCountAll: document.getElementById("btn-count-all"),
    orderBtns: document.querySelectorAll("#order-options .pill-btn"),
    btnStart: document.getElementById("btn-start"),

    btnBackHome: document.getElementById("btn-back-home"),
    gameScopeBadge: document.getElementById("game-scope-badge"),
    starProgressWrap: document.getElementById("star-progress-wrap"),
    progressPill: document.getElementById("progress-pill"),

    animalLeft: document.getElementById("animal-left"),
    animalRight: document.getElementById("animal-right"),
    animalLeftSvg: document.getElementById("animal-left-svg"),
    animalRightSvg: document.getElementById("animal-right-svg"),
    bubbleLeft: document.getElementById("bubble-left"),
    bubbleRight: document.getElementById("bubble-right"),

    zhuyinCard: document.getElementById("zhuyin-card"),
    zhuyinSymbol: document.getElementById("zhuyin-symbol"),
    cardHintToast: document.getElementById("card-hint-toast"),

    btnRetry: document.getElementById("btn-retry"),
    btnCorrect: document.getElementById("btn-correct"),

    victoryTitle: document.getElementById("victory-title"),
    victorySubtitle: document.getElementById("victory-subtitle"),
    victoryAnimals: document.getElementById("victory-animals"),
    reviewChips: document.getElementById("review-chips"),
    btnPlayAgain: document.getElementById("btn-play-again"),
    btnVictoryHome: document.getElementById("btn-victory-home"),

    modalConfirm: document.getElementById("modal-confirm"),
    btnModalCancel: document.getElementById("btn-modal-cancel"),
    btnModalOk: document.getElementById("btn-modal-ok"),

    soundBtns: document.querySelectorAll(".sound-toggle-btn"),
    fullscreenBtns: document.querySelectorAll(".fullscreen-btn"),
    btnFontHome: document.getElementById("btn-font-home"),
    btnFontGame: document.getElementById("btn-font-game")
  };

  /* ==================== 6. 16:9 等比縮放引擎 ==================== */
  function updateStageScale() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const scale = Math.min(vw / 1280, vh / 720);
    state.currentScale = scale;
    el.stage.style.transform = `scale(${scale})`;

    // 若螢幕比例非常接近 16:9（如 65 吋白板），貼齊滿版去圓角
    const ratio = vw / vh;
    const isExact169 = Math.abs(ratio - 16 / 9) < 0.04;
    el.stage.classList.toggle("is-exact-fit", isExact169);
  }

  window.addEventListener("resize", updateStageScale);
  window.addEventListener("orientationchange", () => setTimeout(updateStageScale, 120));
  document.addEventListener("fullscreenchange", () => setTimeout(updateStageScale, 80));

  /* ==================== 7. 介面切換與工具列 ==================== */
  function showScreen(name) {
    state.screen = name;
    el.screenHome.classList.toggle("active", name === "home");
    el.screenGame.classList.toggle("active", name === "game");
    el.screenVictory.classList.toggle("active", name === "victory");

    if (name !== "victory") {
      stopConfetti();
    }
  }

  function toggleSound() {
    SoundFX.enabled = !SoundFX.enabled;
    if (SoundFX.enabled) {
      SoundFX.playClick();
    }
    el.soundBtns.forEach((btn) => {
      btn.classList.toggle("is-muted", !SoundFX.enabled);
      const icon = btn.querySelector(".sound-icon");
      const label = btn.querySelector(".sound-label");
      if (icon) icon.textContent = SoundFX.enabled ? "🔊" : "🔇";
      if (label) label.textContent = SoundFX.enabled ? "音效開" : "已靜音";
    });
  }

  function toggleFont() {
    SoundFX.playClick();
    state.fontMode = state.fontMode === "sans" ? "kai" : "sans";
    document.body.classList.toggle("font-kai", state.fontMode === "kai");
    document.body.classList.toggle("font-sans", state.fontMode === "sans");

    const longLabel = el.btnFontHome.querySelector(".font-toggle-label");
    const shortLabel = el.btnFontGame.querySelector(".font-toggle-short");
    if (longLabel) longLabel.textContent = state.fontMode === "kai" ? "標楷體" : "黑體";
    if (shortLabel) shortLabel.textContent = state.fontMode === "kai" ? "楷" : "黑";
  }

  function toggleFullscreen() {
    SoundFX.playClick();
    const docEl = document.documentElement;
    if (!document.fullscreenElement) {
      if (docEl.requestFullscreen) {
        docEl.requestFullscreen().catch(() => {});
      } else if (docEl.webkitRequestFullscreen) {
        docEl.webkitRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }
  }

  /* ==================== 8. 首頁設定互動 ==================== */
  function updateCountAllLabel() {
    const total = SCOPE_CONFIG[state.scope].symbols.length;
    el.btnCountAll.textContent = `全部（${total} 題）`;
  }

  el.scopeCards.forEach((card) => {
    card.addEventListener("click", () => {
      SoundFX.playClick();
      state.scope = card.dataset.scope;
      state.sequentialOffset[state.scope] = 0;
      el.scopeCards.forEach((c) => {
        const isSelected = c === card;
        c.classList.toggle("selected", isSelected);
        c.setAttribute("aria-checked", String(isSelected));
      });
      updateCountAllLabel();
    });
  });

  el.countBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      SoundFX.playClick();
      state.countMode = btn.dataset.count;
      el.countBtns.forEach((b) => {
        const isSelected = b === btn;
        b.classList.toggle("selected", isSelected);
        b.setAttribute("aria-checked", String(isSelected));
      });
    });
  });

  el.orderBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      SoundFX.playClick();
      state.order = btn.dataset.order;
      state.sequentialOffset[state.scope] = 0;
      el.orderBtns.forEach((b) => {
        const isSelected = b === btn;
        b.classList.toggle("selected", isSelected);
        b.setAttribute("aria-checked", String(isSelected));
      });
    });
  });

  /* ==================== 9. 遊戲初始化與星星槽繪製 ==================== */
  function shuffle(array) {
    const arr = array.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function buildRoundData() {
    const pool = SCOPE_CONFIG[state.scope].symbols;
    const targetCount =
      state.countMode === "all"
        ? pool.length
        : Math.min(Number(state.countMode), pool.length);

    if (state.order === "random") {
      const shuffled = shuffle(pool);
      return {
        queue: shuffled.slice(0, targetCount),
        reservePool: shuffled.slice(targetCount)
      };
    }

    // 照順序模式：若題數小於總數，每次「再玩一次」自動接續下一批注音，其餘作為替補池
    const queue = [];
    const reservePool = [];
    let offset = state.sequentialOffset[state.scope] || 0;
    for (let i = 0; i < pool.length; i++) {
      const sym = pool[(offset + i) % pool.length];
      if (i < targetCount) {
        queue.push(sym);
      } else {
        reservePool.push(sym);
      }
    }
    state.sequentialOffset[state.scope] = (offset + targetCount) % pool.length;
    return { queue, reservePool };
  }

  function renderStarProgress() {
    const wrap = el.starProgressWrap;
    wrap.innerHTML = "";

    if (state.totalTarget <= 10) {
      const slotsDiv = document.createElement("div");
      slotsDiv.className = "star-slots" + (state.totalTarget > 6 ? " many-stars" : "");
      for (let i = 0; i < state.totalTarget; i++) {
        const slot = document.createElement("div");
        slot.className = "star-slot";
        slot.dataset.index = String(i);
        slot.innerHTML = `
          <svg viewBox="0 0 48 48">
            <polygon class="star-shape" points="24,4 30,17 44,19 34,29 36,43 24,36 12,43 14,29 4,19 18,17" />
          </svg>
        `;
        slotsDiv.appendChild(slot);
      }
      wrap.appendChild(slotsDiv);
    } else {
      const meter = document.createElement("div");
      meter.className = "star-meter";
      meter.innerHTML = `
        <div id="star-meter-icon" class="star-meter-icon">⭐</div>
        <div class="star-meter-track">
          <div id="star-meter-fill" class="star-meter-fill"></div>
        </div>
      `;
      wrap.appendChild(meter);
    }
  }

  function updateProgressUI(justEarnedIndex = -1) {
    el.progressPill.textContent = `${state.earnedStars} / ${state.totalTarget} 顆星`;

    if (state.totalTarget <= 10) {
      const slots = el.starProgressWrap.querySelectorAll(".star-slot");
      slots.forEach((slot, idx) => {
        const filled = idx < state.earnedStars;
        slot.classList.toggle("filled", filled);
        slot.classList.remove("just-earned");
        if (idx === justEarnedIndex) {
          void slot.offsetWidth;
          slot.classList.add("just-earned");
        }
      });
    } else {
      const fill = document.getElementById("star-meter-fill");
      const icon = document.getElementById("star-meter-icon");
      if (fill) {
        const pct = Math.round((state.earnedStars / state.totalTarget) * 100);
        fill.style.width = `${pct}%`;
      }
      if (icon && justEarnedIndex >= 0) {
        icon.classList.remove("pulse");
        void icon.offsetWidth;
        icon.classList.add("pulse");
      }
    }
  }

  function setStageAnimals() {
    const pair = ANIMAL_PAIRS[state.pairIndex % ANIMAL_PAIRS.length];
    state.pairIndex += 1;
    el.animalLeftSvg.innerHTML = renderAnimalMarkup(pair[0]);
    el.animalRightSvg.innerHTML = renderAnimalMarkup(pair[1]);
  }

  function startGame() {
    SoundFX.playClick();
    const round = buildRoundData();
    state.queue = round.queue;
    state.reservePool = round.reservePool;
    state.totalTarget = state.queue.length;
    state.earnedStars = 0;
    state.completedSymbols = [];
    state.skippedSymbols = new Set();
    state.isAnimating = false;

    el.gameScopeBadge.textContent = SCOPE_CONFIG[state.scope].label;
    setStageAnimals();
    renderStarProgress();
    updateProgressUI();
    hideToast();
    setButtonsDisabled(false);

    showScreen("game");
    displayCurrentSymbol(true);
  }

  function displayCurrentSymbol(withPop = true) {
    if (state.queue.length === 0) return;
    const sym = state.queue[0];
    el.zhuyinSymbol.textContent = sym;

    el.zhuyinCard.classList.remove("card-enter", "card-celebrate", "card-retry");
    if (withPop) {
      void el.zhuyinCard.offsetWidth;
      el.zhuyinCard.classList.add("card-enter");
    }
  }

  function setButtonsDisabled(disabled) {
    el.btnCorrect.disabled = disabled;
    el.btnRetry.disabled = disabled;
  }

  let toastTimer = null;
  function showToast(msg, duration = 1800) {
    clearTimeout(toastTimer);
    el.cardHintToast.textContent = msg;
    el.cardHintToast.classList.add("show");
    toastTimer = setTimeout(hideToast, duration);
  }

  function hideToast() {
    clearTimeout(toastTimer);
    el.cardHintToast.classList.remove("show");
  }

  let bubbleTimer = null;
  function triggerAnimalReaction(mode) {
    clearTimeout(bubbleTimer);
    el.animalLeft.classList.remove("cheering", "encouraging");
    el.animalRight.classList.remove("cheering", "encouraging");
    void el.animalLeft.offsetWidth;

    if (mode === "cheer") {
      el.animalLeft.classList.add("cheering");
      el.animalRight.classList.add("cheering");
      el.bubbleLeft.textContent = CHEER_PHRASES_LEFT[Math.floor(Math.random() * CHEER_PHRASES_LEFT.length)];
      el.bubbleRight.textContent = CHEER_PHRASES_RIGHT[Math.floor(Math.random() * CHEER_PHRASES_RIGHT.length)];
      el.bubbleLeft.classList.add("show");
      el.bubbleRight.classList.add("show");
    } else {
      el.animalLeft.classList.add("encouraging");
      el.animalRight.classList.add("encouraging");
      const msg = ENCOURAGE_PHRASES[Math.floor(Math.random() * ENCOURAGE_PHRASES.length)];
      el.bubbleLeft.textContent = msg;
      el.bubbleLeft.classList.add("show");
      el.bubbleRight.classList.remove("show");
    }

    bubbleTimer = setTimeout(() => {
      el.bubbleLeft.classList.remove("show");
      el.bubbleRight.classList.remove("show");
    }, 820);
  }

  /* ==================== 10. 飛星與閃光特效 ==================== */
  function getStagePoint(element) {
    const stageRect = el.stage.getBoundingClientRect();
    const rect = element.getBoundingClientRect();
    const s = state.currentScale || 1;
    return {
      x: (rect.left + rect.width / 2 - stageRect.left) / s,
      y: (rect.top + rect.height / 2 - stageRect.top) / s
    };
  }

  function spawnSparkles(x, y, count = 12) {
    const colors = ["#FFD447", "#FF9E44", "#FFF5A5", "#6EE07E", "#7AD3FF"];
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "sparkle-particle";
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const dist = 34 + Math.random() * 44;
      p.style.left = `${x}px`;
      p.style.top = `${y}px`;
      p.style.background = colors[i % colors.length];
      p.style.setProperty("--dx", `${Math.cos(angle) * dist}px`);
      p.style.setProperty("--dy", `${Math.sin(angle) * dist}px`);
      el.fxLayer.appendChild(p);
      setTimeout(() => p.remove(), 700);
    }
  }

  function launchFlyingStar(targetIndex, onLand) {
    const start = getStagePoint(el.zhuyinCard);
    let targetEl = null;
    if (state.totalTarget <= 10) {
      targetEl = el.starProgressWrap.querySelector(`.star-slot[data-index="${targetIndex}"]`);
    } else {
      targetEl = document.getElementById("star-meter-icon");
    }
    const end = targetEl ? getStagePoint(targetEl) : { x: 640, y: 46 };

    const star = document.createElement("div");
    star.className = "flying-star";
    star.innerHTML = `
      <svg viewBox="0 0 64 64" width="68" height="68">
        <polygon points="32,4 40,22 60,25 45,39 49,58 32,48 15,58 19,39 4,25 24,22"
          fill="#FFD447" stroke="#EB8F00" stroke-width="3" stroke-linejoin="round"/>
      </svg>
    `;
    star.style.left = `${start.x}px`;
    star.style.top = `${start.y}px`;
    el.fxLayer.appendChild(star);

    // 拋物線控制點
    const ctrlX = (start.x + end.x) / 2 + (end.x >= start.x ? 60 : -60);
    const ctrlY = Math.min(start.y, end.y) - 95;
    const duration = 520;
    const startTime = performance.now();

    function step(now) {
      const t = Math.min((now - startTime) / duration, 1);
      // easeInOutCubic
      const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      const inv = 1 - e;
      const x = inv * inv * start.x + 2 * inv * e * ctrlX + e * e * end.x;
      const y = inv * inv * start.y + 2 * inv * e * ctrlY + e * e * end.y;
      const scale = 1.25 - 0.55 * e;
      const rot = e * 360;

      star.style.left = `${x}px`;
      star.style.top = `${y}px`;
      star.style.transform = `scale(${scale}) rotate(${rot}deg)`;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        star.remove();
        spawnSparkles(end.x, end.y, 14);
        if (onLand) onLand();
      }
    }

    spawnSparkles(start.x, start.y, 10);
    requestAnimationFrame(step);
  }

  /* ==================== 11. 老師判定動作 ==================== */
  function handleCorrect() {
    if (state.screen !== "game" || state.isAnimating || state.queue.length === 0) return;
    state.isAnimating = true;
    setButtonsDisabled(true);
    hideToast();

    SoundFX.playStar();
    el.zhuyinCard.classList.remove("card-enter", "card-retry");
    void el.zhuyinCard.offsetWidth;
    el.zhuyinCard.classList.add("card-celebrate");
    triggerAnimalReaction("cheer");

    const currentSymbol = state.queue.shift();
    state.completedSymbols.push(currentSymbol);
    const earnedSlotIndex = state.earnedStars;
    state.earnedStars += 1;

    launchFlyingStar(earnedSlotIndex, () => {
      updateProgressUI(earnedSlotIndex);
    });

    const isFinished = state.earnedStars >= state.totalTarget || state.queue.length === 0;
    if (isFinished) {
      setTimeout(() => {
        showVictoryScreen();
      }, 860);
    } else {
      setTimeout(() => {
        displayCurrentSymbol(true);
        state.isAnimating = false;
        setButtonsDisabled(false);
      }, 720);
    }
  }

  function handleRetry() {
    if (state.screen !== "game" || state.isAnimating || state.queue.length === 0) return;
    state.isAnimating = true;
    setButtonsDisabled(true);

    SoundFX.playRetry();
    triggerAnimalReaction("encourage");

    const skippedSymbol = state.queue[0];
    state.skippedSymbols.add(skippedSymbol);

    el.zhuyinCard.classList.remove("card-enter", "card-celebrate", "card-retry");
    void el.zhuyinCard.offsetWidth;
    el.zhuyinCard.classList.add("card-retry");

    if (state.reservePool.length > 0) {
      // 直接從同範圍替補池換成另一個還沒出現過的注音（不排到後面）
      state.queue[0] = state.reservePool.shift();
      showToast("換一個新注音來挑戰吧！", 1700);

      setTimeout(() => {
        displayCurrentSymbol(true);
        state.isAnimating = false;
        setButtonsDisabled(false);
      }, 460);
      return;
    }

    // 若替補池已用完（例如「全部」模式或已換過所有備用注音），直接移除此注音不再出現
    state.queue.shift();

    if (state.queue.length > 0) {
      state.totalTarget = state.earnedStars + state.queue.length;
      renderStarProgress();
      updateProgressUI();
      showToast("換下一個注音繼續挑戰！", 1700);

      setTimeout(() => {
        displayCurrentSymbol(true);
        state.isAnimating = false;
        setButtonsDisabled(false);
      }, 460);
    } else if (state.earnedStars > 0) {
      // 已收集部分星星且無剩餘新注音，直接進入鼓勵慶祝畫面
      state.totalTarget = state.earnedStars;
      updateProgressUI();
      setTimeout(() => {
        showVictoryScreen();
      }, 520);
    } else {
      // 極端情況：範圍內全部注音皆已跳過且尚無星星，重抽其他注音讓挑戰可持續
      const pool = SCOPE_CONFIG[state.scope].symbols;
      const fresh = shuffle(pool.filter((s) => s !== skippedSymbol));
      state.queue = [fresh[0]];
      state.reservePool = fresh.slice(1);
      showToast("換一個注音重新挑戰吧！", 1700);

      setTimeout(() => {
        displayCurrentSymbol(true);
        state.isAnimating = false;
        setButtonsDisabled(false);
      }, 460);
    }
  }

  /* ==================== 12. 過關頒獎與彩帶動畫 ==================== */
  function showVictoryScreen() {
    state.isAnimating = false;
    setButtonsDisabled(false);
    SoundFX.playVictory();

    el.victoryTitle.textContent = `太棒了！集滿 ${state.totalTarget} 顆星星！`;
    el.victorySubtitle.textContent = `${SCOPE_CONFIG[state.scope].label} 挑戰成功，森林小動物都為你拍拍手！`;

    // 顯示四隻小動物一起慶祝
    el.victoryAnimals.innerHTML = ["bear", "bunny", "fox", "owl"]
      .map((key) => `<div class="victory-animal-item">${renderAnimalMarkup(key)}</div>`)
      .join("");

    // 顯示本回合唸過的注音徽章
    el.reviewChips.innerHTML = "";
    el.reviewChips.className = "review-chips";
    if (state.completedSymbols.length > 14) {
      el.reviewChips.classList.add("compact");
    } else if (state.completedSymbols.length > 8) {
      el.reviewChips.classList.add("medium");
    }

    state.completedSymbols.forEach((sym) => {
      const chip = document.createElement("div");
      chip.className = "review-chip";
      chip.textContent = sym;
      el.reviewChips.appendChild(chip);
    });

    showScreen("victory");
    startConfetti();
  }

  /* 輕量級彩帶煙火 Canvas */
  let confettiReqId = null;
  let confettiPieces = [];

  function startConfetti() {
    stopConfetti();
    const ctx = el.confettiCanvas.getContext("2d");
    const colors = ["#FFD447", "#FF7B9C", "#5FD16E", "#67C8FF", "#FFAA4C", "#C59BFF"];
    confettiPieces = Array.from({ length: 85 }, () => ({
      x: Math.random() * 1280,
      y: -20 - Math.random() * 420,
      w: 10 + Math.random() * 9,
      h: 6 + Math.random() * 6,
      vx: (Math.random() - 0.5) * 2.2,
      vy: 2.1 + Math.random() * 2.8,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.14,
      color: colors[Math.floor(Math.random() * colors.length)]
    }));

    function draw() {
      ctx.clearRect(0, 0, 1280, 720);
      for (const p of confettiPieces) {
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;
        if (p.y > 740) {
          p.y = -20;
          p.x = Math.random() * 1280;
        }
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      confettiReqId = requestAnimationFrame(draw);
    }

    confettiReqId = requestAnimationFrame(draw);
  }

  function stopConfetti() {
    if (confettiReqId) {
      cancelAnimationFrame(confettiReqId);
      confettiReqId = null;
    }
    const ctx = el.confettiCanvas.getContext("2d");
    ctx.clearRect(0, 0, 1280, 720);
  }

  /* ==================== 13. 返回首頁防誤觸視窗 ==================== */
  function openConfirmModal() {
    SoundFX.playClick();
    if (state.earnedStars === 0) {
      showScreen("home");
      return;
    }
    el.modalConfirm.hidden = false;
  }

  function closeConfirmModal() {
    SoundFX.playClick();
    el.modalConfirm.hidden = true;
  }

  /* ==================== 14. 事件綁定與鍵盤快捷鍵 ==================== */
  el.btnStart.addEventListener("click", startGame);
  el.btnCorrect.addEventListener("click", handleCorrect);
  el.btnRetry.addEventListener("click", handleRetry);
  el.btnBackHome.addEventListener("click", openConfirmModal);

  el.btnModalCancel.addEventListener("click", closeConfirmModal);
  el.btnModalOk.addEventListener("click", () => {
    SoundFX.playClick();
    el.modalConfirm.hidden = true;
    showScreen("home");
  });

  el.btnPlayAgain.addEventListener("click", startGame);
  el.btnVictoryHome.addEventListener("click", () => {
    SoundFX.playClick();
    showScreen("home");
  });

  el.soundBtns.forEach((b) => b.addEventListener("click", toggleSound));
  el.fullscreenBtns.forEach((b) => b.addEventListener("click", toggleFullscreen));
  el.btnFontHome.addEventListener("click", toggleFont);
  el.btnFontGame.addEventListener("click", toggleFont);

  // 鍵盤與簡報筆快捷鍵支援
  document.addEventListener("keydown", (e) => {
    if (!el.modalConfirm.hidden) {
      if (e.code === "Escape") closeConfirmModal();
      return;
    }

    if (e.code === "KeyM") {
      toggleSound();
      return;
    }
    if (e.code === "KeyF") {
      toggleFullscreen();
      return;
    }

    if (state.screen === "game") {
      if (e.code === "Space" || e.code === "Enter" || e.code === "ArrowRight") {
        e.preventDefault();
        handleCorrect();
      } else if (e.code === "ArrowLeft" || e.code === "KeyR") {
        e.preventDefault();
        handleRetry();
      }
    } else if (state.screen === "victory") {
      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        startGame();
      }
    }
  });

  /* ==================== 15. 初始啟動 ==================== */
  updateCountAllLabel();
  updateStageScale();
})();
