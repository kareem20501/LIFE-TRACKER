
// ═══════════════════════════════════════════════════════════

const http    = require('http');
const fs      = require('fs');
const path    = require('path');

/* ── استيراد Supabase (يدعم CommonJS) ── */
let createClient;
try {
  ({ createClient } = require('@supabase/supabase-js'));
} catch(e) {
  console.error('❌  Run:  npm install @supabase/supabase-js node-fetch');
  process.exit(1);
}

/* ══════════════════════════════════════════════════════════
   §1  CONFIG
══════════════════════════════════════════════════════════ */
coconst PORT = process.env.PORT || 3000;
const SUPABASE_URL     = process.env.SUPABASE_URL     || '';
const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_KEY || '';
const APPS_SCRIPT_URL  = process.env.APPS_SCRIPT_URL  || '';
const ADMIN_KEY        = process.env.ADMIN_KEY         || '';
const __root = __dirname;

/* ══════════════════════════════════════════════════════════
   §2  SUPABASE CLIENT (service_role — كل الصلاحيات)
══════════════════════════════════════════════════════════ */
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ══════════════════════════════════════════════════════════
   §3  IN-MEMORY SESSION STORE
   token (string) → { userId, email, expiresAt }
   يُمسح عند إعادة تشغيل السيرفر — مناسب للـ dev
   في الإنتاج: خزّن في Redis أو Supabase table
══════════════════════════════════════════════════════════ */
const sessions = new Map();

function createSession(userId, email) {
  const token     = randomToken();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { userId, email, expiresAt });
  // ملاحظة: لا تستخدم setTimeout(fn, SESSION_TTL_MS) هنا —
  // SESSION_TTL_MS (30 يوم = 2,592,000,000ms) أكبر من الحد الأقصى المسموح
  // لـ setTimeout في Node.js (2,147,483,647ms ≈ 24.8 يوم، حد 32-bit signed int).
  // أي قيمة أكبر من كده بتعمل overflow وبتخلي الـ callback ينفّذ فورًا تقريبًا،
  // وده كان بيمسح الـ session لحظة إنشائها! التنظيف الدوري تحت كافي وآمن.
  return { token, expiresAt };
}

function getSession(token) {
  if (!token) return null;
  const s = sessions.get(token);
  if (!s) return null;
  if (Date.now() > s.expiresAt) { sessions.delete(token); return null; }
  return s;
}

function deleteSession(token) { sessions.delete(token); }

// تنظيف دوري آمن للـ sessions المنتهية (كل ساعة) بدل setTimeout لكل session
setInterval(() => {
  const now = Date.now();
  for (const [token, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(token);
  }
}, 60 * 60 * 1000); // كل ساعة

function randomToken() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let t = '';
  for (let i = 0; i < 64; i++) t += chars[Math.floor(Math.random() * chars.length)];
  return t + Date.now().toString(36);
}

/* ══════════════════════════════════════════════════════════
   §4  HTTP HELPERS
══════════════════════════════════════════════════════════ */
function cors(res) {
  res.setHeader('Access-Control-Allow-Origin',  '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function sendJSON(res, status, data) {
  cors(res);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

const ok        = (res, d)   => sendJSON(res, 200, { ok: true,  data: d });
const created   = (res, d)   => sendJSON(res, 201, { ok: true,  data: d });
const noContent = (res)      => { cors(res); res.writeHead(204); res.end(); };
const notFound  = (res)      => sendJSON(res, 404, { ok: false, error: 'Not found' });
const badReq    = (res, msg) => sendJSON(res, 400, { ok: false, error: msg });
const unauth    = (res)      => sendJSON(res, 401, { ok: false, error: 'Unauthorized' });
const forbidden = (res, msg) => sendJSON(res, 403, { ok: false, error: msg || 'Forbidden' });
const serverErr = (res, err) => {
  console.error('[server error]', err);
  sendJSON(res, 500, { ok: false, error: err.message || 'Server error' });
};

function parseBody(req) {
  return new Promise(resolve => {
    let b = '';
    req.on('data', c => { b += c.toString(); if (b.length > 1e6) { b = '{}'; } });
    req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
  });
}

/* ── استخراج token من Authorization header ── */
function extractToken(req) {
  const h = req.headers['authorization'] || '';
  if (h.startsWith('Bearer ')) return h.slice(7).trim();
  return null;
}

/* ── middleware: يتحقق من الـ session ── */
function requireAuth(req, res) {
  const token = extractToken(req);
  const s     = getSession(token);
  if (!s) { unauth(res); return null; }
  return s;
}

/* ══════════════════════════════════════════════════════════
   §5  APPS SCRIPT PROXY
   الـ frontend يتكلم مع الـ server،
   والـ server يتكلم مع Apps Script
   (يتجنب CORS issues مع Apps Script)
══════════════════════════════════════════════════════════ */
async function appsScriptCall(body) {
  // node-fetch dynamic import
  const fetch = (await import('node-fetch')).default;

  let res;
  try {
    res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
      redirect: 'follow',
    });
  } catch (err) {
    console.error('[appsScriptCall] network error reaching Apps Script:', err.message);
    throw new Error('تعذّر الوصول إلى Apps Script — تحقق من الاتصال بالإنترنت أو من الرابط.');
  }

  const raw = await res.text();

  // اطبع أول 500 حرف من الرد عشان تشوف فعليًا إيه اللي راجع من Google
  console.log('[appsScriptCall] HTTP status:', res.status);
  console.log('[appsScriptCall] raw response (first 500 chars):', raw.slice(0, 500));

  let json;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    // الرد مش JSON — غالبًا صفحة HTML من جوجل (مشكلة صلاحيات الـ deployment)
    console.error('[appsScriptCall] Apps Script لم يُرجع JSON صالح.');
    throw new Error(
      'Apps Script رجّع رد غير صالح (مش JSON). راجع إعدادات الـ Deployment: ' +
      'Execute as = Me, Who has access = Anyone، وتأكد إن الرابط هو آخر /exec بعد آخر Deploy.'
    );
  }
  return json;
}

/* ══════════════════════════════════════════════════════════
   §6  FIXED SKILLS (تُضاف تلقائياً عند إنشاء لغة)
══════════════════════════════════════════════════════════ */
const FIXED_SKILLS = [
  { key:'new_words',    name:'New Words',    unit:'words', goal:30,  xp_per_unit:5,  is_checkbox:false, can_edit_xp:false },
  { key:'review_words', name:'Reviewing',    unit:'words', goal:100, xp_per_unit:2,  is_checkbox:false, can_edit_xp:false },
  { key:'reading',      name:'Reading',      unit:'pages', goal:3,   xp_per_unit:50, is_checkbox:false, can_edit_xp:false },
  { key:'listening',    name:'Listening',    unit:'min',   goal:60,  xp_per_unit:3,  is_checkbox:false, can_edit_xp:false },
  { key:'speaking',     name:'Speaking',     unit:'min',   goal:30,  xp_per_unit:7,  is_checkbox:false, can_edit_xp:false },
  { key:'touch_typing', name:'Touch Typing', unit:'check', goal:1,   xp_per_unit:0,  is_checkbox:true,  can_edit_xp:false },
];

/* ══════════════════════════════════════════════════════════
   §7  STATIC FILE SERVER
══════════════════════════════════════════════════════════ */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
};

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath)) return false;
  const ext  = path.extname(filePath).toLowerCase();
  const ct   = MIME[ext] || 'text/plain';
  cors(res);
  res.writeHead(200, { 'Content-Type': ct });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

/* ══════════════════════════════════════════════════════════
   §8  SUPABASE HELPERS
══════════════════════════════════════════════════════════ */
async function dbQuery(table, filters = {}) {
  let q = supabase.from(table).select('*');
  Object.entries(filters).forEach(([k, v]) => { q = q.eq(k, v); });
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

/* ══════════════════════════════════════════════════════════
   §9  MAIN REQUEST HANDLER
══════════════════════════════════════════════════════════ */
async function handle(req, res) {
  const url    = new URL(req.url, `http://localhost:${PORT}`);
  const p      = url.pathname;
  const method = req.method.toUpperCase();

  /* ── OPTIONS preflight ── */
  if (method === 'OPTIONS') { cors(res); res.writeHead(204); return res.end(); }

  /* ══════════════════════════════════════════════════════
     STATIC FILES
  ══════════════════════════════════════════════════════ */
  if (!p.startsWith('/api/')) {
    // صفحة Login
    if (p === '/' || p === '/login') {
      return serveStatic(res, path.join(__root, 'login.html')) || notFound(res);
    }
    // صفحة App
    if (p === '/app') {
      return serveStatic(res, path.join(__root, 'app.html')) || notFound(res);
    }
    // JS files
    if (p.startsWith('/js/')) {
      return serveStatic(res, path.join(__root, p)) || notFound(res);
    }
    // Page partials
    if (p.startsWith('/pages/')) {
      return serveStatic(res, path.join(__root, p)) || notFound(res);
    }
    // أي ملف آخر
    return serveStatic(res, path.join(__root, p.slice(1))) || notFound(res);
  }

  /* ══════════════════════════════════════════════════════
     API ROUTES
  ══════════════════════════════════════════════════════ */
  try {

    /* ────────────────────────────────────────────────────
       AUTH — OTP PROXY
    ──────────────────────────────────────────────────── */

    // POST /api/auth/send_otp
    if (p === '/api/auth/send_otp' && method === 'POST') {
      const b = await parseBody(req);
      if (!b.email) return badReq(res, 'Email required');

      const result = await appsScriptCall({ action: 'send_otp', email: b.email });
      return ok(res, result);
    }

    // POST /api/auth/verify_otp
    if (p === '/api/auth/verify_otp' && method === 'POST') {
      const b = await parseBody(req);
      if (!b.email || !b.otp) return badReq(res, 'Email and OTP required');

      const result = await appsScriptCall({ action: 'verify_otp', email: b.email, otp: b.otp });

      if (!result.ok) return ok(res, result); // أعد الخطأ للـ frontend

      // OTP صحيح → أنشئ أو احضر المستخدم في Supabase
      const email = b.email.trim().toLowerCase();

      // هل المستخدم موجود؟
      let { data: profile, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;

      // مش موجود → أنشئه
      if (!profile) {
        const displayName = email.split('@')[0].replace(/[._-]/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        const { data: newProfile, error: insertErr } = await supabase
          .from('profiles')
          .insert({ email, display_name: displayName })
          .select()
          .single();
        if (insertErr) throw insertErr;
        profile = newProfile;
      }

      // أنشئ session
      const { token, expiresAt } = createSession(profile.id, email);

      return ok(res, {
        ok:        true,
        token,
        expiresAt,
        email:     profile.email,
        userId:    profile.id,
      });
    }

    // POST /api/auth/validate
    if (p === '/api/auth/validate' && method === 'POST') {
      const b     = await parseBody(req);
      const token = b.token || extractToken(req);
      const s     = getSession(token);
      if (!s) return ok(res, { ok: false, error: 'Session expired' });
      return ok(res, { ok: true, userId: s.userId, email: s.email, expiresAt: s.expiresAt });
    }

    // POST /api/auth/logout
    if (p === '/api/auth/logout' && method === 'POST') {
      const token = extractToken(req);
      if (token) deleteSession(token);
      return ok(res, { ok: true });
    }

    /* ────────────────────────────────────────────────────
       ADMIN ROUTES — محمية بـ ADMIN_KEY الخاص بيها، مش بـ
       session المستخدم العادي، فلازم تتفحص قبل requireAuth
    ──────────────────────────────────────────────────── */
    if (p.startsWith('/api/admin/')) {
      return await handleAdmin(req, res, p, method);
    }

    /* ────────────────────────────────────────────────────
       كل الـ routes التالية تحتاج auth
    ──────────────────────────────────────────────────── */
    const sess = requireAuth(req, res);
    if (!sess) return; // unauth أُرسل بالفعل
    const userId = sess.userId;

    /* ────────────────────────────────────────────────────
       PROFILE
    ──────────────────────────────────────────────────── */
    if (p === '/api/profile') {
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
        if (error) throw error;
        return ok(res, data);
      }

      if (method === 'PUT') {
        const b       = await parseBody(req);
        const allowed = {};
        if (b.display_name !== undefined) allowed.display_name = String(b.display_name).trim().slice(0, 60);
        if (b.bio          !== undefined) allowed.bio          = String(b.bio).trim().slice(0, 300);
        if (b.timezone     !== undefined) allowed.timezone     = b.timezone;
        if (b.theme        !== undefined) allowed.theme        = b.theme;

        const { data, error } = await supabase
          .from('profiles')
          .update(allowed)
          .eq('id', userId)
          .select()
          .single();
        if (error) throw error;
        return ok(res, data);
      }
    }

    /* ────────────────────────────────────────────────────
       DASHBOARD
    ──────────────────────────────────────────────────── */
    if (p === '/api/dashboard' && method === 'GET') {
      const { data, error } = await supabase.rpc('get_dashboard', { p_user_id: userId });
      if (error) throw error;
      return ok(res, data);
    }

    /* ────────────────────────────────────────────────────
       LANGUAGES
    ──────────────────────────────────────────────────── */
    if (p === '/api/languages') {
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('languages')
          .select('*')
          .eq('user_id', userId)
          .order('sort_order');
        if (error) throw error;
        return ok(res, data);
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        if (!b.code || !b.name) return badReq(res, 'code and name required');

        // تحقق من الحد الأقصى
        const { count } = await supabase
          .from('languages')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId);
        if (count >= 2) return badReq(res, 'Maximum 2 languages per account');

        // تحقق من التكرار
        const { data: existing } = await supabase
          .from('languages')
          .select('id')
          .eq('user_id', userId)
          .eq('code', b.code)
          .single();
        if (existing) return badReq(res, `You already study ${b.name}`);

        // أنشئ اللغة
        const { data: lang, error: langErr } = await supabase
          .from('languages')
          .insert({ user_id: userId, code: b.code, name: b.name, flag: b.flag || '🌐' })
          .select()
          .single();
        if (langErr) throw langErr;

        // أنشئ المهارات الثابتة
        const skillsToInsert = FIXED_SKILLS.map((sk, i) => ({
          lang_id:     lang.id,
          key:         sk.key,
          name:        sk.name,
          unit:        sk.unit,
          goal:        sk.goal,
          xp_per_unit: sk.xp_per_unit,
          is_checkbox: sk.is_checkbox,
          can_edit_xp: sk.can_edit_xp,
          is_custom:   false,
          sort_order:  i,
        }));
        const { error: skillsErr } = await supabase.from('skills').insert(skillsToInsert);
        if (skillsErr) throw skillsErr;

        return created(res, lang);
      }
    }

    // DELETE /api/languages/:id
    const langMatch = p.match(/^\/api\/languages\/([a-zA-Z0-9-]+)$/);
    if (langMatch && method === 'DELETE') {
      const langId = langMatch[1];
      // تحقق من الملكية
      const { data: lang } = await supabase
        .from('languages').select('id').eq('id', langId).eq('user_id', userId).single();
      if (!lang) return forbidden(res, 'Language not found');

      const { error } = await supabase.from('languages').delete().eq('id', langId);
      if (error) throw error;
      return noContent(res);
    }

    /* ────────────────────────────────────────────────────
       SKILLS
    ──────────────────────────────────────────────────── */
    if (p === '/api/skills') {
      if (method === 'GET') {
        const langId = url.searchParams.get('lang');
        let q = supabase.from('skills').select(`*, languages!inner(user_id)`);
        q = q.eq('languages.user_id', userId);
        if (langId) q = q.eq('lang_id', langId);
        q = q.order('sort_order');
        const { data, error } = await q;
        if (error) throw error;
        // أزل الـ join data
        return ok(res, (data || []).map(s => { const {languages, ...rest} = s; return rest; }));
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        if (!b.lang_id || !b.name) return badReq(res, 'lang_id and name required');

        // تحقق من الملكية
        const { data: lang } = await supabase
          .from('languages').select('id').eq('id', b.lang_id).eq('user_id', userId).single();
        if (!lang) return forbidden(res, 'Language not found');

        // تحقق من الحد الأقصى للمهارات المخصصة
        const { count } = await supabase
          .from('skills')
          .select('id', { count: 'exact', head: true })
          .eq('lang_id', b.lang_id)
          .eq('is_custom', true);
        if (count >= 3) return badReq(res, 'Maximum 3 custom skills per language');

        const { data: skill, error } = await supabase
          .from('skills')
          .insert({
            lang_id:     b.lang_id,
            key:         'custom_' + Date.now(),
            name:        String(b.name).trim().slice(0, 80),
            unit:        String(b.unit || 'units').trim().slice(0, 20),
            goal:        Math.max(0.1, Number(b.goal) || 1),
            xp_per_unit: Math.max(0.1, Number(b.xp_per_unit) || 1),
            is_checkbox: false,
            can_edit_xp: true,
            is_custom:   true,
          })
          .select()
          .single();
        if (error) throw error;
        return created(res, skill);
      }
    }

    // PUT / DELETE /api/skills/:id
    const skillMatch = p.match(/^\/api\/skills\/([a-zA-Z0-9-]+)$/);
    if (skillMatch) {
      const skillId = skillMatch[1];

      // تحقق من الملكية
      const { data: skill } = await supabase
        .from('skills')
        .select('*, languages!inner(user_id)')
        .eq('id', skillId)
        .eq('languages.user_id', userId)
        .single();
      if (!skill) return forbidden(res, 'Skill not found');

      if (method === 'PUT') {
        const b       = await parseBody(req);
        const allowed = {};
        if (b.goal !== undefined) allowed.goal = Math.max(0.1, Number(b.goal));
        if (b.xp_per_unit !== undefined && skill.can_edit_xp) allowed.xp_per_unit = Math.max(0.1, Number(b.xp_per_unit));
        if (b.name !== undefined && skill.is_custom) allowed.name = String(b.name).trim().slice(0, 80);
        if (b.unit !== undefined && skill.is_custom) allowed.unit = String(b.unit).trim().slice(0, 20);

        const { data, error } = await supabase
          .from('skills').update(allowed).eq('id', skillId).select().single();
        if (error) throw error;
        return ok(res, data);
      }

      if (method === 'DELETE') {
        if (!skill.is_custom) return badReq(res, 'Cannot delete fixed skills');
        const { error } = await supabase.from('skills').delete().eq('id', skillId);
        if (error) throw error;
        return noContent(res);
      }
    }

    /* ────────────────────────────────────────────────────
       ENTRIES
    ──────────────────────────────────────────────────── */
    if (p === '/api/entries') {
      if (method === 'GET') {
        const date    = url.searchParams.get('date');
        const skillId = url.searchParams.get('skill');
        const from    = url.searchParams.get('from');
        const to      = url.searchParams.get('to');

        if (date) {
          const { data, error } = await supabase
            .from('entries')
            .select('*')
            .eq('user_id', userId)
            .eq('log_date', date);
          if (error) throw error;
          return ok(res, data);
        }

        if (skillId) {
          // تحقق من الملكية
          const { data: sk } = await supabase
            .from('skills')
            .select('id, languages!inner(user_id)')
            .eq('id', skillId)
            .eq('languages.user_id', userId)
            .single();
          if (!sk) return forbidden(res, 'Skill not found');

          let q = supabase.from('entries').select('*').eq('skill_id', skillId).eq('user_id', userId);
          if (from) q = q.gte('log_date', from);
          if (to)   q = q.lte('log_date', to);
          q = q.order('log_date');
          const { data, error } = await q;
          if (error) throw error;
          return ok(res, data);
        }

        return badReq(res, 'Provide ?date= or ?skill=');
      }

      if (method === 'POST') {
        const b = await parseBody(req);
        const { skill_id, log_date, value } = b;
        if (!skill_id || !log_date || value === undefined) return badReq(res, 'skill_id, log_date, value required');
        if (Number(value) < 0) return badReq(res, 'value cannot be negative');

        const { data, error } = await supabase.rpc('upsert_entry', {
          p_skill_id: skill_id,
          p_log_date: log_date,
          p_value:    Number(value),
          p_user_id:  userId,
        });
        if (error) throw error;
        return ok(res, data);
      }

      if (method === 'DELETE') {
        const skillId = url.searchParams.get('skill');
        const date    = url.searchParams.get('date');
        if (!skillId || !date) return badReq(res, 'Provide ?skill= and ?date=');

        const { error } = await supabase
          .from('entries')
          .delete()
          .eq('user_id', userId)
          .eq('skill_id', skillId)
          .eq('log_date', date);
        if (error) throw error;
        return noContent(res);
      }
    }

    /* ────────────────────────────────────────────────────
       STREAKS
    ──────────────────────────────────────────────────── */
    if (p === '/api/streaks' && method === 'GET') {
      const skillId = url.searchParams.get('skill');
      if (!skillId) return badReq(res, 'Provide ?skill=');

      const { data, error } = await supabase.rpc('calc_streak', {
        p_skill_id: skillId,
        p_user_id:  userId,
      });
      if (error) throw error;
      return ok(res, { skill_id: skillId, current_streak: data, longest_streak: 0 });
    }

    /* ────────────────────────────────────────────────────
       LEAGUE
    ──────────────────────────────────────────────────── */
    if (p === '/api/league' && method === 'GET') {
      const { data, error } = await supabase.rpc('get_league');
      if (error) throw error;
      return ok(res, data);
    }

    /* ────────────────────────────────────────────────────
       ACHIEVEMENT SEEN (sync across devices)
    ──────────────────────────────────────────────────── */
    if (p === '/api/achievements/seen') {
      if (method === 'GET') {
        const { data, error } = await supabase
          .from('achievement_seen')
          .select('achievement_id')
          .eq('user_id', userId);
        if (error) throw error;
        return ok(res, (data || []).map(r => r.achievement_id));
      }

      if (method === 'POST') {
        const b    = await parseBody(req);
        const ids  = Array.isArray(b.ids) ? b.ids : [];
        if (ids.length === 0) return ok(res, []);

        const rows = ids.map(id => ({ user_id: userId, achievement_id: String(id).slice(0, 100) }));
        const { error } = await supabase
          .from('achievement_seen')
          .upsert(rows, { onConflict: 'user_id,achievement_id' });
        if (error) throw error;
        return ok(res, { saved: ids.length });
      }
    }

    /* ────────────────────────────────────────────────────
       SUPPORT / FEEDBACK
       يتطلب auth (المستخدم لازم يكون مسجل دخول) — بيبعت
       الرسالة لـ Apps Script اللي بيحفظها في شيت Feedback
    ──────────────────────────────────────────────────── */
    if (p === '/api/support/feedback' && method === 'POST') {
      const b       = await parseBody(req);
      const subject = String(b.subject || '').trim().slice(0, 100);
      const message = String(b.message || '').trim().slice(0, 1000);
      if (!subject || !message) return badReq(res, 'subject and message required');

      try {
        const result = await appsScriptCall({
          action:  'send_feedback',
          email:   sess.email,
          subject,
          message,
        });
        return ok(res, result);
      } catch (err) {
        // فشل الوصول لـ Apps Script — لا نمنع المستخدم من المتابعة،
        // الـ frontend عنده fallback (mailto:) في هذه الحالة
        console.error('[feedback] appsScriptCall failed:', err.message);
        return ok(res, { ok: true, note: 'apps_script_unreachable' });
      }
    }

    notFound(res);

  } catch (err) {
    serverErr(res, err);
  }
}

/* ══════════════════════════════════════════════════════════
   §9b  ADMIN ROUTES (مخفية — لا روابط أو أزرار في الفرونت إند)
   تُستدعى يدويًا فقط (Postman/curl) بعد مراجعة طلب صورة في
   شيت Feedback. محمية بـ ADMIN_KEY عبر header وليس عبر session.
══════════════════════════════════════════════════════════ */
async function handleAdmin(req, res, p, method) {
  // POST /api/admin/set-avatar
  // Headers: x-admin-key: <ADMIN_KEY>
  // Body: { email, avatar_url }
  if (p === '/api/admin/set-avatar' && method === 'POST') {
    const key = req.headers['x-admin-key'] || '';
    if (key !== ADMIN_KEY) return unauth(res);

    const b = await parseBody(req);
    const email      = String(b.email || '').trim().toLowerCase();
    const avatarUrl  = String(b.avatar_url || '').trim();
    if (!email || !avatarUrl) return badReq(res, 'email and avatar_url required');

    const { data, error } = await supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('email', email)
      .select('id, email, avatar_url')
      .single();

    if (error) throw error;
    if (!data) return notFound(res);
    return ok(res, data);
  }

  notFound(res);
}

/* ══════════════════════════════════════════════════════════
   §10  START
══════════════════════════════════════════════════════════ */
http.createServer(handle).listen(PORT, async () => {
  // اختبر الاتصال بـ Supabase
  const { error } = await supabase.from('profiles').select('id').limit(1);
  if (error) {
    console.warn('\n⚠️  Supabase connection warning:', error.message);
    console.warn('   تأكد من SUPABASE_SERVICE_KEY الصحيح\n');
  } else {
    console.log('✅  Supabase connected');
  }

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   Life Tracker — Development Server          ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log(`║   http://localhost:${PORT}                      ║`);
  console.log('║   Login:  http://localhost:3000/             ║');
  console.log('║   App:    http://localhost:3000/app          ║');
  console.log('╠══════════════════════════════════════════════╣');
  console.log('║   Ctrl+C to stop                             ║');
  console.log('╚══════════════════════════════════════════════╝\n');
});
