import { domainSuffix } from '@/lib/access-control';
import { GoogleSignInButton } from './GoogleSignInButton';

export default function LoginPage() {
  const suffix = domainSuffix(process.env.ALLOWED_DOMAIN);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#f8fafc] p-6">
      <div className="flex w-full max-w-[380px] flex-col items-center gap-6">
        {/* Brand */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#2563eb] text-3xl font-bold text-white shadow-lg shadow-[#2563eb]/25">
            ฿
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#111827]">ระบบเบิกจ่ายค่าใช้จ่าย</h1>
            <p className="mt-1 text-sm text-[#6b7280]">ส่งบิล ติดตามสถานะ และสรุปยอดเบิก ในที่เดียว</p>
          </div>
        </div>

        {/* Sign-in card */}
        <div className="card flex w-full flex-col gap-4 px-6 py-7">
          <GoogleSignInButton />

          <div className="flex items-start gap-2.5 rounded-xl bg-[#eff6ff] px-3.5 py-3 text-[12px] leading-relaxed text-[#1d4ed8]">
            <span className="mt-px text-sm">📧</span>
            <span>
              {suffix ? (
                <>
                  ใช้ <b>อีเมลบริษัท {suffix}</b> เท่านั้น
                  <br />
                  อีเมลส่วนตัว (Gmail ทั่วไป) จะเข้าใช้งานไม่ได้
                </>
              ) : (
                <>ใช้ <b>อีเมลบริษัท</b> ในการเข้าสู่ระบบ</>
              )}
            </span>
          </div>
        </div>

        <p className="text-[11px] text-[#9ca3af]">ระบบภายในบริษัท · like-soft.net</p>
      </div>
    </main>
  );
}
