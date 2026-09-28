'use client';
import { useCallback, useEffect, useRef, useState, use } from 'react';
import { Icon } from '../../../icons';
import { Gate, useHuman } from '../../../Gate';

const NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Flexozy';
const T = {
  th: { start: 'เริ่ม Get Key', yt: 'ไปที่ Discord', dc: 'ยืนยันว่าไม่ใช่บอท', claim: 'รับคีย์', wait: 'รอ', login: 'ล็อกอินด้วย Discord', exp: 'หมดอายุ', hrs: 'ชม.', copy: 'คัดลอกคีย์', copied: 'คัดลอกแล้ว', copyFail: 'คัดลอกไม่สำเร็จ', nf: 'ไม่พบหน้านี้', load: 'กำลังโหลด…', busy: 'กำลังทำงาน…', human: 'ยืนยันตัวตน', net: 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง',
    hint: ['กด "เริ่ม" เพื่อเปิด YouTube แล้วกดติดตามช่อง', 'ติดตามยูทูปแล้วรอให้เวลาครบ จากนั้นไปขั้นต่อไป', 'เข้า Discord แล้วยืนยัน captcha', 'ครบทุกขั้นตอนแล้ว กดรับคีย์ได้เลย'],
    ok1: 'เปิด YouTube แล้ว รอเวลาให้ครบ', ok2: 'เปิด Discord แล้ว รอเวลาแล้วยืนยัน captcha', ok3: 'ยืนยันสำเร็จ กดรับคีย์ได้เลย', got: 'ได้รับคีย์แล้ว!',
    errs: { server: 'ระบบมีปัญหาชั่วคราว ลองใหม่อีกครั้ง', auth: 'กรุณาเข้าสู่ระบบก่อน', banned: 'บัญชี/IP นี้ถูกแบน', wait: 'ยังไม่ครบเวลารอ', captcha: 'ยืนยัน captcha ไม่ผ่าน ลองอีกครั้ง', steps: 'ทำขั้นตอนไม่ครบ', nf: 'ไม่พบหน้านี้', act: 'คำสั่งไม่ถูกต้อง', x: 'เกิดข้อผิดพลาด ลองใหม่อีกครั้ง' } },
  en: { start: 'Get Key', yt: 'Go to Discord', dc: 'Verify you are human', claim: 'Claim key', wait: 'Wait', login: 'Log in with Discord', exp: 'Expires', hrs: 'h', copy: 'Copy key', copied: 'Copied', copyFail: 'Copy failed', nf: 'Page not found', load: 'Loading…', busy: 'Working…', human: 'Verify', net: 'Cannot reach the server, please try again',
    hint: ['Press "Get Key" to open YouTube and follow the channel', 'Follow on YouTube, wait for the timer, then continue', 'Join the Discord and verify the captcha', 'All steps done, claim your key'],
    ok1: 'YouTube opened, wait for the timer', ok2: 'Discord opened, wait then verify the captcha', ok3: 'Verified, you can claim your key', got: 'Key claimed!',
    errs: { server: 'Temporary server problem, try again', auth: 'Please log in first', banned: 'This account/IP is banned', wait: 'Timer not finished yet', captcha: 'Captcha failed, try again', steps: 'Steps not completed', nf: 'Page not found', act: 'Invalid action', x: 'Something went wrong, try again' } },
};

export default function K({ params }) {
  const { slug } = use(params), { hv, sk: gsk, setHv } = useHuman();
  const [lang, setLang] = useState('th'), t = T[lang], [toasts, setToasts] = useState([]), tid = useRef(0);
  const [d, setD] = useState(null), [dl, setDl] = useState(0), [left, setLeft] = useState(0), [tok, setTok] = useState(''), [busy, setBusy] = useState(false);
  const box = useRef(null), wid = useRef(null);

  useEffect(() => { let l = 'th'; try { l = localStorage.getItem('lang') || 'th'; } catch {} setLang(T[l] ? l : 'th'); }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const sw = l => { setLang(l); try { localStorage.setItem('lang', l); } catch {} };
  const toast = useCallback((msg, type = 'ok') => { const n = ++tid.current; setToasts(x => [...x.slice(-2), { n, msg, type }]); setTimeout(() => setToasts(x => x.filter(y => y.n !== n)), 4200); }, []);
  const api = useCallback(async (p, body) => {
    try { const r = await fetch('/api/' + p, { cache: 'no-store', ...(body ? { method: 'POST', body: JSON.stringify(body) } : {}) }); return { ok: r.ok, j: await r.json().catch(() => ({})) }; }
    catch { toast(T[document.documentElement.lang]?.net || T.th.net, 'err'); return { ok: false, j: {} }; }
  }, [toast]);
  const copy = async text => {
    try { await navigator.clipboard.writeText(text); toast(t.copied); }
    catch { try { const a = document.createElement('textarea'); a.value = text; document.body.appendChild(a); a.select(); document.execCommand('copy'); a.remove(); toast(t.copied); } catch { toast(t.copyFail, 'err'); } }
  };

  const load = useCallback(async hit => {
    const { j } = await api('page/' + slug + (hit ? '?hit=1' : ''));
    if (!j.error && !j.title) return; // เน็ตล่ม: คงค่าเดิมไว้
    setD(j);
    setDl(Date.now() + (j.left || 0) * 1000); // นับถอยหลังจากค่าของเซิร์ฟเวอร์ ไม่พึ่งนาฬิกาเครื่อง
  }, [api, slug]);
  useEffect(() => {
    if (hv !== true) return;
    let hit = false; // นับการเข้าชม 1 ครั้งต่อแท็บ (รีเฟรชไม่นับซ้ำ)
    try { if (!sessionStorage.getItem('hit:' + slug)) { sessionStorage.setItem('hit:' + slug, '1'); hit = true; } } catch {}
    load(hit);
  }, [hv, load, slug]);
  useEffect(() => { if (d?.title) document.title = d.title + ' · ' + NAME; }, [d?.title]);

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

  if (hv === undefined) return <div className="gate" />;
  if (hv === false) return <Gate sitekey={gsk} lang={lang} onOk={() => setHv(true)} />;

  const Toasts = <div className="tst" role="status" aria-live="polite">{toasts.map(x => <div key={x.n} className={'tt ' + x.type} onClick={() => setToasts(y => y.filter(z => z.n !== x.n))}>{x.msg}</div>)}</div>;
  const Top = <div className="top"><div className="lang">{['th', 'en'].map(l => <button key={l} className={lang === l ? 'on' : ''} onClick={() => sw(l)}>{l.toUpperCase()}</button>)}</div></div>;
  if (!d) return <div className="page">{Top}<p style={{ textAlign: 'center', color: 'var(--m)' }}>{t.load}</p>{Toasts}</div>;
  if (d.error) return <div className="page">{Top}<div className="nf"><h1>404</h1><p>{t.nf}</p></div>{Toasts}</div>;

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
  const chips = [['youtube', 'YouTube'], ['discord', 'Discord'], ['shield', t.human]];
  return <div className="page">{Top}
    <div className="hero">{d.banner ? <img className="bn" src={d.banner} alt="" /> : <div className="bn ph" />}
      <div className="hd2">{d.logo ? <img className="lg" src={d.logo} alt="" /> : <span className="lg ph">{(d.title || '?')[0]}</span>}<div><h1>{d.title}</h1>{d.desc && <p>{d.desc}</p>}</div></div></div>
    {d.links?.length > 0 && <div className="lks">{d.links.map((l, i) => <a key={i} className="lk" href={l.url} target="_blank" rel="noopener noreferrer nofollow">{l.icon === 'img' && l.img ? <img src={l.img} alt="" width="26" height="26" /> : <Icon name={l.icon === 'img' ? 'website' : l.icon} size={26} />}<span>{l.label}</span></a>)}</div>}

    {!d.user ? <div className="box"><a className="main" href={'/api/login?next=' + encodeURIComponent('/getkey/' + slug)}>{t.login}</a><p>{t.hint[0]}</p></div>
      : d.key ? <div className="box"><div className="steps">{[0, 1, 2].map(i => <i key={i} className="d" />)}</div><div className="key">{d.key.key}</div><p style={{ textAlign: 'center' }}>{t.exp}: {new Date(d.key.exp).toLocaleString()}</p><button className="main" style={{ marginTop: 14 }} onClick={() => copy(d.key.key)}>{t.copy}</button></div>
        : <div className="box"><div className="chips">{chips.map(([ic, n], i) => <span key={i} className={'chip' + (st > i ? ' d' : st === i ? ' on' : '')}>{ic === 'shield' ? <b>✓</b> : <Icon name={ic} size={18} />}{n}</span>)}</div>
          <div className="steps">{[0, 1, 2].map(i => <i key={i} className={st > i ? 'd' : ''} />)}</div>
          {st === 2 && sk && <div ref={box} className="ts" />}
          {st === 3 ? <button className="main" disabled={busy} onClick={() => post({ act: 'claim' })}>{busy ? t.busy : `${t.claim} (${d.hours}${t.hrs})`}</button>
            : <button className="main" disabled={busy || !ready} onClick={() => post({ act: 'go', token: tok })}>{label}</button>}
          <p>{t.hint[st]}</p></div>}
    <div className="ft">{NAME}</div>{Toasts}</div>;
}
