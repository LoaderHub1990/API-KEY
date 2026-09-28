'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

const L = {
  th: {
    sub: 'ระบบแจกคีย์สำหรับชุมชน', tabs: ['สร้างหน้า', 'หน้าตัวอย่าง', 'แอดมิน'], login: 'เข้าสู่ระบบด้วย Discord', logout: 'ออกจากระบบ',
    loggedIn: 'เข้าสู่ระบบสำเร็จ', loggedOut: 'ออกจากระบบแล้ว', copied: 'คัดลอกแล้ว', copyFail: 'คัดลอกไม่สำเร็จ', net: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง',
    errs: { guild: 'ต้องอยู่ในเซิร์ฟเวอร์ Discord ก่อนถึงจะเข้าสู่ระบบได้', ban: 'บัญชีนี้ถูกแบน', denied: 'ยกเลิกการเข้าสู่ระบบ', state: 'เซสชันหมดอายุ ลองเข้าสู่ระบบใหม่', token: 'เข้าสู่ระบบ Discord ไม่สำเร็จ ลองใหม่อีกครั้ง', cfg: 'ยังไม่ได้ตั้งค่า Discord ในเซิร์ฟเวอร์' },
  },
  en: {
    sub: 'Key system for the community', tabs: ['Create page', 'Example page', 'Admin'], login: 'Log in with Discord', logout: 'Log out',
    loggedIn: 'Logged in', loggedOut: 'Logged out', copied: 'Copied', copyFail: 'Copy failed', net: 'Cannot reach the server, please try again',
    errs: { guild: 'You must join the Discord server first', ban: 'This account is banned', denied: 'Login cancelled', state: 'Session expired, please log in again', token: 'Discord login failed, please try again', cfg: 'Discord is not configured on the server' },
  },
};

const NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Flexozy';
const DEMO = process.env.NEXT_PUBLIC_DEMO_SLUG || 'demo';
const DISCORD = process.env.NEXT_PUBLIC_DISCORD_URL || '';

const Door = () => <svg viewBox="0 0 26 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
  <path d="M3 21h12M5 21V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1v17" /><circle cx="11" cy="12" r=".9" fill="currentColor" stroke="none" /><path d="M17.5 12H23M20.5 9l3 3-3 3" /></svg>;

export default function Shell({ children }) {
  const [lang, setLang] = useState('th'), [s, setS] = useState({}), [me, setMe] = useState(undefined), [toasts, setToasts] = useState([]), [dbErr, setDbErr] = useState(false);
  const path = usePathname(), t = L[lang], id = useRef(0);

  const toast = useCallback((msg, type = 'ok') => {
    const n = ++id.current;
    setToasts(x => [...x.slice(-3), { n, msg, type }]);
    setTimeout(() => setToasts(x => x.filter(y => y.n !== n)), 4200);
  }, []);
  const api = useCallback(async (p, body) => {
    try {
      const r = await fetch('/api/' + p, { cache: 'no-store', ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) });
      const j = await r.json().catch(() => ({}));
      if (j.error === 'server' || j.dbError) setDbErr(true);
      return { ok: r.ok, j };
    } catch { toast(L[document.documentElement.dataset.lang || 'th'].net, 'err'); return { ok: false, j: {} }; }
  }, [toast]);
  const reload = useCallback(async () => { const { j } = await api('me'); setMe(j.user !== undefined ? j : { user: null }); }, [api]);
  const copy = useCallback(async (text, notify = true) => {
    const T = L[document.documentElement.dataset.lang || 'th'];
    try { await navigator.clipboard.writeText(text); notify && toast(T.copied); }
    catch {
      try { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); notify && toast(T.copied); }
      catch { toast(T.copyFail, 'err'); }
    }
  }, [toast]);
  const logout = async () => { const { ok } = await api('logout', {}); if (ok) { setMe({ user: null }); toast(t.loggedOut, 'info'); } };
  const sw = l => { setLang(l); try { localStorage.setItem('lang', l); } catch {} };

  useEffect(() => { document.documentElement.dataset.lang = lang; document.documentElement.lang = lang; }, [lang]);
  useEffect(() => {
    let l = 'th'; try { l = localStorage.getItem('lang') || 'th'; } catch {}
    if (!L[l]) l = 'th';
    setLang(l); document.documentElement.dataset.lang = l;
    const q = new URLSearchParams(location.search), T = L[l];
    if (q.get('ok') === 'login') toast(T.loggedIn);
    if (q.get('err')) toast((T.errs[q.get('err')] || T.errs.token) + (q.get('why') ? ' [' + q.get('why') + ']' : ''), 'err');
    if (q.has('ok') || q.has('err')) { q.delete('ok'); q.delete('err'); q.delete('why'); const x = q.toString(); history.replaceState(null, '', location.pathname + (x ? '?' + x : '')); }
    reload();
  }, [reload, toast]);
  useEffect(() => { fetch('/api/stats', { cache: 'no-store' }).then(r => r.json()).then(x => { if (x.dbError || x.error) setDbErr(true); else setS(x); }).catch(() => setDbErr(true)); }, [path, me?.user?.id]);

  const hr = ['/', '/k/' + DEMO, '/admin'], tabs = t.tabs.map((x, i) => ({ x, href: hr[i], on: i === 0 ? path === '/' : path.startsWith(hr[i]) })).filter((_, i) => i < 2 || me?.admin);
  const u = me?.user;

  return <Ctx.Provider value={{ lang, me, reload, api, toast, copy }}><div className="wrap">
    <header className="hd"><Link href="/" className="id"><span className="logo">{NAME[0]}</span><span><b>{NAME}</b><small>{t.sub} {NAME}</small></span></Link>
      <div className="stats">{[['Pages', s.pages], ['Keys', s.keys], ['Max H', s.max]].map(([l, v]) => <div key={l}><b>{v ?? '-'}</b><span>{l}</span></div>)}</div></header>
    <div className="bar"><nav className="seg">{tabs.map(x => <Link key={x.href} href={x.href} className={x.on ? 'on' : ''}>{x.x}</Link>)}</nav>
      <div className="rt">
        {me === undefined ? null : u
          ? <div className="me"><img src={u.avatar} alt="" width="30" height="30" referrerPolicy="no-referrer" /><span title={'Discord ID: ' + u.id + ' (คลิกเพื่อคัดลอก)'} style={{ cursor: 'pointer' }} onClick={() => copy(u.id)}>{u.name}</span>{me.admin && <em>ADMIN</em>}
            <button className="door" onClick={logout} title={t.logout} aria-label={t.logout}><Door /></button></div>
          : <a className="b sm" href={'/api/login?next=' + encodeURIComponent(path || '/')}>{t.login}</a>}
        <div className="seg">{['th', 'en'].map(l => <button key={l} className={lang === l ? 'on' : ''} onClick={() => sw(l)}>{l.toUpperCase()}</button>)}</div>
      </div></div>
    {dbErr && <div className="warn">⚠ เชื่อมต่อฐานข้อมูลไม่ได้ จึงสร้างหน้า/สร้างคีย์/ดูสถิติไม่ได้ · ตรวจว่าโปรเจกต์ต่อ Vercel KV หรือ Upstash แล้ว (KV_REST_API_URL, KV_REST_API_TOKEN) จากนั้น Redeploy · <a href="/api/health" target="_blank" rel="noreferrer">ดูผลตรวจระบบ</a></div>}
    {children}
    <footer className="ft">© {new Date().getFullYear()} {NAME}{DISCORD && <> · <a href={DISCORD} target="_blank" rel="noreferrer">Discord</a></>}</footer>
    <div className="tst" role="status" aria-live="polite">{toasts.map(x => <div key={x.n} className={'tt ' + x.type} onClick={() => setToasts(y => y.filter(z => z.n !== x.n))}>{x.msg}</div>)}</div>
  </div></Ctx.Provider>;
}
