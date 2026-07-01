import {
  DndContext,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCw, X } from "lucide-react";
import { formatBytes } from "@/lib/formatBytes";

export type SortableItem = {
  id: string;
  name: string;
  size: number;
  thumbnailUrl?: string;
  rotation?: number;
};

type Props = {
  items: SortableItem[];
  onChange: (next: SortableItem[]) => void;
  onRemove: (id: string) => void;
  onRotate?: (id: string) => void;
};

export function SortableFileGrid({ items, onChange, onRemove, onRotate }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(items, oldIndex, newIndex));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {items.map((item, idx) => (
            <SortableTile
              key={item.id}
              item={item}
              index={idx}
              onRemove={onRemove}
              onRotate={onRotate}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableTile({
  item,
  index,
  onRemove,
  onRotate,
}: {
  item: SortableItem;
  index: number;
  onRemove: (id: string) => void;
  onRotate?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card"
    >
      <div className="relative aspect-square bg-muted/40">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.name}
            className="h-full w-full object-contain"
            style={{ transform: `rotate(${item.rotation ?? 0}deg)` }}
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">
            {item.name.split(".").pop()?.toUpperCase()}
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-md bg-background/90 px-1.5 py-0.5 text-xs font-semibold">
          {index + 1}
        </span>
        <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {onRotate && (
            <button
              type="button"
              onClick={() => onRotate(item.id)}
              className="grid h-7 w-7 place-items-center rounded-md bg-background/95 text-foreground shadow-sm hover:bg-background"
              aria-label="Putar"
            >
              <RotateCw className="h-3.5 w-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onRemove(item.id)}
            className="grid h-7 w-7 place-items-center rounded-md bg-background/95 text-destructive shadow-sm hover:bg-background"
            aria-label="Hapus"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="absolute bottom-2 left-2 grid h-7 w-7 cursor-grab place-items-center rounded-md bg-background/95 text-muted-foreground shadow-sm active:cursor-grabbing"
          aria-label="Geser"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="px-2.5 py-2">
        <div className="truncate text-xs font-medium" title={item.name}>
          {item.name}
        </div>
        <div className="text-[11px] text-muted-foreground">{formatBytes(item.size)}</div>
      </div>
    </div>
  );
}
