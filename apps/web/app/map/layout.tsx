export default function MapLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col overflow-hidden">
      <a className="sr-only focus:not-sr-only" href="#layer-rail">
        Skip to layer controls
      </a>
      <a className="sr-only focus:not-sr-only" href="#map-pane">
        Skip to map
      </a>
      <a className="sr-only focus:not-sr-only" href="#inspector">
        Skip to inspector
      </a>
      {children}
    </div>
  );
}
