"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PRIORIDAD_COLORS, PRIORIDAD_LABELS, ESTADO_OT_LABELS } from "@/lib/utils";
import { useSession } from "next-auth/react";

const COLUMNAS = [
  { id: "PENDIENTE",               label: "Pendiente",     topColor: "#b0b4b8" },
  { id: "EN_CURSO",                label: "En Curso",      topColor: "#1C6B30" },
  { id: "COMPLETADA_CON_PROBLEMAS",label: "Con problemas", topColor: "#d97706" },
] as const;

type EstadoOT = string;

interface OTCard {
  id: string;
  docId: string;
  titulo: string;
  prioridad: string;
  estado: EstadoOT;
  fechaVencimiento?: string | null;
  tecnico?: string | null;
  tecnicos?: string | null;   // comma-separated all technicians
  maquina?: string | null;
  sector?: string | null;
  linea?: string | null;
  creadoPor: string;
  createdAt: string;
  descripcion: string;
}

export default function TableroPage() {
  const { data: session } = useSession();
  const canCreateOT = ["ADMIN", "SUPERVISOR"].includes(session?.user?.role ?? "");
  const [cards, setCards] = useState<OTCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCard, setActiveCard] = useState<OTCard | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const fetchOTs = useCallback(async () => {
    const res = await fetch("/api/documentos?tipo=ORDEN_TRABAJO&tablero=true");
    if (!res.ok) return;
    const { docs } = await res.json();
    // Filter out final-state OTs from the board view
    const ESTADOS_FINALES = new Set(["COMPLETADA", "COMPLETADA_CON_PROBLEMAS", "IMPOSIBLE_TERMINAR", "CANCELADA"]);
    const mapped: OTCard[] = docs.filter((d: any) => !ESTADOS_FINALES.has(d.ordenTrabajo?.estado)).map((d: any) => ({
      id: d.ordenTrabajo?.id ?? d.id,
      docId: d.id,
      titulo: d.titulo,
      prioridad: d.ordenTrabajo?.prioridad ?? "MEDIA",
      estado: d.ordenTrabajo?.estado ?? "PENDIENTE",
      fechaVencimiento: d.ordenTrabajo?.fechaVencimiento ?? null,
      tecnico: d.ordenTrabajo?.tecnico?.name ?? null,
      tecnicos: (() => {
        const names = [d.ordenTrabajo?.tecnico?.name, ...(d.ordenTrabajo?.tecnicosResueltos ?? []).map((t: any) => t.name)].filter(Boolean);
        return names.length ? names.join(", ") : null;
      })(),
      maquina: d.maquina?.nombre ?? null,
      sector: d.maquina?.linea?.subsector?.sector?.nombre ?? null,
      linea: d.maquina?.linea?.nombre ?? null,
      creadoPor: d.creadoPor?.name ?? "",
      createdAt: d.createdAt,
      descripcion: d.ordenTrabajo?.descripcion ?? "",
    }));
    setCards(mapped);
    setLoading(false);
  }, []);

  useEffect(() => { fetchOTs(); }, [fetchOTs]);

  // Auto-refresh cada 15 segundos y al enfocar la ventana
  useEffect(() => {
    const interval = setInterval(fetchOTs, 15000);
    window.addEventListener("focus", fetchOTs);
    return () => { clearInterval(interval); window.removeEventListener("focus", fetchOTs); };
  }, [fetchOTs]);

  function handleDragStart(event: DragStartEvent) {
    const card = cards.find(c => c.id === event.active.id);
    setActiveCard(card ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const cardId = active.id as string;
    const card = cards.find(c => c.id === cardId);
    if (!card) return;

    // Determine target column: either a column id or another card's column
    let targetEstado: EstadoOT | null = null;
    const colId = COLUMNAS.find(c => c.id === over.id)?.id;
    if (colId) {
      targetEstado = colId;
    } else {
      const overCard = cards.find(c => c.id === over.id);
      if (overCard) targetEstado = overCard.estado;
    }

    if (!targetEstado || targetEstado === card.estado) return;

    // Optimistic update
    setCards(prev => prev.map(c => c.id === cardId ? { ...c, estado: targetEstado! } : c));
    setSaving(cardId);

    await fetch(`/api/documentos/${card.docId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo: card.titulo,
        tipo: "ORDEN_TRABAJO",
        datos: { descripcion: card.descripcion, prioridad: card.prioridad, estado: targetEstado },
      }),
    });

    setSaving(null);
  }

  const cardsByEstado = COLUMNAS.reduce<Record<string, OTCard[]>>((acc, col) => {
    acc[col.id] = cards.filter(c => c.estado === col.id);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 bg-slate-200 rounded w-48 mb-6 animate-pulse" />
        <div className="flex gap-4">
          {COLUMNAS.map(c => (
            <div key={c.id} className="flex-1 h-96 bg-slate-100 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-[#d4d6d8] px-6 py-3 flex items-center justify-between shrink-0">
        <h1 className="text-sm font-semibold text-[#1d2023]">Tablero — Órdenes de Trabajo <span className="font-normal text-[#9ea3aa]">({cards.length})</span></h1>
        {canCreateOT && (
          <Link href="/documentos/nuevo?tipo=ORDEN_TRABAJO" className="flex items-center gap-2 text-sm font-semibold text-white px-3 py-1.5 transition-colors" style={{ backgroundColor: "#1C6B30" }}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Nueva OT
          </Link>
        )}
      </div>

      {/* Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-3 overflow-x-auto p-4 flex-1 min-h-0">
          {COLUMNAS.map(col => {
            const colCards = cardsByEstado[col.id] ?? [];
            return (
              <Column
                key={col.id}
                col={col}
                cards={colCards}
                saving={saving}
              />
            );
          })}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeCard && <CardView card={activeCard} isDragging saving={null} />}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  col,
  cards,
  saving,
}: {
  col: typeof COLUMNAS[number];
  cards: OTCard[];
  saving: string | null;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col w-64 shrink-0 transition-colors"
      style={{ border: `1px solid #d4d6d8`, borderTop: `3px solid ${col.topColor}`, backgroundColor: isOver ? "#f0f7f2" : "#f7f8f9" }}
    >
      {/* Column header */}
      <div className="px-3 py-2.5 bg-white border-b border-[#d4d6d8] flex items-center justify-between">
        <span className="text-xs font-semibold text-[#1d2023] uppercase tracking-wider">{col.label}</span>
        <span className="text-xs font-bold text-[#9ea3aa]">{cards.length}</span>
      </div>

      {/* Cards */}
      <SortableContext items={cards.map(c => c.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-[120px]">
          {cards.map(card => (
            <SortableCard key={card.id} card={card} saving={saving} />
          ))}
          {cards.length === 0 && (
            <div className="flex items-center justify-center h-16 text-xs text-[#9ea3aa] border border-dashed border-[#d4d6d8]">
              Sin órdenes
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ card, saving }: { card: OTCard; saving: string | null }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: "card", card },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardView card={card} isDragging={isDragging} saving={saving} />
    </div>
  );
}

function CardView({ card, isDragging, saving }: { card: OTCard; isDragging: boolean; saving: string | null }) {
  const isSaving = saving === card.id;
  const isOverdue = card.fechaVencimiento && new Date(card.fechaVencimiento) < new Date() && card.estado !== "COMPLETADA";

  return (
    <div
      className={`bg-white border border-[#d4d6d8] p-3 cursor-grab active:cursor-grabbing select-none transition-colors ${
        isDragging ? "shadow-lg opacity-90" : "hover:border-[#b0b4b8]"
      } ${isSaving ? "opacity-50" : ""}`}
    >
      {/* Prioridad + saving */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-[#5a5f67] uppercase tracking-wider">
          {PRIORIDAD_LABELS[card.prioridad as keyof typeof PRIORIDAD_LABELS]}
          {card.prioridad === "CRITICA" && " ⚠"}
        </span>
        {isSaving && <span className="text-[10px] text-[#9ea3aa] animate-pulse">guardando...</span>}
      </div>

      <Link
        href={`/documentos/${card.docId}`}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
        className="text-sm font-medium text-[#1d2023] hover:text-[#1C6B30] leading-snug block mb-2"
      >
        {card.titulo}
      </Link>

      {card.descripcion && (
        <p className="text-xs text-[#9ea3aa] line-clamp-2 mb-2">{card.descripcion}</p>
      )}

      <div className="border-t border-[#e8e9eb] pt-2 space-y-1">
        {card.maquina && (
          <p className="text-[10px] text-[#9ea3aa] truncate">{card.sector && `${card.sector} › `}{card.maquina}</p>
        )}
        {card.tecnicos && (
          <p className="text-[10px] text-[#9ea3aa]">{card.tecnicos}</p>
        )}
        {card.fechaVencimiento && (
          <p className={`text-[10px] font-medium ${isOverdue ? "text-red-500" : "text-[#9ea3aa]"}`}>
            Vence: {format(new Date(card.fechaVencimiento), "dd/MM/yy", { locale: es })}
            {isOverdue && " · vencida"}
          </p>
        )}
      </div>
    </div>
  );
}
