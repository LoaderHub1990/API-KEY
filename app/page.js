'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApp } from './Shell';

const T = {
  th: { ph: 'แผงผู้สร้างหน้า', sb: 'เฉพาะบัญชีที่แอดมินอนุมัติเท่านั้น', login: 'เข้าสู่ระบบด้วย Discord', pend: 'บัญชีนี้ยังไม่ได้รับอนุมัติ ส่ง Discord ID ด้านล่างให้แอดมินเพื่อขอสิทธิ์', ok: 'อนุมัติแล้ว', mine: 'หน้าของฉัน', open: 'เปิด', empty: 'ยังไม่มีหน้า กรอกแบบฟอร์มแล้วบันทึกเพื่อสร้าง', save: 'บันทึก', saving: 'กำลังบันทึก…', ti: 'ชื่อหน้า', yt: 'ลิงก์ YouTube', dc: 'ลิงก์ Discord', w: 'เวลารอ (วินาที 10-120)', hr: 'อายุคีย์ (ชั่วโมง)', saved: 'บันทึกแล้ว', copy: 'คัดลอก', cid: 'Discord ID ของคุณ', link: 'ลิงก์หน้า',
    errs: { server: 'ฐานข้อมูลมีปัญหา ดูป้ายเตือนด้านบน', yt: 'ลิงก์ YouTube ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)', dc: 'ลิงก์ Discord ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://)', not_approved: 'บัญชีนี้ยังไม่ได้รับอนุมัติ', x: 'บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง' } },
  en: { ph: 'Creator panel', sb: 'Only accounts approved by an admin', login: 'Log in with Discord', pend: 'This account is not approved yet. Send the Discord ID below to an admin.', ok: 'approved', mine: 'My pages', open: 'Open', empty: 'No page yet. Fill in the form and save.', save: 'Save', saving: 'Saving…', ti: 'Page title', yt: 'YouTube link', dc: 'Discord link', w: 'Wait (seconds 10-120)', hr: 'Key lifetime (hours)', saved: 'Saved', copy: 'Copy', cid: 'Your Discord ID', link: 'Page link',
    errs: { yt: 'Invalid YouTube link (must start with https://)', dc: 'Invalid Discord link (must start with https://)', not_approved: 'This account is not approved', x: 'Could not save, please try again' } },
};

export default function P() {
  const { lang, me, reload, api, toast, copy } = useApp(), t = T[lang], [f, setF] = useState({ wait: 40, hours: 24 }), [busy, setBusy] = useState(false);
  const p = me?.page, u = me?.user;
  useEffect(() => { if (me?.page) { const g = me.page; setF({ title: g.title, yt: g.yt, dc: g.dc, wait: g.wait, hours: g.hours }); } }, [me]);
  const set = k => e => setF(v => ({ ...v, [k]: e.target.value }));
  const save = async () => {
    setBusy(true);
    const { ok, j } = await api('creator', f);
    setBusy(false);
    if (ok) { toast(t.saved); reload(); } else if (j.error || !ok) toast(t.errs[j.error] || t.errs.x, 'err');
  };
  return <div className="grid2"><section className="box"><h2>{t.ph}</h2><p>{t.sb}</p>
    {me === undefined ? null : !u ? <a className="b" href="/api/login">{t.login}</a>
      : <><span className="pill">{u.name} ({me.creator ? t.ok : '…'})</span>
        {!me.creator && <div style={{ marginTop: 16 }}><p>{t.pend}</p><small className="tag">{t.cid}</small><div className="cp"><code>{u.id}</code><button className="g" onClick={() => copy(u.id)}>{t.copy}</button></div></div>}</>}
    {me?.creator && <div style={{ marginTop: 16 }}>{[['title', 'ti', 'text'], ['yt', 'yt', 'url'], ['dc', 'dc', 'url'], ['wait', 'w', 'number'], ['hours', 'hr', 'number']].map(([k, l, ty]) => <label key={k}>{t[l]}<input type={ty} min={ty === 'number' ? 1 : undefined} value={f[k] ?? ''} onChange={set(k)} /></label>)}
      <button onClick={save} disabled={busy}>{busy ? t.saving : t.save}</button></div>}</section>
    <section className="box"><h2>{t.mine}</h2>{p ? <div className="row"><div><b>{p.title}</b><small>/k/{p.slug} · {p.hours}h · {p.wait}s · {p.prefix}-</small></div>
      <div className="rt"><button className="g" onClick={() => copy(location.origin + '/k/' + p.slug)}>{t.copy}</button><Link className="b g" href={'/k/' + p.slug}>{t.open}</Link></div></div> : <p>{t.empty}</p>}</section></div>;
}
