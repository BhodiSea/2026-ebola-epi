import { redirect } from "next/navigation";

import { InternalNav } from "@/components/layout/internal-nav";
import { isInternalUser } from "@/lib/auth/internal-user";
import { createClient } from "@/lib/supabase/server";

export default async function InternalLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user === null) {
    return redirect("/auth/login");
  }

  if (!isInternalUser(user)) {
    return redirect("/today");
  }

  return (
    <div className="flex min-h-screen flex-col bg-(--color-surface-2)">
      <header className="flex h-10 items-center border-border border-b px-4 font-medium text-fg-muted text-xs">
        <span className="mr-auto text-fg">ituri · internal</span>
        <span className="tabular-nums">{user.email}</span>
      </header>
      <div className="flex flex-1">
        <InternalNav />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
