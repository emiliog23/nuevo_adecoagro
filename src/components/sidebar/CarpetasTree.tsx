"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Carpeta {
  id: string;
  nombre: string;
  children: Carpeta[];
  _count: { documentoUsuarios: number };
}

export function CarpetasTree() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const carpetaActiva = searchParams.get("carpetaId");

  const { data: carpetas = [], mutate } = useSWR<Carpeta[]>("/api/carpetas", fetcher);

  // Which folders are open (show children)
  const [open, setOpen] = useState<Record<string, boolean>>({});
  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");
  // New folder input
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [parentForNew, setParentForNew] = useState<string | null>(null);
  // Drag-over highlight
  const [dragOver, setDragOver] = useState<string | null>(null);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (showNew) newInputRef.current?.focus(); }, [showNew]);

  // Auto-open the active folder
  useEffect(() => {
    if (!carpetaActiva) return;
    setOpen((p) => ({ ...p, [carpetaActiva]: true }));
  }, [carpetaActiva]);

  function toggleOpen(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setOpen((p) => ({ ...p, [id]: !p[id] }));
  }

  async function createCarpeta() {
    if (!newName.trim()) { setShowNew(false); return; }
    await fetch("/api/carpetas", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: newName.trim(), parentId: parentForNew }),
    });
    setNewName(""); setShowNew(false); setParentForNew(null);
    mutate();
  }

  async function renameCarpeta(id: string) {
    if (!editNombre.trim()) { setEditingId(null); return; }
    await fetch(`/api/carpetas/${id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre: editNombre.trim() }),
    });
    setEditingId(null);
    mutate();
  }

  async function deleteCarpeta(id: string) {
    if (!confirm("¿Eliminar carpeta? Los documentos quedarán sin carpeta.")) return;
    await fetch(`/api/carpetas/${id}`, { method: "DELETE" });
    if (carpetaActiva === id) router.push("/documentos");
    mutate();
  }

  function navigate(id: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("carpetaId", id);
    router.push(`/documentos?${params}`);
  }

  // ── Drag & Drop handlers ──────────────────────────────────────────────────
  function onDragOver(e: React.DragEvent, carpetaId: string) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(carpetaId);
  }

  function onDragLeave(e: React.DragEvent) {
    // Only clear if leaving the element itself (not a child)
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
      setDragOver(null);
    }
  }

  async function onDrop(e: React.DragEvent, carpetaId: string) {
    e.preventDefault();
    setDragOver(null);
    const docId = e.dataTransfer.getData("application/doc-id");
    if (!docId) return;

    await fetch(`/api/documentos/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carpetaId }),
    });
    mutate();
    // Trigger a refresh of the document list via a custom event
    window.dispatchEvent(new CustomEvent("docs-updated"));
  }
  // ─────────────────────────────────────────────────────────────────────────

  function renderCarpeta(c: Carpeta, depth = 0) {
    const isActive = carpetaActiva === c.id;
    const isEditing = editingId === c.id;
    const isOpen = open[c.id];
    const isDragTarget = dragOver === c.id;
    const hasChildren = c.children?.length > 0;

    return (
      <div key={c.id}>
        <div
          className={`group flex items-center gap-1 py-1.5 cursor-pointer transition-colors select-none ${
            isActive ? "text-white" : isDragTarget ? "text-white" : "text-[#9ea8b4] hover:text-white hover:bg-[#2e3540]"
          }`}
          style={{
            paddingLeft: `${12 + depth * 12}px`,
            paddingRight: "8px",
            ...(isActive ? { backgroundColor: "#1C6B30" } : isDragTarget ? { backgroundColor: "#2e5c3a" } : {}),
          }}
          onClick={() => !isEditing && navigate(c.id)}
          onDragOver={(e) => onDragOver(e, c.id)}
          onDragLeave={onDragLeave}
          onDrop={(e) => onDrop(e, c.id)}
        >
          {/* Chevron for folders with children */}
          {hasChildren ? (
            <button
              onClick={(e) => toggleOpen(c.id, e)}
              className="w-3.5 h-3.5 flex items-center justify-center shrink-0 opacity-60 hover:opacity-100"
            >
              <svg
                className={`w-2.5 h-2.5 transition-transform duration-150 ${isOpen ? "rotate-90" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ) : (
            <span className="w-3.5 shrink-0" />
          )}

          {/* Folder icon */}
          <svg className="w-3.5 h-3.5 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d={isOpen
                ? "M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                : "M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
              }
            />
          </svg>

          {/* Name or input */}
          {isEditing ? (
            <input
              autoFocus
              value={editNombre}
              onChange={(e) => setEditNombre(e.target.value)}
              onBlur={() => renameCarpeta(c.id)}
              onKeyDown={(e) => { if (e.key === "Enter") renameCarpeta(c.id); if (e.key === "Escape") setEditingId(null); }}
              className="flex-1 bg-transparent border-b border-white/40 text-xs text-white outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 text-xs truncate">{c.nombre}</span>
          )}

          {/* Doc count */}

          {/* Action buttons (visible on hover) */}
          {!isEditing && (
            <div className="hidden group-hover:flex items-center gap-1 shrink-0 ml-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setParentForNew(c.id); setOpen((p) => ({ ...p, [c.id]: true })); setShowNew(true); }}
                className="text-[#4a5260] hover:text-white text-[10px] leading-none px-0.5"
                title="Nueva subcarpeta"
              >+</button>
              <button
                onClick={() => { setEditNombre(c.nombre); setEditingId(c.id); }}
                className="text-[#4a5260] hover:text-white"
                title="Renombrar"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
              <button
                onClick={() => deleteCarpeta(c.id)}
                className="text-[#4a5260] hover:text-red-400"
                title="Eliminar"
              >
                <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Children — only when open */}
        {isOpen && hasChildren && (
          <div>
            {c.children.map((child) => renderCarpeta(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-2">
      <div className="flex items-center justify-between px-3 py-1 mb-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5260]">Carpetas</p>
        <button
          onClick={() => { setParentForNew(null); setShowNew(true); }}
          className="text-[#4a5260] hover:text-white transition-colors text-xs leading-none"
          title="Nueva carpeta"
        >+</button>
      </div>

      {/* Todos los documentos */}
      <button
        onClick={() => { const p = new URLSearchParams(searchParams.toString()); p.delete("carpetaId"); router.push(`/documentos?${p}`); }}
        className={`w-full flex items-center gap-1.5 px-3 py-1.5 text-xs transition-colors mb-px ${
          !carpetaActiva ? "text-white bg-[#1C6B30]" : "text-[#9ea8b4] hover:text-white hover:bg-[#2e3540]"
        }`}
      >
        <svg className="w-3.5 h-3.5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
        Todos
      </button>

      {carpetas.map((c) => renderCarpeta(c))}

      {/* New folder input */}
      {showNew && (
        <div
          className="flex items-center gap-1 py-1.5"
          style={{ paddingLeft: parentForNew ? "36px" : "12px", paddingRight: "8px" }}
        >
          <svg className="w-3.5 h-3.5 opacity-40 shrink-0 text-[#9ea8b4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
          </svg>
          <input
            ref={newInputRef}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={createCarpeta}
            onKeyDown={(e) => {
              if (e.key === "Enter") createCarpeta();
              if (e.key === "Escape") { setShowNew(false); setNewName(""); }
            }}
            className="flex-1 bg-transparent border-b border-[#4a5260] text-xs text-white outline-none placeholder-[#4a5260]"
            placeholder="Nombre de carpeta"
          />
        </div>
      )}
    </div>
  );
}
