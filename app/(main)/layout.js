import '../globals.css';
import Shell from '../Shell';

const NAME = process.env.NEXT_PUBLIC_SITE_NAME || 'Flexozy';
export const metadata = { title: NAME };
export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#07080d' };

export default function L({ children }) {
  return <html lang="th"><head><link rel="preconnect" href="https://fonts.googleapis.com" /><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" /><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Noto+Sans+Thai:wght@400;500;600;700&display=swap" rel="stylesheet" /></head><body><Shell>{children}</Shell></body></html>;
}
