import Link from "next/link";

// eslint-disable-next-line sonarjs/todo-tag
// TODO(phase-4): replace with /today redirect once the today page lands
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
      <h1 className="font-sans font-semibold text-[24px] text-fg">ituri-sitrep</h1>
      <p className="font-mono text-[13px] text-fg-muted">
        2026 Ituri Bundibugyo virus outbreak situational awareness
      </p>
      <Link
        href="/methods"
        className="font-mono text-[13px] text-accent underline-offset-2 hover:underline"
      >
        Methods & provenance →
      </Link>
    </main>
  );
}
