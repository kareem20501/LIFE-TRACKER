// ═══════════════════════════════════════════════════════════
//  js/state.js
//  الحالة المشتركة بين كل الصفحات
// ═══════════════════════════════════════════════════════════

window.STATE = {

  /* ── Auth (session-based) ──────────────────────────────── */
  token:   null,   // session token — في الذاكرة فقط (يُحمَّل من sessionStorage في api.js)
  userId:  null,   // UUID من Supabase profiles
  email:   null,   // إيميل المستخدم الحالي

  /* ── Profile ────────────────────────────────────────────── */
  profile: null,

  /* ── Languages ──────────────────────────────────────────── */
  languages: [],

  /* ── Skills (flat list) ─────────────────────────────────── */
  skills: [],

  /* ── Cached aggregates ──────────────────────────────────── */
  xpMap:     {},   // skill_id → total_xp
  streakMap: {},   // skill_id → { current, longest, last_date }
  todayMap:  {},   // skill_id → today_value

  /* ── Overall ─────────────────────────────────────────────── */
  overallXP:    0,
  overallLevel: 1,

  /* ── League cache ────────────────────────────────────────── */
  leagueRows: [],

  /* ── UI ──────────────────────────────────────────────────── */
  currentPage: 'log',
  detailSkill: null,
  detailRange: 'day',
  detailCalY:  new Date().getFullYear(),
  detailCalM:  new Date().getMonth(),

  /* ── Active language per page (persisted across refresh) ───
     يُخزَّن في sessionStorage عشان ميتمسحش لو المستخدم عمل
     refresh للصفحة — وإلا كل صفحة بترجع للغة الأولى دايمًا. ──*/
  getActiveLang(scope) {
    const fromStorage = sessionStorage.getItem('lt_active_lang_' + scope);
    if (fromStorage && this.languages.find(l => l.id === fromStorage)) {
      return fromStorage;
    }
    return this.languages.length > 0 ? this.languages[0].id : null;
  },

  setActiveLang(scope, langId) {
    if (langId) sessionStorage.setItem('lt_active_lang_' + scope, langId);
  },

  /* ── Helpers ─────────────────────────────────────────────── */
  get tz() {
    return this.profile?.timezone || 'Africa/Cairo';
  },

  get today() {
    return todayStr(this.tz);
  },

  skillsForLang(langId) {
    return this.skills.filter(s => s.lang_id === langId);
  },

  xpForLang(langId) {
    return this.skillsForLang(langId)
      .reduce((sum, s) => sum + (this.xpMap[s.id] || 0), 0);
  },

  reset() {
    this.token        = null;
    this.userId       = null;
    this.email        = null;
    this.profile      = null;
    this.languages    = [];
    this.skills       = [];
    this.xpMap        = {};
    this.streakMap    = {};
    this.todayMap     = {};
    this.overallXP    = 0;
    this.overallLevel = 1;
    this.leagueRows   = [];
  },
};