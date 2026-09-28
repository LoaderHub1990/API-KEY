/** @type {import('next').NextConfig} */
module.exports = {
  // ลิงก์เก่า /k/slug ยังใช้ได้ (พาไป /getkey/slug)
  async redirects() { return [{ source: '/k/:slug', destination: '/getkey/:slug', permanent: false }]; },
};
