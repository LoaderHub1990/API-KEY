# KeyGate (Next.js + Vercel KV)

ระบบแจกคีย์: ผู้ใช้ล็อกอินด้วย Discord → ทำขั้นตอน (YouTube → Discord → captcha) → รับคีย์

## ตั้งค่า (Environment Variables)
ดูตัวอย่างใน `.env.example`

| ตัวแปร | ใช้ทำอะไร |
|---|---|
| `BASE_URL` | โดเมนเว็บ เช่น `https://your-domain.com` |
| `SESSION_SECRET` | สตริงสุ่มยาวๆ สำหรับเซ็น cookie (**ต้องตั้ง**) |
| `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` | จาก Discord Developer Portal |
| `DISCORD_GUILD_ID` | เซิร์ฟเวอร์ที่ผู้ใช้ต้องอยู่ (ไม่ตั้ง = ไม่เช็ก) |
| `ADMIN_IDS` | **Discord ID ของแอดมิน** คั่นด้วย `,` (แทนระบบ user/pass เดิม) |
| `TURNSTILE_SITEKEY` / `TURNSTILE_SECRET` | Cloudflare Turnstile (ไม่ตั้ง = ข้าม captcha) |
| `BOT_SECRET` | (ไม่บังคับ) สำหรับบอทของคุณเรียก `/api/bot` |
| `NEXT_PUBLIC_SITE_NAME`, `NEXT_PUBLIC_DISCORD_URL`, `NEXT_PUBLIC_DEMO_SLUG` | ชื่อเว็บ / ลิงก์ดิสคอร์ด / slug หน้าตัวอย่าง |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | ได้จาก Vercel KV (Storage) |

Discord Developer Portal → OAuth2 → Redirects: `BASE_URL/api/callback` (scope: identify + guilds, ไม่ต้องใช้ bot token)

หา Discord ID: เปิด Developer Mode ใน Discord → คลิกขวาโปรไฟล์ → Copy User ID (หรือดูในหน้า "รออนุมัติ" ของเว็บหลังล็อกอิน)

## การใช้งาน
- **แอดมิน**: ล็อกอิน Discord ด้วยบัญชีที่อยู่ใน `ADMIN_IDS` → แท็บ "แอดมิน" จะโผล่ขึ้นมาเอง
- **ผู้สร้างหน้า**: ล็อกอิน → คัดลอก Discord ID ส่งให้แอดมิน → แอดมินอนุมัติพร้อมกำหนด slug → กรอกฟอร์มบันทึก → ลิงก์ `/getkey/slug`
- **ออกจากระบบ**: ปุ่มรูปประตูข้างโปรไฟล์มุมขวาบน

## ฟีเจอร์ผู้สร้างหน้า (ล่าสุด)
- ลิงก์หน้าแจกคีย์: `/getkey/slug` (ลิงก์เก่า `/k/slug` redirect ให้อัตโนมัติ)
- แผงผู้สร้างหน้าอัปโหลดโลโก้ / แบนเนอร์ / รูปไอคอนของลิงก์เพิ่มเติมได้ (ย่อรูปอัตโนมัติ เก็บใน KV) และเพิ่มลิงก์ของตัวเองได้สูงสุด 6 ปุ่ม
- ผู้สร้างหน้าที่แอดมินอนุมัติ ระงับ/เปิดใช้/ลบคีย์ของหน้าตัวเองได้ (แตะคีย์หน้าอื่นไม่ได้)
- เข้าเว็บครั้งแรกจะมีหน้าตรวจบอต (Turnstile) ต้องตั้ง `TURNSTILE_SITEKEY` + `TURNSTILE_SECRET` ถ้าไม่ตั้งจะข้าม · จำผลไว้ 7 วัน · ไม่กระทบ `/api/verify`

## API
- ตรวจคีย์: `GET /api/verify?key=XXX`
  - ถูกต้อง (200): `{valid:true, expiresAt, remaining, serverTime, expires, page}` — `expiresAt` = **Unix timestamp วินาที (UTC)** ของเวลาหมดอายุจริง อ่านจากคีย์ที่เก็บไว้ ไม่สร้างใหม่ตอนตรวจ (`expires` = ค่าเดิมเป็น ms คงไว้เพื่อความเข้ากันได้)
  - ไม่ถูกต้อง: `{valid:false, reason}` — 400 `missing` · 404 `not_found` · 403 `revoked` · 410 `expired`
  - Roblox: ดู `roblox/KeyTimer.lua` (Remaining = expiresAt - os.time())
- บอท: `POST /api/bot` header `Authorization: Bearer BOT_SECRET`, body `{act: gen|revoke|ban|unban|check, ...}`
  - `gen {hours,prefix,uid}` → `{key,exp}` · `revoke {key}` · `ban/unban {id}` · `check {key}`

## รัน
```
npm install
npm run dev
```

## แก้ปัญหา
**ล็อกอินไม่ได้** → เปิด `/api/health` ก่อนเสมอ แล้วดู:
- `loginReady:false` + `missing` = ขาด `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
- `redirectUri` = ค่านี้ต้องเพิ่มใน Discord Developer Portal → OAuth2 → Redirects **ให้ตรงเป๊ะ** (รวม http/https, ไม่มี `/` ท้าย)
- `notes` = คำเตือนเรื่อง BASE_URL / SESSION_SECRET / ADMIN_IDS
- ระบบใช้โดเมนที่เข้าจริงเป็น redirect URI (ไม่พึ่ง BASE_URL อย่างเดียว) ดังนั้นต้องเข้าเว็บและกดล็อกอินจากโดเมนเดียวกับที่ลงทะเบียนไว้

ข้อความ error หลังล็อกอิน (แสดงเป็นแถบแจ้งเตือน มี `[สาเหตุ]` ต่อท้าย):
- `เซสชันหมดอายุ` (state) = cookie หาย มักเกิดจากเปลี่ยนโดเมนระหว่างล็อกอิน (www ↔ ไม่ www, http ↔ https) หรือบล็อก cookie
- `[Redirect URI ไม่ตรง...]` = ยังไม่ได้เพิ่ม redirectUri ใน Discord Portal
- `[DISCORD_CLIENT_ID หรือ ..._SECRET ไม่ถูกต้อง]` = ตรวจ env แล้ว Redeploy
- `ต้องอยู่ในเซิร์ฟเวอร์` = ไม่ได้อยู่ใน `DISCORD_GUILD_ID` (ลบตัวแปรนี้ถ้าไม่ต้องการเช็ก)

เปิด `/api/health` จะบอกว่า env/ฐานข้อมูลตัวไหนขาด (ไม่เปิดเผยค่าลับ)
- `db.envFound:false` = ยังไม่ได้ตั้ง `KV_REST_API_URL`+`KV_REST_API_TOKEN` (หรือ `UPSTASH_REDIS_REST_URL`+`UPSTASH_REDIS_REST_TOKEN`)
- `ADMIN_IDS_count:0` = ยังไม่ได้ใส่ Discord ID แอดมิน

## รันบน Vercel (ค่าเริ่มต้น)
Push ขึ้น Git แล้ว import เข้า Vercel · ตั้ง env ตาม `.env.example` · Redeploy ทุกครั้งที่แก้ env

> ถ้าอยากย้ายไป Cloudflare Workers ต้องใช้ `@opennextjs/cloudflare` + `wrangler.jsonc` (nodejs_compat) แยกต่างหาก ยังไม่ได้ใส่ในโปรเจกต์นี้เพื่อไม่ให้กระทบ build บน Vercel
