'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useApp } from './Shell';
import { Icon, PRESETS } from './icons';

const T = {
  th: { ph: 'แผงผู้สร้างหน้า', sb: 'เฉพาะบัญชีที่แอดมินอนุมัติเท่านั้น', login: 'เข้าสู่ระบบด้วย Discord', pend: 'บัญชีนี้ยังไม่ได้รับอนุมัติ ส่ง Discord ID ด้านล่างให้แอดมินเพื่อขอสิทธิ์', ok: 'อนุมัติแล้ว', mine: 'หน้าของฉัน', open: 'เปิด', empty: 'ยังไม่มีหน้า กรอกแบบฟอร์มแล้วบันทึกเพื่อสร้าง', save: 'บันทึก', saving: 'กำลังบันทึก…', ti: 'ชื่อหน้า', ds: 'คำอธิบายสั้นๆ (ไม่เกิน 140 ตัวอักษร)', yt: 'ลิงก์ YouTube', dc: 'ลิงก์ Discord', w: 'เวลารอ (วินาที 10-120)', hr: 'อายุคีย์ (ชั่วโมง)', saved: 'บันทึกแล้ว', copy: 'คัดลอก', cid: 'Discord ID ของคุณ', link: 'ลิงก์หน้า',
    im: 'รูปภาพ', logo: 'โลโก้ (สี่เหลี่ยมจัตุรัส)', banner: 'แบนเนอร์ (กว้าง)', up: 'อัปโหลด', chg: 'เปลี่ยนรูป', del: 'ลบ', up0: 'กำลังอัปโหลด…', upok: 'อัปโหลดแล้ว (อย่าลืมกดบันทึกหน้า)', imgn: 'รูปจะถูกย่อให้อัตโนมัติ รองรับ PNG / JPG / WEBP',
    lk: 'ลิงก์เพิ่มเติม', lkh: 'แสดงเป็นปุ่มสวยๆ บนหน้าแจกคีย์ (ไม่บังคับ ไม่ใช่ขั้นตอนรับคีย์) สูงสุด 6 ลิงก์', addl: '+ เพิ่มลิงก์', lname: 'ชื่อปุ่ม', lurl: 'https://…', ic: 'ไอคอน', icimg: 'รูปของฉัน',
    keys: 'คีย์ของฉัน', kh: 'คีย์ที่ผู้ใช้รับจากหน้าของคุณ', kq: 'ค้นหาคีย์', st: { active: 'ใช้ได้', expired: 'หมดอายุ', revoked: 'ระงับ' }, left: 'เหลือ', off: 'ระงับ', on: 'เปิดใช้', purge: 'ล้างคีย์เสีย', refresh: 'รีเฟรช', nokeys: 'ยังไม่มีคีย์', cd: (k) => `ลบคีย์ ${k}?`, cp: 'ลบคีย์ที่หมดอายุ/ถูกระงับทั้งหมด?', pn: n => `ลบแล้ว ${n} คีย์`, done: 'ทำรายการแล้ว',
    errs: { server: 'ฐานข้อมูลมีปัญหา ดูป้ายเตือนด้านบน', yt: 'ลิงก์ YouTube ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)', dc: 'ลิงก์ Discord ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)', link: 'ลิงก์เพิ่มเติมไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)', img: 'รูปไม่ถูกต้องหรือใหญ่เกินไป ลองรูปอื่น', kind: 'ประเภทรูปไม่ถูกต้อง', nf: 'ไม่พบคีย์นี้ในหน้าของคุณ', not_approved: 'บัญชีนี้ยังไม่ได้รับอนุมัติ', x: 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง' } },
  en: { ph: 'Creator panel', sb: 'Only accounts approved by an admin', login: 'Log in with Discord', pend: 'This account is not approved yet. Send the Discord ID below to an admin.', ok: 'approved', mine: 'My pages', open: 'Open', empty: 'No page yet. Fill in the form and save.', save: 'Save', saving: 'Saving…', ti: 'Page title', ds: 'Short description (max 140 chars)', yt: 'YouTube link', dc: 'Discord link', w: 'Wait (seconds 10-120)', hr: 'Key lifetime (hours)', saved: 'Saved', copy: 'Copy', cid: 'Your Discord ID', link: 'Page link',
    im: 'Images', logo: 'Logo (square)', banner: 'Banner (wide)', up: 'Upload', chg: 'Change', del: 'Remove', up0: 'Uploading…', upok: 'Uploaded (remember to save the page)', imgn: 'Images are resized automatically. PNG / JPG / WEBP',
    lk: 'Extra links', lkh: 'Shown as nice buttons on your key page (optional, not part of the key steps). Up to 6.', addl: '+ Add link', lname: 'Button label', lurl: 'https://…', ic: 'Icon', icimg: 'My image',
    keys: 'My keys', kh: 'Keys users claimed from your page', kq: 'Search key', st: { active: 'Active', expired: 'Expired', revoked: 'Suspended' }, left: 'Left', off: 'Suspend', on: 'Enable', purge: 'Clear dead keys', refresh: 'Refresh', nokeys: 'No keys yet', cd: (k) => `Delete key ${k}?`, cp: 'Delete all expired/suspended keys?', pn: n => `Removed ${n} keys`, done: 'Done',
    errs: { yt: 'Invalid YouTube link (must start with https://)', dc: 'Invalid Discord link (must start with https://)', link: 'Invalid extra link (must start with https://)', img: 'Invalid or too large image, try another', kind: 'Invalid image type', nf: 'Key not found on your page', not_approved: 'This account is not approved', x: 'Could not save, please try again' } },
};

// ย่อรูปฝั่งเบราว์เซอร์ (crop แบบ cover) แล้วแปลงเป็น data URL ให้เล็กพอ (<~300KB)
const shrink = (file, w, h) => new Promise((res, rej) => {
  const img = new Image(), u = URL.createObjectURL(file);
  img.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
  img.onload = () => {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const x = c.getContext('2d'), r = Math.max(w / img.width, h / img.height), dw = img.width * r, dh = img.height * r;
    x.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh); URL.revokeObjectURL(u);
    let q = 0.86, out = c.toDataURL('image/webp', q);
    if (!out.startsWith('data:image/webp')) out = c.toDataURL('image/jpeg', q); // Safari เข้ารหัส webp ไม่ได้
    while (out.length > 380000 && q > 0.4) { q -= 0.12; out = c.toDataURL(out.startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg', q); }
    res(out);
  };
  img.src = u;
});
const fmt = sec => { sec = Math.max(0, Math.floor(sec)); const p = n => String(n).padStart(2, '0'); return `${Math.floor(sec / 3600)}h ${p(Math.floor(sec % 3600 / 60))}m ${p(sec % 60)}s`; };
const SIZE = { logo: [256, 256], banner: [1200, 400] };

function Pick({ t, kind, url, busy, round, wide, onFile, onDel }) {
  const ref = useRef(null);
  return <div className="pick">
    <div className={'pv' + (round ? ' r' : '') + (wide ? ' w' : '')}>{url ? <img src={url} alt="" /> : <span>＋</span>}</div>
    <div className="pa">
      <button type="button" className="g" disabled={busy} onClick={() => ref.current?.click()}>{busy ? t.up0 : url ? t.chg : t.up}</button>
      {url && <button type="button" className="g" disabled={busy} onClick={onDel}>{t.del}</button>}
      <input ref={ref} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) onFile(f, kind); }} />
    </div>
  </div>;
}

export default function P() {
  const { lang, me, reload, api, toast, copy } = useApp(), t = T[lang], [f, setF] = useState({ wait: 40, hours: 24, links: [] }), [busy, setBusy] = useState(false);
  const [iv, setIv] = useState({}), [ib, setIb] = useState(''), [ks, setKs] = useState(null), [now, setNow] = useState(Date.now()), [q, setQ] = useState('');
  const init = useRef(false), p = me?.page, u = me?.user, slug = me?.creator?.slug;

  // ตั้งค่าฟอร์มจากข้อมูลเดิมครั้งเดียว (ไม่รีเซ็ตทับสิ่งที่กำลังพิมพ์)
  useEffect(() => {
    if (!me?.creator || init.current) return;
    init.current = true; setIv(me.imgv || {});
    if (me.page) { const g = me.page; setF({ title: g.title, desc: g.desc || '', yt: g.yt, dc: g.dc, wait: g.wait, hours: g.hours, links: g.links || [] }); }
  }, [me]);
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));
  const setLink = (slot, k, val) => setF(v => ({ ...v, links: v.links.map(l => l.slot === slot ? { ...l, [k]: val } : l) }));
  const addLink = () => setF(v => { const used = new Set(v.links.map(l => l.slot)), s = [0, 1, 2, 3, 4, 5].find(x => !used.has(x)); return s === undefined ? v : { ...v, links: [...v.links, { slot: s, label: '', url: '', icon: 'website' }] }; });
  const rmLink = slot => setF(v => ({ ...v, links: v.links.filter(l => l.slot !== slot) }));

  const save = async () => {
    setBusy(true);
    const { ok, j } = await api('creator', f);
    setBusy(false);
    if (ok) { toast(t.saved); reload(); } else toast(t.errs[j.error] || t.errs.x, 'err');
  };
  const upload = async (file, kind) => {
    setIb(kind);
    try {
      const [w, h] = kind.startsWith('i') ? [128, 128] : SIZE[kind], data = await shrink(file, w, h);
      const { ok, j } = await api('creator', { act: 'img', kind, data });
      if (ok && j.ok) { setIv(v => ({ ...v, [kind]: j.v })); toast(t.upok); } else toast(t.errs[j.error] || t.errs.img, 'err');
    } catch { toast(t.errs.img, 'err'); }
    setIb('');
  };
  const delImg = async kind => { setIb(kind); const { ok } = await api('creator', { act: 'imgdel', kind }); setIb(''); if (ok) setIv(v => { const n = { ...v }; delete n[kind]; return n; }); };
  const img = kind => iv[kind] ? `/api/img/${slug}/${kind}?v=${iv[kind]}` : '';

  // คีย์ของตัวเอง
  const loadKeys = useCallback(async () => { const { ok, j } = await api('creator', { act: 'keys' }); if (ok && j.keys) setKs(j.keys); }, [api]);
  useEffect(() => { if (me?.creator) loadKeys(); }, [me?.creator, loadKeys]);
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const kact = async (o, msg, confirm) => {
    if (confirm && !window.confirm(confirm)) return;
    setBusy(true); const { ok, j } = await api('creator', o); setBusy(false);
    if (!ok || j.error) return toast(t.errs[j.error] || t.errs.x, 'err');
    toast(typeof msg === 'function' ? msg(j) : msg); loadKeys();
  };
  const status = k => k.exp <= now ? 'expired' : k.off ? 'revoked' : 'active';
  const shown = (ks || []).filter(k => !q.trim() || k.key.toLowerCase().includes(q.trim().toLowerCase()));

  return <>
    <div className="grid2"><section className="box"><h2>{t.ph}</h2><p>{t.sb}</p>
      {me === undefined ? null : !u ? <a className="b" href="/api/login">{t.login}</a>
        : <><span className="pill">{u.name} ({me.creator ? t.ok : '…'})</span>
          {!me.creator && <div style={{ marginTop: 16 }}><p>{t.pend}</p><small className="tag">{t.cid}</small><div className="cp"><code>{u.id}</code><button className="g" onClick={() => copy(u.id)}>{t.copy}</button></div></div>}</>}
      {me?.creator && <div style={{ marginTop: 16 }}>
        {[['title', 'ti', 'text'], ['desc', 'ds', 'text'], ['yt', 'yt', 'url'], ['dc', 'dc', 'url'], ['wait', 'w', 'number'], ['hours', 'hr', 'number']].map(([k, l, ty]) => <label key={k}>{t[l]}<input type={ty} min={ty === 'number' ? 1 : undefined} maxLength={k === 'desc' ? 140 : undefined} value={f[k] ?? ''} onChange={set(k)} /></label>)}

        <h3 className="sec">{t.im}</h3><small className="tag">{t.imgn}</small>
        <div className="picks">
          <div><label>{t.logo}</label><Pick t={t} kind="logo" url={img('logo')} busy={ib === 'logo'} round onFile={upload} onDel={() => delImg('logo')} /></div>
          <div><label>{t.banner}</label><Pick t={t} kind="banner" url={img('banner')} busy={ib === 'banner'} wide onFile={upload} onDel={() => delImg('banner')} /></div>
        </div>

        <h3 className="sec">{t.lk}</h3><small className="tag">{t.lkh}</small>
        {f.links.map(l => <div key={l.slot} className="lrow">
          <div className="lic">{l.icon === 'img' ? (img('i' + l.slot) ? <img src={img('i' + l.slot)} alt="" /> : <span>＋</span>) : <Icon name={l.icon} size={26} />}</div>
          <div className="lf">
            <div className="two"><input placeholder={t.lname} maxLength={24} value={l.label} onChange={e => setLink(l.slot, 'label', e.target.value)} />
              <select value={l.icon} onChange={e => setLink(l.slot, 'icon', e.target.value)} aria-label={t.ic}>{PRESETS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}<option value="img">{t.icimg}</option></select></div>
            <input type="url" placeholder={t.lurl} value={l.url} onChange={e => setLink(l.slot, 'url', e.target.value)} />
            <div className="pa">{l.icon === 'img' && <><Pick t={t} kind={'i' + l.slot} url={img('i' + l.slot)} busy={ib === 'i' + l.slot} onFile={upload} onDel={() => delImg('i' + l.slot)} /></>}
              <button type="button" className="g" onClick={() => rmLink(l.slot)}>{t.del}</button></div>
          </div></div>)}
        {f.links.length < 6 && <button type="button" className="g" onClick={addLink}>{t.addl}</button>}

        <div style={{ marginTop: 18 }}><button onClick={save} disabled={busy}>{busy ? t.saving : t.save}</button></div></div>}</section>

      <section className="box"><h2>{t.mine}</h2>{p ? <div className="row"><div><b>{p.title}</b><small>/getkey/{p.slug} · {p.hours}h · {p.wait}s · {p.prefix}-</small></div>
        <div className="rt"><button className="g" onClick={() => copy(location.origin + '/getkey/' + p.slug)}>{t.copy}</button><Link className="b g" href={'/getkey/' + p.slug}>{t.open}</Link></div></div> : <p>{t.empty}</p>}</section></div>

    {me?.creator && <section className="box"><div className="adm-top"><div><h2>{t.keys}{ks ? ` (${ks.length})` : ''}</h2><p style={{ margin: 0 }}>{t.kh}</p></div>
      <div className="rt"><button className="g" disabled={busy} onClick={loadKeys}>{t.refresh}</button><button className="g" disabled={busy} onClick={() => kact({ act: 'purge' }, r => t.pn(r.n), t.cp)}>{t.purge}</button></div></div>
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={t.kq} style={{ marginTop: 12 }} />
      <div className="tw"><table><thead><tr><th>Key</th><th>Status</th><th>{t.left}</th><th></th></tr></thead><tbody>
        {shown.map(k => { const st = status(k), left = (k.exp - now) / 1000; return <tr key={k.key}>
          <td className="mono">{k.key}</td><td><span className={'st ' + st}>{t.st[st]}</span></td>
          <td className={'mono ' + (st === 'active' && left <= 300 ? 'low' : '')}>{st === 'expired' ? '0h 00m 00s' : fmt(left)}</td>
          <td className="acts"><button className="g" onClick={() => copy(k.key)}>{t.copy}</button>
            <button className="g" disabled={busy} onClick={() => kact({ act: 'keyoff', key: k.key }, t.done)}>{k.off ? t.on : t.off}</button>
            <button className="g" disabled={busy} onClick={() => kact({ act: 'keydel', key: k.key }, t.done, t.cd(k.key))}>{t.del}</button></td></tr>; })}
        {!shown.length && <tr><td colSpan="4" className="empty">{ks ? t.nokeys : '…'}</td></tr>}</tbody></table></div></section>}
  </>;
}
