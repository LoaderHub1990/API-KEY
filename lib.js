import { createClient } from '@vercel/kv';
import crypto from 'crypto';

// SESSION_SECRET ถ้าไม่ตั้ง จะสร้างจากความลับอื่นของเซิร์ฟเวอร์แทน (ห้ามใช้ค่า default สาธารณะ ไม่งั้นใครก็ปลอม cookie แอดมินได้)
const X = process.env, sv = k => (X[k] || '').trim();
const S = sv('SESSION_SECRET')
  || (sv('DISCORD_CLIENT_SECRET') || sv('KV_REST_API_TOKEN') || sv('UPSTASH_REDIS_REST_TOKEN')
    ? crypto.createHash('sha256').update(['keygate', sv('DISCORD_CLIENT_SECRET'), sv('KV_REST_API_TOKEN'), sv('UPSTASH_REDIS_REST_TOKEN')].join('|')).digest('hex')
    : X.NODE_ENV === 'production' ? crypto.randomBytes(32).toString('hex') : 'dev-secret-local-only');
const h = b => crypto.createHmac('sha256', S).update(b).digest('base64url');

// sign/unsign: cookie แบบมีลายเซ็น + วันหมดอายุ (field "e")
export const sign = o => { const b = Buffer.from(JSON.stringify(o)).toString('base64url'); return b + '.' + h(b); };
export const unsign = t => {
  try {
    const [b, m] = String(t).split('.');
    if (!b || !m) return;
    const x = h(b);
    if (m.length !== x.length || !crypto.timingSafeEqual(Buffer.from(m), Buffer.from(x))) return;
    const o = JSON.parse(Buffer.from(b, 'base64url'));
    if (o.e && o.e < Date.now()) return;
    return o;
  } catch {}
};

// แอดมิน = Discord ID ที่อยู่ใน ADMIN_IDS (คั่นด้วย , )
export const isAdmin = id => (process.env.ADMIN_IDS || '').split(/[,\s]+/).filter(Boolean).includes(String(id));

const E = process.env;
const url = E.KV_REST_API_URL || E.UPSTASH_REDIS_REST_URL, token = E.KV_REST_API_TOKEN || E.UPSTASH_REDIS_REST_TOKEN;
export const kvReady = !!(url && token);
export const kv = createClient({ url: url || 'https://missing.invalid', token: token || 'missing' });
export { crypto };
