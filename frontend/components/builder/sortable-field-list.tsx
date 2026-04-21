"use client";

import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

import { sortFieldsByOrder } from "@/lib/builder/form-model";
import { cn } from "@/lib/utils";
import type { FieldRead } from "@/types/api";

type Props = {
  fields: FieldRead[];
  selectedId: string | null;
  onReorder: (next: FieldRead[]) => void;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
};

export function SortableFieldList({
  fields,
  selectedId,
  onReorder,
  onSelect,
  onRemove,
}: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const ordered = sortFieldsByOrder(fields);
  const ids = ordered.map((f) => f.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const moved = arrayMove(ordered, oldIndex, newIndex);
    onReorder(moved.map((f, i) => ({ ...f, order: i })));
  }

  if (ordered.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        Add fields from the palette to build your form.
      </p>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <ul className="space-y-2">
          {ordered.map((field) => (
            <SortableFieldRow
              key={field.id}
              field={field}
              selected={field.id === selectedId}
              onSelect={() => onSelect(field.id)}
              onRemove={() => onRemove(field.id)}
            />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function SortableFieldRow({
  field,
  selected,
  onSelect,
  onRemove,
}: {
  field: FieldRead;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="list-none">
      <div
        className={cn(
          "flex items-stretch gap-2 rounded-lg border bg-card text-left shadow-sm",
          selected ? "border-primary ring-1 ring-ring" : "border-border",
          isDragging && "opacity-70"
        )}
      >
        <button
          type="button"
          className="flex shrink-0 cursor-grab touch-none items-center px-2 text-muted-foreground hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onSelect}
          className="min-w-0 flex-1 py-3 pr-2 text-left"
        >
          <span className="block truncate font-medium text-foreground">
            {field.label || "Untitled field"}
          </span>
          <span className="text-xs text-muted-foreground">
            {field.type.replace(/_/g, " ")}
            {field.required ? " · required" : ""}
          </span>
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 px-3 text-muted-foreground hover:text-destructive"
          aria-label="Remove field"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
