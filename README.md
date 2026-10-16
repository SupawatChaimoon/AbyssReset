# AbyssReset

ปฏิทินรวมตู้กาชา แพตช์ กิจกรรม และ Endgame ของหลายเกมไว้ในหน้าเดียว ข้อมูลดึงจากแหล่งสาธารณะและอัปเดตเองตามรอบเวลา

**เว็บ:** https://abyss-reset.vercel.app (deploy อัตโนมัติจาก branch `main` ผ่าน Vercel)

> **สถานะ:** MVP ครบ (Phase 1 + 2) พร้อมทดสอบ — ปฏิทินรายเดือน/รายการ ตัวกรอง แผงรายละเอียด บัตรรายเดือน แบตเทิลพาส รายการส่วนตัว ส่งออก/นำเข้า และ GitHub Actions ดู [ขั้นตอนพัฒนา](#ขั้นตอนพัฒนา) และสิ่งที่ตัดสินใจเองใน [DECISIONS.md](DECISIONS.md)

## หน้าเว็บ

| หน้า | ใช้ทำอะไร |
|---|---|
| `/` ปฏิทิน | รายเดือน (จอกว้าง) หรือรายการเรียงตามวัน (มือถือ) สลับได้ กรองเกม / ประเภท / ช่วงเวลา กดรายการเพื่อดูรายละเอียด กดวันเพื่อดูทุกรายการของวันนั้น |
| `/my-items` ของฉัน | บัตรรายเดือน (นับวันที่เหลือ, ปุ่ม +1 เดือน, สรุปค่าใช้จ่าย) แบตเทิลพาส (ระดับ/ความคืบหน้า) รายการส่วนตัว |
| `/settings` ตั้งค่า | เลือกเกมที่ติดตาม ซ่อนชั่วคราว มุมมองเริ่มต้น ส่งออก/นำเข้า JSON ล้างข้อมูล |
| `/about` แหล่งข้อมูล | สถานะการดึงข้อมูลแต่ละแหล่ง ตารางว่าเกมไหนมีข้อมูลประเภทใด ความหมายของสถานะ และเครดิต |

ข้อมูลส่วนตัวเก็บใน Local Storage key `abyssreset:v1` เท่านั้น ไม่มีเซิร์ฟเวอร์หลังบ้าน

## เกมที่รองรับ

| เกม | เซิร์ฟ | แหล่งข้อมูล | ดึงอัตโนมัติได้ | ต้องกรอกเอง |
|---|---|---|---|---|
| Genshin Impact | Asia | Ennead API | ตู้, Endgame, กิจกรรม | แพตช์ |
| Honkai: Star Rail | Asia | Ennead API | ตู้, Endgame, กิจกรรม | แพตช์ |
| Zenless Zone Zero | Asia | Ennead API | ตู้, Endgame, กิจกรรม | แพตช์ |
| Wuthering Waves | SEA (UTC+8) | ประกาศในเกมของ Kuro Games | แพตช์, ตู้, กิจกรรม | Endgame |

Ennead ไม่มีวันแพตช์ และเวลาเริ่มของตู้ก็แยกไม่ได้ว่าเป็นตู้ครึ่งแรกหรือครึ่งหลัง จึงไม่เดาวันแพตช์จากตู้ ส่วนประกาศของ Kuro ไม่มีรอบ Endgame ที่เชื่อถือได้ ข้อมูลในช่อง "ต้องกรอกเอง" ให้ผู้ดูแลกรอกใน [`data-manual/manual-events.json`](#กรอกข้อมูลเอง)

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
| `npm run sync` | ดึงข้อมูลทุกแหล่งแล้วเขียน `public/data/*.json` (เขียนเฉพาะเมื่อข้อมูลเปลี่ยน) |
| `npm test` | รัน unit test ด้วย vitest ใช้ข้อมูลจริงที่บันทึกไว้ ไม่ต้องต่อเน็ต |

ทดสอบกรณีแหล่งข้อมูลพังได้ด้วย `SYNC_FAIL` เช่น `SYNC_FAIL=ennead:genshin npm run sync` รายการเดิมของ Genshin ต้องยังอยู่ และ `sync-status.json` บันทึก error ไว้ ถ้าทุกแหล่งอัตโนมัติพังพร้อมกัน script จะจบด้วย exit code 1

## เครื่องมือ

- React 18 + TypeScript + Vite 6
- Tailwind CSS 4 (ผ่าน `@tailwindcss/vite`) สีประจำเกมกำหนดไว้ใน `@theme` ของ [src/index.css](src/index.css)
- `date-fns` + `date-fns-tz` สำหรับจัดการวันที่และเขตเวลา
- `zod` ตรวจรูปแบบข้อมูล ทั้งข้อมูลดิบจากต้นทางและไฟล์ที่ script เขียน
- `react-router` สำหรับแยกหน้า
- `tsx` รัน sync script ที่เป็น TypeScript, `vitest` สำหรับ unit test
- ฟอนต์ IBM Plex Sans Thai จาก Google Fonts
- Vercel สำหรับ deploy ทุกครั้งที่ push ขึ้น `main`
- GitHub Actions: `sync.yml` ดึงข้อมูลทุก 6 ชม. (นาทีที่ 17) และทุกครั้งที่แก้ `data-manual/` แล้ว commit ถ้าไฟล์เปลี่ยน, `ci.yml` รัน test + build

## โครงไฟล์

```
AbyssReset/
├─ .github/workflows/             sync.yml (ดึงข้อมูลตามรอบ), ci.yml (test + build)
├─ vercel.json                    ให้ทุก path เปิด SPA ได้
├─ index.html                     จุดเริ่มของหน้าเว็บ
├─ src/
│  ├─ main.tsx, App.tsx           router, แถบเมนู, แผงรายละเอียด, ฟอร์ม, toast
│  ├─ i18n/th.ts                  ข้อความภาษาไทยที่ใช้ซ้ำ
│  ├─ data/                       โหลด events.json (+ cache), Local Storage ข้อมูลส่วนตัว, context
│  ├─ lib/                        วันที่, แปลงเป็น CalendarItem, ตัวกรอง, จัดแถบรายเดือน, agenda (+ test)
│  ├─ hooks/                      useNow, useMediaQuery, useLocalState
│  ├─ components/                 calendar/, filters/, detail/, my-items/, common/
│  └─ pages/                      CalendarPage, MyItemsPage, SettingsPage, AboutPage
├─ shared/                        ใช้ร่วมกันทั้ง script และหน้าเว็บ
│  ├─ schema.ts                   zod schema + type ของกิจกรรม สถานะ sync และรายการกรอกเอง
│  └─ games.ts                    ข้อมูลเกม ประเภทที่แต่ละแหล่งรองรับ คำที่ใช้ข้ามประกาศ
├─ scripts/sync/
│  ├─ index.ts                    จุดเริ่มของ npm run sync
│  ├─ adapters/ennead.ts          Genshin / Star Rail / ZZZ
│  ├─ adapters/kuro-notice.ts     Wuthering Waves อ่านช่วงเวลาจากเนื้อหาประกาศ
│  ├─ manual.ts                   อ่านไฟล์กรอกเอง
│  ├─ merge.ts, combine.ts        รวมกับข้อมูลเดิม กันซ้ำ แหล่งพังไม่ลบข้อมูล
│  ├─ id.ts                       สร้างรหัสคงที่
│  └─ __fixtures__/               ข้อมูลจริงจากต้นทางสำหรับ test
├─ data-manual/manual-events.json ข้อมูลที่ผู้ดูแลกรอกเอง
├─ public/data/
│  ├─ events.json                 ผลลัพธ์จาก sync ที่หน้าเว็บอ่าน
│  └─ sync-status.json            สถานะการดึงแต่ละแหล่ง
├─ requirement.md                 ข้อกำหนดผลิตภัณฑ์ฉบับเต็ม
├─ PLAN.md                        แผนพัฒนารอบแรก (ฉบับสั้น)
└─ PLAN-full.md                   การออกแบบฉบับเต็ม ใช้อ้างอิงรอบถัดไป
```

## ขั้นตอนพัฒนา

- [x] **1. ตั้งโปรเจกต์** — Vite + React + Tailwind, GitHub, Vercel
- [x] **2. Sync script** — ดึงข้อมูล 4 เกม + อ่านไฟล์กรอกเอง → `events.json` และ `sync-status.json`
- [x] **3. GitHub Actions** — รัน sync ตามรอบ แล้ว commit ถ้าไฟล์เปลี่ยน (ยังต้องกดรันครั้งแรกบน GitHub)
- [x] **4. หน้าเว็บ** — ปฏิทินรายเดือน, รายการเรียงตามวัน, ตัวกรองเกม/ประเภท/เวลา, แผงรายละเอียด, แถบสถานะ
- [x] **5. ตรวจ** — ทดสอบจอ 375px และ 1280px, รัน sync 2 รอบไม่เกิดรายการซ้ำ, `SYNC_FAIL` แล้วข้อมูลเดิมยังอยู่และมีแถบเตือน
- [x] **Phase 2** — บัตรรายเดือน แบตเทิลพาส รายการส่วนตัว ส่งออก/นำเข้า JSON (ข้ามขีดจาก PLAN.md เพราะ requirement AC 9–12 ต้องมี)

ยังเหลือ: ทดสอบบนมือถือจริง, รัน workflow ครั้งแรกบน GitHub, กรอกวันแพตช์/Endgame ที่แหล่งข้อมูลไม่มีลง `data-manual/`

รายละเอียดอยู่ใน [PLAN.md](PLAN.md)

## กติกาข้อมูล

1. **กันซ้ำ:** รหัสรายการคือ `เกม:ประเภท:รหัสจากต้นทาง` รัน sync กี่รอบก็ไม่เกิดรายการซ้ำ
2. **แหล่งพังไม่ลบข้อมูล:** ถ้าแหล่งไหนดึงไม่สำเร็จ ใช้รายการเดิมของแหล่งนั้นจากรอบก่อน
3. **ไม่เดาวันที่:** วันที่ที่ต้นทางไม่มีให้เก็บเป็นว่าง และติดป้าย "ยังตรวจสอบไม่ได้"
4. **แยกสถานะ:** `confirmed` แสดงแถบทึบ, `unverified` แสดงแถบจาง, รายการกรอกเองมีป้าย "กรอกโดยผู้ดูแล"
5. **เวลา:** เก็บเป็น UTC แสดงตามเวลาเครื่องผู้ใช้

รูปแบบข้อมูลกิจกรรม (`GameEvent`) ดูได้ใน [shared/schema.ts](shared/schema.ts)

`last_synced_at` ของแต่ละรายการคือเวลาที่ข้อมูลรายการนั้นเปลี่ยนล่าสุด และ `sync-status.json` จะเขียนใหม่เฉพาะเมื่อมีอะไรเปลี่ยนนอกจากเวลา เพื่อไม่ให้เกิด commit ทุก 6 ชั่วโมงทั้งที่ข้อมูลเหมือนเดิม

## กรอกข้อมูลเอง

ใช้เฉพาะเกมและประเภทในช่อง "ต้องกรอกเอง" ของตาราง [เกมที่รองรับ](#เกมที่รองรับ) ถ้ากรอกประเภทที่ดึงอัตโนมัติได้อยู่แล้ว sync จะข้ามรายการนั้นและพิมพ์คำเตือน

แก้ไฟล์ [data-manual/manual-events.json](data-manual/manual-events.json) เป็น array ของรายการแบบนี้

```json
[
  {
    "game_id": "wuwa",
    "type": "endgame",
    "title": "Whimpering Wastes",
    "start_at": "2026-10-13T04:00:00+08:00",
    "end_at": "2026-10-27T03:59:59+08:00",
    "region": "sea",
    "source_url": "https://ลิงก์ประกาศทางการ",
    "note": "บันทึกสำหรับผู้ดูแล ไม่แสดงบนเว็บ"
  }
]
```

- `game_id`: `genshin`, `starrail`, `zenless`, `wuwa`
- `type`: `banner`, `patch`, `endgame`, `event`
- `region`: `asia` สำหรับ 3 เกม HoYoverse, `sea` สำหรับ Wuthering Waves
- เวลาต้องมี offset เช่น `+08:00` หรือใส่ `null` ถ้ายังไม่รู้
- มี `source_url` และวันครบ → `confirmed` ถ้าไม่มี → `unverified`
- ถ้าไฟล์ผิดรูปแบบ ส่วน manual ของรอบนั้นจะล้มเหลวและคงรายการกรอกเองชุดเดิมไว้ เกมอื่นยังอัปเดตตามปกติ

ตัวอย่างข้างบนเป็นวันสมมติ ไฟล์จริงตอนนี้ยังว่างอยู่

## เอกสารเพิ่มเติม

- [requirement.md](requirement.md) — ข้อกำหนดผลิตภัณฑ์ทั้งหมด รวมฟีเจอร์ที่ยังไม่อยู่ในรอบนี้ เช่น บัตรรายเดือน แบตเทิลพาส PWA และการแจ้งเตือน
- [PLAN.md](PLAN.md) — ขอบเขตและขั้นตอนของรอบแรก
- [PLAN-full.md](PLAN-full.md) — การออกแบบฉบับเต็ม
- [DECISIONS.md](DECISIONS.md) — สิ่งที่ตัดสินใจเองระหว่างพัฒนา และสิ่งที่ยังต้องทดสอบ
