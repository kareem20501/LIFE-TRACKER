// ═══════════════════════════════════════════════════════════
//  js/utils.js
//  دوال مشتركة بين كل الصفحات
//  يُحمَّل أول شيء في app.html قبل أي ملف آخر
// ═══════════════════════════════════════════════════════════

/* ── XP Constants ─────────────────────────────────────────── */
const XP_SKILL   = 500;
const XP_LANG    = 1000;
const XP_OVERALL = 1500;
const LVL_MAX    = 100;

/* ── Fixed skills definition ──────────────────────────────── */
// كل لغة تُنشأ بهذه المهارات الـ6 تلقائياً
const FIXED_SKILLS = [
  { key:'new_words',     name:'New Words',      unit:'words', goal:30,  xpU:5,  icon:'📘', iconName:'book-plus',  canEditXP:false },
  { key:'review_words',  name:'Reviewing',      unit:'words', goal:100, xpU:2,  icon:'🔁', iconName:'repeat',     canEditXP:false },
  { key:'reading',       name:'Reading',        unit:'pages', goal:3,   xpU:50, icon:'📖', iconName:'book-open',  canEditXP:false },
  { key:'listening',     name:'Listening',      unit:'min',   goal:60,  xpU:3,  icon:'🎧', iconName:'headphones', canEditXP:false },
  { key:'speaking',      name:'Speaking',       unit:'min',   goal:30,  xpU:7,  icon:'🗣️', iconName:'mic',        canEditXP:false },
  { key:'touch_typing',  name:'Touch Typing',   unit:'check', goal:1,   xpU:0,  icon:'⌨️', iconName:'keyboard',   canEditXP:false, isCheckbox:true },
];

/* ══════════════════════════════════════════════════════════
   FLAG ICONS — flag-icons CDN classes بدل الإيموجي
   flagIconHTML(countryCode, size) → <span class="fi fi-xx">
   ملاحظة: كود الدولة لـ flag-icons مختلف أحيانًا عن كود اللغة
   (مثلاً en→gb, ar→sa, zh→cn, uk→ua, ko→kr, ja→jp)
══════════════════════════════════════════════════════════ */
function flagIconHTML(countryCode, size) {
  const code  = (countryCode || 'un').toLowerCase();
  const style = size ? `style="width:${size}px;height:${Math.round(size * 0.75)}px;border-radius:2px;display:inline-block;vertical-align:middle"` : 'style="display:inline-block;vertical-align:middle"';
  return `<span class="fi fi-${code}" ${style}></span>`;
}

// يرجع كود الدولة (iso) المطابق لكود اللغة من LANGUAGES — fallback إلى 'un'
function langIso(langCode) {
  const ld = LANGUAGES.find(l => l.code === langCode);
  return ld ? ld.iso : 'un';
}
// يرجع كود الدولة (iso) المطابق لاسم اللغة (name) من LANGUAGES — fallback إلى 'un'
function langIsoByName(langName) {
  const ld = LANGUAGES.find(l => l.name === langName);
  return ld ? ld.iso : 'un';
}

/* ══════════════════════════════════════════════════════════
   ICON SYSTEM — Lucide-style inline SVG icons (no emojis)
   icon(name, size, strokeWidth) → <svg> string
══════════════════════════════════════════════════════════ */
const ICON_PATHS = {
  'list-checks':    '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  'trending-up':    '<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
  'swords':         '<polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/><line x1="13" x2="19" y1="19" y2="13"/><line x1="16" x2="20" y1="16" y2="20"/><line x1="19" x2="21" y1="21" y2="19"/><polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/><line x1="5" x2="9" y1="14" y2="18"/><line x1="4" x2="8" y1="17" y2="21"/><line x1="3" x2="5" y1="19" y2="21"/>',
  'settings':       '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  'message-circle': '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>',
  'book-plus':      '<path d="M12 7v6"/><path d="M9 10h6"/><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  'repeat':         '<path d="m17 2 4 4-4 4"/><path d="M3 11v-1a4 4 0 0 1 4-4h14"/><path d="m7 22-4-4 4-4"/><path d="M21 13v1a4 4 0 0 1-4 4H3"/>',
  'mic':            '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/>',
  'headphones':     '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3v-7a9 9 0 1 1 18 0v7h-3a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>',
  'book-open':      '<path d="M12 7v14"/><path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>',
  'keyboard':       '<rect width="20" height="16" x="2" y="4" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/>',
  'flame':          '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  'log-out':        '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/>',
  'award':          '<circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>',
  'target':         '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  'star':           '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  'globe':          '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/>',
  'crown':          '<path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Zm3 16h14"/>',
  'chevron-left':   '<path d="m15 18-6-6 6-6"/>',
  'chevron-right':  '<path d="m9 18 6-6-6-6"/>',
  'calendar':       '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  'bar-chart':      '<line x1="12" x2="12" y1="20" y2="10"/><line x1="18" x2="18" y1="20" y2="4"/><line x1="6" x2="6" y1="20" y2="16"/>',
  'pie-chart':      '<path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>',
  'trophy':         '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>',
  'check':          '<path d="M20 6 9 17l-5-5"/>',
  'sparkles':       '<path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>',
};

// يهرب نص لاستخدامه بأمان داخل HTML attribute (يمنع كسر onclick="" لو فيه quote)
function escAttr(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/* ══════════════════════════════════════════════════════════
   AVATAR HELPER — مشترك بين الشريط الجانبي (app.html)،
   صفحة Profile، وصفوف/منصة الـ League. يعرض صورة لو avatarUrl
   موجودة، وإلا الحروف الأولى من الاسم كـ fallback.
══════════════════════════════════════════════════════════ */
function avatarInitials(name) {
  return String(name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarInnerHTML(name, avatarUrl) {
  return avatarUrl
    ? `<img src="${avatarUrl}" alt="${escAttr(name || '')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`
    : avatarInitials(name);
}

function icon(name, size = 16, strokeWidth = 2) {
  const path = ICON_PATHS[name] || ICON_PATHS['star'];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:middle;flex-shrink:0">${path}</svg>`;
}

// يرجع اسم أيقونة Lucide المناسبة للمهارة (الثابتة أو أي مهارة مخصصة → flame)
function skillIconName(skill) {
  const fixed = FIXED_SKILLS.find(f => f.key === skill.key);
  return fixed ? fixed.iconName : 'flame';
}
function skillIconHTML(skill, size = 16) {
  return icon(skillIconName(skill), size);
}

/* ══════════════════════════════════════════════════════════
   ANALYTICS HELPERS — مستخدمة في صفحة Skill Detail و Profile
══════════════════════════════════════════════════════════ */

// يحول مصفوفة entries إلى { 'YYYY-MM-DD': totalValue }
function entriesByDate(entries) {
  const map = {};
  (entries || []).forEach(e => { map[e.log_date] = (map[e.log_date] || 0) + e.value; });
  return map;
}

// دائرة Donut: items = [{label, value, color}]
// SVG بيتمدد لعرض الحاوية (responsive) لحد أقصى = size px، بدل حجم ثابت دايمًا
function donutSVG(items, size = 140, centerLabel = '', centerSub = '') {
  const total = (items || []).reduce((s, i) => s + (i.value || 0), 0);
  const r = size / 2 - 14;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  let svg = `<svg viewBox="0 0 ${size} ${size}" style="width:100%;max-width:${size}px;height:auto;display:block;margin:0 auto">`;
  if (total <= 0) {
    svg += `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="16"/>`;
  } else {
    items.forEach(it => {
      if (!it.value) return;
      const pct = it.value / total;
      const da  = pct * circ;
      svg += `<circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${it.color}" stroke-width="16" stroke-dasharray="${da.toFixed(2)} ${(circ-da).toFixed(2)}" stroke-dashoffset="${(-cum).toFixed(2)}" transform="rotate(-90 ${size/2} ${size/2})" stroke-linecap="round"/>`;
      cum += da;
    });
  }
  if (centerLabel) svg += `<text x="${size/2}" y="${size/2-2}" text-anchor="middle" fill="#FBF5F0" font-size="18" font-weight="800" font-family="Syne,sans-serif">${centerLabel}</text>`;
  if (centerSub)   svg += `<text x="${size/2}" y="${size/2+16}" text-anchor="middle" fill="rgba(251,245,240,0.45)" font-size="9" font-family="DM Sans,sans-serif">${centerSub}</text>`;
  svg += '</svg>';
  return svg;
}

// خط Trend بسيط: data = [{label, value}]
function trendSVG(data, color = '#8A83DA', width = 480, height = 130) {
  if (!data || !data.length) return '';
  const maxV = Math.max(...data.map(d => d.value || 0), 1);
  const pL = 6, pR = 6, pT = 10, pB = 10;
  const iw = width - pL - pR, ih = height - pT - pB;
  let line = '', area = `${pL},${height-pB} `;
  data.forEach((d, i) => {
    const x = pL + (data.length <= 1 ? 0 : i * iw / (data.length - 1));
    const y = height - pB - ((d.value || 0) / maxV * ih);
    line += `${x.toFixed(1)},${y.toFixed(1)} `;
    area += `${x.toFixed(1)},${y.toFixed(1)} `;
  });
  const lastX = pL + (data.length <= 1 ? 0 : (data.length - 1) * iw / (data.length - 1));
  area += `${lastX.toFixed(1)},${height-pB}`;
  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;display:block">
    <polygon points="${area}" fill="${color}" opacity="0.12"/>
    <polyline fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="${line}"/>
  </svg>`;
}

/* ── Rank levels ──────────────────────────────────────────── */
const SKILL_LEVELS = [
  {label:'Bronze V',   tier:'Bronze',   col:'#cd7f32'},
  {label:'Bronze IV',  tier:'Bronze',   col:'#cd7f32'},
  {label:'Bronze III', tier:'Bronze',   col:'#cd7f32'},
  {label:'Bronze II',  tier:'Bronze',   col:'#cd7f32'},
  {label:'Bronze I',   tier:'Bronze',   col:'#cd7f32'},
  {label:'Silver V',   tier:'Silver',   col:'#c0c8d8'},
  {label:'Silver IV',  tier:'Silver',   col:'#c0c8d8'},
  {label:'Silver III', tier:'Silver',   col:'#c0c8d8'},
  {label:'Silver II',  tier:'Silver',   col:'#c0c8d8'},
  {label:'Silver I',   tier:'Silver',   col:'#c0c8d8'},
  {label:'Gold V',     tier:'Gold',     col:'#EBA328'},
  {label:'Gold IV',    tier:'Gold',     col:'#EBA328'},
  {label:'Gold III',   tier:'Gold',     col:'#EBA328'},
  {label:'Gold II',    tier:'Gold',     col:'#EBA328'},
  {label:'Gold I',     tier:'Gold',     col:'#EBA328'},
  {label:'Platinum V', tier:'Platinum', col:'#d0e8f4'},
  {label:'Platinum IV',tier:'Platinum', col:'#d0e8f4'},
  {label:'Platinum III',tier:'Platinum',col:'#d0e8f4'},
  {label:'Platinum II',tier:'Platinum', col:'#d0e8f4'},
  {label:'Platinum I', tier:'Platinum', col:'#d0e8f4'},
  {label:'Diamond V',  tier:'Diamond',  col:'#80d8ff'},
  {label:'Diamond IV', tier:'Diamond',  col:'#80d8ff'},
  {label:'Diamond III',tier:'Diamond',  col:'#80d8ff'},
  {label:'Diamond II', tier:'Diamond',  col:'#80d8ff'},
  {label:'Diamond I',  tier:'Diamond',  col:'#80d8ff'},
  {label:'Crown V',    tier:'Crown',    col:'#ff9040'},
  {label:'Crown IV',   tier:'Crown',    col:'#ff9040'},
  {label:'Crown III',  tier:'Crown',    col:'#ff9040'},
  {label:'Crown II',   tier:'Crown',    col:'#ff9040'},
  {label:'Crown I',    tier:'Crown',    col:'#ff9040'},
  {label:'Ace',        tier:'Ace',      col:'#ff6080'},
  {label:'Ace Master', tier:'Ace',      col:'#ff6080'},
  {label:'Ace Dominator',tier:'Ace',    col:'#ff6080'},
  {label:'Conqueror',  tier:'Conqueror',col:'#EBA328'},
];

const RANK_TIERS = [
  {tier:'Bronze',   col:'#cd7f32', subs:['V','IV','III','II','I']},
  {tier:'Silver',   col:'#c0c8d8', subs:['V','IV','III','II','I']},
  {tier:'Gold',     col:'#EBA328', subs:['V','IV','III','II','I']},
  {tier:'Platinum', col:'#d0e8f4', subs:['V','IV','III','II','I']},
  {tier:'Diamond',  col:'#80d8ff', subs:['V','IV','III','II','I']},
  {tier:'Crown',    col:'#ff9040', subs:['V','IV','III','II','I']},
  {tier:'Ace',      col:'#ff6080', subs:['','Master','Dominator']},
  {tier:'Conqueror',col:'#EBA328', subs:['']},
];

/* ── Level math ───────────────────────────────────────────── */
function getLevelInfo(xp, xpPerLevel) {
  xp = Math.max(0, xp || 0);
  const level   = Math.min(Math.floor(xp / xpPerLevel) + 1, LVL_MAX);
  const ri      = Math.min(Math.floor((level - 1) / 3), SKILL_LEVELS.length - 1);
  const rank    = SKILL_LEVELS[ri];
  const maxed   = level >= LVL_MAX;
  const xpInLvl = maxed ? xpPerLevel : xp % xpPerLevel;
  const pct     = maxed ? 100 : Math.round(xpInLvl / xpPerLevel * 100);
  const xpToNext= maxed ? 0 : Math.round(xpPerLevel - xpInLvl);
  const nextRank= ri < SKILL_LEVELS.length - 1 ? SKILL_LEVELS[ri + 1] : null;
  return { level, rank, pct, xpToNext, nextRank, xpInLvl };
}

/* ── Rank badge SVG ───────────────────────────────────────── */
function rankBadgeSVG(tier, sub, size = 28) {
  const C = {
    Bronze:    {c1:'#cd7f32',c2:'#7d3c0a',c3:'#e8a857',bg:'#2a1000'},
    Silver:    {c1:'#c0c0d8',c2:'#606090',c3:'#e8e8f5',bg:'#141428'},
    Gold:      {c1:'#EBA328',c2:'#8a5a00',c3:'#E8C283',bg:'#211400'},
    Platinum:  {c1:'#4fc3f7',c2:'#0277bd',c3:'#b3e5fc',bg:'#041020'},
    Diamond:   {c1:'#9575cd',c2:'#4a148c',c3:'#e1bee7',bg:'#0e0016'},
    Crown:     {c1:'#ff9040',c2:'#8a3800',c3:'#ffd0b0',bg:'#180800'},
    Ace:       {c1:'#ff6080',c2:'#880030',c3:'#ffc0d0',bg:'#180010'},
    Conqueror: {c1:'#EBA328',c2:'#8a5a00',c3:'#E8C283',bg:'#0d0a00'},
  };
  const g  = C[tier] || C.Bronze;
  const id = 'bg' + Math.random().toString(36).slice(2, 7);
  const lbl = sub ? (tier === 'Ace' && sub ? sub.charAt(0) : sub.charAt(0)) : tier.charAt(0);
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 118" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="${id}" cx="40%" cy="35%" r="65%">
    <stop offset="0%" stop-color="${g.c3}"/>
    <stop offset="45%" stop-color="${g.c1}"/>
    <stop offset="100%" stop-color="${g.bg}"/>
  </radialGradient></defs>
  <path d="M50 6L87 24L87 60Q87 90 50 103Q13 90 13 60L13 24Z" fill="${g.bg}"/>
  <path d="M50 10L83 27L83 59Q83 87 50 99Q17 87 17 59L17 27Z" fill="url(#${id})"/>
  <path d="M50 6L87 24L87 60Q87 90 50 103Q13 90 13 60L13 24Z" fill="none" stroke="${g.c1}" stroke-width="1.2"/>
  <text x="50" y="64" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="18" font-weight="700" fill="#fff">${lbl}</text>
  <rect x="18" y="104" width="64" height="11" rx="3" fill="${g.bg}" stroke="${g.c2}" stroke-width="0.6"/>
  <text x="50" y="113" text-anchor="middle" font-family="DM Sans,sans-serif" font-size="5.5" font-weight="700" fill="${g.c1}">${tier.toUpperCase()}</text>
</svg>`;
}

/* ── Rank road builder ────────────────────────────────────── */
function buildRankRoad(currentLevel) {
  const ci = Math.min(Math.floor((currentLevel - 1) / 3), SKILL_LEVELS.length - 1);
  let html = '<div style="display:inline-flex;gap:0;align-items:center;padding:4px 8px;white-space:nowrap">';
  SKILL_LEVELS.forEach((rank, idx) => {
    const isPast = idx < ci;
    const isCur  = idx === ci;
    const parts  = rank.label.split(' ');
    html += `<div style="display:flex;flex-direction:column;align-items:center;min-width:52px;flex-shrink:0">
      <span style="font-size:8px;font-weight:700;color:${isCur ? rank.col : 'rgba(251,245,240,0.25)'};text-align:center;line-height:1.2;max-width:52px;white-space:normal">${parts[0]}</span>
      <span style="font-size:7px;color:${isCur ? rank.col : 'rgba(251,245,240,0.18)'};text-align:center">${parts.slice(1).join(' ') || ''}</span>
      <div style="width:10px;height:10px;border-radius:50%;margin:3px 0;
        background:${isCur ? rank.col : isPast ? rank.col + '66' : 'rgba(255,255,255,0.08)'};
        border:2px solid ${isCur ? '#fff' : isPast ? rank.col + '44' : 'rgba(255,255,255,0.12)'};
        ${isCur ? 'box-shadow:0 0 8px ' + rank.col : ''}"></div>
      <span style="font-size:7px;color:rgba(251,245,240,0.20)">Lv${idx * 3 + 1}</span>
    </div>`;
    if (idx < SKILL_LEVELS.length - 1) {
      html += `<div style="width:14px;height:2px;background:${isPast ? rank.col + '55' : 'rgba(255,255,255,0.06)'};align-self:center;flex-shrink:0"></div>`;
    }
  });
  return html + '</div>';
}

/* ── Time / date helpers ──────────────────────────────────── */
function pad(n) { return String(n).padStart(2, '0'); }

function todayStr(tz) {
  // tz مثل 'Africa/Cairo' — يُقرأ من STATE.profile.timezone
  try {
    return new Date().toLocaleDateString('en-CA', { timeZone: tz || 'Africa/Cairo' });
  } catch {
    const d = new Date();
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
}

function dateOffsetStr(offsetDays, tz) {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  try {
    return d.toLocaleDateString('en-CA', { timeZone: tz || 'Africa/Cairo' });
  } catch {
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  }
}

// تنسيق الدقائق → ساعات ودقائق  (مثل: 90 → "1h 30m")
function fmtMin(mins) {
  mins = Math.round(mins || 0);
  if (mins < 60) return mins + ' min';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

// تنسيق الأرقام الكبيرة
function fmtNum(n) { return Number(n || 0).toLocaleString(); }

/* ── Streak calculator ────────────────────────────────────── */
// byDay: { 'YYYY-MM-DD': value }
// goal:  minimum value to count as done
// today: string 'YYYY-MM-DD'
function calcStreakFromMap(byDay, goal, today) {
  let streak = 0;
  const cur  = new Date(today + 'T12:00:00');
  // إذا اليوم لم يكتمل بعد، ابدأ من أمس
  if (!byDay[today] || byDay[today] < goal) cur.setDate(cur.getDate() - 1);
  for (let i = 0; i < 3650; i++) {
    const ds = `${cur.getFullYear()}-${pad(cur.getMonth()+1)}-${pad(cur.getDate())}`;
    if (byDay[ds] && byDay[ds] >= goal) {
      streak++;
      cur.setDate(cur.getDate() - 1);
    } else break;
  }
  return streak;
}

/* ══════════════════════════════════════════════════════════
   QUICK ACHIEVEMENT CHECK — يُستدعى بعد كل حفظ ناجح
   فحص خفيف (بدون إعادة بناء كل الإنجازات) لإظهار نقطة
   الإشعار فورًا لو فُتح إنجاز جديد
══════════════════════════════════════════════════════════ */
async function quickAchievementCheck(skillId, newStreak) {
  try {
    if (typeof api === 'undefined' || !api.achievements) return;
    const res  = await api.achievements.getSeen();
    const seen = new Set(res.data || []);

    const totalXP = STATE.overallXP || 0;
    const XP_MS   = [1000, 5000, 10000, 25000, 50000, 100000];
    if (XP_MS.some(t => totalXP >= t && !seen.has(`xp_${t}`))) {
      _showAchievementDots();
      return;
    }

    if (skillId && newStreak !== undefined) {
      const skill = (STATE.skills || []).find(s => s.id === skillId);
      const lang  = skill && (STATE.languages || []).find(l => l.id === skill.lang_id);
      if (skill && lang) {
        const hasNewStreak = [1,3,7,14,30,60,100,180,365].some(d =>
          newStreak >= d && !seen.has(`streak_${lang.id}_${skill.key}_${d}`)
        );
        if (hasNewStreak) { _showAchievementDots(); return; }
      }
    }
  } catch(e) {
    // صامت — لا نعطل تدفق الحفظ بسبب فحص الإنجازات
  }
}

function _showAchievementDots() {
  const menuBtn = document.getElementById('btn-menu');
  if (menuBtn && !menuBtn.querySelector('.ach-notif-dot')) {
    const dot = document.createElement('span');
    dot.className = 'ach-notif-dot';
    dot.style.cssText = 'position:absolute;top:4px;right:4px;width:7px;height:7px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 6px rgba(255,77,77,0.7);pointer-events:none;z-index:5;';
    menuBtn.style.position = 'relative';
    menuBtn.appendChild(dot);
  }
  const achLink = document.querySelector('.sb-link[data-page="achievements"]');
  if (achLink && !achLink.querySelector('.ach-notif-dot')) {
    const dot = document.createElement('span');
    dot.className = 'ach-notif-dot';
    dot.style.cssText = 'display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff4d4d;box-shadow:0 0 6px rgba(255,77,77,0.7);margin-left:auto;flex-shrink:0;';
    achLink.appendChild(dot);
  }
}

/* ── Toast notifications ──────────────────────────────────── */
function toast(msg, type = 'info', dur = 2800) {
  let wrap = document.getElementById('toast-wrap');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.id = 'toast-wrap';
    wrap.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:9000;display:flex;flex-direction:column;gap:8px;align-items:center;pointer-events:none';
    document.body.appendChild(wrap);
  }
  const t = document.createElement('div');
  t.style.cssText = `
    background:${type==='success'?'#0a1a10':type==='error'?'#1a0808':type==='warn'?'#1a1208':'#1A1728'};
    border:1px solid ${type==='success'?'rgba(80,220,120,0.35)':type==='error'?'rgba(255,80,80,0.35)':type==='warn'?'rgba(251,213,189,0.35)':'rgba(138,131,218,0.30)'};
    border-radius:12px;padding:10px 18px;font-size:13px;font-weight:600;
    color:#FBF5F0;font-family:'DM Sans',sans-serif;
    box-shadow:0 4px 24px rgba(0,0,0,0.4);
    max-width:90vw;text-align:center;
    animation:_toastIn .25s ease both;
    pointer-events:auto;
  `;
  t.textContent = msg;
  // inject keyframes once
  if (!document.getElementById('_toast-kf')) {
    const s = document.createElement('style');
    s.id = '_toast-kf';
    s.textContent = `
      @keyframes _toastIn{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes _toastOut{from{opacity:1;transform:translateY(0)}to{opacity:0;transform:translateY(12px)}}
    `;
    document.head.appendChild(s);
  }
  wrap.appendChild(t);
  setTimeout(() => {
    t.style.animation = '_toastOut .25s ease forwards';
    setTimeout(() => t.remove(), 260);
  }, dur);
}

/* ── Confirm modal ────────────────────────────────────────── */
let _confirmResolve = null;

function showConfirm(title, msg, okLabel = 'Delete') {
  let box = document.getElementById('_confirm-wrap');
  if (!box) {
    box = document.createElement('div');
    box.id = '_confirm-wrap';
    box.style.cssText = 'display:none;position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,0.7);backdrop-filter:blur(8px);align-items:center;justify-content:center';
    box.innerHTML = `
      <div style="background:#1A1728;border:1px solid rgba(138,131,218,0.40);border-radius:20px;padding:28px;width:90%;max-width:360px;font-family:'DM Sans',sans-serif">
        <div id="_ct" style="font-size:17px;font-weight:700;color:#FBF5F0;margin-bottom:8px"></div>
        <div id="_cm" style="font-size:13px;color:rgba(251,245,240,0.70);margin-bottom:22px;line-height:1.6"></div>
        <div style="display:flex;gap:8px">
          <button onclick="window._rc(false)" style="flex:1;padding:9px;border-radius:8px;border:1px solid rgba(138,131,218,0.20);background:rgba(138,131,218,0.10);color:rgba(251,245,240,0.75);font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif">Cancel</button>
          <button id="_cok" onclick="window._rc(true)" style="flex:1;padding:9px;border-radius:8px;border:1px solid rgba(255,80,80,0.30);background:rgba(255,80,80,0.12);color:#ff9090;font-size:13px;font-weight:600;cursor:pointer;font-family:'DM Sans',sans-serif"></button>
        </div>
      </div>`;
    document.body.appendChild(box);
  }
  document.getElementById('_ct').textContent  = title;
  document.getElementById('_cm').textContent  = msg;
  document.getElementById('_cok').textContent = okLabel;
  box.style.display = 'flex';
  window._rc = (val) => {
    box.style.display = 'none';
    if (_confirmResolve) { _confirmResolve(val); _confirmResolve = null; }
  };
  return new Promise(r => { _confirmResolve = r; });
}

/* ── Language list with flags ─────────────────────────────── */
// iso = كود الدولة المستخدم في flag-icons (مختلف عن كود اللغة أحيانًا)
const LANGUAGES = [
  { code:'en', name:'English',    flag:'🇬🇧', iso:'gb' },
  { code:'ar', name:'Arabic',     flag:'🇸🇦', iso:'sa' },
  { code:'fr', name:'French',     flag:'🇫🇷', iso:'fr' },
  { code:'de', name:'German',     flag:'🇩🇪', iso:'de' },
  { code:'es', name:'Spanish',    flag:'🇪🇸', iso:'es' },
  { code:'it', name:'Italian',    flag:'🇮🇹', iso:'it' },
  { code:'pt', name:'Portuguese', flag:'🇵🇹', iso:'pt' },
  { code:'ru', name:'Russian',    flag:'🇷🇺', iso:'ru' },
  { code:'zh', name:'Chinese',    flag:'🇨🇳', iso:'cn' },
  { code:'ja', name:'Japanese',   flag:'🇯🇵', iso:'jp' },
  { code:'ko', name:'Korean',     flag:'🇰🇷', iso:'kr' },
  { code:'tr', name:'Turkish',    flag:'🇹🇷', iso:'tr' },
  { code:'nl', name:'Dutch',      flag:'🇳🇱', iso:'nl' },
  { code:'pl', name:'Polish',     flag:'🇵🇱', iso:'pl' },
  { code:'sv', name:'Swedish',    flag:'🇸🇪', iso:'se' },
  { code:'no', name:'Norwegian',  flag:'🇳🇴', iso:'no' },
  { code:'da', name:'Danish',     flag:'🇩🇰', iso:'dk' },
  { code:'fi', name:'Finnish',    flag:'🇫🇮', iso:'fi' },
  { code:'he', name:'Hebrew (free palestine)', flag:'🇮🇱', iso:'il' },
  { code:'fa', name:'Persian',    flag:'🇮🇷', iso:'ir' },
  { code:'hi', name:'Hindi',      flag:'🇮🇳', iso:'in' },
  { code:'id', name:'Indonesian', flag:'🇮🇩', iso:'id' },
  { code:'uk', name:'Ukrainian',  flag:'🇺🇦', iso:'ua' },
  { code:'cs', name:'Czech',      flag:'🇨🇿', iso:'cz' },
  { code:'ro', name:'Romanian',   flag:'🇷🇴', iso:'ro' },
];

/* ── Timezone list ────────────────────────────────────────── */
const TIMEZONES = [
  { label:'Cairo (Egypt)',          value:'Africa/Cairo' },
  { label:'London (UK)',            value:'Europe/London' },
  { label:'Paris (France)',         value:'Europe/Paris' },
  { label:'Berlin (Germany)',       value:'Europe/Berlin' },
  { label:'Moscow (Russia)',        value:'Europe/Moscow' },
  { label:'Dubai (UAE)',            value:'Asia/Dubai' },
  { label:'Riyadh (Saudi Arabia)',  value:'Asia/Riyadh' },
  { label:'Istanbul (Turkey)',      value:'Europe/Istanbul' },
  { label:'Karachi (Pakistan)',     value:'Asia/Karachi' },
  { label:'Mumbai (India)',         value:'Asia/Kolkata' },
  { label:'Jakarta (Indonesia)',    value:'Asia/Jakarta' },
  { label:'Beijing (China)',        value:'Asia/Shanghai' },
  { label:'Tokyo (Japan)',          value:'Asia/Tokyo' },
  { label:'New York (USA-East)',    value:'America/New_York' },
  { label:'Chicago (USA-Central)', value:'America/Chicago' },
  { label:'Los Angeles (USA-West)',value:'America/Los_Angeles' },
  { label:'São Paulo (Brazil)',     value:'America/Sao_Paulo' },
  { label:'UTC',                    value:'UTC' },
];

// أول يوم في الأسبوع الحالي (السبت)
function weekStartDate(d) {
  const ref = d ? new Date(d) : new Date();
  const day = ref.getDay(); // 0=Sun, 6=Sat
  const diff = (day >= 6) ? -(day - 6) : -(day + 1);
  ref.setDate(ref.getDate() + diff);
  ref.setHours(0, 0, 0, 0);
  return ref;
}

// آخر يوم في الأسبوع (الجمعة)
function weekEndDate(d) {
  const start = weekStartDate(d);
  const end   = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}
