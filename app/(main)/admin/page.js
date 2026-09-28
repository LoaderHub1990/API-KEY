'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useApp } from '../../Shell';

const ERR = { server: 'ฐานข้อมูลมีปัญหา ดูป้ายเตือนด้านบนหรือเปิด /api/health', id: 'Discord ID ไม่ถูกต้อง', slug: 'slug ต้องเป็น a-z 0-9 หรือ - ขึ้นต้นด้วยตัวอักษร ยาว 2-30 ตัว', taken: 'slug นี้ถูกใช้แล้ว', nf: 'ไม่พบข้อมูล', forbidden: 'บัญชีนี้ไม่ใช่แอดมิน', auth: 'กรุณาเข้าสู่ระบบก่อน', act: 'คำสั่งไม่ถูกต้อง', x: 'ทำรายการไม่สำเร็จ ลองใหม่อีกครั้ง' };
const TABS = [['keys', 'คีย์'], ['gen', 'สร้างคีย์'], ['creators', 'ผู้สร้างหน้า'], ['pages', 'หน้า'], ['bans', 'แบน'], ['log', 'Log'], ['set', 'ตั้งค่า']];
const FILTERS = [['all', 'ทั้งหมด'], ['active', 'ใช้ได้'], ['expired', 'หมดอายุ'], ['revoked', 'ระงับ']];

// รูปแบบ Nh NNm NNs (ชั่วโมงทั้งหมด ไม่แปลงเป็นวัน)
const fmt = sec => { sec = Math.max(0, Math.floor(sec)); const p = n => String(n).padStart(2, '0'); return `${Math.floor(sec / 3600)}h ${p(Math.floor(sec % 3600 / 60))}m ${p(sec % 60)}s`; };
const status = (k, now) => k.exp <= now ? 'expired' : k.off ? 'revoked' : 'active';
const LBL = { active: 'ใช้ได้', expired: 'หมดอายุ', revoked: 'ระงับ' };

export default function A() {
  const { me, api, toast, copy } = useApp(), [d, setD] = useState(null), [f, setF] = useState({}), [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('keys'), [flt, setFlt] = useState('all'), [qs, setQs] = useState(''), [now, setNow] = useState(Date.now());
  const s = k => e => setF(v => ({ ...v, [k]: e.target.value })), adm = !!me?.admin;
  const load = useCallback(async () => { const { ok, j } = await api('admin'); if (ok) setD(j); else if (j.error) toast(ERR[j.error] || ERR.x, 'err'); }, [api, toast]);
  useEffect(() => { if (adm) load(); else setD(null); }, [adm, load]);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []); // นับถอยหลังทุก 1 วินาที

  const act = async (o, msg, opt = {}) => {
    if (opt.confirm && !window.confirm(opt.confirm)) return;
    setBusy(true);
    const { ok, j } = await api('admin', o);
    setBusy(false);
    if (!ok || j.error) return toast(ERR[j.error] || ERR.x, 'err');
    if (j.keys) { copy(j.keys.join('\n'), false); toast(`สร้าง ${j.keys.length} คีย์แล้ว (คัดลอกทั้งหมดให้แล้ว)`); }
    else if (j.key) { copy(j.key, false); toast(`สร้างคีย์ ${j.key} แล้ว (คัดลอกให้แล้ว)`); }
    else toast(typeof msg === 'function' ? msg(j) : msg);
    if (opt.clear) setF(v => { const n = { ...v }; opt.clear.forEach(k => delete n[k]); return n; });
    load();
  };
  const need = (cond, m) => { if (!cond) { toast(m, 'err'); return false; } return true; };
  const inp = (k, ph, extra = {}) => <input value={f[k] || ''} placeholder={ph} onChange={s(k)} {...extra} />;

  const keys = useMemo(() => {
    if (!d) return [];
    const t = qs.trim().toLowerCase();
    return d.keys.filter(k => (flt === 'all' || status(k, now) === flt) && (!t || k.key.toLowerCase().includes(t) || String(k.uid || '').includes(t) || String(k.page || '').toLowerCase().includes(t)));
  }, [d, flt, qs, now]);

  if (me === undefined) return <main className="adm"><h1>Admin</h1></main>;
  if (!me.user) return <main className="adm"><h1>Admin</h1><div className="box"><p>เข้าสู่ระบบด้วย Discord (บัญชีที่เป็นแอดมิน) เพื่อจัดการระบบ</p><a className="b" href="/api/login?next=/admin">เข้าสู่ระบบด้วย Discord</a></div></main>;
  if (!adm) return <main className="adm"><h1>Admin</h1><div className="box"><p>บัญชี {me.user.name} ไม่มีสิทธิ์แอดมิน</p><small className="tag">Discord ID: {me.user.id}</small></div></main>;
  if (!d) return <main className="adm"><h1>Admin</h1><p>กำลังโหลด…</p></main>;

  const sm = d.summary || {}, cnt = { keys: d.keys.length, creators: d.creators.length, pages: d.pages.length, bans: d.bans.length, log: d.log.length };

  return <main className="adm">
    <div className="adm-top"><h1>Admin</h1><button className="g" disabled={busy} onClick={load}>รีเฟรช</button></div>

    <div className="cards">
      {[['ทั้งหมด', sm.total, ''], ['ใช้ได้', sm.active, 'ok'], ['หมดอายุ', sm.expired, 'bad'], ['ระงับ', sm.revoked, 'warn']].map(([l, v, c]) => <div key={l} className={'card ' + c}><b>{v ?? 0}</b><span>{l}</span></div>)}
    </div>

    <nav className="seg tabs" role="tablist">{TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{cnt[k] !== undefined && <i>{cnt[k]}</i>}</button>)}</nav>

    {tab === 'keys' && <div className="box">
      <div className="tools">
        <input className="grow" value={qs} onChange={e => setQs(e.target.value)} placeholder="ค้นหาคีย์ / Discord ID / หน้า" />
        <div className="seg">{FILTERS.map(([k, l]) => <button key={k} className={flt === k ? 'on' : ''} onClick={() => setFlt(k)}>{l}</button>)}</div>
        <button className="g" disabled={busy} onClick={() => act({ act: 'purge' }, r => `ลบคีย์ที่หมดอายุ/ระงับ ${r.n} รายการ`, { confirm: 'ลบคีย์ที่หมดอายุและถูกระงับทั้งหมด?' })}>ล้างคีย์เสีย</button>
      </div>
      <div className="tw"><table><thead><tr><th>คีย์</th><th>สถานะ</th><th>เวลาที่เหลือ</th><th>หมดอายุ</th><th>หน้า</th><th></th></tr></thead>
        <tbody>{keys.map(k => { const st = status(k, now), left = (k.exp - now) / 1000; return <tr key={k.key}>
          <td className="mono">{k.key}</td>
          <td><span className={'st ' + st}>{LBL[st]}</span></td>
          <td className={'mono ' + (st === 'active' && left <= 300 ? 'low' : '')}>{st === 'expired' ? '0h 00m 00s' : fmt(left)}</td>
          <td className="tag">{new Date(k.exp).toLocaleString()}</td>
          <td className="tag">{k.page}</td>
          <td className="acts"><button className="g" onClick={() => copy(k.key)}>คัดลอก</button>
            <button className="g" disabled={busy} onClick={() => { const h = window.prompt('เพิ่มเวลา (ชั่วโมง)', '24'); if (h && +h > 0) act({ act: 'extend', key: k.key, hours: h }, 'เพิ่มเวลาแล้ว'); }}>+เวลา</button>
            <button className="g" disabled={busy} onClick={() => act({ act: 'keyoff', key: k.key }, r => r.off ? 'ระงับคีย์แล้ว' : 'เปิดใช้คีย์แล้ว')}>{k.off ? 'เปิดใช้' : 'ระงับ'}</button>
            <button className="g" disabled={busy} onClick={() => act({ act: 'keydel', key: k.key }, 'ลบคีย์แล้ว', { confirm: `ลบคีย์ ${k.key}?` })}>ลบ</button></td></tr>; })}
          {!keys.length && <tr><td colSpan="6" className="empty">ไม่พบคีย์</td></tr>}</tbody></table></div>
    </div>}

    {tab === 'gen' && <div className="cols">
      <div className="box"><h2>สร้างคีย์เดียว</h2>{inp('h', 'ชั่วโมง เช่น 24', { inputMode: 'numeric' })}{inp('pf', 'คำนำหน้า เช่น VIP')}
        <button disabled={busy} onClick={() => need(+f.h > 0, 'ใส่จำนวนชั่วโมงให้ถูกต้อง') && act({ act: 'gen', hours: f.h, prefix: f.pf })}>สร้าง</button></div>
      <div className="box"><h2>สร้างหลายคีย์ (สูงสุด 50)</h2>{inp('bc', 'จำนวนคีย์ เช่น 10', { inputMode: 'numeric' })}{inp('bh', 'ชั่วโมง เช่น 24', { inputMode: 'numeric' })}{inp('bp', 'คำนำหน้า เช่น VIP')}
        <button disabled={busy} onClick={() => need(+f.bc > 0 && +f.bh > 0, 'ใส่จำนวนและชั่วโมงให้ถูกต้อง') && act({ act: 'bulkgen', count: f.bc, hours: f.bh, prefix: f.bp })}>สร้างและคัดลอกทั้งหมด</button></div>
    </div>}

    {tab === 'creators' && <div className="cols">
      <div className="box"><h2>อนุมัติผู้สร้างหน้า</h2>{inp('id', 'Discord ID', { inputMode: 'numeric' })}{inp('sl', 'slug (ชื่อหน้า) เช่น feozy')}{inp('px', 'คำนำหน้าคีย์ เช่น Feozy')}
        <button disabled={busy} onClick={() => need(f.id && f.sl, 'กรอก Discord ID และ slug ให้ครบ') && act({ act: 'approve', id: f.id, slug: f.sl, prefix: f.px }, 'อนุมัติผู้สร้างหน้าแล้ว', { clear: ['id', 'sl', 'px'] })}>อนุมัติ</button></div>
      <div className="box"><h2>ผู้สร้างที่อนุมัติแล้ว</h2><div className="tw"><table><thead><tr><th>Discord ID</th><th>slug</th><th>prefix</th><th></th></tr></thead><tbody>
        {d.creators.map(c => <tr key={c.id}><td className="mono">{c.id}</td><td>{c.slug}</td><td>{c.prefix}</td><td className="acts"><button className="g" disabled={busy} onClick={() => act({ act: 'unapprove', id: c.id }, 'ถอนสิทธิ์แล้ว', { confirm: `ถอนสิทธิ์ ${c.id}?` })}>ถอน</button></td></tr>)}
        {!d.creators.length && <tr><td colSpan="4" className="empty">ยังไม่มีผู้สร้าง</td></tr>}</tbody></table></div></div>
    </div>}

    {tab === 'pages' && <div className="box"><h2>หน้าแจกคีย์</h2><div className="tw"><table><thead><tr><th>slug</th><th>ชื่อ</th><th>เจ้าของ</th><th>อายุคีย์</th><th></th></tr></thead><tbody>
      {d.pages.map(p => <tr key={p.slug}><td><a href={'/getkey/' + p.slug} target="_blank" rel="noreferrer">{p.slug}</a></td><td>{p.title}</td><td className="mono">{p.owner}</td><td>{p.hours}h</td><td className="acts"><button className="g" disabled={busy} onClick={() => act({ act: 'pagedel', slug: p.slug }, 'ลบหน้าแล้ว', { confirm: `ลบหน้า ${p.slug}?` })}>ลบ</button></td></tr>)}
      {!d.pages.length && <tr><td colSpan="5" className="empty">ยังไม่มีหน้า</td></tr>}</tbody></table></div></div>}

    {tab === 'bans' && <div className="cols">
      <div className="box"><h2>แบน (Discord ID / IP)</h2>{inp('bn', 'Discord ID หรือ IP')}
        <button disabled={busy} onClick={() => need(f.bn?.trim(), 'กรอก ID หรือ IP') && act({ act: 'ban', id: f.bn }, 'แบนแล้ว', { clear: ['bn'] })}>แบน</button></div>
      <div className="box"><h2>รายการที่ถูกแบน</h2><div className="tw"><table><tbody>
        {d.bans.map(b => <tr key={b}><td className="mono">{b}</td><td className="acts"><button className="g" disabled={busy} onClick={() => act({ act: 'unban', id: b }, 'ปลดแบนแล้ว')}>ปลด</button></td></tr>)}
        {!d.bans.length && <tr><td className="empty">ไม่มีรายการ</td></tr>}</tbody></table></div></div>
    </div>}

    {tab === 'log' && <div className="box"><h2>Log การรับคีย์ล่าสุด</h2><div className="tw"><table><thead><tr><th>เวลา</th><th>หน้า</th><th>ผู้ใช้</th><th>IP</th><th>คีย์</th></tr></thead><tbody>
      {d.log.map((l, i) => <tr key={i}><td className="tag">{new Date(l.t).toLocaleString()}</td><td>{l.page}</td><td>{l.name}</td><td className="tag">{l.ip}</td><td className="mono">{l.key}</td></tr>)}
      {!d.log.length && <tr><td colSpan="5" className="empty">ยังไม่มี log</td></tr>}</tbody></table></div></div>}

    {tab === 'set' && <div className="box"><h2>เพดานชั่วโมง (ปัจจุบัน {d.max})</h2><p>ผู้สร้างหน้าตั้งอายุคีย์ได้ไม่เกินค่านี้</p>{inp('mx', 'ชั่วโมงสูงสุด', { inputMode: 'numeric' })}
      <button disabled={busy} onClick={() => need(+f.mx > 0, 'ใส่ตัวเลขให้ถูกต้อง') && act({ act: 'max', hours: f.mx }, 'ตั้งเพดานชั่วโมงแล้ว', { clear: ['mx'] })}>ตั้งค่า</button></div>}
  </main>;
}
