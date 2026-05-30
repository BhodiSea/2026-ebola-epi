"use client";

import { Drawer } from "vaul";

import { InspectorTabs } from "./inspector-tabs";
import type { ZoneSelection } from "./map-pane";
import type { TimeWindow } from "@/lib/map/zone-detail-response";

const SNAP_POINTS: [number, number, number] = [0.12, 0.5, 0.92];

interface MobileInspectorProps {
  outbreakId: string;
  selectedAdmin1?: ZoneSelection;
  timeWindow?: TimeWindow;
}

export function MobileInspector({
  outbreakId,
  selectedAdmin1,
  timeWindow,
}: Readonly<MobileInspectorProps>) {
  return (
    <Drawer.Root snapPoints={SNAP_POINTS} modal={false}>
      <Drawer.Portal>
        {/* Overlay intentionally omitted: modal={false} keeps the map pannable behind the sheet. */}
        <Drawer.Content
          data-vaul-drawer=""
          className="fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-xl bg-(--color-surface-1) outline-none md:hidden"
        >
          {/* Drag handle — 4×36 px at 40% alpha per Material 3 spec */}
          <div
            aria-hidden="true"
            className="mx-auto mt-2 h-1 w-9 rounded-full bg-fg-subtle opacity-40"
          />
          <div className="flex-1 overflow-y-auto">
            <InspectorTabs
              outbreakId={outbreakId}
              {...(timeWindow === undefined ? {} : { timeWindow })}
              {...(selectedAdmin1 === undefined ? {} : { selectedAdmin1 })}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
