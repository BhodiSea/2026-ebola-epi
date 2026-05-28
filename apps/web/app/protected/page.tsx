import { redirect } from "next/navigation";
import { Suspense } from "react";

import { createClient } from "@/lib/supabase/server";

export default function ProtectedPage() {
  return (
    <div className="flex w-full flex-1 flex-col gap-12">
      <div className="flex flex-col items-start gap-2">
        <h2 className="mb-4 font-bold text-2xl">Your session</h2>
        <pre className="max-h-32 overflow-auto rounded border p-3 font-mono text-xs">
          <Suspense>
            <UserDetails />
          </Suspense>
        </pre>
      </div>
    </div>
  );
}

async function UserDetails() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    redirect("/auth/login");
  }

  return JSON.stringify(data.claims, null, 2);
}
