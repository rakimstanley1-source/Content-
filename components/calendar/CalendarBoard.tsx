"use client";

import { useMemo, useState } from "react";
import { DndContext, useDraggable, useDroppable, type DragEndEvent } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Copy, Plus } from "lucide-react";
import type { ContentItem } from "@prisma/client";
import { Badge, Button } from "@/components/ui/primitives";
import { cn, firstLine, truncate } from "@/lib/utils";

const PLATFORM_COLOR: Record<string, string> = {
  INSTAGRAM: "border-l-accent",
  TIKTOK: "border-l-ink",
  YOUTUBE: "border-l-bad",
  PINTEREST: "border-l-good",
  X: "border-l-ink-dim",
};

function startOfCalendarGrid(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const dayOfWeek = first.getDay();
  return new Date(first.getFullYear(), first.getMonth(), first.getDate() - dayOfWeek);
}

export function CalendarBoard({
  items,
  onReschedule,
  onDuplicate,
  onCreate,
  onOpen,
}: {
  items: ContentItem[];
  onReschedule: (id: string, date: Date) => void;
  onDuplicate: (item: ContentItem) => void;
  onCreate: (date: Date) => void;
  onOpen: (item: ContentItem) => void;
}) {
  const [month, setMonth] = useState(() => new Date());

  const days = useMemo(() => {
    const start = startOfCalendarGrid(month);
    return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
  }, [month]);

  const itemsByDay = useMemo(() => {
    const map = new Map<string, ContentItem[]>();
    for (const item of items) {
      if (!item.scheduledAt) continue;
      const key = new Date(item.scheduledAt).toDateString();
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [items]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;
    const date = new Date(String(over.id));
    onReschedule(String(active.id), date);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl text-ink">{month.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</h2>
        <div className="flex items-center gap-1">
          <Button variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} className="!p-2">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setMonth(new Date())} className="!px-3">
            Today
          </Button>
          <Button variant="outline" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} className="!p-2">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-hairline bg-hairline">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="bg-canvas-raised px-2 py-1.5 text-center text-xs uppercase tracking-wide text-ink-dim">
              {d}
            </div>
          ))}
          {days.map((day) => (
            <DayCell
              key={day.toISOString()}
              day={day}
              inMonth={day.getMonth() === month.getMonth()}
              items={itemsByDay.get(day.toDateString()) ?? []}
              onDuplicate={onDuplicate}
              onCreate={onCreate}
              onOpen={onOpen}
            />
          ))}
        </div>
      </DndContext>
    </div>
  );
}

function DayCell({
  day,
  inMonth,
  items,
  onDuplicate,
  onCreate,
  onOpen,
}: {
  day: Date;
  inMonth: boolean;
  items: ContentItem[];
  onDuplicate: (item: ContentItem) => void;
  onCreate: (date: Date) => void;
  onOpen: (item: ContentItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: day.toDateString() });
  const isToday = day.toDateString() === new Date().toDateString();

  return (
    <div
      ref={setNodeRef}
      className={cn("group min-h-28 bg-canvas-raised p-1.5", !inMonth && "opacity-40", isOver && "bg-accent-soft")}
    >
      <div className="flex items-center justify-between px-1">
        <span className={cn("text-xs tabular", isToday ? "font-semibold text-accent" : "text-ink-faint")}>{day.getDate()}</span>
        <button onClick={() => onCreate(day)} className="opacity-0 group-hover:opacity-100">
          <Plus className="h-3 w-3 text-ink-faint" />
        </button>
      </div>
      <div className="mt-1 flex flex-col gap-1">
        {items.map((item) => (
          <DraggableCard key={item.id} item={item} onDuplicate={onDuplicate} onOpen={onOpen} />
        ))}
      </div>
    </div>
  );
}

function DraggableCard({ item, onDuplicate, onOpen }: { item: ContentItem; onDuplicate: (item: ContentItem) => void; onOpen: (item: ContentItem) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(item)}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 10 } : undefined}
      className={cn(
        "cursor-grab rounded border-l-2 bg-canvas px-1.5 py-1 text-[11px] text-ink shadow-none",
        PLATFORM_COLOR[item.platform] ?? "border-l-ink-dim",
        isDragging && "opacity-70"
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate">{truncate(firstLine(item.caption || item.hook || "Untitled"), 26)}</span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(item);
          }}
          className="shrink-0 text-ink-faint hover:text-ink"
        >
          <Copy className="h-3 w-3" />
        </button>
      </div>
      <Badge tone={item.status === "PUBLISHED" ? "good" : "neutral"}>{item.status.toLowerCase()}</Badge>
    </div>
  );
}
