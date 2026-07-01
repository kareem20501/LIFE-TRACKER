// ═══════════════════════════════════════════════════════════
//  js/api.js
//  Session-based auth (OTP via Apps Script)
//  يُحمَّل بعد utils.js و state.js
// ═══════════════════════════════════════════════════════════

const API_BASE = 'http://localhost:3000';

/* ══════════════════════════════════════════════════════════
   §1  SESSION MANAGEMENT
   Token مخزون في localStorage
   (يبقى بعد إغلاق التاب/المتصفح — جلسة دائمة)
══════════════════════════════════════════════════════════ */

function loadSessionFromStorage() {
  const token = localStorage.getItem('lt_token');
  const email = localStorage.getItem('lt_email');
  const uid   = localStorage.getItem('lt_uid');
  if (token && uid) {
    STATE.token   = token;
    STATE.email   = email;
    STATE.userId  = uid;
    return true;
  }
  return false;
}

// يُستدعى من app.html بدلاً من loadTokensFromHash
function loadTokensFromHash() {
  return loadSessionFromStorage();
}

function doLogout() {
  // أخبر الـ server بحذف الـ session
  if (STATE.token) {
    fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${STATE.token}`,
      },
    }).catch(() => {});
  }

  // امسح كل شيء
  sessionStorage.removeItem('lt_token');
  sessionStorage.removeItem('lt_email');
  sessionStorage.removeItem('lt_uid');
  localStorage.removeItem('lt_token');
  localStorage.removeItem('lt_email');
  localStorage.removeItem('lt_uid');
  STATE.reset();
  window.location.href = '/';
}

/* ══════════════════════════════════════════════════════════
   §2  CORE FETCH
══════════════════════════════════════════════════════════ */

async function apiFetch(path, opts = {}) {
  if (!STATE.token) { doLogout(); throw new Error('Not logged in'); }

  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${STATE.token}`,
    ...(opts.headers || {}),
  };

  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });

  // Session منتهية → logout
  if (res.status === 401) {
    doLogout();
    throw { status: 401, message: 'Session expired. Please sign in again.' };
  }

  if (res.status === 204) return { ok: true, data: null };

  const json = await res.json();
  if (!res.ok) throw { status: res.status, message: json.error || 'Unknown error' };
  return json;
}

/* ══════════════════════════════════════════════════════════
   §3  API SURFACE
══════════════════════════════════════════════════════════ */

const api = {

  /* ── Auth ─────────────────────────────────────────────── */
  auth: {
    validate: () => apiFetch('/api/auth/validate', { method: 'POST' }),
    logout:   () => doLogout(),
  },

  /* ── Profile ─────────────────────────────────────────── */
  profile: {
    get:    ()  => apiFetch('/api/profile'),
    update: (b) => apiFetch('/api/profile', { method: 'PUT', body: JSON.stringify(b) }),
  },

  /* ── Dashboard ────────────────────────────────────────── */
  dashboard: {
    get: () => apiFetch('/api/dashboard'),
  },

  /* ── Languages ────────────────────────────────────────── */
  languages: {
    list:   ()    => apiFetch('/api/languages'),
    create: (b)   => apiFetch('/api/languages', { method: 'POST', body: JSON.stringify(b) }),
    delete: (id)  => apiFetch(`/api/languages/${id}`, { method: 'DELETE' }),
  },

  /* ── Skills ───────────────────────────────────────────── */
  skills: {
    forLang: (langId) => apiFetch(`/api/skills?lang=${langId}`),
    create:  (b)      => apiFetch('/api/skills', { method: 'POST', body: JSON.stringify(b) }),
    update:  (id, b)  => apiFetch(`/api/skills/${id}`, { method: 'PUT', body: JSON.stringify(b) }),
    delete:  (id)     => apiFetch(`/api/skills/${id}`, { method: 'DELETE' }),
  },

  /* ── Entries ──────────────────────────────────────────── */
  entries: {
    forDate:  (date)          => apiFetch(`/api/entries?date=${date}`),
    forSkill: (id, from, to)  => {
      const p = new URLSearchParams({ skill: id });
      if (from) p.set('from', from);
      if (to)   p.set('to', to);
      return apiFetch(`/api/entries?${p}`);
    },
    upsert: (b) => apiFetch('/api/entries', { method: 'POST', body: JSON.stringify(b) }),
    delete: (skillId, date) => apiFetch(`/api/entries?skill=${skillId}&date=${date}`, { method: 'DELETE' }),
  },

  /* ── League ───────────────────────────────────────────── */
  league: {
    get: () => apiFetch('/api/league'),
  },

  /* ── Streaks ──────────────────────────────────────────── */
  streaks: {
    forSkill: (id) => apiFetch(`/api/streaks?skill=${id}`),
  },

  /* ── Achievements Seen (cross-device) ─────────────────── */
  achievements: {
    getSeen:  ()      => apiFetch('/api/achievements/seen'),
    markSeen: (ids)   => apiFetch('/api/achievements/seen', { method: 'POST', body: JSON.stringify({ ids }) }),
  },

  /* ── Support / Feedback ───────────────────────────────── */
  support: {
    sendFeedback: (b) => apiFetch('/api/support/feedback', { method: 'POST', body: JSON.stringify(b) }),
  },
};

/* ══════════════════════════════════════════════════════════
   §4  HIGH-LEVEL LOADERS
══════════════════════════════════════════════════════════ */

async function loadProfile() {
  const { data } = await api.profile.get();
  STATE.profile  = data;
  _updateSidebarProfile();
}

async function loadDashboard() {
  _setSyncStatus('syncing');
  try {
    const { data } = await api.dashboard.get();

    STATE.languages = data.languages || [];
    STATE.skills    = [];
    STATE.xpMap     = {};
    STATE.streakMap = {};
    STATE.todayMap  = {};

    STATE.languages.forEach(lang => {
      (lang.skills || []).forEach(s => {
        STATE.skills.push(s);
        STATE.xpMap[s.id]     = s.total_xp      || 0;
        STATE.streakMap[s.id] = {
          current:  s.current_streak || 0,
          longest:  s.longest_streak || 0,
          last_date: s.last_log_date || null,
        };
        STATE.todayMap[s.id] = s.today_value || 0;
      });
    });

    STATE.overallXP    = data.overall?.total_xp || 0;
    STATE.overallLevel = data.overall?.level    || 1;

    _setSyncStatus('ok');
    _updateSidebarProfile();
  } catch (err) {
    console.error('[loadDashboard]', err);
    _setSyncStatus('error');
    toast('Failed to load data — check connection', 'error');
    throw err;
  }
}

/* ══════════════════════════════════════════════════════════
   §5  SIDEBAR HELPERS
══════════════════════════════════════════════════════════ */

function _setSyncStatus(s) {
  const el = document.getElementById('sync-dot');
  if (el) el.className = 'sync-dot ' + s;
}

function _updateSidebarProfile() {
  const p = STATE.profile;
  if (!p) return;

  const name   = p.display_name || p.email?.split('@')[0] || 'User';
  const nameEl = document.getElementById('sb-name');
  const emlEl  = document.getElementById('sb-email');
  const avWrap = document.getElementById('sb-avatar-wrap');

  if (nameEl)  nameEl.textContent  = name;
  if (emlEl)   emlEl.textContent   = p.email || '';

  if (avWrap) {
    if (p.avatar_url) {
      avWrap.innerHTML = `<img src="${p.avatar_url}" alt="${name}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
    } else {
      const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
      avWrap.innerHTML = `<span style="font-family:'DM Sans',sans-serif;font-size:17px;font-weight:700;color:#fff">${initials}</span>`;
    }
  }

  const info     = getLevelInfo(STATE.overallXP || 0, XP_OVERALL);
  const lvlEl    = document.getElementById('sb-level-lbl');
  const xpValEl  = document.getElementById('sb-xp-val');
  const xpFillEl = document.getElementById('sb-xp-fill');

  if (lvlEl)    lvlEl.textContent   = `Lv ${info.level} · ${info.rank.label}`;
  if (xpValEl)  xpValEl.textContent = `${fmtNum(Math.round(STATE.overallXP))} XP`;
  if (xpFillEl) xpFillEl.style.width = info.pct + '%';
}
