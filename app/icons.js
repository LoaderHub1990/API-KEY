// ไอคอนแบรนด์แบบ SVG (วาดเอง ไม่มีรูปภายนอก) — ถ้าอยากได้โลโก้จริง/รูปสวยๆ ให้อัปโหลดรูปเองในแผงผู้สร้างหน้า
export const PRESETS = [['youtube', 'YouTube'], ['discord', 'Discord'], ['tiktok', 'TikTok'], ['facebook', 'Facebook'], ['instagram', 'Instagram'], ['telegram', 'Telegram'], ['x', 'X'], ['website', 'Website']];

export function Icon({ name, size = 22 }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true, style: { flex: 'none' } };
  switch (name) {
    case 'youtube': return <svg {...p}><rect x="1.5" y="4.5" width="21" height="15" rx="4.5" fill="#ff0033" /><path d="M10 8.9v6.2l5.4-3.1z" fill="#fff" /></svg>;
    case 'discord': return <svg {...p}><path fill="#5865f2" d="M20 5.6A16 16 0 0 0 16 4.3l-.5 1a15 15 0 0 0-4.6 0l-.5-1A16 16 0 0 0 6.4 5.6C3.9 9.4 3.2 13 3.5 16.6a16 16 0 0 0 4.9 2.5l1-1.6a10 10 0 0 1-1.6-.8l.4-.3a11.5 11.5 0 0 0 10.2 0l.4.3c-.5.3-1 .6-1.6.8l1 1.6a16 16 0 0 0 4.9-2.5c.4-4.2-.7-7.900-3.100-11z" /><circle cx="9.200" cy="12.200" r="1.500" fill="#fff" /><circle cx="14.800" cy="12.200" r="1.500" fill="#fff" /></svg>;
    case 'tiktok': return <svg {...p}><rect x="1.500" y="1.500" width="21" height="21" rx="6" fill="#111" stroke="#444" /><path d="M13.200 6v8.200a2.300 2.300 0 1 1-2.300-2.300M13.200 6c.3 1.900 1.500 3 3.500 3.100" fill="none" stroke="#25f4ee" strokeWidth="2" strokeLinecap="round" transform="translate(-.6 0)" /><path d="M13.200 6v8.200a2.300 2.300 0 1 1-2.300-2.300M13.200 6c.3 1.900 1.500 3 3.500 3.100" fill="none" stroke="#fe2c55" strokeWidth="2" strokeLinecap="round" transform="translate(.6 .4)" /></svg>;
    case 'facebook': return <svg {...p}><circle cx="12" cy="12" r="10.500" fill="#1877f2" /><path d="M13.300 20v-6.500h2.200l.4-2.700h-2.600V9.200c0-.8.300-1.300 1.400-1.300h1.300V5.500c-.3 0-1.100-.1-2-.1-2 0-3.300 1.200-3.300 3.400v2h-2.200v2.700h2.200V20z" fill="#fff" /></svg>;
    case 'instagram': return <svg {...p}><defs><linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#feda75" /><stop offset=".4" stopColor="#fa7e1e" /><stop offset=".7" stopColor="#d62976" /><stop offset="1" stopColor="#4f5bd5" /></linearGradient></defs><rect x="2" y="2" width="20" height="20" rx="6" fill="url(#ig)" /><circle cx="12" cy="12" r="4.300" fill="none" stroke="#fff" strokeWidth="1.800" /><circle cx="17.200" cy="6.800" r="1.200" fill="#fff" /></svg>;
    case 'telegram': return <svg {...p}><circle cx="12" cy="12" r="10.500" fill="#29a9eb" /><path d="M5.800 11.800l11.100-4.300c.5-.2 1 .1.800.9l-1.900 8.900c-.1.600-.5.800-1 .5l-2.900-2.100-1.400 1.400c-.2.200-.3.300-.6.300l.2-3 5.400-4.900c.2-.2 0-.3-.3-.1l-6.700 4.200-2.900-.9c-.6-.2-.6-.6.200-.9z" fill="#fff" /></svg>;
    case 'x': return <svg {...p}><rect x="1.500" y="1.500" width="21" height="21" rx="6" fill="#000" stroke="#444" /><path d="M7 7l10 10M17 7L7 17" stroke="#fff" strokeWidth="2" strokeLinecap="round" /></svg>;
    default: return <svg {...p}><circle cx="12" cy="12" r="9.500" fill="none" stroke="currentColor" strokeWidth="1.800" /><path d="M2.500 12h19M12 2.500c3 3.200 3 15.800 0 19M12 2.500c-3 3.200-3 15.800 0 19" fill="none" stroke="currentColor" strokeWidth="1.500" /></svg>;
  }
}
