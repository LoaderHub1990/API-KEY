'use client';
import { useCallback, useEffect, useState } from 'react';
import { useApp } from '../Shell';

const ERR = { server: 'ฐานข้อมูลมีปัญหา ดูป้ายเตือนด้านบนหรือเปิด /api/health', id: 'Discord ID ไม่ถูกต้อง', slug: 'slug ต้องเป็น a-z 0-9 หรือ - ขึ้นต้นด้วยตัวอักษร ยาว 2-30 ตัว', taken: 'slug นี้ถูกใช้แล้ว', nf: 'ไม่พบข้อมูล', forbidden: 'บัญชีนี้ไม่ใช่แอดมิน', auth: 'กรุณาเข้าสู่ระบบก่อน', act: 'คำสั่งไม่ถูกต้อง', x: 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง' };

export default function A() {
  const { me, api, toast, copy } = useApp(), [d, setD] = useState(null), [f, setF] = useState({}), [busy, setBusy] = useState(false);
  const s = k => e => setF(v => ({ ...v, [k]: e.target.value })), adm = !!me?.admin;
  const load = useCallback(async () => { const { ok, j } = await api('admin'); if (ok) setD(j); else if (j.error) toast(ERR[j.error] || ERR.x, 'err'); }, [api, toast]);
  useEffect(() => { if (adm) load(); else setD(null); }, [adm, load]);

  const act = async (o, msg, opt = {}) => {
    if (opt.confirm && !window.confirm(opt.confirm)) return;
    setBusy(true);
    const { ok, j } = await api('admin', o);
    setBusy(false);
    if (!ok || j.error) return toast(ERR[j.error] || ERR.x, 'err');
    if (j.key) { copy(j.key, false); toast(`สร้างคีย์ ${j.key} แล้ว (คัดลอกให้แล้ว)`); } else toast(typeof msg === 'function' ? msg(j) : msg);
    if (opt.clear) setF(v => { const n = { ...v }; opt.clear.forEach(k => delete n[k]); return n; });
    load();
  };
  const need = (cond, m) => { if (!cond) { toast(m, 'err'); return false; } return true; };
  const inp = (k, ph, extra = {}) => <input value={f[k] || ''} placeholder={ph} onChange={s(k)} {...extra} />;

  if (me === undefined) return <main><h1>Admin</h1></main>;
  if (!me.user) return <main><h1>Admin</h1><div className="box"><p>เข้าสู่ระบบด้วย Discord (บัญชีที่เป็นแอดมิน) เพื่อจัดการระบบ</p><a className="b" href="/api/login?next=/admin">เข้าสู่ระบบด้วย Discord</a></div></main>;
  if (!adm) return <main><h1>Admin</h1><div className="box"><p>บัญชี {me.user.name} ไม่มีสิทธิ์แอดมิน</p><small className="tag">Discord ID: {me.user.id}</small></div></main>;
  if (!d) return <main><h1>Admin</h1><p>กำลังโหลด…</p></main>;

  return <main><h1>Admin</h1>
    <div className="box"><b>สร้างคีย์</b>{inp('h', 'ชั่วโมง เช่น 24', { inputMode: 'numeric' })}{inp('pf', 'คำนำหน้า เช่น VIP')}
      <button disabled={busy} onClick={() => need(+f.h > 0, 'ใส่จำนวนชั่วโมงให้ถูกต้อง') && act({ act: 'gen', hours: f.h, prefix: f.pf })}>สร้าง</button></div>

    <div className="box"><b>อนุมัติผู้สร้างหน้า</b>{inp('id', 'Discord ID', { inputMode: 'numeric' })}{inp('sl', 'slug (ชื่อหน้า) เช่น feozy')}{inp('px', 'คำนำหน้าคีย์ เช่น Feozy')}
      <button disabled={busy} onClick={() => need(f.id && f.sl, 'กรอก Discord ID และ slug ให้ครบ') && act({ act: 'approve', id: f.id, slug: f.sl, prefix: f.px }, 'อนุมัติผู้สร้างหน้าแล้ว', { clear: ['id', 'sl', 'px'] })}>อนุมัติ</button>
      <div className="tw"><table><tbody>{d.creators.map(c => <tr key={c.id}><td>{c.id}</td><td>{c.slug}</td><td>{c.prefix}</td><td><button className="g" disabled={busy} onClick={() => act({ act: 'unapprove', id: c.id }, 'ถอนสิทธิ์แล้ว', { confirm: `ถอนสิทธิ์ ${c.id}?` })}>ถอน</button></td></tr>)}</tbody></table></div></div>

    <div className="box"><b>เพดานชั่วโมง ({d.max})</b>{inp('mx', 'ชั่วโมงสูงสุด', { inputMode: 'numeric' })}
      <button disabled={busy} onClick={() => need(+f.mx > 0, 'ใส่ตัวเลขให้ถูกต้อง') && act({ act: 'max', hours: f.mx }, 'ตั้งเพดานชั่วโมงแล้ว', { clear: ['mx'] })}>ตั้งค่า</button></div>

    <div className="box"><b>แบน (Discord ID / IP)</b>{inp('bn', 'Discord ID หรือ IP')}
      <button disabled={busy} onClick={() => need(f.bn?.trim(), 'กรอก ID หรือ IP') && act({ act: 'ban', id: f.bn }, 'แบนแล้ว', { clear: ['bn'] })}>แบน</button>
      {d.bans.map(b => <p key={b}>{b} <button className="g" disabled={busy} onClick={() => act({ act: 'unban', id: b }, 'ปลดแบนแล้ว')}>ปลด</button></p>)}</div>

    <div className="box"><b>หน้า ({d.pages.length})</b><div className="tw"><table><tbody>{d.pages.map(p => <tr key={p.slug}><td>{p.slug}</td><td>{p.owner}</td><td><button className="g" disabled={busy} onClick={() => act({ act: 'pagedel', slug: p.slug }, 'ลบหน้าแล้ว', { confirm: `ลบหน้า ${p.slug}?` })}>ลบ</button></td></tr>)}</tbody></table></div></div>

    <div className="box"><b>คีย์ ({d.keys.length})</b><div className="tw"><table><tbody>{d.keys.map(k => <tr key={k.key}><td>{k.key}</td><td>{k.exp < Date.now() ? 'หมดอายุ' : k.off ? 'ระงับ' : 'ใช้ได้'}</td>
      <td><button className="g" onClick={() => copy(k.key)}>คัดลอก</button> <button className="g" disabled={busy} onClick={() => act({ act: 'keyoff', key: k.key }, r => r.off ? 'ระงับคีย์แล้ว' : 'เปิดใช้คีย์แล้ว')}>{k.off ? 'เปิดใช้' : 'ระงับ'}</button> <button className="g" disabled={busy} onClick={() => act({ act: 'keydel', key: k.key }, 'ลบคีย์แล้ว', { confirm: `ลบคีย์ ${k.key}?` })}>ลบ</button></td></tr>)}</tbody></table></div></div>

    <div className="box"><b>Log</b><div className="tw"><table><tbody>{d.log.map((l, i) => <tr key={i}><td>{new Date(l.t).toLocaleString()}</td><td>{l.page}</td><td>{l.name}</td><td>{l.ip}</td></tr>)}</tbody></table></div></div></main>;
}
