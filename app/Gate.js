'use client';
import { useEffect, useRef, useState } from 'react';
import './gate.css';

const NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Flexozy';
const G = {
  th: { title: 'กำลังตรวจสอบว่าคุณไม่ใช่บอต', desc: 'เว็บไซต์นี้ตรวจสอบความปลอดภัยก่อนเข้าใช้งาน ใช้เวลาไม่กี่วินาที หน้านี้จะแสดงเฉพาะครั้งแรกที่เข้าเว็บ', wait: 'กำลังตรวจสอบ…', fail: 'ตรวจสอบไม่ผ่าน ลองอีกครั้ง', err: 'โหลดการตรวจสอบไม่สำเร็จ ลองรีเฟรชหน้านี้', by: 'ป้องกันโดย Cloudflare Turnstile' },
  en: { title: 'Verifying you are human', desc: 'This site runs a quick security check before you enter. It only appears on your first visit.', wait: 'Verifying…', fail: 'Verification failed, please try again', err: 'Could not load the check, please refresh', by: 'Protected by Cloudflare Turnstile' },
};
// หน้าตรวจบอตครั้งแรก (เลย์เอาต์เหมือนหน้า interstitial ของ Cloudflare)
export function Gate({ sitekey, lang, onOk }) {
  const box = useRef(null), [msg, setMsg] = useState(''), g = G[lang] || G.th;
  useEffect(() => {
    let dead = false, wid = null;
    const draw = () => {
      if (dead || !window.turnstile || !box.current || wid != null) return;
      wid = window.turnstile.render(box.current, {
        sitekey, theme: 'light',
        callback: async token => {
          setMsg(g.wait);
          const j = await fetch('/api/human', { method: 'POST', body: JSON.stringify({ token }) }).then(r => r.json()).catch(() => ({}));
          if (j.ok) onOk(); else { setMsg(g.fail); try { window.turnstile.reset(wid); } catch {} }
        },
        'error-callback': () => setMsg(g.err),
      });
    };
    let sc = document.getElementById('cf-ts');
    if (window.turnstile) draw();
    else { if (!sc) { sc = document.createElement('script'); sc.id = 'cf-ts'; sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async = true; document.head.appendChild(sc); } sc.addEventListener('load', draw); sc.addEventListener('error', () => setMsg(g.err)); }
    return () => { dead = true; sc?.removeEventListener('load', draw); if (wid != null) { try { window.turnstile?.remove(wid); } catch {} } };
  }, [sitekey]); // eslint-disable-line react-hooks/exhaustive-deps
  return <div className="gate"><div className="gate-in">
    <h1>{typeof location !== 'undefined' ? location.host : NAME}</h1>
    <h2>{g.title}</h2><p>{g.desc}</p>
    <div ref={box} className="gate-box" />
    {msg && <p className="gate-msg">{msg}</p>}
    <div className="gate-ft">{g.by}</div>
  </div></div>;
}
export const useApp = () => useContext(Ctx);


// เช็กว่าเบราว์เซอร์นี้ผ่านการตรวจบอตแล้วหรือยัง (undefined = กำลังเช็ก, true = ผ่าน/ไม่ต้องตรวจ, false = ต้องตรวจ)
export function useHuman() {
  const [hv, setHv] = useState(undefined), [sk, setSk] = useState('');
  useEffect(() => { fetch('/api/human', { cache: 'no-store' }).then(r => r.json()).then(j => { if (j.ok) setHv(true); else { setSk(j.sitekey || ''); setHv(false); } }).catch(() => setHv(true)); }, []); // เน็ตล่ม = ไม่ล็อกคนออก
  return { hv, sk, setHv };
}
