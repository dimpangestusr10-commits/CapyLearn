(() => {
  "use strict";

  const K = {
    profile: "capylearnV3Profile",
    daily: "capylearnV3Daily",
    dailyXp: "capylearnV3DailyXP",
    unlocked: "capylearnV3Achievements",
    sound: "capylearnV3Sound",
    lastWorld: "capylearnV3LastWorld",
    firstRun: "capylearnV3OnboardingDone"
  };

  const WORLDS = [
    ["Animals", "animals.html", "🐯", "capylearnAnimalsLearned"],
    ["Fruits", "fruits.html", "🍎", "capylearnFruitsLearned"],
    ["Plants", "plants.html", "🌱", "capylearnPlantsLearned"],
    ["Colors", "colors.html", "🎨", "capylearnColorsLearned"],
    ["Numbers", "numbers.html", "🔢", "capylearnNumbersLearned"]
  ];

  const ACHIEVEMENTS = [
    { id:"first_word", icon:"🌟", title:"First Word", desc:"You learned your first CapyLearn word.", test:s=>s.learned >= 1 },
    { id:"ten_words", icon:"🧭", title:"Word Explorer", desc:"10 words learned. Your adventure is growing!", test:s=>s.learned >= 10 },
    { id:"half_way", icon:"🚀", title:"Halfway Hero", desc:"25 words learned — halfway to all 50.", test:s=>s.learned >= 25 },
    { id:"world_complete", icon:"🏆", title:"World Complete", desc:"You completed an entire learning world.", test:s=>s.completedWorlds >= 1 },
    { id:"practice_started", icon:"🎯", title:"Practice Rookie", desc:"You jumped into practice.", test:s=>s.practiceDone >= 1 },
    { id:"game_started", icon:"🎮", title:"Game On!", desc:"You played in the CapyLearn arcade.", test:s=>s.gameDone >= 1 },
    { id:"star_200", icon:"⭐", title:"Star Collector", desc:"You reached 200 total stars.", test:s=>s.stars >= 200 },
    { id:"all_words", icon:"👑", title:"Word Master", desc:"All 50 vocabulary words learned.", test:s=>s.learned >= 50 }
  ];

  const page = (location.pathname.split("/").pop() || "index.html").toLowerCase();
  const isHome = page === "" || page === "index.html";
  const isProgress = page === "progress.html";
  const isPractice = page === "practice.html";
  const isGames = page === "games.html";
  const isCreator = page === "creator.html";

  const safeJSON = (key, fallback) => {
    try {
      const v = JSON.parse(localStorage.getItem(key));
      return v ?? fallback;
    } catch {
      return fallback;
    }
  };

  const arrLen = key => {
    const v = safeJSON(key, []);
    return Array.isArray(v) ? Math.min(v.length, 10) : 0;
  };

  const score = (key, max = Infinity) => {
    const n = Number(localStorage.getItem(key));
    return Number.isFinite(n) ? Math.min(Math.max(0, n), max) : 0;
  };

  const globalStars = () => {
    const learned = WORLDS.reduce((a,w)=>a+arrLen(w[3]),0);
    return 120 + learned * 10
      + score("capylearnMixedPracticeBest",10)
      + score("capylearnPictureBest",10)
      + score("capylearnMatchBest",5)
      + score("capylearnSpeedBest");
  };

  const today = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,"0");
    const day = String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };

  function getProfile() {
    const p = safeJSON(K.profile, null);
    if (!p || typeof p !== "object") return null;
    return {
      name: String(p.name || "Learner").slice(0,24),
      avatar: String(p.avatar || "🦊").slice(0,4)
    };
  }

  function setProfile(profile) {
    if (window.CapyProfiles?.updateActiveIdentity) {
      window.CapyProfiles.updateActiveIdentity({
        name: profile?.name,
        avatar: profile?.avatar
      });
      return;
    }

    const current = getProfile() || {};
    const nextProfile = {
      ...current,
      name: String(profile?.name || current.name || "Learner").slice(0, 24),
      avatar: String(profile?.avatar || current.avatar || "🦊").slice(0, 4)
    };

    localStorage.setItem(K.profile, JSON.stringify(nextProfile));
    localStorage.setItem(K.firstRun, "1");
  }

  function ensureProfileEditDoesNotResetProgress() {
    // Migration/repair guard:
    // If a previous V3 build reset only the V3 Daily XP while legacy learning/game
    // progress still exists, rebuild a safe baseline XP from existing activity.
    // This does NOT change stars or any legacy score.
    const learned = WORLDS.reduce((a,w)=>a+arrLen(w[3]),0);
    const activityXP =
      learned * 20
      + score("capylearnMixedPracticeBest",10) * 8
      + score("capylearnPictureBest",10) * 8
      + score("capylearnMatchBest",5) * 12
      + score("capylearnSpeedBest") * 4;

    const dailyXpRaw = Number(localStorage.getItem(K.dailyXp));
    if (!Number.isFinite(dailyXpRaw) || dailyXpRaw < 0) {
      localStorage.setItem(K.dailyXp, "0");
    }

    // Store a non-destructive baseline marker for future versions.
    if (!localStorage.getItem("capylearnV3ProfileProgressSafe")) {
      localStorage.setItem("capylearnV3ProfileProgressSafe", "1");
    }

    return activityXP;
  }

  function getDaily() {
    const current = safeJSON(K.daily, null);
    const learnedNow = WORLDS.reduce((a,w)=>a+arrLen(w[3]),0);
    if (!current || current.date !== today()) {
      const fresh = {
        date: today(),
        learnedBase: learnedNow,
        learnedDelta: 0,
        practice: 0,
        game: 0,
        claimed: false
      };
      localStorage.setItem(K.daily, JSON.stringify(fresh));
      return fresh;
    }
    current.learnedDelta = Math.max(0, learnedNow - Number(current.learnedBase || 0));
    return current;
  }

  function saveDaily(d) {
    localStorage.setItem(K.daily, JSON.stringify(d));
  }

  function markDaily(kind) {
    const d = getDaily();
    if (kind === "practice") d.practice = 1;
    if (kind === "game") d.game = 1;
    d.learnedDelta = Math.max(0, WORLDS.reduce((a,w)=>a+arrLen(w[3]),0) - Number(d.learnedBase || 0));

    const allDone = d.learnedDelta >= 3 && d.practice >= 1 && d.game >= 1;
    if (allDone && !d.claimed) {
      d.claimed = true;
      const xp = Number(localStorage.getItem(K.dailyXp) || 0) + 75;
      localStorage.setItem(K.dailyXp, String(xp));
      setTimeout(() => {
        showCappy("Daily Mission Complete! 🎉", "+75 XP added to your journey.");
        celebrate();
        playTone("success");
      }, 200);
    }
    saveDaily(d);
    refreshWidgets();
  }

  function getStats() {
    const learned = WORLDS.reduce((a,w)=>a+arrLen(w[3]),0);
    const completedWorlds = WORLDS.filter(w=>arrLen(w[3])>=10).length;
    const mixed = score("capylearnMixedPracticeBest",10);
    const picture = score("capylearnPictureBest",10);
    const match = score("capylearnMatchBest",5);
    const speed = score("capylearnSpeedBest");
    const daily = getDaily();
    const dailyXp = Number(localStorage.getItem(K.dailyXp) || 0);

    const xp = learned*20 + mixed*8 + picture*8 + match*12 + speed*4 + dailyXp;
    const levels = [
      {name:"Beginner", min:0, max:200},
      {name:"Explorer", min:200, max:500},
      {name:"Adventurer", min:500, max:900},
      {name:"Word Ranger", min:900, max:1400},
      {name:"Word Master", min:1400, max:2000},
      {name:"Capy Legend", min:2000, max:3000}
    ];
    let level = levels[levels.length-1];
    for (const l of levels) {
      if (xp < l.max) { level = l; break; }
    }
    const pct = Math.max(0, Math.min(100, ((xp-level.min)/(level.max-level.min))*100));

    return {
      learned, completedWorlds, mixed, picture, match, speed,
      stars: globalStars(),
      xp, level, pct,
      daily,
      practiceDone: daily.practice,
      gameDone: daily.game
    };
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function injectLauncher() {
    if (document.querySelector(".engagement-launcher")) return;
    const p = getProfile() || {name:"Learner", avatar:"🦊"};
    const el = document.createElement("div");
    el.className = "engagement-launcher";
    el.innerHTML = `
      <button class="engagement-pill engagement-sound" id="engSoundBtn" aria-label="Toggle sound">🔇</button>
      <button class="engagement-pill profile-pill" id="engProfileBtn">
        <span class="eng-avatar-mini">${escapeHTML(p.avatar)}</span>
        <span class="eng-name-mini">${escapeHTML(p.name)}</span>
      </button>`;
    document.body.appendChild(el);
    document.getElementById("engProfileBtn").addEventListener("click", () => { if (window.CapyProfiles?.openManager) window.CapyProfiles.openManager(); else openProfileEditor(); });
    document.getElementById("engSoundBtn").addEventListener("click", toggleSound);
    updateSoundButton();
  }

  function updateSoundButton() {
    const b = document.getElementById("engSoundBtn");
    if (!b) return;
    const on = localStorage.getItem(K.sound) === "1";
    b.textContent = on ? "🔊" : "🔇";
    b.title = on ? "Sound On" : "Sound Off";
  }

  function toggleSound() {
    const next = localStorage.getItem(K.sound) === "1" ? "0" : "1";
    localStorage.setItem(K.sound, next);
    updateSoundButton();
    if (next === "1") playTone("success");
  }

  let audioCtx = null;
  function playTone(kind="tap") {
    if (localStorage.getItem(K.sound) !== "1") return;
    try {
      audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.connect(g); g.connect(audioCtx.destination);
      const map = {
        tap:[420,.05],
        success:[660,.10],
        unlock:[780,.14]
      };
      const [f,d] = map[kind] || map.tap;
      o.frequency.setValueAtTime(f, audioCtx.currentTime);
      if (kind === "success" || kind === "unlock") {
        o.frequency.exponentialRampToValueAtTime(f*1.25, audioCtx.currentTime+d);
      }
      g.gain.setValueAtTime(.0001,audioCtx.currentTime);
      g.gain.exponentialRampToValueAtTime(.05,audioCtx.currentTime+.01);
      g.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+d);
      o.start(); o.stop(audioCtx.currentTime+d+.02);
    } catch {}
  }

  function openModal(inner, options={}) {
    const wrap = document.createElement("div");
    wrap.className = "engagement-backdrop";
    wrap.innerHTML = `
      <div class="engagement-modal ${options.className || ""}" role="dialog" aria-modal="true" aria-label="${escapeHTML(options.label || "CapyLearn dialog")}">
        ${options.closable === false ? "" : '<button class="engagement-close" aria-label="Close">✕</button>'}
        ${inner}
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("engagement-modal-open");
    requestAnimationFrame(()=>wrap.classList.add("open"));

    const close = () => {
      wrap.classList.remove("open");
      document.body.classList.remove("engagement-modal-open");
      setTimeout(()=>wrap.remove(),260);
      document.removeEventListener("keydown", onKey);
    };
    const onKey = e => { if (e.key === "Escape" && options.closable !== false) close(); };
    document.addEventListener("keydown", onKey);
    wrap.addEventListener("click", e => {
      if (e.target === wrap && options.closable !== false) close();
    });
    wrap.querySelector(".engagement-close")?.addEventListener("click", close);
    return {wrap, close};
  }

  function onboarding(force=false) {
    if (!force && localStorage.getItem(K.firstRun) === "1" && getProfile()) return;

    const current = getProfile() || {name:"", avatar:"🦊"};
    const avatars = ["🦊","🐼","🐯","🐸","🦄","🐨"];
    const modal = openModal(`
      <div class="engagement-kicker">🐾 MEET CAPPY</div>
      <h2>Hi! Ready for your English adventure?</h2>
      <p class="engagement-sub">Tell Cappy your learner name and choose an avatar. You can change it anytime.</p>

      <div class="engagement-field">
        <label for="engLearnerName">LEARNER NAME</label>
        <input id="engLearnerName" class="engagement-input" maxlength="24" autocomplete="off" placeholder="Type a name..." value="${escapeHTML(current.name)}">
      </div>

      <div class="engagement-field">
        <label>CHOOSE AN AVATAR</label>
        <div class="engagement-avatar-grid">
          ${avatars.map(a=>`<button class="engagement-avatar-option ${a===current.avatar?"selected":""}" data-avatar="${a}" aria-label="Avatar ${a}">${a}</button>`).join("")}
        </div>
      </div>

      <button class="engagement-submit" id="engStartJourney">Start My Journey →</button>
    `,{closable:force, label:"Learner setup"});

    let chosen = current.avatar || "🦊";
    modal.wrap.querySelectorAll(".engagement-avatar-option").forEach(btn=>{
      btn.addEventListener("click",()=>{
        modal.wrap.querySelectorAll(".engagement-avatar-option").forEach(x=>x.classList.remove("selected"));
        btn.classList.add("selected");
        chosen = btn.dataset.avatar;
        playTone("tap");
      });
    });

    modal.wrap.querySelector("#engStartJourney").addEventListener("click",()=>{
      const input = modal.wrap.querySelector("#engLearnerName");
      const name = input.value.trim() || "Learner";
      // Save identity only; all learner progress remains untouched.
      setProfile({
        name: name.slice(0,24),
        avatar: chosen
      });
      modal.close();
      injectLauncher();
      refreshWidgets();
      showCappy(`Welcome, ${name}! 👋`, "Cappy is ready to learn with you.");
      playTone("success");
    });
  }

  function openProfileEditor() {
    const p = getProfile() || {name:"Learner",avatar:"🦊"};
    const s = getStats();
    const modal = openModal(`
      <div class="engagement-kicker">✨ LEARNER PROFILE</div>
      <h2>${escapeHTML(p.avatar)} ${escapeHTML(p.name)}</h2>
      <p class="engagement-sub">${escapeHTML(s.level.name)} • ${s.xp} XP • ${s.learned}/50 words learned</p>

      <div class="v3-profile-stats" style="margin-top:20px">
        <div class="v3-profile-stat"><strong>${s.stars}</strong><span>STARS</span></div>
        <div class="v3-profile-stat"><strong>${s.completedWorlds}</strong><span>WORLDS</span></div>
        <div class="v3-profile-stat"><strong>${s.xp}</strong><span>XP</span></div>
      </div>

      <button class="engagement-submit" id="engEditProfile">Edit name & avatar</button>
    `,{label:"Learner profile"});

    modal.wrap.querySelector("#engEditProfile").addEventListener("click",()=>{
      modal.close();
      setTimeout(()=>onboarding(true),280);
    });
  }

  function dashboardHTML() {
    const p = getProfile() || {name:"Learner",avatar:"🦊"};
    const s = getStats();
    const d = s.daily;
    const learnedDone = Math.min(3, d.learnedDelta || 0);

    const last = safeJSON(K.lastWorld, null) || {name:"Animals",href:"animals.html",icon:"🐯"};

    return `
      <section class="v3-engagement-section" id="v3Engagement">
        <div class="container">
          <div class="v3-engagement-grid">
            <article class="v3-profile-card">
              <div class="v3-profile-top">
                <div class="v3-profile-avatar">${escapeHTML(p.avatar)}</div>
                <div class="v3-profile-copy">
                  <small>YOUR LEARNING JOURNEY</small>
                  <h3>Hi, ${escapeHTML(p.name)} 👋</h3>
                  <p>${escapeHTML(s.level.name)} • Keep growing with Cappy</p>
                </div>
              </div>

              <div class="v3-profile-stats">
                <div class="v3-profile-stat"><strong>${s.learned}</strong><span>WORDS</span></div>
                <div class="v3-profile-stat"><strong>${s.stars}</strong><span>STARS</span></div>
                <div class="v3-profile-stat"><strong>${s.xp}</strong><span>XP</span></div>
              </div>

              <div class="v3-xp-row">
                <span>${escapeHTML(s.level.name)}</span>
                <span>${s.xp} / ${s.level.max} XP</span>
              </div>
              <div class="v3-xp-track"><div class="v3-xp-fill" style="width:${s.pct.toFixed(1)}%"></div></div>
            </article>

            <div class="v3-side-stack">
              <article class="v3-missions-card">
                <div class="v3-card-kicker">☀️ TODAY'S MISSIONS</div>
                <div class="v3-card-title">Three small wins.</div>
                <div class="v3-card-sub">Complete all three to earn +75 XP today.</div>

                <div class="v3-mission-list">
                  <div class="v3-mission ${learnedDone>=3?"done":""}">
                    <div class="v3-mission-icon">📚</div>
                    <div><strong>Learn 3 words</strong><span>Discover new vocabulary</span></div>
                    <div class="v3-mission-status">${learnedDone}/3</div>
                  </div>

                  <div class="v3-mission ${d.practice?"done":""}">
                    <div class="v3-mission-icon">🎯</div>
                    <div><strong>Do 1 practice</strong><span>Train what you remember</span></div>
                    <div class="v3-mission-status">${d.practice?"✓":"0/1"}</div>
                  </div>

                  <div class="v3-mission ${d.game?"done":""}">
                    <div class="v3-mission-icon">🎮</div>
                    <div><strong>Play 1 game</strong><span>Learn through play</span></div>
                    <div class="v3-mission-status">${d.game?"✓":"0/1"}</div>
                  </div>
                </div>

                <div class="v3-mission-reward">
                  <span>${d.claimed ? "Reward claimed ✨" : "Daily reward"}</span>
                  <strong>${d.claimed ? "+75 XP ✓" : "+75 XP"}</strong>
                </div>
              </article>

              <a class="v3-continue-card" href="${escapeHTML(last.href)}">
                <div>
                  <div class="v3-card-kicker">↗ CONTINUE LEARNING</div>
                  <h4>${escapeHTML(last.icon)} ${escapeHTML(last.name)}</h4>
                </div>
                <div class="v3-continue-arrow">→</div>
              </a>
            </div>
          </div>
        </div>
      </section>`;
  }

  function injectDashboard() {
    if (!(isHome || isProgress)) return;
    if (document.getElementById("v3Engagement")) return;
    const hero =
      document.querySelector(isHome ? ".hero" : ".progress-hero") ||
      document.querySelector("main > section");
    if (!hero) return;
    hero.insertAdjacentHTML("afterend", dashboardHTML());
  }

  function refreshWidgets() {
    const old = document.getElementById("v3Engagement");
    if (old) {
      const holder = document.createElement("div");
      holder.innerHTML = dashboardHTML().trim();
      old.replaceWith(holder.firstElementChild);
    }
    const p = getProfile();
    const pill = document.querySelector(".profile-pill");
    if (p && pill) {
      pill.querySelector(".eng-avatar-mini").textContent = p.avatar;
      pill.querySelector(".eng-name-mini").textContent = p.name;
    }
  }

  function showCappy(title, message) {
    let stack = document.querySelector(".cappy-toast-stack");
    if (!stack) {
      stack = document.createElement("div");
      stack.className = "cappy-toast-stack";
      document.body.appendChild(stack);
    }
    const t = document.createElement("div");
    t.className = "cappy-toast";
    t.innerHTML = `
      <div class="cappy-toast-avatar">🐾</div>
      <div><strong>${escapeHTML(title)}</strong><p>${escapeHTML(message)}</p></div>`;
    stack.appendChild(t);
    setTimeout(()=>{
      t.style.transition = "opacity .25s ease, transform .25s ease";
      t.style.opacity = "0";
      t.style.transform = "translateY(10px)";
      setTimeout(()=>t.remove(),260);
    },3400);
  }

  function celebrate() {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const layer = document.createElement("div");
    layer.className = "v3-confetti-layer";
    const colors = ["#7b6ef6","#67c8ff","#ffd76a","#78e1b0","#ff9a84"];
    for (let i=0;i<54;i++) {
      const p = document.createElement("i");
      p.className = "v3-confetti";
      p.style.left = `${Math.random()*100}%`;
      p.style.background = colors[i%colors.length];
      p.style.setProperty("--drift", `${(Math.random()-.5)*220}px`);
      p.style.animationDelay = `${Math.random()*.35}s`;
      p.style.transform = `rotate(${Math.random()*180}deg)`;
      layer.appendChild(p);
    }
    document.body.appendChild(layer);
    setTimeout(()=>layer.remove(),2400);
  }

  function checkAchievements() {
    const s = getStats();
    const unlocked = safeJSON(K.unlocked, []);
    const set = new Set(Array.isArray(unlocked) ? unlocked : []);
    const newly = ACHIEVEMENTS.filter(a=>!set.has(a.id) && a.test(s));
    if (!newly.length) return;

    // Save all qualifying IDs, but celebrate one at a time to avoid popup spam.
    newly.forEach(a=>set.add(a.id));
    localStorage.setItem(K.unlocked, JSON.stringify([...set]));

    const a = newly[0];
    setTimeout(()=>{
      const modal = openModal(`
        <div class="achievement-card">
          <div class="achievement-burst">${a.icon}</div>
          <div class="engagement-kicker" style="margin-top:20px">ACHIEVEMENT UNLOCKED</div>
          <h2>${escapeHTML(a.title)}</h2>
          <p class="engagement-sub">${escapeHTML(a.desc)}</p>
          <div class="achievement-reward-chip">Saved to your journey ✦</div>
          <button class="engagement-submit" id="achievementContinue">Awesome!</button>
        </div>
      `,{className:"achievement-card",label:"Achievement unlocked"});
      modal.wrap.querySelector("#achievementContinue").addEventListener("click",modal.close);
      celebrate();
      playTone("unlock");
    },500);
  }

  function rememberWorld() {
    const hit = WORLDS.find(w=>page===w[1].toLowerCase());
    if (!hit) return;
    localStorage.setItem(K.lastWorld, JSON.stringify({name:hit[0],href:hit[1],icon:hit[2]}));
  }

  function hookMissions() {
    if (isPractice) {
      document.addEventListener("click", e => {
        const text = (e.target.closest("button,a")?.textContent || "").toLowerCase();
        if (/start|check|next|practice|answer|submit|begin/.test(text)) {
          markDaily("practice");
        }
      }, {passive:true});
    }
    if (isGames) {
      document.addEventListener("click", e => {
        const text = (e.target.closest("button,a")?.textContent || "").toLowerCase();
        if (/play|start|check|next|match|guess|speed/.test(text)) {
          markDaily("game");
        }
      }, {passive:true});
    }
  }

  function hookLearningChanges() {
    let last = WORLDS.reduce((a,w)=>a+arrLen(w[3]),0);
    setInterval(()=>{
      const now = WORLDS.reduce((a,w)=>a+arrLen(w[3]),0);
      if (now !== last) {
        if (now > last) {
          const d = getDaily();
          d.learnedDelta = Math.max(0, now - Number(d.learnedBase || 0));
          saveDaily(d);
          showCappy("Nice work! ⭐", `You now know ${now} CapyLearn words.`);
          playTone("success");
        }
        last = now;
        refreshWidgets();
        checkAchievements();
      }
    },1100);
  }

  function hookGenericReactions() {
    document.addEventListener("click", e=>{
      const clickable = e.target.closest("button, .option, .quiz-option, .answer-option");
      if (!clickable) return;
      setTimeout(()=>{
        const cls = clickable.className || "";
        const txt = (clickable.textContent || "").toLowerCase();
        if (/correct|right|success/.test(cls) || /correct|great|awesome/.test(txt)) {
          showCappy("Awesome! 🎉","That answer looks right.");
          playTone("success");
        } else if (/wrong|incorrect|error/.test(cls) || /try again|incorrect/.test(txt)) {
          showCappy("Almost! 💜","Try again — Cappy believes in you.");
        }
      },120);
    },{passive:true});
  }

  function addLegacyMode() {
    if (!isCreator) return;
    const dedication = document.querySelector(".creator-dedication");
    if (!dedication) return;
    dedication.id = dedication.id || "cyraLegacy";
    if (dedication.querySelector(".v3-legacy-button")) return;
    const shell = dedication.querySelector(".dedication-shell") || dedication;
    const btn = document.createElement("button");
    btn.className = "v3-legacy-button";
    btn.type = "button";
    btn.innerHTML = "♥ Open Parent / Legacy Mode";
    shell.appendChild(btn);
    btn.addEventListener("click",openLegacyModal);
  }

  function openLegacyModal() {
    const modal = openModal(`
      <div class="engagement-kicker">♥ PARENT / LEGACY MODE</div>
      <h2>A little piece of today, for tomorrow.</h2>
      <p class="engagement-sub">CapyLearn is also a personal time capsule — a project built with the hope that one day Cyra can learn from it and see a piece of her father's journey.</p>

      <div class="legacy-letter">
        <strong>Dear Cyra,</strong><br><br>
        Suatu hari jika kamu membaca ini, mungkin CapyLearn sudah jauh berbeda dari saat ayah pertama kali membuatnya.
        Tapi satu hal yang ayah harap tidak pernah berubah: rasa ingin tahumu, keberanianmu untuk belajar,
        dan keyakinan bahwa kamu juga bisa menciptakan sesuatu dari idemu sendiri.<br><br>
        Ayah membuat karya ini bukan karena semuanya sudah sempurna, tetapi karena ayah ingin meninggalkan satu bukti kecil
        bahwa memulai selalu lebih penting daripada menunggu sempurna.<br><br>
        Semoga suatu hari CapyLearn bisa menemanimu belajar, dan halaman ini mengingatkanmu bahwa sejak awal,
        ada bagian dari karya ini yang dibuat untukmu.
        <span class="legacy-signature">Dengan cinta, Ayah.</span>
      </div>

      <button class="engagement-submit" id="legacyGo">Read the full dedication ↓</button>
    `,{label:"Parent Legacy Mode"});
    modal.wrap.querySelector("#legacyGo").addEventListener("click",()=>{
      modal.close();
      setTimeout(()=>document.getElementById("cyraLegacy")?.scrollIntoView({behavior:"smooth",block:"start"}),280);
    });
  }

  function greetByPage() {
    if (sessionStorage.getItem("capylearnV3Greeted:"+page)) return;
    sessionStorage.setItem("capylearnV3Greeted:"+page,"1");
    const p = getProfile();
    if (!p) return;
    const messages = {
      "learn.html":["Pick your adventure 🌍","Choose a world and discover something new."],
      "practice.html":["Practice time 🎯","Small practice makes big progress."],
      "games.html":["Game on! 🎮","Learn, play, and beat your best score."],
      "progress.html":["Look how far you've come ✨","Your progress is growing with every word."],
      "creator.html":["Behind CapyLearn ✦","Meet the story and purpose behind the project."],
      "about.html":["Welcome to CapyLearn 🐾","Play, learn, speak — one adventure at a time."]
    };
    const m = messages[page];
    if (m) setTimeout(()=>showCappy(m[0],m[1]),900);
  }

  function init() {
    ensureProfileEditDoesNotResetProgress();
    injectLauncher();
    injectDashboard();
    rememberWorld();
    hookMissions();
    hookLearningChanges();
    hookGenericReactions();
    addLegacyMode();

    if (!getProfile() || localStorage.getItem(K.firstRun)!=="1") {
      setTimeout(()=>onboarding(false),550);
    } else {
      greetByPage();
    }

    setTimeout(()=>{
      refreshWidgets();
      checkAchievements();
    },800);

    window.addEventListener("storage",()=>{
      refreshWidgets();
      checkAchievements();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded",init,{once:true});
  } else {
    init();
  }
})();