# AbyssReset

ปฏิทินรวมตู้กาชา แพตช์ กิจกรรม และ Endgame ของหลายเกมไว้ในหน้าเดียว ข้อมูลดึงจากแหล่งสาธารณะและอัปเดตเองตามรอบเวลา

**เว็บ:** https://abyss-reset.vercel.app (deploy อัตโนมัติจาก branch `main` ผ่าน Vercel)

> **สถานะ:** ขั้นที่ 1 จาก 5 (ตั้งโปรเจกต์) ตอนนี้หน้าเว็บแสดงแค่รายชื่อเกมที่รองรับ ระบบดึงข้อมูลและปฏิทินยังไม่ได้ทำ ดู [ขั้นตอนพัฒนา](#ขั้นตอนพัฒนา)

## เกมที่รองรับ

| เกม | เซิร์ฟ | แหล่งข้อมูล |
|---|---|---|
| Genshin Impact | Asia | Ennead API (`api.ennead.cc/mihoyo/genshin/calendar`) |
| Honkai: Star Rail | Asia | Ennead API (`api.ennead.cc/mihoyo/starrail/calendar`) |
| Zenless Zone Zero | Asia | Ennead API (`api.ennead.cc/mihoyo/zenless/calendar`) |
| Wuthering Waves | SEA (UTC+8) | ประกาศของ Kuro Games (`aki-gm-resources-back.aki-game.com`) |

ข้อมูลที่แหล่งไม่มี เช่น Endgame ของ Wuthering Waves จะกรอกเองในไฟล์ `data-manual/manual-events.json` (ยังไม่ได้สร้าง)

## เริ่มใช้งาน

ต้องมี Node.js 18 ขึ้นไป

```bash
npm install
npm run dev       # เปิดเซิร์ฟเวอร์พัฒนาที่ http://localhost:5173
```

| คำสั่ง | ใช้ทำอะไร |
|---|---|
| `npm run dev` | รันเซิร์ฟเวอร์พัฒนาแบบ hot reload |
| `npm run build` | ตรวจ type ด้วย `tsc` แล้ว build ลง `dist/` |
| `npm run preview` | เปิดดูผล build จาก `dist/` |

## เครื่องมือ

- React 18 + TypeScript + Vite 6
- Tailwind CSS 4 (ผ่าน `@tailwindcss/vite`) สีประจำเกมกำหนดไว้ใน `@theme` ของ [src/index.css](src/index.css)
- `date-fns` สำหรับจัดการวันที่
- ฟอนต์ IBM Plex Sans Thai จาก Google Fonts
- Vercel สำหรับ deploy ทุกครั้งที่ push ขึ้น `main`
- ที่วางแผนไว้: GitHub Actions สำหรับ sync ข้อมูล

## โครงไฟล์

ตอนนี้มี:

```
AbyssReset/
├─ index.html          จุดเริ่มของหน้าเว็บ
├─ src/
│  ├─ main.tsx         mount React
│  ├─ App.tsx          หน้าหลัก
│  └─ index.css        Tailwind + สีประจำเกม
├─ public/             ไฟล์ static
├─ requirement.md      ข้อกำหนดผลิตภัณฑ์ฉบับเต็ม
├─ PLAN.md             แผนพัฒนารอบแรก (ฉบับสั้น)
└─ PLAN-full.md        การออกแบบฉบับเต็ม ใช้อ้างอิงรอบถัดไป
```

จะเพิ่มในขั้นถัดไป:

```
├─ .github/workflows/sync.yml    รัน sync ทุก 6 ชั่วโมง
├─ scripts/sync.ts               ดึงข้อมูลทุกแหล่ง แปลงเป็นรูปแบบเดียวกัน
├─ data-manual/manual-events.json
├─ public/data/events.json       ผลลัพธ์จาก sync ที่หน้าเว็บอ่าน
├─ public/data/sync-status.json  สถานะการดึงแต่ละแหล่ง
└─ src/
   ├─ types.ts
   ├─ lib/                       วันที่ ตัวกรอง
   └─ components/                MonthView, ListView, Filters, DetailPanel, StatusBar
```

## ขั้นตอนพัฒนา

- [x] **1. ตั้งโปรเจกต์** — Vite + React + Tailwind, GitHub, Vercel
- [ ] **2. Sync script** — ดึงข้อมูล 4 เกม + อ่านไฟล์กรอกเอง → `events.json` และ `sync-status.json`
- [ ] **3. GitHub Actions** — รัน sync ตามรอบ แล้ว commit ถ้าไฟล์เปลี่ยน
- [ ] **4. หน้าเว็บ** — ปฏิทินรายเดือน, รายการเรียงตามวัน, ตัวกรองเกม/ประเภท, แผงรายละเอียด, แถบสถานะ
- [ ] **5. ตรวจ** — ทดสอบบนคอมและมือถือ, รัน sync ซ้ำดูว่าไม่เกิดรายการซ้ำ, จำลองแหล่งพังดูว่าข้อมูลเดิมยังอยู่

รายละเอียดอยู่ใน [PLAN.md](PLAN.md)

## กติกาข้อมูล

1. **กันซ้ำ:** รหัสรายการคือ `เกม:ประเภท:รหัสจากต้นทาง` รัน sync กี่รอบก็ไม่เกิดรายการซ้ำ
2. **แหล่งพังไม่ลบข้อมูล:** ถ้าแหล่งไหนดึงไม่สำเร็จ ใช้รายการเดิมของแหล่งนั้นจากรอบก่อน
3. **ไม่เดาวันที่:** วันที่ที่ต้นทางไม่มีให้เก็บเป็นว่าง และติดป้าย "ยังตรวจสอบไม่ได้"
4. **แยกสถานะ:** `confirmed` แสดงแถบทึบ, `unverified` แสดงแถบจาง, รายการกรอกเองมีป้าย "กรอกโดยผู้ดูแล"
5. **เวลา:** เก็บเป็น UTC แสดงตามเวลาเครื่องผู้ใช้

รูปแบบข้อมูลกิจกรรม (`GameEvent`) ดูได้ใน [PLAN.md](PLAN.md#รูปแบบข้อมูลกิจกรรม)

## เอกสารเพิ่มเติม

- [requirement.md](requirement.md) — ข้อกำหนดผลิตภัณฑ์ทั้งหมด รวมฟีเจอร์ที่ยังไม่อยู่ในรอบนี้ เช่น บัตรรายเดือน แบตเทิลพาส PWA และการแจ้งเตือน
- [PLAN.md](PLAN.md) — ขอบเขตและขั้นตอนของรอบแรก
- [PLAN-full.md](PLAN-full.md) — การออกแบบฉบับเต็ม
