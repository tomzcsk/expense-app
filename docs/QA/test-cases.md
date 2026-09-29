# เอกสาร Test Cases — ระบบเบิกจ่าย (Expense Reimbursement)

> **ที่มา:** ออกแบบเทสเคสโดย codex (รับบท QA tester รีวิวจากซอร์สโค้ดทั้งrepo) และตรวจสอบยืนยันทุกข้อกับโค้ดจริงโดย Claude
> **สถานะเอกสาร:** ยังไม่ได้รันเทสจริง (test design) — ใช้เป็นเช็กลิสต์สำหรับเทสด้วยมือ

---

## ข้อมูลเอกสาร

| | |
|---|---|
| แอป | ระบบเบิกจ่าย ค่าสมัคร AI/ซอฟต์แวร์ (Next.js 16 + Supabase, deploy บน Vercel `sin1`) |
| วันที่ | 2026-09-29 |
| ขอบเขต | Auth/สิทธิ์, ยื่นเบิก, คิวจ่ายเงิน, กรอกแทน, รายงาน/CSV/พิมพ์, จัดการสมาชิก, กันตกเบิก, Telegram |
| จำนวนเทสเคส | 62 cases (8 หมวด) + 8 ความเสี่ยง/บั๊กที่เจอ |

### วิธีใช้เอกสาร
- ไล่เทสตาม **Priority** ก่อน: ทำ **P1** ให้ครบก่อนปล่อยใช้งาน แล้วค่อย P2 → P3
- ช่อง **สถานะ** ให้ผู้เทสกรอกเอง: `⬜ ยังไม่เทส` · `✅ ผ่าน` · `❌ ไม่ผ่าน` · `⚠️ ติดปัญหา/ต้องคุย`
- ถ้าเจอบั๊กระหว่างเทส ให้จดใต้เคสนั้น (อาการ + ขั้นตอนซ้ำ) แล้วโยงกับหมวด 9 ถ้าตรงกัน

### ระดับความสำคัญ (Priority)
- **P1 — วิกฤต:** เรื่องสิทธิ์/ความปลอดภัย และ flow หลักที่พัง = ปล่อยไม่ได้
- **P2 — สำคัญ:** ฟีเจอร์ทำงานผิดจากที่ตั้งใจ แต่ยังไม่ถึงขั้นข้อมูลรั่ว
- **P3 — รอง:** ความสวยงาม/empty state/กรณีขอบสุดๆ

### สรุป coverage
| หมวด | จำนวนเคส | P1 | โฟกัส |
|---|---|---|---|
| 1. Auth & สิทธิ์การเข้าถึง | 11 | 9 | Google login, RLS, กันข้ามสิทธิ์ |
| 2. ยื่นเบิก & ยื่นซ้ำ | 9 | 6 | ฟอร์ม, RPC validation, เลขเบิก |
| 3. คิวผู้จัดการ & workflow | 7 | 4 | จ่าย/ตีกลับ/ปฏิเสธ, state machine |
| 4. กรอกแทน (on-behalf) | 3 | 2 | สิทธิ์ manager, created_by |
| 5. รายงาน/CSV/พิมพ์ | 10 | 4 | ยอดสรุป, CSV injection, print/PDF |
| 6. จัดการสมาชิก | 5 | 4 | เปลี่ยน role/active, กันแก้ตัวเอง |
| 7. กันตกเบิก & subscription | 7 | 4 | จับคู่ person+category, empty state |
| 8. Telegram & แจ้งเตือน | 8 | 5 | webhook secret, cron auth, DM |

---

## หมวด 1 — Authentication & สิทธิ์การเข้าถึง

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| AUTH-01 | ล็อกอิน admin ใน allowlist / **P1** | อีเมลอยู่ใน `ADMIN_EMAILS` (แม้อยู่นอกโดเมนบริษัท), ยังไม่มีแถวใน `people` | ล็อกอิน Google จนจบ callback | สร้างบัญชี role = **manager** และพาไป `/dashboard` — allowlist admin ใช้ได้แม้ไม่ตรงโดเมน | ⬜ |
| AUTH-02 | ล็อกอินด้วยโดเมนบริษัท / **P1** | อีเมลตรง `ALLOWED_DOMAIN`, ยังไม่มีแถว | ล็อกอิน Google | สร้างบัญชี role = **submitter** และพาไป `/dashboard` | ⬜ |
| AUTH-03 | ปฏิเสธอีเมลนอก allowlist / **P1** | อีเมลไม่ตรงทั้ง admin และโดเมน | ล็อกอิน Google จนจบ callback | ระบบ sign out + พาไป `/auth/denied`, **ไม่สร้างแถวใน `people`** | ⬜ |
| AUTH-04 | ขอบเขตการ match โดเมน / **P2** | `ALLOWED_DOMAIN = example.com` | ลอง `user@example.com`, `user@notexample.com`, `user@sub.example.com` | รับเฉพาะที่ลงท้าย `@example.com`; โดเมนอื่นถูกปฏิเสธ — *ยืนยันว่า subdomain ตั้งใจให้ผ่านหรือไม่* | ⬜ |
| AUTH-05 | ล็อกอินซ้ำไม่ทับ role เดิม / **P2** | ผู้ใช้เดิมถูก manager ตั้ง role ไว้แล้ว | ออกจากระบบแล้วล็อกอินใหม่ | callback **ไม่เขียนทับ** role เดิม (โค้ด insert เฉพาะตอนยังไม่มีแถว — ยืนยันแล้ว) | ⬜ |
| AUTH-06 | กันหน้าเมื่อยังไม่ล็อกอิน / **P1** | ไม่มี session | เปิดตรงๆ `/dashboard`, `/my`, `/manage/report` | เด้งไป `/login`; เหลือแค่ `/login`, `/auth/callback`, `/auth/denied` ที่เข้าได้ | ⬜ |
| AUTH-07 | เมนู/หน้า แยกตาม role / **P1** | มี submitter 1 + manager 1 (active) | ล็อกอินแต่ละคน; ในฐานะ submitter เปิด `/manage/queue`, `/manage/new`, `/manage/report`, `/manage/missing`, `/manage/members` | manager เห็นเมนูจัดการครบ; submitter ไม่เห็น และถูกเด้งออกจากหน้า manage | ⬜ |
| AUTH-08 | ล็อกผู้ใช้ที่ถูกปิดใช้งาน / **P1** | ผู้ใช้ล็อกอินอยู่ แล้ว manager ตั้ง `active=false` | รีเฟรช/เปิดหน้าแอปตรงๆ; ลองยิง server action | `getCurrentUser()` เด้งไป `/auth/denied`; server action ถูกปฏิเสธ — *ดูความเสี่ยง R-02 เรื่องเข้าตรงผ่าน Supabase* | ⬜ |
| AUTH-09 | RLS จำกัดการอ่าน claim/history / **P1** | submitter A, B ต่างมี claim; manager มีของทั้งคู่ | ในฐานะ A ยิง query Supabase ตรงๆ รวมถึง claim id ของ B; แล้วทำเป็น manager | A อ่านได้เฉพาะของตัวเอง (ของ B = 0 แถว); manager อ่านได้ทั้งคู่ | ⬜ |
| AUTH-10 | สิทธิ์การเขียนตรง & RPC / **P1** | submitter + manager; มี claim submitted และ returned | ในฐานะ submitter: insert/update claim ตรง + insert history ตรง; เรียก `transition_claim`; เรียก `create_claim` ตั้ง `p_submitter_id` เป็นคนอื่น; `resubmit_claim` บน claim คนอื่น | เขียนตรงถูก RLS ปฏิเสธ; transition/กรอกแทน/resubmit ที่ไม่ใช่เจ้าของถูก RPC ปฏิเสธ; แต่ยื่นเบิกให้ตัวเองผ่าน `create_claim` ยังทำได้ปกติ | ⬜ |
| AUTH-11 | สิทธิ์อ่านไฟล์ใบเสร็จตาม role / **P1** | A, B อัปโหลดใบเสร็จแล้ว; manager active | ในฐานะ A ลองอ่านไฟล์ของ B; ในฐานะ manager อ่านทั้งคู่ | A อ่านของ B ไม่ได้; manager อ่านได้ทุกคน | ⬜ |

---

## หมวด 2 — ยื่นเบิก & ยื่นซ้ำ

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| CLAIM-01 | ยื่นเบิกพร้อมใบเสร็จ / **P1** | submitter active; มีหมวดหมู่ active; รูป/PDF ใบเสร็จ | เปิดยื่นใหม่, เลือกหมวด, ใส่จำนวนบวก, เดือน, วันจ่าย, หมายเหตุ, แนบใบเสร็จ, ส่ง | ขึ้นใน "รายการของฉัน" สถานะ submitted; claim มี submitter=creator=ผู้ยื่น, มีเลขเบิก, path ใบเสร็จ, แถว history เริ่มต้น | ⬜ |
| CLAIM-02 | ยื่นเบิกไม่แนบใบเสร็จ / **P2** | submitter + หมวด active | ยื่น claim ถูกต้องแต่ไม่แนบใบเสร็จ | รับได้ receipt path = null; หน้า UI/manager แสดง "ไม่มีใบเสร็จ" โดยไม่ error | ⬜ |
| CLAIM-03 | ฟิลด์บังคับ & ขอบเขตจำนวนเงิน / **P1** | submitter active | ลองส่งโดยไม่มีหมวด/เดือน/วันจ่าย/จำนวน; แล้วส่ง 0, ติดลบ, และค่าบวก | ฟอร์มบล็อกฟิลด์ที่ขาด; RPC ปฏิเสธจำนวน ≤ 0; รับค่าบวก | ⬜ |
| CLAIM-04 | หมวดไม่ถูกต้อง & period ผิดรูป / **P1** | submitter; มี category id ที่ inactive/ไม่มีจริงไว้ทดสอบยิงตรง | ยิงผ่านฟอร์ม/RPC ด้วยหมวด inactive และ period เช่น `2026-13`, `26-09` | RPC ปฏิเสธหมวดผิดและ period ผิดรูป; ไม่มี claim/counter ถูกเพิ่ม | ⬜ |
| CLAIM-05 | ตรวจความเป็นเจ้าของ path ใบเสร็จ / **P1** | submitter A; รู้ path ใบเสร็จของ B | เรียก `create_claim` ด้วย path ของ B; แล้วด้วย path ขึ้นต้นด้วย uid ของ A | path ของ B ถูกปฏิเสธ; path ของ A ผ่าน (ตรวจแค่ prefix — *ดู R-04*) | ⬜ |
| CLAIM-06 | เลขเบิกภายใต้ concurrency / **P1** | ให้ผู้ใช้ 2 คนยื่นเดือนเดียวกันพร้อมกันได้ | ยื่นหลาย claim เดือนเดียวกันพร้อมๆ กัน | ทุก claim ได้เลขเบิกรันไม่ซ้ำ (counter atomic — ยืนยันในโค้ด `create_claim`); ไม่มีเลขซ้ำ/ตกหาย | ⬜ |
| CLAIM-07 | ยื่นซ้ำ claim ที่ถูกตีกลับ / **P1** | submitter มี claim สถานะ returned + เหตุผล + ใบเสร็จเดิม | แก้จำนวน/หมวด/วัน/หมายเหตุ แล้วยื่นซ้ำโดยไม่แนบใบเสร็จใหม่; แล้วลองยื่นซ้ำอีกครั้งหลังกลับเป็น submitted | ครั้งแรกกลับเป็น submitted, ล้างเหตุผลตีกลับ, คงใบเสร็จเดิม, เขียน history; ยื่นซ้ำครั้งที่สองถูกปฏิเสธ | ⬜ |
| CLAIM-08 | ยื่นซ้ำ claim คนอื่น/สถานะไม่ใช่ returned / **P1** | A มี returned; B มี returned หรือ paid | เรียก `resubmit_claim` ด้วย id ของ B และ id ของ A ที่ไม่ใช่ returned | ถูกปฏิเสธทั้งคู่; ข้อมูลไม่เปลี่ยน | ⬜ |
| CLAIM-09 | อัปโหลดล้มเหลว / **P2** | submitter active; จำลอง network/storage ล้ม | เลือกใบเสร็จแล้วส่งตอนอัปโหลดล้ม/ค้าง | ผู้ใช้เห็นสถานะล้มเหลวชัดเจน ลองใหม่ได้ ไม่ค้าง "กำลังอัปโหลด" ถาวร | ⬜ |

---

## หมวด 3 — คิวผู้จัดการ & Workflow

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| FLOW-01 | จ่าย claim ที่ submitted ตรงๆ / **P1** | manager; มี claim submitted | เปิดรายละเอียดในคิว, ใส่เลขอ้างอิงจ่าย, ยืนยัน | claim → paid ทันที (ไม่มีขั้น approve); บันทึกข้อมูลจ่าย + actor/เวลาใน history; คิวรีเฟรช | ⬜ |
| FLOW-02 | ตีกลับ claim / **P1** | manager; claim submitted | เปิดรายละเอียด, ใส่เหตุผลตีกลับ, ยืนยัน | claim → returned; เก็บเหตุผล + ข้อมูลผู้ตรวจ; submitter เห็นเหตุผลและแก้/ยื่นซ้ำได้ | ⬜ |
| FLOW-03 | ปฏิเสธ claim / **P1** | manager; claim submitted | เปิดรายละเอียด, ใส่เหตุผลปฏิเสธ, ยืนยัน | claim → rejected; เก็บเหตุผล + history; ยื่นซ้ำไม่ได้ | ⬜ |
| FLOW-04 | transition ที่ผิด & สถานะ approved เก่า / **P1** | มี claim submitted, returned, rejected, paid และ (ถ้ามี) approved เก่า | ลอง transition ทั้ง UI และ RPC ตรง: submitted→approved, paid→returned, returned→paid, จ่ายซ้ำ | ปัจจุบันอนุญาต submitted→paid/returned/rejected; สถานะปลายทางเปลี่ยนต่อไม่ได้; approved เก่าไป paid/returned เท่านั้น; ไม่มีขั้น approve สำหรับของใหม่ | ⬜ |
| FLOW-05 | คิวว่าง & สมาชิกในคิว / **P2** | manager; ไม่มี claim ที่จ่ายได้ แล้วเพิ่ม submitted 1 + paid 1 | เปิดคิวทั้งสองสภาพข้อมูล | โชว์ empty state เมื่อไม่มีของให้จ่าย; submitted/approved-เก่าโผล่; paid/returned/rejected ไม่โผล่ | ⬜ |
| FLOW-06 | ดูใบเสร็จ & ไม่มีใบเสร็จ / **P2** | manager; claim ที่มีรูป, PDF, และไม่มีใบเสร็จ | เปิดแต่ละ claim ใน drawer แล้วกดดูใบเสร็จ | รูปใช้ signed URL; PDF เปิดจาก signed URL; ไม่มีใบเสร็จโชว์ข้อความว่าง; ผู้ไม่มีสิทธิ์เปิด endpoint ใบเสร็จไม่ได้ | ⬜ |
| FLOW-07 | manager 2 คนทำพร้อมกัน / **P2** | manager 2 คนเปิด claim submitted ตัวเดียวกัน | แต่ละคนกด transition คนละอย่างเกือบพร้อมกัน | มีแค่คนเดียว commit ได้; อีกคนได้ error "เปลี่ยนไปแล้ว/สถานะไม่ถูกต้อง"; history มีแค่รายการที่ commit (ยืนยันจาก `where status = v_from`) | ⬜ |

---

## หมวด 4 — กรอกแทน (On-behalf)

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| BEHALF-01 | manager กรอกแทนผู้ใช้ active / **P1** | manager; ผู้ถูกกรอก active; มีหมวด; (option) ใบเสร็จที่ manager อัปโหลด | ใช้ "กรอกแทน", เลือกคน + กรอกข้อมูลถูกต้อง | submitter = คนที่ถูกกรอก, `created_by` = manager; claim โผล่ทั้งของคนนั้นและ manager | ⬜ |
| BEHALF-02 | สิทธิ์กรอกแทน & ตรวจ target / **P1** | submitter; manager; target ที่ inactive | ในฐานะ submitter เรียก `create_claim` ด้วย id คนอื่น; ในฐานะ manager ลอง target inactive/ไม่มีจริง | submitter ถูกปฏิเสธ; manager กรอกให้ target inactive/ไม่รู้จักไม่ได้ | ⬜ |
| BEHALF-03 | มองเห็นใบเสร็จตอนกรอกแทน / **P2** | manager กรอกแทนพร้อมใบเสร็จในโฟลเดอร์ของ manager เอง | เปิดใบเสร็จในฐานะ manager; ลองอ่าน Storage ตรงในฐานะ target | manager เปิดได้; target เห็น claim แต่อ่านไฟล์ตรงในโฟลเดอร์ manager ไม่ได้ (นโยบายโฟลเดอร์ปัจจุบัน) — *ยืนยันว่าตั้งใจแบบนี้* | ⬜ |

---

## หมวด 5 — รายงาน, CSV & พิมพ์/PDF

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| REPORT-01 | KPI รายเดือน & กราฟหมวด / **P1** | manager; เดือนมี claim หลายสถานะ + หลายหมวด | เปิดรายงานเดือนนั้น เทียบยอดกับข้อมูลที่ใส่ | ยอดรวม/จำนวน/ยอดตามหมวด **ไม่รวม rejected**; KPI จ่ายแล้ว/ค้างจ่ายตรงตามนิยาม; แท่งหมวดสะท้อน claim ที่ไม่ใช่ rejected | ⬜ |
| REPORT-02 | เทรนด์จ่าย 6 เดือน / **P2** | manager; claim paid กระจาย 6 เดือน มีเดือนที่ไม่จ่าย | เปิดรายงานดูเทรนด์ | โชว์ 6 เดือนจบที่เดือนที่เลือก; รวมยอด paid ตาม period; เดือนไม่มีข้อมูล = 0 | ⬜ |
| REPORT-03 | ตารางรายคน, sort, ค้นหา, drill-down / **P2** | manager; หลายคน มีคนที่มีแต่ claim rejected | เปิดแท็บรายคน; sort ตามยอด/ค้าง/ชื่อ; ค้นหา; กดเข้าไปดูรายคน | กลุ่มและรายละเอียดตรงข้อมูล period — *คนที่มีแต่ rejected ดู R-03* | ⬜ |
| REPORT-04 | ตารางทุกบิล & เดือนไม่มีข้อมูล / **P2** | manager; เดือนที่เลือกไม่มี claim | เปิดแท็บทุกบิล แล้วไปเดือนที่มีข้อมูล (มี rejected ด้วย) | เดือนว่างโชว์ empty state; ตารางบิลถูกต้อง; ยอดรวมสอดคล้องกับการตัด rejected | ⬜ |
| REPORT-05 | เลื่อนเดือน & ตัวเลือกเดือน / **P2** | manager; มี claim หลาย period | กดก่อนหน้า/ถัดไป + เลือกเดือน; ลอง period อนาคตผ่าน URL | ข้อมูล/หัวข้อตามเดือนที่เลือก; ปุ่มถัดไปถูกปิดเมื่อเกินเดือนล่าสุด; period ผิด/อนาคตไม่ทำหน้าพัง | ⬜ |
| REPORT-06 | encode & เนื้อหา CSV / **P1** | manager; claim มีชื่อไทย/หมวดไทย, เลขอ้างอิง, หลายสถานะ | export CSV แล้วเปิดใน Excel | ดาวน์โหลด CSV มี **UTF-8 BOM**, header/ค่าถูก, ป้ายสถานะถูก (ภาษาไทยไม่เพี้ยน) | ⬜ |
| REPORT-07 | อักขระ formula injection ใน CSV / **P1** | manager; ค่า/ชื่อขึ้นต้นด้วย `=` `+` `-` `@` tab CR **และ LF** | export CSV แล้วเปิด/ตรวจแต่ละค่า | ค่ายังเป็น text ไม่ทำงานเป็นสูตร — *ค่าที่ขึ้นต้นด้วย LF ยังไม่ถูกป้องกัน ดู R-06* | ⬜ |
| REPORT-08 | พิมพ์รายงานพร้อมใบเสร็จ / **P2** | manager; เดือนมีใบเสร็จรูป, PDF, ไม่มี, และ rejected | เปิดหน้า print; ตรวจสรุป/รายการ/ภาคผนวก; พิมพ์/บันทึก PDF | ฝังรูปใบเสร็จ (signed URL); PDF มีลิงก์; ไม่มีใบเสร็จมีป้ายกำกับ; แถบพิมพ์ถูกซ่อน; ยอดกระทบยอดถูก | ⬜ |
| REPORT-09 | พิมพ์เมื่อ 0 claim / 0 ใบเสร็จ / **P2** | manager; เดือนไม่มี claim แล้วเดือนที่ claim ไม่มีใบเสร็จ | เปิดหน้า print + พิมพ์/บันทึก PDF | เรนเดอร์ไม่ error; สรุป/ตารางว่างใช้งานได้; ภาคผนวกโชว์ empty/ป้ายไม่มีใบเสร็จ ไม่มีรูปพัง | ⬜ |
| REPORT-10 | submitter เปิดรายงาน/export/print ไม่ได้ / **P1** | submitter active | เปิดตรงๆ `/manage/report`, `/manage/report/export`, `/manage/report/print` | เด้งไป `/my`; ไม่หลุดข้อมูลรายงาน/CSV/ใบเสร็จ | ⬜ |

---

## หมวด 6 — จัดการสมาชิก

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| MEMBER-01 | เปลี่ยน role คนอื่น / **P1** | manager + submitter อีกคน (active) | เปลี่ยน submitter → manager แล้วกลับเป็น submitter | role เปลี่ยนถาวร; เมนู/สิทธิ์สะท้อน role ใหม่ในคำขอถัดไป | ⬜ |
| MEMBER-02 | เปิด/ปิดใช้งานคนอื่น / **P1** | manager + สมาชิก active อีกคน | ปิดใช้งาน แล้วเช็กว่าเข้าไม่ได้; เปิดกลับแล้วเช็กว่าเข้าได้ | flag active ถาวร; คนที่ถูกปิดใช้เข้าแอปไม่ได้; เปิดกลับแล้วใช้ได้ | ⬜ |
| MEMBER-03 | กันแก้ role/ปิดตัวเอง / **P1** | manager ล็อกอินอยู่ | ลองเปลี่ยน role + ปิดตัวเองผ่าน UI; แล้วลองยิง update ผ่าน Supabase API ตรง | UI บล็อก; เปลี่ยน role ตัวเองตรงถูก trigger ปฏิเสธ; **แต่ปิดตัวเองตรงยังทำได้ ดู R-01** | ⬜ |
| MEMBER-04 | submitter จัดการสมาชิกไม่ได้ / **P1** | submitter active | เปิด `/manage/members`; เรียก `setRole`/`setActive` ตรง | หน้า/action ถูกปฏิเสธ; ไม่หลุดข้อมูลหรือแก้ได้ | ⬜ |
| MEMBER-05 | empty/ค้นหาในรายชื่อ / **P3** | manager; สมาชิก < 8 แล้ว > 8 | เปิดหน้า; ค้นหาชื่อ/อีเมล (ถ้ามีช่องค้นหา) | รายชื่อเรนเดอร์ถูก; ค้นหากรองถูกแถว | ⬜ |

---

## หมวด 7 — กันตกเบิก (Missed Claims) & Subscription

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| MISS-01 | CRUD subscription / **P1** | manager; คน active + หมวด | เพิ่ม subscription, แก้จำนวน/หมายเหตุ/หมวด, ปิด/เปิด, แล้วลบ | ทุกการเปลี่ยนถาวร + รีเฟรชหน้า; subscription ที่ปิดไม่ถูกนับในยอดตกเบิก | ⬜ |
| MISS-02 | จับคู่ตาม person + category / **P1** | sub ของ A/หมวด X; claim ของ A/X และ A/Y; sub ของ B/X | เปิดหน้าตกเบิกเดือนนั้น | A/X = ส่งแล้ว; A/Y ไม่นับแทนหมวดอื่น; B/X ยังตกเบิกจนกว่าจะมี claim B/X | ⬜ |
| MISS-03 | claim ที่ไม่ใช่ rejected = ส่งแล้ว / **P1** | sub active; เดือนมี claim สถานะ submitted/paid/returned/rejected ตรง person+category | เช็กรายการตกเบิกแต่ละสถานะ | submitted/paid/returned นับว่าส่งแล้ว; **rejected ไม่นับ** และยังตกเบิก (ยืนยันจาก filter `status !== 'rejected'`) | ⬜ |
| MISS-04 | ไม่มี sub & ส่งครบ / **P2** | manager; ไม่มี sub active แล้วมี sub ที่ตรง claim ครบ | เปิดหน้าตกเบิก + tile บน dashboard ทั้งสองสภาพ | ไม่มี sub = empty state ชวนตั้งค่า; ตรงครบ = ตกเบิก 0 ไม่โชว์เตือนหลอก | ⬜ |
| MISS-05 | เลื่อนเดือน & period อนาคต / **P2** | manager; claim ถึง period ล่าสุดที่รู้ | เลื่อนเดือน + เลือกเดือน; ยิง period ผิด/อนาคตตรง | เดือนที่เลือกถูก; ปุ่มถัดไปถูกจำกัด; period ผิดไม่ทำพัง | ⬜ |
| MISS-06 | submitter อ่าน/จัดการ sub ไม่ได้ / **P1** | submitter active | เปิด `/manage/missing`; query subscription + insert/update/delete ตรง | หน้าถูกปฏิเสธ; RLS ให้อ่านเฉพาะ sub ของตัวเอง และห้ามเขียนทั้งหมด | ⬜ |
| MISS-07 | tile ตกเบิกบน dashboard / **P2** | manager; เดือนนี้มี sub active ผสมทั้งตรงและตกเบิก | เปิด dashboard | tile โชว์จำนวน/คนที่ตกเบิกถูก + ลิงก์ไปหน้าตกเบิก; ไม่มี sub = ชวนตั้งค่า | ⬜ |

---

## หมวด 8 — Telegram & แจ้งเตือน

| ID | เคส / Priority | เงื่อนไขก่อนเทส | ขั้นตอน | ผลที่คาดหวัง | สถานะ |
|---|---|---|---|---|---|
| TG-01 | สร้าง token เชื่อมจากโปรไฟล์ / **P1** | ผู้ใช้ active; ตั้ง bot username แล้ว | กด "เชื่อม Telegram" | สร้าง token สุ่มความยาวสูงให้ผู้ใช้ปัจจุบัน + คืน deep link Telegram; UI บอกขั้นถัดไป | ⬜ |
| TG-02 | consume token ที่ถูกต้อง 1 ครั้ง / **P1** | token ยังไม่ใช้/ไม่หมดอายุ; ตั้ง webhook secret | POST update `/start <token>` พร้อม secret ถูก | token ถูกมาร์ค used; ผูก chat_id/username เข้ากับคนของ token; ส่งข้อความสำเร็จ | ⬜ |
| TG-03 | replay/หมดอายุ/token มั่ว / **P1** | token ที่ใช้แล้ว 1, หมดอายุ 1, ไม่รู้จัก 1 | POST แต่ละ token ด้วย secret ถูก | ไม่ผูกบัญชี; ผู้ใช้ได้ข้อความ invalid/expired; replay เปลี่ยนการผูกเดิมไม่ได้ | ⬜ |
| TG-04 | ตรวจ webhook secret / **P1** | ตั้ง webhook secret | POST update โดย header `x-telegram-bot-api-secret-token` หาย/ผิด; แล้วถูก + update รูปแบบแปลกๆ | หาย/ผิด → 401 ไม่ประมวลผล; ถูก → สำเร็จ; update ที่ไม่รองรับถูกข้ามอย่างปลอดภัย (ตอบ 200) | ⬜ |
| TG-05 | ตรวจ bearer ของ cron / **P1** | ตั้ง `CRON_SECRET` | ยิง `/api/cron/reminders` ด้วย bearer หาย/ผิดรูป/ผิด; แล้วถูก | คำขอไม่ผ่าน → 401 ไม่ส่งอะไร; bearer ถูก → รับ | ⬜ |
| TG-06 | วันที่ cron ส่งเตือน / **P2** | bearer ถูก; ทดสอบวันที่ 25, 28, และวันอื่น | ยิง cron แต่ละวัน | ส่งเฉพาะวันที่ 25 และ 28 เท่านั้น; วันอื่นตอบ skipped — *วันคิดตาม UTC ดู R-08* | ⬜ |
| TG-07 | ยิงเตือนเอง & คนไม่มี Telegram / **P2** | manager; คนตกเบิกบางคนเชื่อม Telegram บางคนไม่ | กด "ยิงเตือน Telegram" | DM เฉพาะคนที่ตกเบิก + เชื่อม chat_id; คนไม่มี Telegram นับ skipped; โชว์จำนวน sent/skipped — *ยิงซ้ำได้ = DM ซ้ำ ดู R-07* | ⬜ |
| TG-08 | submitter ยิงเตือนไม่ได้ / **P1** | submitter active | เรียก `sendRemindersNow` ตรง | ตัวกัน manager ปฏิเสธ; ไม่มี DM ถูกส่ง | ⬜ |

---

## หมวด 9 — บั๊ก / ความเสี่ยงที่เจอ (ตรวจยืนยันกับโค้ดจริงแล้วทุกข้อ)

> โครงสร้างสิทธิ์หลักถือว่า**แน่นดี**: หน้า/action ของ manager เช็ก role, ทุก write ของ claim ผ่าน RPC, transition เช็ก manager ซ้ำ, เลขเบิกใช้ counter ใน DB — ทั้งหมดนี้เทสยืนยันว่าถูกต้อง ด้านล่างคือช่องโหว่ที่เหลือ (ส่วนใหญ่เป็น defense-in-depth ไม่ใช่ช่องให้คนนอกโจมตี)

| ID | ความเสี่ยง | ไฟล์ที่ยืนยัน | ระดับ | ข้อเสนอแก้ | สถานะ |
|---|---|---|---|---|---|
| **R-01** | **ปิดใช้งานตัวเองผ่าน API ตรงได้** — UI/server action กันแล้ว แต่ policy `people_update` ให้ manager แก้แถวตัวเองได้ และ trigger `prevent_self_role_change()` กันเฉพาะการเปลี่ยน `role` ไม่กัน `active`. ยิง Supabase ตรงตั้ง `active=false` ให้ตัวเองได้ | `0002_rls.sql:19,26` | ต่ำ | เพิ่มเงื่อนไขใน trigger ให้ raise เมื่อ `auth.uid()=new.id and new.active=false and old.active` | ⬜ |
| **R-02** | **ผู้ใช้ที่เพิ่งถูกปิดยังอ่านข้อมูลตัวเองตรงได้ชั่วคราว** — `is_manager()` เช็ก `active` แต่ policy self-branch (`= auth.uid()`) ของ people/claims/history/ใบเสร็จ ไม่เช็ก `active`. คนที่ถูกปิดใช้งานยัง query ข้อมูล**ของตัวเอง**ตรงได้จนกว่า session หมดอายุ (UI บล็อกแล้วผ่าน `getCurrentUser`) | `0002_rls.sql:18,47` · `current-user.ts` | ต่ำ | ถ้าต้องกันเข้ม เพิ่ม `and exists(... active)` ใน self-branch หรือ revoke session ตอนปิดใช้งาน | ⬜ |
| **R-03** | **คนที่มีแต่ claim rejected ถูกนับใน "ผู้เบิก"** — ลูปสร้าง group ต่อทุก claim (รวม rejected) ก่อน filter ทำให้เกิด group ยอด 0; KPI/ป้ายแท็บใช้ `people.length` จึงนับคนยอด 0 เกินมา | `report/page.tsx:44-67` | ต่ำ | กรอง group ที่ `count===0` ออกก่อนส่งให้ ReportView | ⬜ |
| **R-04** | **ตรวจใบเสร็จแค่ prefix ไม่เช็กว่าไฟล์มีจริง** — `assert_claim_input` รับ path ใดๆ ที่ขึ้นต้นด้วย uid ผู้เรียก; claim จึงอ้าง object ที่ไม่มีอยู่ได้ แล้วโชว์ใบเสร็จไม่ขึ้นภายหลัง | `0004_claim_rpcs.sql:25` | ต่ำ | เช็ก object มีจริง หรือจัดการ "ใบเสร็จหาย" ให้ชัดใน UI | ⬜ |
| **R-05** | **อัปโหลดใบเสร็จไม่จำกัดชนิด/ขนาดฝั่งเซิร์ฟเวอร์** — `accept` ในฟอร์มเป็นแค่ hint ของ browser; policy Storage เช็กแค่ bucket + โฟลเดอร์ uid ไม่เช็ก MIME/ขนาด. ผู้ใช้ที่ล็อกอินยิงตรงอัปไฟล์ใหญ่/แปลกเข้าโฟลเดอร์ตัวเองได้ | `0003_storage.sql:6-8` · `NewClaimForm.tsx` | **กลาง** | ตั้ง `allowed_mime_types` + `file_size_limit` บน bucket `receipts` | ✅ **แก้แล้ว** (0009 + narrow `accept` + แสดง error, รอ deploy) |
| **R-06** | **CSV neutralization ไม่ครอบคลุม LF นำหน้า** — regex กัน `= + - @ tab CR` แต่ไม่กัน `\n` | `csv.ts:10` | ต่ำ | เพิ่ม `\n` เข้า char class: `/^[=+\-@\t\r\n]/` | ⬜ |
| **R-07** | **แจ้งเตือนไม่ idempotent** — cron ยิงได้ซ้ำในวันเตือน และปุ่มกดซ้ำได้; ไม่มีบันทึกว่าเคยส่ง = DM ซ้ำได้ | `reminders.ts` · `cron/reminders/route.ts` | **กลาง** | บันทึก sent-log ต่อ (person, period) หรือกันปุ่มกดรัว | ✅ **แก้แล้ว** (0010 `reminder_log` dedup ต่อคน/วัน + เช็ก `ok` body, รอ deploy) |
| **R-08** | **"เดือนปัจจุบัน" ใช้ UTC** — `toISOString().slice(0,7)` และ cron ใช้ `getUTCDate()`. เวลาไทย (UTC+7) ช่วงต้นเดือน 7 ชม.แรก UTC ยังเป็นเดือนก่อน — อาจเตือน/รายงานผิดเดือนใกล้เส้นแบ่ง | `reminders.ts:26` · `cron/reminders/route.ts:13` | **กลาง** | คำนวณเดือน/วันด้วยโซนเวลา `Asia/Bangkok` ให้สม่ำเสมอ | ✅ **แก้แล้ว** (`bangkok-time.ts` ใช้ทุกจุด รวม print date, รอ deploy) |

---

## สรุป & ข้อเสนอ

**ผลรวม:** โครงสร้างความปลอดภัยหลัก (สิทธิ์, RLS, RPC state machine, atomic เลขเบิก) แน่นดี ไม่พบช่องให้คนนอกเจาะ ความเสี่ยงที่เจอ 8 ข้อเป็น edge case / defense-in-depth เกือบทั้งหมด

**แนะนำแก้ก่อน (ระดับกลาง 3 ข้อ):**
1. **R-05** — จำกัด MIME + ขนาดไฟล์บน bucket `receipts` (กันคนอัปไฟล์ใหญ่ถล่ม storage ฟรี)
2. **R-08** — ใช้โซนเวลา `Asia/Bangkok` คำนวณเดือน/วัน (กันเตือน/รายงานผิดเดือน)
3. **R-07** — กัน DM แจ้งเตือนซ้ำ

**ที่เหลือ (R-01/02/03/04/06)** เป็นความเสี่ยงต่ำ แก้ได้เมื่อสะดวก

**ขั้นถัดไป:** ไล่เทส **P1 ทั้งหมด** ด้วยมือ (เน้นหมวด 1 สิทธิ์ + หมวด 8 Telegram) แล้วกรอกช่องสถานะ
