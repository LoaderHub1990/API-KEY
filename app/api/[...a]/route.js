import { NextResponse as R } from 'next/server';
import { cookies } from 'next/headers';
import { kv, kvReady, sign, unsign, crypto, isAdmin } from '../../../lib';

export const dynamic = 'force-dynamic';

const E = process.env, D = 'https://discord.com/api', WEEK = 7 * 864e5;
const V = k => (E[k] || '').trim(), CID = V('DISCORD_CLIENT_ID'), CSEC = V('DISCORD_CLIENT_SECRET'), GID = V('DISCORD_GUILD_ID');
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const J = (o, s = 200) => R.json(o, { status: s, headers: CORS });
const rnd = n => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: n }, () => c[crypto.randomInt(c.length)]).join(''); };
const ses = async () => unsign((await cookies()).get('s')?.value || '');
// แปลงค่าหมดอายุที่เก็บไว้ (ms ตามที่ mint() บันทึก) เป็น Unix timestamp วินาที; ถ้าเป็นวินาทีอยู่แล้ว (<1e11) ก็ใช้ตามนั้น
const toUnix = v => { const n = Number(v); return Number.isFinite(n) && n > 0 ? Math.floor(n >= 1e11 ? n / 1000 : n) : 0; };
const PRESETS = ['youtube', 'discord', 'tiktok', 'facebook', 'instagram', 'telegram', 'x', 'website'];
const IMG_KINDS = ['logo', 'banner', 'i0', 'i1', 'i2', 'i3', 'i4', 'i5'], MAX_LINKS = 6, MAX_IMG = 420000; // MAX_IMG = ความยาว base64 (~300KB)
// ตรวจรูปที่อัปโหลด: ต้องเป็น png/jpeg/webp จริง (เช็ก magic bytes) ไม่รับ svg เพื่อกัน XSS
const imgOk = d => {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]+={0,2})$/.exec(String(d || ''));
  if (!m || m[2].length > MAX_IMG) return null;
  const b = Buffer.from(m[2], 'base64'), t = m[1];
  const ok = t === 'image/png' ? b.subarray(0, 4).toString('hex') === '89504e47' : t === 'image/jpeg' ? b.subarray(0, 3).toString('hex') === 'ffd8ff' : b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP';
  return ok ? { t, d: m[2] } : null;
};
const imgUrl = (slug, kind, v) => v?.[kind] ? `/api/img/${slug}/${kind}?v=${v[kind]}` : '';
const wipeImgs = async slug => { try { await kv.del('imgv:' + slug, ...IMG_KINDS.map(k => `img:${slug}:${k}`)); } catch {} };
// คีย์ของหน้านั้นๆ: เก็บเป็น set pk:slug (คีย์เก่าก่อนอัปเดตจะถูกดึงเข้า set ให้อัตโนมัติครั้งเดียว)
async function ownKeys(slug) {
  if (!await kv.get('pkfill:' + slug)) {
    const ks = await kv.smembers('keys'), vs = ks.length ? await kv.mget(...ks.map(x => 'key:' + x)) : [];
    const mine = ks.filter((x, i) => vs[i] && vs[i].page === slug);
    if (mine.length) await kv.sadd('pk:' + slug, ...mine);
    await kv.set('pkfill:' + slug, 1);
  }
  const ids = await kv.smembers('pk:' + slug), vs = ids.length ? await kv.mget(...ids.map(x => 'key:' + x)) : [];
  const gone = ids.filter((_, i) => !vs[i]); if (gone.length) await kv.srem('pk:' + slug, ...gone);
  return vs.filter(Boolean).sort((x, y) => y.exp - x.exp).slice(0, 300);
}
const live = k => !!k && !k.off && k.exp > Date.now();
const safe = n => (typeof n === 'string' && /^\/($|[^/\\])/.test(n)) ? n : '/';
const url = v => { try { const u = new URL(String(v || '').trim()); return /^https?:$/.test(u.protocol) ? u.toString() : ''; } catch { return ''; } };
const clean = (v, re, n) => String(v ?? '').trim().replace(re, '').slice(0, n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.floor(+v) || lo));
// Discord ID ยาว 18-19 หลัก: ถ้าเก็บใน Redis set ตรงๆ จะถูกแปลงเป็น number แล้วเลขเพี้ยน จึงใส่ prefix
const bk = x => /^\d+$/.test(x) ? 'id:' + x : x;
const unbk = x => String(x).replace(/^id:/, '');
const avatar = u => u.avatar
  ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${u.avatar.startsWith('a_') ? 'gif' : 'png'}?size=128`
  : `https://cdn.discordapp.com/embed/avatars/${Number((BigInt(u.id) >> 22n) % 6n)}.png`;
// ---- โดเมนที่ใช้จริง: ยึดโดเมนที่ผู้ใช้เข้ามา (cookie ต้องอยู่โดเมนเดียวกับตอนล็อกอิน) ไม่พึ่ง BASE_URL อย่างเดียว ----
const isLocal = h => /^(localhost|127\.|0\.0\.0\.0|\[::1\]|10\.|192\.168\.)/i.test(h);
const cfgBase = () => { const m = V('BASE_URL').match(/^https?:\/\/[^/\s]+/i); return m && !/your-domain\.com/i.test(m[0]) ? m[0] : ''; };
const pickBase = req => {
  const H = req.headers, u = new URL(req.url), first = v => String(v || '').split(',')[0].trim();
  const host = first(H.get('x-forwarded-host')) || first(H.get('host')) || u.host, proto = first(H.get('x-forwarded-proto')) || u.protocol.replace(':', '');
  const seen = proto + '://' + host, cfg = cfgBase();
  return cfg && isLocal(host) && !isLocal(cfg.split('://')[1]) ? cfg : seen; // หลัง proxy ที่ไม่ส่ง host มา → ใช้ BASE_URL
};
// เรียก Discord พร้อม timeout และรับมือ response ที่ไม่ใช่ JSON
const dj = async (path, init) => {
  const r = await fetch(D + path, { ...init, signal: AbortSignal.timeout(8000) });
  return { ok: r.ok, status: r.status, j: await r.json().catch(() => ({})) };
};
const tokenWhy = (t, uri) => t.error === 'invalid_client' ? 'DISCORD_CLIENT_ID หรือ DISCORD_CLIENT_SECRET ไม่ถูกต้อง'
  : t.error === 'invalid_grant' ? 'Redirect URI ไม่ตรงกับที่ตั้งใน Discord Portal: ' + uri
  : t.error_description || t.message || t.error || 'no_token';
const ts = async t => {
  if (!E.TURNSTILE_SECRET) return true;
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: new URLSearchParams({ secret: E.TURNSTILE_SECRET, response: t || '' }) });
    return !!(await r.json()).success;
  } catch { return false; }
};

async function mint(page, uid, hours, prefix) {
  hours = Math.max(1, +hours || 24);
  const key = (clean(prefix, /[^A-Za-z0-9]/g, 12) || 'KEY') + '-' + rnd(7) + '-' + rnd(5), exp = Date.now() + hours * 36e5;
  await kv.set('key:' + key, { key, page, uid: String(uid), exp, off: 0 }, { ex: Math.ceil(hours * 3600) + 604800 });
  await kv.sadd('keys', key);
  if (page && page !== 'bot' && page !== 'admin') await kv.sadd('pk:' + page, key);
  return { key, exp };
}

async function inner(req, { params }) {
  const [a, b, c3] = (await params).a, M = req.method;
  if (M === 'OPTIONS') return J({});
  const body = M === 'POST' ? await req.json().catch(() => ({})) : {};
  const q = new URL(req.url).searchParams;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const base = pickBase(req);
  const co = { path: '/', httpOnly: true, sameSite: 'lax', secure: base.startsWith('https') };

  // ---------- ตรวจระบบ (ไม่เปิดเผยค่าลับ) ----------
  if (a === 'health') {
    let kvOk = false, kvErr = '';
    try { await kv.set('health', 1, { ex: 30 }); kvOk = (await kv.get('health')) === 1; } catch (e) { kvErr = String(e?.message || e).slice(0, 160); }
    const missing = [!CID && 'DISCORD_CLIENT_ID', !CSEC && 'DISCORD_CLIENT_SECRET'].filter(Boolean), cb = cfgBase();
    return J({
      loginReady: !missing.length, missing,
      db: { envFound: kvReady, working: kvOk, error: kvErr },
      env: { BASE_URL: !!E.BASE_URL, SESSION_SECRET: !!V('SESSION_SECRET'), DISCORD_CLIENT_ID: !!CID, DISCORD_CLIENT_SECRET: !!CSEC, DISCORD_GUILD_ID: !!GID, ADMIN_IDS_count: (E.ADMIN_IDS || '').split(/[,\s]+/).filter(Boolean).length },
      baseUrlUsed: base,
      redirectUri: base + '/api/callback', // ต้องเพิ่มค่านี้ใน Discord Developer Portal → OAuth2 → Redirects ให้ตรงเป๊ะ
      notes: [
        !cb && E.BASE_URL && 'BASE_URL ยังเป็นค่าตัวอย่าง/รูปแบบไม่ถูกต้อง (ระบบจึงใช้โดเมนที่เข้าจริงแทน)',
        cb && cb !== base && 'BASE_URL ไม่ตรงกับโดเมนที่เข้าอยู่ (ระบบใช้โดเมนที่เข้าจริงเพื่อให้ cookie ล็อกอินทำงาน)',
        !V('SESSION_SECRET') && 'ยังไม่ได้ตั้ง SESSION_SECRET (ใช้ค่าที่สร้างจากความลับอื่นแทน แนะนำให้ตั้งเอง)',
        !(E.ADMIN_IDS || '').trim() && 'ยังไม่ได้ตั้ง ADMIN_IDS จึงไม่มีใครเป็นแอดมิน',
      ].filter(Boolean),
    });
  }

  // ---------- Discord login ----------
  if (a === 'login') {
    if (!CID || !CSEC) return R.redirect(base + '/?err=cfg&why=' + encodeURIComponent('ขาด ' + [!CID && 'DISCORD_CLIENT_ID', !CSEC && 'DISCORD_CLIENT_SECRET'].filter(Boolean).join(', ')));
    const state = crypto.randomBytes(16).toString('hex');
    const r = R.redirect('https://discord.com/oauth2/authorize?' + new URLSearchParams({ client_id: CID, redirect_uri: base + '/api/callback', response_type: 'code', scope: 'identify guilds', state }));
    r.cookies.set('os', state, { ...co, maxAge: 600 });
    r.cookies.set('next', safe(q.get('next')), { ...co, maxAge: 600 });
    return r;
  }
  if (a === 'callback') {
    const ck = await cookies();
    const back = (p, why) => { if (why) p += '&why=' + encodeURIComponent(String(why).slice(0, 140)); const r = R.redirect(base + p); r.cookies.delete('os'); r.cookies.delete('next'); return r; };
    if (q.get('error')) return back('/?err=denied');
    if (!q.get('code') || !q.get('state') || q.get('state') !== ck.get('os')?.value) return back('/?err=state');
    try {
      const uri = base + '/api/callback';
      const { j: t } = await dj('/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: CID, client_secret: CSEC, grant_type: 'authorization_code', code: q.get('code'), redirect_uri: uri }) });
      if (!t.access_token) { console.error('discord token error', t, 'redirect_uri=', uri); return back('/?err=token', tokenWhy(t, uri)); }
      const H = { Authorization: 'Bearer ' + t.access_token, 'User-Agent': 'KeyGate (' + base + ', 1.0)' };
      const { j: u } = await dj('/users/@me', { headers: H });
      if (!u.id) return back('/?err=token', u.message || 'no_user');
      const adminUser = isAdmin(u.id);
      let inGuild = adminUser || !GID; // แอดมินเข้าได้เสมอ / ถ้าไม่ตั้ง GUILD_ID = ไม่เช็กเซิร์ฟเวอร์
      if (!inGuild) { const { j: gs } = await dj('/users/@me/guilds', { headers: H }); inGuild = Array.isArray(gs) && gs.some(g => g.id === GID); }
      if (!inGuild) return back('/?err=guild');
      if (!adminUser && await kv.sismember('bans', 'id:' + u.id).catch(() => 0)) return back('/?err=ban');
      const dest = new URL(base + safe(ck.get('next')?.value));
      dest.searchParams.set('ok', 'login');
      const r = back(dest.pathname + dest.search);
      r.cookies.set('s', sign({ id: u.id, name: u.global_name || u.username, avatar: avatar(u), e: Date.now() + WEEK }), { ...co, maxAge: 604800 });
      return r;
    } catch (e) { console.error('callback error', e); return back('/?err=token', e?.message || 'exception'); }
  }
  if (a === 'logout') { const r = J({ ok: 1 }); r.cookies.delete('s'); r.cookies.delete('adm'); return r; }

  // ---------- ตรวจบอตครั้งแรกที่เข้าเว็บ (Cloudflare Turnstile) ----------
  if (a === 'human') {
    const need = !!(E.TURNSTILE_SECRET && E.TURNSTILE_SITEKEY);
    if (M === 'GET') return J({ ok: !need || !!unsign((await cookies()).get('hv')?.value || ''), sitekey: need ? E.TURNSTILE_SITEKEY : '' });
    if (!need) return J({ ok: 1 });
    if (!await ts(body.token)) return J({ ok: 0, error: 'captcha' }, 400);
    const r = J({ ok: 1 });
    r.cookies.set('hv', sign({ h: 1, e: Date.now() + WEEK }), { ...co, maxAge: 604800 });
    return r;
  }
  // ---------- รูปของหน้า (เก็บใน KV, เสิร์ฟพร้อม cache ยาว; ?v= ใช้เปลี่ยน URL เมื่ออัปโหลดใหม่) ----------
  if (a === 'img') {
    const o = IMG_KINDS.includes(c3) ? await kv.get(`img:${b}:${c3}`) : null;
    if (!o?.d) return J({ error: 'nf' }, 404);
    return new Response(Buffer.from(o.d, 'base64'), { headers: { 'Content-Type': o.t, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff', 'Access-Control-Allow-Origin': '*' } });
  }

  // ---------- public ----------
  if (a === 'me') {
    const s = await ses();
    if (!s) return J({ user: null });
    const out = { user: { id: s.id, name: s.name, avatar: s.avatar }, admin: isAdmin(s.id), creator: null, page: null, max: 72 };
    try { const c = await kv.get('cr:' + s.id); out.creator = c || null; out.page = c ? (await kv.get('page:' + c.slug)) || null : null; out.max = (await kv.get('max')) || 72; out.imgv = c ? (await kv.get('imgv:' + c.slug)) || {} : {}; } catch { out.dbError = true; }
    return J(out);
  }
  if (a === 'stats') { try { const [keys, pages, creators, max] = await Promise.all([kv.scard('keys'), kv.scard('pages'), kv.scard('crs'), kv.get('max')]); return J({ keys, pages, creators, max: max || 72 }); } catch { return J({ dbError: true }); } }
  if (a === 'verify') {
    // อ่านวันหมดอายุจริงจากข้อมูลคีย์ใน KV (field "exp" = มิลลิวินาที) ห้ามสร้างใหม่ตอนตรวจ
    const key = String(q.get('key') || '').trim();
    if (!key || key.length > 80) return J({ valid: false, reason: 'missing' }, 400);
    const k = await kv.get('key:' + key);
    if (!k) return J({ valid: false, reason: 'not_found' }, 404);
    const expiresAt = toUnix(k.exp); // Unix timestamp (วินาที, UTC) ของเวลาหมดอายุจริง
    if (k.off) return J({ valid: false, reason: 'revoked' }, 403);
    if (!expiresAt || expiresAt * 1000 <= Date.now()) return J({ valid: false, reason: 'expired' }, 410);
    return J({ valid: true, expiresAt, remaining: expiresAt - Math.floor(Date.now() / 1000), serverTime: Math.floor(Date.now() / 1000), expires: k.exp, page: k.page });
  }

  // ---------- bot ----------
  if (a === 'bot') {
    if (!E.BOT_SECRET || req.headers.get('authorization') !== 'Bearer ' + E.BOT_SECRET) return J({ error: 'auth' }, 401);
    const A = body.act;
    if (A === 'gen') return J(await mint('bot', body.uid || 'bot', body.hours, body.prefix));
    if (A === 'revoke') { const k = await kv.get('key:' + body.key); if (k) await kv.set('key:' + body.key, { ...k, off: 1 }, { ex: 604800 }); return J({ ok: 1 }); }
    if (A === 'ban' && body.id) { await kv.sadd('bans', bk(String(body.id).trim())); return J({ ok: 1 }); }
    if (A === 'unban' && body.id) { await kv.srem('bans', bk(String(body.id).trim())); return J({ ok: 1 }); }
    if (A === 'check') { const k = await kv.get('key:' + body.key); return J({ valid: live(k), key: k || null }); }
    return J({ error: 'act' }, 400);
  }

  // ---------- หน้าแจกคีย์ ----------
  if (a === 'page') {
    const p = await kv.get('page:' + b);
    if (!p) return J({ error: 'nf' }, 404);
    const iv = (await kv.get('imgv:' + b)) || {};
    const s = await ses();
    let st = null, k = null;
    if (s) {
      st = await kv.get(`st:${b}:${s.id}`);
      const old = await kv.get(`cl:${b}:${s.id}`);
      if (old) { const kk = await kv.get('key:' + old); if (live(kk)) k = kk; }
    }
    const step = st?.step || 0, left = (step === 1 || step === 2) ? Math.max(0, Math.ceil((st.t + p.wait * 1000 - Date.now()) / 1000)) : 0;
    return J({ title: p.title, desc: p.desc || '', logo: imgUrl(b, 'logo', iv), banner: imgUrl(b, 'banner', iv), links: (p.links || []).map(l => ({ label: l.label, url: l.url, icon: l.icon, img: l.icon === 'img' ? imgUrl(b, 'i' + l.slot, iv) : '' })), wait: p.wait, hours: p.hours, step, left, key: k ? { key: k.key, exp: k.exp } : null, sitekey: E.TURNSTILE_SITEKEY || '', user: s?.name || null });
  }
  if (a === 'gate' && M === 'POST') {
    const s = await ses(), p = await kv.get('page:' + b);
    if (!s) return J({ error: 'auth' }, 401);
    if (!p) return J({ error: 'nf' }, 404);
    if (await kv.sismember('bans', 'id:' + s.id) || (ip && await kv.sismember('bans', ip))) return J({ error: 'banned' }, 403);
    const sk = `st:${b}:${s.id}`, st = (await kv.get(sk)) || { step: 0 }, left = Math.max(0, Math.ceil(((st.t || 0) + p.wait * 1000 - Date.now()) / 1000));
    const setSt = (step) => kv.set(sk, { step, t: Date.now() }, { ex: 3600 });
    if (body.act === 'go') {
      if (st.step === 0) { await setSt(1); return J({ ok: 1, url: p.yt || null }); }
      if ((st.step === 1 || st.step === 2) && left > 0) return J({ error: 'wait', left }, 400);
      if (st.step === 1) { await setSt(2); return J({ ok: 1, url: p.dc || null }); }
      if (st.step === 2) { if (!await ts(body.token)) return J({ error: 'captcha' }, 400); await setSt(3); return J({ ok: 1 }); }
      return J({ error: 'steps' }, 400);
    }
    if (body.act === 'claim') {
      const oldKey = await kv.get('cl:' + b + ':' + s.id), old = oldKey && await kv.get('key:' + oldKey);
      if (live(old)) return J({ key: { key: old.key, exp: old.exp } });
      if (st.step !== 3) return J({ error: 'steps' }, 400);
      if (!await kv.set(`lock:${b}:${s.id}`, 1, { nx: true, ex: 5 })) return J({ error: 'wait', left: 1 }, 429);
      const k = await mint(b, s.id, p.hours, p.prefix);
      await kv.set('cl:' + b + ':' + s.id, k.key, { ex: Math.ceil(p.hours * 3600) + 604800 });
      await kv.del(sk);
      await kv.lpush('log', { t: Date.now(), page: b, uid: s.id, name: s.name, ip, key: k.key });
      await kv.ltrim('log', 0, 199);
      return J({ key: k });
    }
    return J({ error: 'act' }, 400);
  }

  // ---------- แผงผู้สร้างหน้า ----------
  if (a === 'creator' && M === 'POST') {
    const s = await ses(), c = s && await kv.get('cr:' + s.id);
    if (!c) return J({ error: 'not_approved' }, 403);
    const A = body.act;
    // จัดการคีย์ของหน้าตัวเองเท่านั้น (เช็กว่าคีย์เป็นของ slug นี้)
    if (A === 'keys') return J({ keys: await ownKeys(c.slug), now: Date.now() });
    if (A === 'keyoff' || A === 'keydel') {
      const k = await kv.get('key:' + body.key);
      if (!k || k.page !== c.slug) return J({ error: 'nf' }, 404);
      if (A === 'keydel') { await kv.del('key:' + body.key); await kv.srem('keys', body.key); await kv.srem('pk:' + c.slug, body.key); return J({ ok: 1 }); }
      await kv.set('key:' + body.key, { ...k, off: k.off ? 0 : 1 }, { ex: Math.max(60, Math.ceil((k.exp - Date.now()) / 1000) + 604800) });
      return J({ ok: 1, off: k.off ? 0 : 1 });
    }
    if (A === 'purge') {
      const mine = await ownKeys(c.slug), dead = mine.filter(k => k.exp <= Date.now() || k.off).map(k => k.key);
      for (const x of dead) await kv.del('key:' + x);
      if (dead.length) { await kv.srem('keys', ...dead); await kv.srem('pk:' + c.slug, ...dead); }
      return J({ ok: 1, n: dead.length });
    }
    if (A === 'img') {
      if (!IMG_KINDS.includes(body.kind)) return J({ error: 'kind' }, 400);
      const im = imgOk(body.data); if (!im) return J({ error: 'img' }, 400);
      const v = (await kv.get('imgv:' + c.slug)) || {}, t = Date.now();
      await kv.set(`img:${c.slug}:${body.kind}`, im); await kv.set('imgv:' + c.slug, { ...v, [body.kind]: t });
      return J({ ok: 1, v: t });
    }
    if (A === 'imgdel') {
      if (!IMG_KINDS.includes(body.kind)) return J({ error: 'kind' }, 400);
      const v = (await kv.get('imgv:' + c.slug)) || {}; delete v[body.kind];
      await kv.del(`img:${c.slug}:${body.kind}`); await kv.set('imgv:' + c.slug, v);
      return J({ ok: 1 });
    }
    // บันทึกหน้า
    const yt = body.yt ? url(body.yt) : '', dc = body.dc ? url(body.dc) : '';
    if (body.yt && !yt) return J({ error: 'yt' }, 400);
    if (body.dc && !dc) return J({ error: 'dc' }, 400);
    const links = [], used = new Set();
    for (const l of (Array.isArray(body.links) ? body.links : []).slice(0, MAX_LINKS)) {
      const slot = Math.floor(+l?.slot), u = url(l?.url), label = String(l?.label || '').trim().slice(0, 24);
      if (!(slot >= 0 && slot < MAX_LINKS) || used.has(slot) || (!label && !l?.url)) continue; // ข้ามแถวว่าง
      if (!u) return J({ error: 'link' }, 400);
      used.add(slot);
      links.push({ slot, label: label || new URL(u).hostname, url: u, icon: PRESETS.includes(l.icon) || l.icon === 'img' ? l.icon : 'website' });
    }
    const max = (await kv.get('max')) || 72;
    await kv.set('page:' + c.slug, { slug: c.slug, owner: s.id, prefix: c.prefix, title: String(body.title || c.slug).trim().slice(0, 60) || c.slug, desc: String(body.desc || '').trim().slice(0, 140), yt, dc, links, wait: clamp(body.wait, 10, 120), hours: clamp(body.hours, 1, max), off: 0 });
    await kv.sadd('pages', c.slug);
    return J({ ok: 1, max });
  }

  // ---------- แอดมิน (ตรวจจาก Discord ID ที่ล็อกอิน) ----------
  if (a === 'admin') {
    const s = await ses();
    if (!s) return J({ error: 'auth' }, 401);
    if (!isAdmin(s.id)) return J({ error: 'forbidden' }, 403);
    if (M === 'GET') {
      const [ks, ps, cs, bs, lg, max] = await Promise.all([kv.smembers('keys'), kv.smembers('pages'), kv.smembers('crs'), kv.smembers('bans'), kv.lrange('log', 0, 49), kv.get('max')]);
      const get = async (pre, arr) => arr.length ? await kv.mget(...arr.map(x => pre + x)) : [];
      const [keyv, pagev, crv] = await Promise.all([get('key:', ks), get('page:', ps), get('cr:', cs.map(unbk))]);
      const gone = ks.filter((_, i) => !keyv[i]); if (gone.length) await kv.srem('keys', ...gone); // เก็บกวาดคีย์ที่หมดอายุและถูกลบแล้ว
      const now = Date.now(), all = keyv.filter(Boolean);
      return J({
        max: max || 72,
        now,
        summary: { total: all.length, active: all.filter(k => live(k)).length, expired: all.filter(k => k.exp <= now).length, revoked: all.filter(k => k.off && k.exp > now).length },
        keys: all.sort((x, y) => y.exp - x.exp).map(k => ({ ...k, expiresAt: toUnix(k.exp) })),
        pages: pagev.filter(Boolean),
        creators: crv.filter(Boolean),
        bans: bs.map(unbk),
        log: lg.map(x => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return null; } }).filter(Boolean),
      });
    }
    const A = body.act;
    if (A === 'gen') return J(await mint('admin', s.id, body.hours, body.prefix));
    if (A === 'keyoff') { const k = await kv.get('key:' + body.key); if (!k) return J({ error: 'nf' }, 404); await kv.set('key:' + body.key, { ...k, off: k.off ? 0 : 1 }, { ex: Math.max(60, Math.ceil((k.exp - Date.now()) / 1000) + 604800) }); return J({ ok: 1, off: k.off ? 0 : 1 }); }
    if (A === 'extend') { // เพิ่มเวลาให้คีย์ที่มีอยู่ (นับต่อจากวันหมดอายุเดิม ถ้ายังไม่หมด / นับจากตอนนี้ถ้าหมดแล้ว)
      const k = await kv.get('key:' + body.key); if (!k) return J({ error: 'nf' }, 404);
      const hrs = clamp(body.hours, 1, 8760), exp = Math.max(k.exp, Date.now()) + hrs * 36e5;
      await kv.set('key:' + body.key, { ...k, exp }, { ex: Math.ceil((exp - Date.now()) / 1000) + 604800 });
      return J({ ok: 1, exp, expiresAt: toUnix(exp) });
    }
    if (A === 'bulkgen') { // สร้างหลายคีย์พร้อมกัน (สูงสุด 50)
      const n = clamp(body.count, 1, 50), keys = [];
      for (let i = 0; i < n; i++) keys.push((await mint('admin', s.id, body.hours, body.prefix)).key);
      return J({ ok: 1, keys });
    }
    if (A === 'purge') { // ลบคีย์ที่หมดอายุ/ถูกระงับทั้งหมด
      const ks = await kv.smembers('keys'), vs = ks.length ? await kv.mget(...ks.map(x => 'key:' + x)) : [];
      const dead = ks.filter((x, i) => !vs[i] || vs[i].exp <= Date.now() || vs[i].off);
      for (const x of dead) await kv.del('key:' + x);
      if (dead.length) await kv.srem('keys', ...dead);
      return J({ ok: 1, n: dead.length });
    }
    if (A === 'keydel') { const k0 = await kv.get('key:' + body.key); await kv.del('key:' + body.key); await kv.srem('keys', body.key); if (k0?.page) await kv.srem('pk:' + k0.page, body.key); return J({ ok: 1 }); }
    if (A === 'approve') {
      const id = clean(body.id, /\D/g, 25), slug = String(body.slug || '').trim().toLowerCase(), prefix = clean(body.prefix, /[^A-Za-z0-9]/g, 12) || 'KEY';
      if (id.length < 5) return J({ error: 'id' }, 400);
      if (!/^[a-z][a-z0-9-]{1,29}$/.test(slug) || ['true', 'false', 'null'].includes(slug)) return J({ error: 'slug' }, 400);
      const cs = await kv.smembers('crs'), all = cs.length ? await kv.mget(...cs.map(x => 'cr:' + unbk(x))) : [];
      if (all.some(c => c && c.slug === slug && c.id !== id)) return J({ error: 'taken' }, 409);
      await kv.set('cr:' + id, { id, slug, prefix }); await kv.sadd('crs', 'id:' + id);
      return J({ ok: 1 });
    }
    if (A === 'unapprove') { const id = clean(body.id, /\D/g, 25); await kv.del('cr:' + id); await kv.srem('crs', 'id:' + id); return J({ ok: 1 }); }
    if (A === 'pagedel') { await kv.del('page:' + body.slug); await kv.srem('pages', body.slug); await wipeImgs(String(body.slug)); return J({ ok: 1 }); }
    if (A === 'ban') { const id = String(body.id || '').trim(); if (!id) return J({ error: 'id' }, 400); await kv.sadd('bans', bk(id)); return J({ ok: 1 }); }
    if (A === 'unban') { await kv.srem('bans', bk(String(body.id || '').trim())); return J({ ok: 1 }); }
    if (A === 'max') { await kv.set('max', clamp(body.hours, 1, 8760)); return J({ ok: 1 }); }
    return J({ error: 'act' }, 400);
  }
  return J({ error: 'nf' }, 404);
}
async function h(req, ctx) {
  try { return await inner(req, ctx); }
  catch (e) { console.error('API error', e); return J({ error: 'server', detail: String(e?.message || e).slice(0, 200), db: kvReady }, 500); }
}
export { h as GET, h as POST, h as OPTIONS };
