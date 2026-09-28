'use client';
// แสดงข้อความ error จริงบนหน้าเว็บ (แทนหน้าดำ) เพื่อให้แก้ปัญหาได้ง่าย
export default function Err({ error, reset }) {
  return <div style={{ padding: 32, color: '#fff', fontFamily: 'sans-serif', maxWidth: 720, margin: '0 auto' }}>
    <h2>เกิดข้อผิดพลาด / Something went wrong</h2>
    <pre style={{ whiteSpace: 'pre-wrap', opacity: .8, fontSize: 13 }}>{String(error?.message || error)}</pre>
    <button onClick={() => reset()} style={{ padding: '8px 16px', cursor: 'pointer' }}>ลองอีกครั้ง / Retry</button>
  </div>;
}
