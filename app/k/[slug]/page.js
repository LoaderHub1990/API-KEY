'use client';
import { useCallback, useEffect, useRef, useState, use } from 'react';
import { useApp } from '../../Shell';

const T = {
  th: { start: 'เริ่ม Get Key', yt: 'ไปที่ Discord', dc: 'ยืนยันว่าไม่ใช่บอท', claim: 'รับคีย์', wait: 'รอ', login: 'ล็อกอินด้วย Discord', exp: 'หมดอายุ', hrs: 'ชม.', copy: 'คัดลอกคีย์', nf: 'ไม่พบหน้านี้', load: 'กำลังโหลด…', busy: 'กำลังทำงาน…',
    hint: ['กด "เริ่ม" เพื่อเปิด YouTube แล้วกดติดตามช่อง', 'ติดตามยูทูปแล้วรอให้เวลาครบ จากนั้นไปขั้นต่อไป', 'เข้า Discord แล้วยืนยัน captcha', 'ครบทุกขั้นตอนแล้ว กดรับคีย์ได้เลย'],
    ok1: 'เปิด YouTube แล้ว รอเวลาให้ครบ', ok2: 'เปิด Discord แล้ว รอเวลาแล้วยืนยัน captcha', ok3: 'ยืนยันสำเร็จ กดรับคีย์ได้เลย', got: 'ได้รับคีย์แล้ว!',
    errs: { server: 'ฐานข้อมูลมีปัญหา ดูป้ายเตือนด้านบน', auth: 'กรุณาเข้าสู่ระบบก่อน', banned: 'บัญชี/IP นี้ถูกแบน', wait: 'ยังไม่ครบเวลารอ', captcha: 'ยืนยัน captcha ไม่ผ่าน ลองอีกครั้ง', steps: 'ทำขั้นตอนไม่ครบ', nf: 'ไม่พบหน้านี้', act: 'คำสั่งไม่ถูกต้อง', x: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' } },
  en: { start: 'Get Key', yt: 'Go to Discord', dc: 'Verify you are human', claim: 'Claim key', wait: 'Wait', login: 'Log in with Discord', exp: 'Expires', hrs: 'h', copy: 'Copy key', nf: 'Page not found', load: 'Loading…', busy: 'Working…',
    hint: ['Press "Get Key" to open YouTube and follow the channel', 'Follow on YouTube, wait for the timer, then continue', 'Join the Discord and verify the captcha', 'All steps done, claim your key'],
    ok1: 'YouTube opened, wait for the timer', ok2: 'Discord opened, wait then verify the captcha', ok3: 'Verified, you can claim your key', got: 'Key claimed!',
    errs: { auth: 'Please log in first', banned: 'This account/IP is banned', wait: 'Timer not finished yet', captcha: 'Captcha failed, try again', steps: 'Steps not completed', nf: 'Page not found', act: 'Invalid action', x: 'Something went wrong, try again' } },
};

export default function K({ params }) {
  const { slug } = use(params), { lang, me, toast, api, copy } = useApp(), t = T[lang];
  const [d, setD] = useState(null), [dl, setDl] = useState(0), [left, setLeft] = useState(0), [tok, setTok] = useState(''), [busy, setBusy] = useState(false);
  const box = useRef(null), wid = useRef(null);

  const load = useCallback(async () => {
    const { j } = await api('page/' + slug);
    if (!j.error && !j.title) return; // เน็ตล่ม: คงค่าเดิมไว้
    setD(j);
    setDl(Date.now() + (j.left || 0) * 1000); // นับถอยหลังจากค่า "วินาทีที่เหลือ" ของเซิร์ฟเวอร์ ไม่พึ่งนาฬิกาเครื่อง
  }, [api, slug]);
  useEffect(() => { load(); }, [load, me?.user?.id]);

  useEffect(() => {
    const tick = () => setLeft(Math.max(0, Math.ceil((dl - Date.now()) / 1000)));
    tick(); const i = setInterval(tick, 300); return () => clearInterval(i);
  }, [dl]);

  // Turnstile แบบ explicit: วาดใหม่ทุกครั้งที่เข้าสเต็ป captcha
  const sk = d?.sitekey, st = d?.step, hasKey = !!d?.key;
  useEffect(() => {
    if (!sk || st !== 2 || hasKey) return;
    let dead = false;
    const draw = () => {
      if (dead || !window.turnstile || !box.current || wid.current != null) return;
      wid.current = window.turnstile.render(box.current, { sitekey: sk, theme: 'dark', callback: setTok, 'expired-callback': () => setTok(''), 'error-callback': () => setTok('') });
    };
    let sc = document.getElementById('cf-ts');
    if (window.turnstile) draw();
    else { if (!sc) { sc = document.createElement('script'); sc.id = 'cf-ts'; sc.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'; sc.async = true; document.head.appendChild(sc); } sc.addEventListener('load', draw); }
    return () => { dead = true; sc?.removeEventListener('load', draw); if (wid.current != null) { try { window.turnstile?.remove(wid.current); } catch {} wid.current = null; } setTok(''); };
  }, [sk, st, hasKey]);

  if (!d) return <main><p>{t.load}</p></main>;
  if (d.error) return <main><h1>404</h1><p>{t.nf}</p></main>;

  const need = st === 1 || st === 2, ready = !need || (left === 0 && (st !== 2 || !sk || tok));
  const post = async o => {
    if (busy) return;
    setBusy(true);
    // เปิดแท็บใหม่ตอนกดทันที (ก่อน await) ไม่งั้นเบราว์เซอร์จะบล็อก popup
    const w = o.act === 'go' && st < 2 ? window.open('about:blank', '_blank') : null;
    const { ok, j } = await api('gate/' + slug, o);
    setBusy(false);
    if (!ok || j.error) { w?.close(); toast(t.errs[j.error] || t.errs.x, 'err'); if (j.error === 'wait') load(); if (j.error === 'captcha') { try { window.turnstile?.reset(wid.current); } catch {} setTok(''); } return; }
    if (j.url) { if (w) w.location.href = j.url; else window.open(j.url, '_blank'); } else w?.close();
    if (o.act === 'claim') toast(t.got); else toast([t.ok1, t.ok2, t.ok3][st] || t.ok3, 'info');
    await load();
  };

  const label = busy ? t.busy : st === 0 ? t.start : st === 1 ? (left ? `${t.wait} ${left}s` : t.yt) : (left ? `${t.wait} ${left}s` : t.dc);
  return <main><h1>{d.title}</h1>
    {!d.user ? <div className="box"><p>{t.hint[0]}</p><a className="b" href={'/api/login?next=' + encodeURIComponent('/k/' + slug)}>{t.login}</a></div>
      : d.key ? <div className="box"><div className="steps">{[0, 1, 2].map(i => <i key={i} className="d" />)}</div><div className="key">{d.key.key}</div><p>{t.exp}: {new Date(d.key.exp).toLocaleString()}</p><button onClick={() => copy(d.key.key)}>{t.copy}</button></div>
        : <div className="box"><div className="steps">{[0, 1, 2].map(i => <i key={i} className={st > i ? 'd' : ''} />)}</div>
          {st === 2 && sk && <div ref={box} style={{ marginBottom: 12 }} />}
          {st === 3 ? <button disabled={busy} onClick={() => post({ act: 'claim' })}>{busy ? t.busy : `${t.claim} (${d.hours}${t.hrs})`}</button>
            : <button disabled={busy || !ready} onClick={() => post({ act: 'go', token: tok })}>{label}</button>}
          <p>{t.hint[st]}</p></div>}</main>;
}
