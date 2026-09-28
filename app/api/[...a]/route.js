import { NextResponse as R } from 'next/server';
import { cookies } from 'next/headers';
import { kv, kvReady, sign, unsign, crypto, isAdmin } from '../../../lib';

export const dynamic = 'force-dynamic';

const E = process.env, D = 'https://discord.com/api', WEEK = 7 * 864e5;
const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' };
const J = (o, s = 200) => R.json(o, { status: s, headers: CORS });
const rnd = n => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; return Array.from({ length: n }, () => c[crypto.randomInt(c.length)]).join(''); };
const ses = async () => unsign((await cookies()).get('s')?.value || '');
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
  return { key, exp };
}

async function inner(req, { params }) {
  const [a, b] = (await params).a, M = req.method;
  if (M === 'OPTIONS') return J({});
  const body = M === 'POST' ? await req.json().catch(() => ({})) : {};
  const q = new URL(req.url).searchParams;
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const base = (E.BASE_URL || new URL(req.url).origin).replace(/\/$/, '');
  const co = { path: '/', httpOnly: true, sameSite: 'lax', secure: base.startsWith('https') };

  // ---------- ตรวจระบบ (ไม่เปิดเผยค่าลับ) ----------
  if (a === 'health') {
    let kvOk = false, kvErr = '';
    try { await kv.set('health', 1, { ex: 30 }); kvOk = (await kv.get('health')) === 1; } catch (e) { kvErr = String(e?.message || e).slice(0, 160); }
    return J({ db: { envFound: kvReady, working: kvOk, error: kvErr }, env: { BASE_URL: !!E.BASE_URL, SESSION_SECRET: !!E.SESSION_SECRET, DISCORD_CLIENT_ID: !!E.DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET: !!E.DISCORD_CLIENT_SECRET, DISCORD_GUILD_ID: !!E.DISCORD_GUILD_ID, ADMIN_IDS_count: (E.ADMIN_IDS || '').split(/[,\s]+/).filter(Boolean).length }, baseUrlUsed: base });
  }

  // ---------- Discord login ----------
  if (a === 'login') {
    if (!E.DISCORD_CLIENT_ID) return R.redirect(base + '/?err=cfg');
    const state = crypto.randomBytes(16).toString('hex');
    const r = R.redirect('https://discord.com/oauth2/authorize?' + new URLSearchParams({ client_id: E.DISCORD_CLIENT_ID, redirect_uri: base + '/api/callback', response_type: 'code', scope: 'identify guilds', state }));
    r.cookies.set('os', state, { ...co, maxAge: 600 });
    r.cookies.set('next', safe(q.get('next')), { ...co, maxAge: 600 });
    return r;
  }
  if (a === 'callback') {
    const ck = await cookies();
    const back = p => { const r = R.redirect(base + p); r.cookies.delete('os'); r.cookies.delete('next'); return r; };
    if (q.get('error')) return back('/?err=denied');
    if (!q.get('code') || !q.get('state') || q.get('state') !== ck.get('os')?.value) return back('/?err=state');
    try {
      const t = await (await fetch(D + '/oauth2/token', { method: 'POST', body: new URLSearchParams({ client_id: E.DISCORD_CLIENT_ID, client_secret: E.DISCORD_CLIENT_SECRET, grant_type: 'authorization_code', code: q.get('code'), redirect_uri: base + '/api/callback' }) })).json();
      if (!t.access_token) return back('/?err=token');
      const H = { Authorization: 'Bearer ' + t.access_token };
      const u = await (await fetch(D + '/users/@me', { headers: H })).json();
      if (!u.id) return back('/?err=token');
      const adminUser = isAdmin(u.id);
      let inGuild = adminUser || !E.DISCORD_GUILD_ID; // แอดมินเข้าได้เสมอ / ถ้าไม่ตั้ง GUILD_ID = ไม่เช็กเซิร์ฟเวอร์
      if (!inGuild) { const gs = await (await fetch(D + '/users/@me/guilds', { headers: H })).json(); inGuild = Array.isArray(gs) && gs.some(g => g.id === E.DISCORD_GUILD_ID); }
      if (!inGuild) return back('/?err=guild');
      if (!adminUser && await kv.sismember('bans', 'id:' + u.id).catch(() => 0)) return back('/?err=ban');
      const dest = new URL(base + safe(ck.get('next')?.value));
      dest.searchParams.set('ok', 'login');
      const r = back(dest.pathname + dest.search);
      r.cookies.set('s', sign({ id: u.id, name: u.global_name || u.username, avatar: avatar(u), e: Date.now() + WEEK }), { ...co, maxAge: 604800 });
      return r;
    } catch { return back('/?err=token'); }
  }
  if (a === 'logout') { const r = J({ ok: 1 }); r.cookies.delete('s'); r.cookies.delete('adm'); return r; }

  // ---------- public ----------
  if (a === 'me') {
    const s = await ses();
    if (!s) return J({ user: null });
    const out = { user: { id: s.id, name: s.name, avatar: s.avatar }, admin: isAdmin(s.id), creator: null, page: null, max: 72 };
    try { const c = await kv.get('cr:' + s.id); out.creator = c || null; out.page = c ? (await kv.get('page:' + c.slug)) || null : null; out.max = (await kv.get('max')) || 72; } catch { out.dbError = true; }
    return J(out);
  }
  if (a === 'stats') { try { const [keys, pages, creators, max] = await Promise.all([kv.scard('keys'), kv.scard('pages'), kv.scard('crs'), kv.get('max')]); return J({ keys, pages, creators, max: max || 72 }); } catch { return J({ dbError: true }); } }
  if (a === 'verify') { const k = await kv.get('key:' + (q.get('key') || '-')); return J(live(k) ? { valid: true, expires: k.exp, remaining: Math.floor((k.exp - Date.now()) / 1000), page: k.page } : { valid: false }); }

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
    const s = await ses();
    let st = null, k = null;
    if (s) {
      st = await kv.get(`st:${b}:${s.id}`);
      const old = await kv.get(`cl:${b}:${s.id}`);
      if (old) { const kk = await kv.get('key:' + old); if (live(kk)) k = kk; }
    }
    const step = st?.step || 0, left = (step === 1 || step === 2) ? Math.max(0, Math.ceil((st.t + p.wait * 1000 - Date.now()) / 1000)) : 0;
    return J({ title: p.title, wait: p.wait, hours: p.hours, step, left, key: k ? { key: k.key, exp: k.exp } : null, sitekey: E.TURNSTILE_SITEKEY || '', user: s?.name || null });
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
    const yt = body.yt ? url(body.yt) : '', dc = body.dc ? url(body.dc) : '';
    if (body.yt && !yt) return J({ error: 'yt' }, 400);
    if (body.dc && !dc) return J({ error: 'dc' }, 400);
    const max = (await kv.get('max')) || 72;
    await kv.set('page:' + c.slug, { slug: c.slug, owner: s.id, prefix: c.prefix, title: String(body.title || c.slug).trim().slice(0, 60) || c.slug, yt, dc, wait: clamp(body.wait, 10, 120), hours: clamp(body.hours, 1, max), off: 0 });
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
      return J({
        max: max || 72,
        keys: keyv.filter(Boolean).sort((x, y) => y.exp - x.exp),
        pages: pagev.filter(Boolean),
        creators: crv.filter(Boolean),
        bans: bs.map(unbk),
        log: lg.map(x => { try { return typeof x === 'string' ? JSON.parse(x) : x; } catch { return null; } }).filter(Boolean),
      });
    }
    const A = body.act;
    if (A === 'gen') return J(await mint('admin', s.id, body.hours, body.prefix));
    if (A === 'keyoff') { const k = await kv.get('key:' + body.key); if (!k) return J({ error: 'nf' }, 404); await kv.set('key:' + body.key, { ...k, off: k.off ? 0 : 1 }, { ex: Math.max(60, Math.ceil((k.exp - Date.now()) / 1000) + 604800) }); return J({ ok: 1, off: k.off ? 0 : 1 }); }
    if (A === 'keydel') { await kv.del('key:' + body.key); await kv.srem('keys', body.key); return J({ ok: 1 }); }
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
    if (A === 'pagedel') { await kv.del('page:' + body.slug); await kv.srem('pages', body.slug); return J({ ok: 1 }); }
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
