"use client";

import { useState } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import type { ContentItem } from "@prisma/client";
import { Badge } from "@/components/ui/primitives";
import { cn, firstLine, truncate } from "@/lib/utils";
import { Send, Repeat } from "lucide-react";

const STATUSES = ["IDEA", "BRIEF", "CREATED", "REVIEW", "APPROVED", "SCHEDULED", "PUBLISHED", "ANALYZED", "REPURPOSED"] as const;

export function PipelineBoard({
  items,
  onStatusChange,
  onOpen,
  onPublish,
  onRepurpose,
}: {
  items: ContentItem[];
  onStatusChange: (id: string, status: string) => void;
  onOpen: (item: ContentItem) => void;
  onPublish: (item: ContentItem) => void;
  onRepurpose: (item: ContentItem) => void;
}) {
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    onStatusChange(String(active.id), String(over.id));
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map((status) => (
          <Column
            key={status}
            status={status}
            items={items.filter((i) => i.status === status)}
            onOpen={onOpen}
            onPublish={onPublish}
            onRepurpose={onRepurpose}
          />
        ))}
      </div>
    </DndContext>
  );
}

function Column({
  status,
  items,
  onOpen,
  onPublish,
  onRepurpose,
}: {
  status: string;
  items: ContentItem[];
  onOpen: (item: ContentItem) => void;
  onPublish: (item: ContentItem) => void;
  onRepurpose: (item: ContentItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div ref={setNodeRef} className={cn("w-56 shrink-0 rounded-card border border-hairline p-2", isOver && "bg-accent-soft")}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-xs uppercase tracking-wide text-ink-dim">{status.toLowerCase()}</span>
        <span className="tabular text-xs text-ink-faint">{items.length}</span>
      </div>
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <Card key={item.id} item={item} onOpen={onOpen} onPublish={onPublish} onRepurpose={onRepurpose} />
        ))}
      </div>
    </div>
  );
}

function Card({
  item,
  onOpen,
  onPublish,
  onRepurpose,
}: {
  item: ContentItem;
  onOpen: (item: ContentItem) => void;
  onPublish: (item: ContentItem) => void;
  onRepurpose: (item: ContentItem) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: item.id });
  const [busy, setBusy] = useState(false);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(item)}
      className={cn("cursor-grab rounded-card border border-hairline bg-canvas-raised p-2.5 text-sm", isDragging && "opacity-70")}
    >
      <div className="flex items-center justify-between">
        <Badge>{item.platform.toLowerCase()}</Badge>
        <Badge>{item.format.toLowerCase()}</Badge>
      </div>
      <p className="mt-2 text-ink">{truncate(firstLine(item.caption || item.hook || "Untitled"), 46)}</p>
      {item.scheduledAt && <p className="mt-1 text-xs text-ink-faint">{new Date(item.scheduledAt).toLocaleString()}</p>}

      {(item.status === "APPROVED" || item.status === "SCHEDULED") && (
        <button
          onClick={async (e) => {
            e.stopPropagation();
            setBusy(true);
            await onPublish(item);
            setBusy(false);
          }}
          disabled={busy}
          className="mt-2 flex items-center gap-1 text-xs text-accent"
        >
          <Send className="h-3 w-3" /> {busy ? "Publishing…" : "Publish now"}
        </button>
      )}
      {(item.status === "PUBLISHED" || item.status === "ANALYZED") && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRepurpose(item);
          }}
          className="mt-2 flex items-center gap-1 text-xs text-ink-dim hover:text-ink"
        >
          <Repeat className="h-3 w-3" /> Repurpose
        </button>
      )}
    </div>
  );
}
