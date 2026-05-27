import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

const validOtpTypes = new Set([
  "email",
  "email_change",
  "invite",
  "magiclink",
  "phone_change",
  "recovery",
  "sms",
]);

export async function GET(request: NextRequest): Promise<never> {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const next = searchParams.get("next") ?? "/";

  if (tokenHash === null || type === null || !validOtpTypes.has(type)) {
    redirect(`/auth/error?error=Missing or invalid OTP parameters`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    type,
    // eslint-disable-next-line @typescript-eslint/naming-convention -- snake_case required by Supabase SDK
    token_hash: tokenHash,
  });
  if (error !== null) {
    redirect(`/auth/error?error=${error.message}`);
  }
  redirect(next);
}
