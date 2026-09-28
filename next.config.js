const DEMO = process.env.NEXT_PUBLIC_DEMO_SLUG || 'demo';
/** @type {import('next').NextConfig} */
module.exports = {
  async redirects() {
    return [
      { source: '/k/:slug', destination: '/getkey/:slug', permanent: false }, // ลิงก์เก่า
      { source: '/getkey', destination: '/getkey/' + DEMO, permanent: false }, // /getkey เฉยๆ → หน้าตัวอย่าง
    ];
  },
};
