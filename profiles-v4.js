(() => {
  "use strict";

  const REGISTRY = "capylearnV4Profiles";
  const ACTIVE = "capylearnV4ActiveProfileId";
  const MIGRATED = "capylearnV4Migrated";
  const GLOBAL_KEYS = new Set([
    REGISTRY, ACTIVE, MIGRATED,
    "capylearnV3Sound"
  ]);

  const original = {
    getItem: localStorage.getItem.bind(localStorage),
    setItem: localStorage.setItem.bind(localStorage),
    removeItem: localStorage.removeItem.bind(localStorage),
    clear: localStorage.clear.bind(localStorage),
    key: localStorage.key.bind(localStorage)
  };

  let applying = false;

  const safeParse = (s, fallback) => {
    try { return JSON.parse(s); } catch { return fallback; }
  };

  const uid = () =>
    "p_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 9);

  const isProfileKey = key => {
    if (!key || typeof key !== "string") return false;
    if (!key.startsWith("capylearn")) return false;
    if (GLOBAL_KEYS.has(key)) return false;
    if (key.startsWith("capylearnV4")) return false;
    return true;
  };

  function allCurrentProfileState() {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = original.key(i);
      if (isProfileKey(k)) {
        const v = original.getItem(k);
        if (v !== null) out[k] = v;
      }
    }
    return out;
  }

  function getProfiles() {
    const raw = safeParse(original.getItem(REGISTRY), []);
    return Array.isArray(raw) ? raw : [];
  }

  function saveProfiles(list) {
    original.setItem(REGISTRY, JSON.stringify(list));
  }

  function getActiveId() {
    return original.getItem(ACTIVE);
  }

  function getActiveProfile() {
    const id = getActiveId();
    return getProfiles().find(p => p.id === id) || null;
  }

  function writeLegacyIdentity(profile) {
    applying = true;
    try {
      original.setItem("capylearnV3Profile", JSON.stringify({
        name: profile.name || "Learner",
        avatar: profile.avatar || "🦊"
      }));
      original.setItem("capylearnV3OnboardingDone", "1");
    } finally {
      applying = false;
    }
  }

  function saveActiveSnapshot() {
    const id = getActiveId();
    if (!id) return;
    const profiles = getProfiles();
    const i = profiles.findIndex(p => p.id === id);
    if (i < 0) return;

    profiles[i] = {
      ...profiles[i],
      state: allCurrentProfileState(),
      updatedAt: Date.now()
    };
    saveProfiles(profiles);
  }

  function clearProfileKeys() {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = original.key(i);
      if (isProfileKey(k)) keys.push(k);
    }
    keys.forEach(k => original.removeItem(k));
  }

  function applyProfile(profile) {
    applying = true;
    try {
      clearProfileKeys();
      const state = profile.state && typeof profile.state === "object" ? profile.state : {};
      Object.entries(state).forEach(([k,v]) => {
        if (isProfileKey(k)) original.setItem(k, String(v));
      });
      writeLegacyIdentity(profile);
    } finally {
      applying = false;
    }
  }

  function migrateOnce() {
    let profiles = getProfiles();
    if (profiles.length) {
      if (!getActiveId() || !profiles.some(p => p.id === getActiveId())) {
        original.setItem(ACTIVE, profiles[0].id);
      }
      const active = getActiveProfile();
      if (active) writeLegacyIdentity(active);
      original.setItem(MIGRATED, "1");
      return;
    }

    const existingIdentity = safeParse(original.getItem("capylearnV3Profile"), null);
    const name = String(existingIdentity?.name || "Learner").slice(0,24);
    const avatar = String(existingIdentity?.avatar || "🦊").slice(0,4);

    const first = {
      id: uid(),
      name,
      avatar,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: allCurrentProfileState()
    };
    profiles = [first];
    saveProfiles(profiles);
    original.setItem(ACTIVE, first.id);
    original.setItem(MIGRATED, "1");
    writeLegacyIdentity(first);
  }

  function updateActiveIdentity({name, avatar}) {
    const id = getActiveId();
    const profiles = getProfiles();
    const i = profiles.findIndex(p => p.id === id);
    if (i < 0) return;

    profiles[i].name = String(name || profiles[i].name || "Learner").slice(0,24);
    profiles[i].avatar = String(avatar || profiles[i].avatar || "🦊").slice(0,4);
    profiles[i].updatedAt = Date.now();
    saveProfiles(profiles);
    writeLegacyIdentity(profiles[i]);
  }

  function createProfile(name, avatar) {
    saveActiveSnapshot();
    const profiles = getProfiles();
    const fresh = {
      id: uid(),
      name: String(name || "Learner").slice(0,24),
      avatar: String(avatar || "🦊").slice(0,4),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      state: {}
    };
    profiles.push(fresh);
    saveProfiles(profiles);
    original.setItem(ACTIVE, fresh.id);
    applyProfile(fresh);
    location.reload();
  }

  function switchProfile(id) {
    const current = getActiveId();
    if (id === current) return;
    saveActiveSnapshot();
    const profile = getProfiles().find(p => p.id === id);
    if (!profile) return;
    original.setItem(ACTIVE, id);
    applyProfile(profile);
    location.reload();
  }

  function deleteProfile(id) {
    const profiles = getProfiles();
    if (profiles.length <= 1) {
      alert("Minimal harus ada satu profil learner.");
      return;
    }
    const target = profiles.find(p => p.id === id);
    if (!target) return;
    if (!confirm(`Hapus profil ${target.name}? Progress profil ini juga akan dihapus.`)) return;

    const activeId = getActiveId();
    const nextProfiles = profiles.filter(p => p.id !== id);
    saveProfiles(nextProfiles);

    if (activeId === id) {
      original.setItem(ACTIVE, nextProfiles[0].id);
      applyProfile(nextProfiles[0]);
      location.reload();
    } else {
      renderManager();
    }
  }

  // Capture every existing CapyLearn legacy write into the active profile snapshot.
  localStorage.setItem = function(key, value) {
    original.setItem(key, value);
    if (!applying && isProfileKey(String(key))) {
      queueMicrotask(saveActiveSnapshot);
    }
  };

  localStorage.removeItem = function(key) {
    original.removeItem(key);
    if (!applying && isProfileKey(String(key))) {
      queueMicrotask(saveActiveSnapshot);
    }
  };

  window.addEventListener("beforeunload", saveActiveSnapshot);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") saveActiveSnapshot();
  });

  function esc(s) {
    return String(s).replace(/[&<>"']/g, c => ({
      "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
    }[c]));
  }

  function modalShell(inner) {
    const old = document.getElementById("v4ProfileManager");
    old?.remove();
    const wrap = document.createElement("div");
    wrap.id = "v4ProfileManager";
    wrap.className = "v4-profile-backdrop open";
    wrap.innerHTML = `
      <div class="v4-profile-modal" role="dialog" aria-modal="true" aria-label="Profile Manager">
        <button class="v4-profile-close" aria-label="Close">✕</button>
        ${inner}
      </div>`;
    document.body.appendChild(wrap);
    document.body.classList.add("engagement-modal-open");

    const close = () => {
      wrap.remove();
      document.body.classList.remove("engagement-modal-open");
    };
    wrap.querySelector(".v4-profile-close").addEventListener("click", close);
    wrap.addEventListener("click", e => { if (e.target === wrap) close(); });
    const keyHandler = e => {
      if (e.key === "Escape") {
        close();
        document.removeEventListener("keydown", keyHandler);
      }
    };
    document.addEventListener("keydown", keyHandler);
    return wrap;
  }

  function renderManager() {
    const profiles = getProfiles();
    const activeId = getActiveId();
    const wrap = modalShell(`
      <div class="v4-profile-kicker">👥 LEARNER PROFILES</div>
      <h2>Choose who is learning.</h2>
      <p class="v4-profile-sub">Setiap profil punya stars, XP, words, games, practice, achievements, dan daily mission sendiri.</p>

      <div class="v4-profile-list">
        ${profiles.map(p => `
          <article class="v4-profile-item ${p.id===activeId?"active":""}">
            <button class="v4-profile-main" data-switch="${p.id}">
              <span class="v4-profile-avatar">${esc(p.avatar)}</span>
              <span class="v4-profile-name">
                <strong>${esc(p.name)}</strong>
                <small>${p.id===activeId ? "Active profile" : "Tap to switch"}</small>
              </span>
              <span class="v4-profile-check">${p.id===activeId ? "✓" : "→"}</span>
            </button>
            <button class="v4-profile-delete" data-delete="${p.id}" title="Delete profile">🗑</button>
          </article>
        `).join("")}
      </div>

      <div class="v4-profile-actions">
        <button class="v4-profile-secondary" id="v4RenameActive">Edit active profile</button>
        <button class="v4-profile-primary" id="v4CreateNew">＋ New learner</button>
      </div>
    `);

    wrap.querySelectorAll("[data-switch]").forEach(btn => {
      btn.addEventListener("click", () => switchProfile(btn.dataset.switch));
    });
    wrap.querySelectorAll("[data-delete]").forEach(btn => {
      btn.addEventListener("click", e => {
        e.stopPropagation();
        deleteProfile(btn.dataset.delete);
      });
    });
    wrap.querySelector("#v4CreateNew").addEventListener("click", showCreateForm);
    wrap.querySelector("#v4RenameActive").addEventListener("click", showEditForm);
  }

  function profileForm(mode) {
    const p = getActiveProfile();
    const isCreate = mode === "create";
    const current = isCreate ? {name:"",avatar:"🦊"} : p;
    const avatars = ["🦊","🐼","🐯","🐸","🦄","🐨"];
    const wrap = modalShell(`
      <div class="v4-profile-kicker">${isCreate?"✨ NEW LEARNER":"✏️ EDIT PROFILE"}</div>
      <h2>${isCreate?"Start a fresh journey.":"Update identity only."}</h2>
      <p class="v4-profile-sub">${isCreate
        ? "Profil baru mulai dari progress baru: 120 stars, 0 words, 0 game/practice progress."
        : "Nama atau avatar boleh diganti. Progress profil ini tetap utuh."}</p>

      <label class="v4-label">LEARNER NAME</label>
      <input class="v4-profile-input" id="v4ProfileName" maxlength="24" value="${esc(current?.name || "")}" placeholder="Name">

      <label class="v4-label">AVATAR</label>
      <div class="v4-avatar-grid">
        ${avatars.map(a=>`<button class="v4-avatar-option ${a===current?.avatar?"selected":""}" data-avatar="${a}">${a}</button>`).join("")}
      </div>

      <button class="v4-profile-primary v4-full" id="v4SaveProfile">${isCreate?"Create learner":"Save changes"}</button>
    `);

    let avatar = current?.avatar || "🦊";
    wrap.querySelectorAll(".v4-avatar-option").forEach(b => {
      b.addEventListener("click", () => {
        wrap.querySelectorAll(".v4-avatar-option").forEach(x=>x.classList.remove("selected"));
        b.classList.add("selected");
        avatar = b.dataset.avatar;
      });
    });

    wrap.querySelector("#v4SaveProfile").addEventListener("click", () => {
      const name = wrap.querySelector("#v4ProfileName").value.trim() || "Learner";
      if (isCreate) createProfile(name, avatar);
      else {
        updateActiveIdentity({name, avatar});
        location.reload();
      }
    });
  }

  function showCreateForm() { profileForm("create"); }
  function showEditForm() { profileForm("edit"); }

  migrateOnce();

  window.CapyProfiles = {
    getProfiles,
    getActiveId,
    getActiveProfile,
    saveActiveSnapshot,
    updateActiveIdentity,
    createProfile,
    switchProfile,
    deleteProfile,
    openManager: renderManager,
    showCreateForm,
    showEditForm
  };
})();