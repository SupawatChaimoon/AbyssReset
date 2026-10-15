# แผนพัฒนา AbyssReset (ฉบับสั้น)

เป้าหมาย: ทำ **ระบบหลัก** ให้ใช้งานได้เร็วที่สุด คือเปิดเว็บแล้วเห็นตู้ กิจกรรม และ Endgame ของ 4 เกมในปฏิทินเดียว ข้อมูลอัปเดตเอง

รายละเอียดเต็มของการออกแบบเก็บไว้ใน `PLAN-full.md` ใช้อ้างอิงตอนทำรอบถัดไป

---

## เกมและแหล่งข้อมูล

| เกม | เซิร์ฟ | แหล่งข้อมูล |
|---|---|---|
| Genshin Impact | Asia | `https://api.ennead.cc/mihoyo/genshin/calendar` |
| Honkai: Star Rail | Asia | `https://api.ennead.cc/mihoyo/starrail/calendar` |
| Zenless Zone Zero | Asia | `https://api.ennead.cc/mihoyo/zenless/calendar` |
| Wuthering Waves | SEA, UTC+8 | `https://aki-gm-resources-back.aki-game.com/gamenotice/G152/76402e5b20be2c39f095a152090afddc/notice.json` |

ข้อมูลที่แหล่งไม่มี เช่น Endgame ของ Wuthering Waves ให้กรอกเองในไฟล์ `data-manual/manual-events.json`

## เครื่องมือ

React + Vite + TypeScript + Tailwind CSS, `date-fns`, Node.js script, GitHub Actions, Vercel

## ขอบเขตรอบนี้

**ทำ**

1. Sync script ดึงข้อมูล 4 เกม แปลงเป็นรูปแบบเดียวกัน แล้วเขียนเป็น `public/data/events.json`
2. อ่านไฟล์กรอกเอง `manual-events.json` แบบครั้งเดียว
3. GitHub Actions รัน sync ทุก 6 ชั่วโมง และทุกครั้งที่แก้ไฟล์กรอกเอง
4. หน้าปฏิทินรายเดือน + มุมมองรายการเรียงตามวัน
5. ตัวกรองเกม และตัวกรองประเภท: ตู้ / แพตช์ / Endgame / กิจกรรม
6. กดรายการแล้วเปิดแผงรายละเอียด: ชื่อ เวลาเริ่ม–จบเป็นเวลาไทย เวลาที่เหลือ เซิร์ฟ ป้ายสถานะ ลิงก์ต้นทาง
7. แถบล่าง "อัปเดตล่าสุด ..." และแถบเตือนถ้ามีแหล่งไหนดึงไม่สำเร็จ
8. จำเกมที่เลือกและมุมมองไว้ใน Local Storage

**ยังไม่ทำ** เก็บไว้รอบถัดไป

- บัตรรายเดือน แบตเทิลพาส รายการส่วนตัว
- ส่งออก/นำเข้า JSON
- แบบกรอกเป็นรอบซ้ำ, การคาดการณ์วันแพตช์ถัดไป
- ย้ายข้อมูลเก่าไป archive, ป้าย "ไม่พบในข้อมูลล่าสุด"
- PWA, iCal, การแจ้งเตือน

## กติกาข้อมูลที่ต้องมีตั้งแต่แรก

ข้อเหล่านี้ตัดไม่ได้ เพราะ requirement บังคับ

1. **กันซ้ำ:** รหัสรายการ = `เกม:ประเภท:รหัสจากต้นทาง` รัน sync กี่รอบก็ไม่เกิดรายการซ้ำ
2. **แหล่งพังไม่ลบข้อมูล:** ถ้าแหล่งไหนดึงไม่สำเร็จ ให้ใช้รายการเดิมของแหล่งนั้นจาก events.json รอบก่อน
3. **ไม่เดาวันที่:** วันที่ที่ต้นทางไม่มีให้เก็บเป็นว่าง และติดป้าย "ยังตรวจสอบไม่ได้"
4. **แยกสถานะ:** `confirmed` แถบทึบ, `unverified` แถบจาง, รายการกรอกเองมีป้าย "กรอกโดยผู้ดูแล"
5. **เวลา:** เก็บเป็น UTC แสดงเป็นเวลาเครื่องผู้ใช้

## ขั้นตอนทำ

1. **ตั้งโปรเจกต์** — สร้าง Vite + React + Tailwind, ขึ้น GitHub, เชื่อม Vercel
2. **Sync script** — `scripts/sync.ts` มีฟังก์ชันดึงข้อมูล Ennead 1 ตัวใช้ 3 เกม และ Kuro 1 ตัว + อ่านไฟล์กรอกเอง → เขียน `events.json` กับ `sync-status.json`
3. **GitHub Actions** — `.github/workflows/sync.yml` รัน script แล้ว commit ถ้าไฟล์เปลี่ยน
4. **หน้าเว็บ** — ปฏิทินรายเดือน, รายการเรียงตามวัน, ตัวกรอง, แผงรายละเอียด, แถบสถานะ
5. **ตรวจ** — เปิดบนคอมและมือถือ, รัน sync 2 รอบดูว่าไม่ซ้ำ, แก้ URL ให้ผิดชั่วคราวดูว่าข้อมูลเดิมยังอยู่

## โครงไฟล์

```
AbyssReset/
├─ .github/workflows/sync.yml
├─ scripts/sync.ts
├─ data-manual/manual-events.json
├─ public/data/events.json
├─ public/data/sync-status.json
└─ src/
   ├─ App.tsx
   ├─ types.ts
   ├─ lib/          วันที่ ตัวกรอง
   └─ components/   MonthView, ListView, Filters, DetailPanel, StatusBar
```

## รูปแบบข้อมูลกิจกรรม

```ts
type GameEvent = {
  id: string;
  game_id: 'genshin' | 'starrail' | 'zenless' | 'wuwa';
  type: 'banner' | 'patch' | 'endgame' | 'event';
  title: string;
  start_at: string | null;
  end_at: string | null;
  region: 'asia' | 'sea';
  status: 'confirmed' | 'unverified';
  source_name: string;
  source_url?: string;
  image_url?: string;
  featured?: string[];
  last_synced_at: string;
};
```
