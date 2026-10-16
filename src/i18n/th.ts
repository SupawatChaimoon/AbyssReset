/** All user-facing labels that are shared between screens. Thai only for now. */
import type { EventType } from '../../shared/schema';

export const TYPE_LABEL: Record<EventType | 'mine', string> = {
  banner: 'ตู้กาชา',
  patch: 'แพตช์',
  endgame: 'Endgame',
  event: 'กิจกรรม',
  mine: 'ของฉัน',
};

export const SUBTYPE_LABEL: Record<string, string> = {
  character: 'ตู้ตัวละคร',
  weapon: 'ตู้อาวุธ',
  light_cone: 'ตู้ Light Cone',
  w_engine: 'ตู้ W-Engine',
  resonator: 'ตู้ตัวละคร',
};

export const STATUS_LABEL = {
  confirmed: 'ยืนยันแล้ว',
  estimated: 'ประมาณการ',
  unverified: 'ยังตรวจสอบไม่ได้',
  cancelled: 'ยกเลิก',
  personal: 'รายการของฉัน',
} as const;

export const STATUS_HINT = {
  confirmed: 'วันเวลามาจากแหล่งข้อมูลครบทั้งวันเริ่มและวันสิ้นสุด',
  estimated: 'วันเวลาคำนวณจากกติกา ยังไม่ใช่ประกาศทางการ',
  unverified: 'แหล่งข้อมูลให้วันเวลาไม่ครบ หรือยังไม่มีประกาศยืนยัน',
  cancelled: 'ผู้พัฒนาเกมยกเลิกกิจกรรมนี้แล้ว',
  personal: 'บันทึกโดยคุณ เก็บไว้ในเบราว์เซอร์เครื่องนี้',
} as const;

export const TIME_FILTER_LABEL = {
  all: 'ทั้งหมด',
  active: 'กำลังเปิด',
  upcoming: 'กำลังจะเริ่ม',
  ending: 'ใกล้หมดใน 3 วัน',
} as const;

export const PERSONAL_KIND_LABEL = {
  subscription: 'บัตรรายเดือน',
  battle_pass: 'แบตเทิลพาส',
  personal_event: 'รายการส่วนตัว',
} as const;

export const REGION_LABEL: Record<string, string> = {
  asia: 'Asia',
  sea: 'SEA',
  america: 'America',
  europe: 'Europe',
  global: 'Global',
};

export const WEEKDAYS_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export const LOCAL_ONLY_NOTICE =
  'ข้อมูลส่วนตัวเก็บอยู่ในเบราว์เซอร์เครื่องนี้เท่านั้น ไม่ซิงก์ข้ามอุปกรณ์ และจะหายถ้าล้างข้อมูลเบราว์เซอร์ ส่งออกไฟล์สำรองไว้เป็นระยะ';
