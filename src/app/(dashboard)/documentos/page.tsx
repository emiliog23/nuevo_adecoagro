"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TIPO_DOC_LABELS, ESTADO_OT_LABELS, PRIORIDAD_LABELS } from "@/lib/utils";
import { UserDot } from "@/components/UserDot";
import { ContextMenu, type ContextMenuEntry } from "@/components/ui/ContextMenu";
import { useSession } from "next-auth/react";

const TIPO_LABELS_MAP: Record<string, string> = {
  REPORTE_INTERVENCION: "Reportes de Intervención",
  MEJORA_MODIFICACION:  "Mejoras y Modificaciones",
  ORDEN_TRABAJO: "Órdenes de Trabajo",
  CIERRE_TURNO: "Cierres de Turno",
  DESCARGA_REPUESTOS: "Descargas de Repuestos",
};

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function DocumentosPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [search, setSearch] = useState("");
  const [carpetaModal, setCarpetaModal] = useState<{ docId: string; carpetaId: string | null } | null>(null);

  const urlParams = useSearchParams();
  const carpetaIdFilter = urlParams.get("carpetaId") ?? "";
  const tipoFilter = urlParams.get("tipo") ?? "";
  const soloArchivados = urlParams.get("archivado") === "true";
  const sectorId = urlParams.get("sectorId") ?? "";
  const subsectorId = urlParams.get("subsectorId") ?? "";
  const lineaId = urlParams.get("lineaId") ?? "";
  const labelParam = urlParams.get("label") ?? "";

  const params = new URLSearchParams();
  if (tipoFilter) params.set("tipo", tipoFilter);
  if (search) params.set("search", search);
  if (carpetaIdFilter) params.set("carpetaId", carpetaIdFilter);
  if (soloArchivados) params.set("archivado", "true");
  if (lineaId) params.set("lineaId", lineaId);
  else if (subsectorId) params.set("subsectorId", subsectorId);
  else if (sectorId) params.set("sectorId", sectorId);

  const { data, mutate, isLoading } = useSWR(`/api/documentos?${params}`, fetcher, {
    refreshInterval: 15000,
    revalidateOnFocus: true,
  });

  useEffect(() => {
    const handler = () => mutate();
    window.addEventListener("docs-updated", handler);
    return () => window.removeEventListener("docs-updated", handler);
  }, [mutate]);

  const documentos: any[] = data?.docs ?? [];
  const totalUsuarios: number = data?.totalUsuariosActivos ?? 0;
  const canDelete = ["ADMIN", "SUPERVISOR"].includes(session?.user?.role as string);
  const docsFiltrados = documentos;

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; doc: any } | null>(null);
  const [moverModal, setMoverModal] = useState<{ docId: string; maquinaId: string | null } | null>(null);
  const { data: maquinasData } = useSWR("/api/maquinas", fetcher);
  const maquinas: any[] = maquinasData ?? [];
  const { data: carpetasData = [] } = useSWR("/api/carpetas", fetcher);

  async function patch(id: string, body: Record<string, unknown>) {
    await fetch(`/api/documentos/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    mutate();
  }
  async function deleteDoc(id: string) {
    if (!confirm("¿Eliminar este documento?")) return;
    await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    mutate();
  }

  function buildMenu(doc: any): ContextMenuEntry[] {
    const items: ContextMenuEntry[] = [
      { label: "Abrir", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>, onClick: () => router.push(`/documentos/${doc.id}`) },
      { separator: true },
      { label: doc.importante ? "Quitar importancia" : "Marcar como importante", active: doc.importante, icon: <svg className="w-4 h-4" fill={doc.importante ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>, onClick: () => patch(doc.id, { importante: !doc.importante }) },
      { label: doc.archivado ? "Desarchivar" : "Archivar", active: doc.archivado, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>, onClick: () => patch(doc.id, { archivado: !doc.archivado }) },
      { separator: true },
      { label: "Mover a otra máquina", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>, onClick: () => setMoverModal({ docId: doc.id, maquinaId: doc.maquinaId }) },
      ...( ["ADMIN","SUPERVISOR"].includes(session?.user?.role ?? "") ? [{ label: "Nueva OT relacionada", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>, onClick: () => router.push(`/documentos/nuevo?tipo=ORDEN_TRABAJO&maquinaId=${doc.maquinaId ?? ""}`) } as ContextMenuEntry] : []),
      { label: "Mover a carpeta", icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>, onClick: () => setCarpetaModal({ docId: doc.id, carpetaId: doc.carpeta?.id ?? null }) },
    ];
    if (canDelete) {
      items.push({ separator: true });
      items.push({ label: "Eliminar", danger: true, icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>, onClick: () => deleteDoc(doc.id) });
    }
    return items;
  }

  return (
    <div className="h-full flex flex-col" onContextMenu={(e) => e.preventDefault()}>
      {/* Toolbar */}
      <div className="bg-white border-b border-[#d4d6d8] px-6 py-3 flex items-center gap-4">
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <h1 className="text-sm font-semibold text-[#1d2023] shrink-0">
            {soloArchivados ? "Archivados"
              : labelParam ? labelParam
              : tipoFilter ? TIPO_LABELS_MAP[tipoFilter]
              : "Documentos"}
          </h1>
          {carpetaIdFilter && carpetasData.length > 0 && (() => {
            const find = (list: any[]): any => { for (const c of list) { if (c.id === carpetaIdFilter) return c; const f = find(c.children ?? []); if (f) return f; } return null; };
            const c = find(carpetasData);
            return c ? <span className="text-xs text-[#5a5f67]">· {c.nombre}</span> : null;
          })()}
        </div>
        <input
          type="text"
          placeholder="Buscar..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] w-56 bg-white"
        />
        <NuevoDocumentoDropdown />
      </div>

      {/* Count bar */}
      <div className="bg-[#f7f8f9] border-b border-[#d4d6d8] px-6 py-1.5">
        <span className="text-xs text-[#5a5f67]">{docsFiltrados.length} registro{docsFiltrados.length !== 1 ? "s" : ""}</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto bg-white">
        {isLoading ? (
          <div className="p-8 text-center text-sm text-[#5a5f67]">Cargando...</div>
        ) : docsFiltrados.length === 0 ? (
          <div className="p-12 text-center text-sm text-[#5a5f67]">
            Sin documentos.{" "}
            <NuevoDocumentoDropdown />
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#d4d6d8] bg-[#f7f8f9]">
                <th className="w-5 px-3 py-2"></th>
                <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2">Título</th>
                <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2">Tipo</th>
                <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2 hidden md:table-cell">Máquina / Ruta</th>
                <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2 hidden lg:table-cell">Creado por</th>
                <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2">Estado / Prioridad</th>
                <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2">Leído</th>
                <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2">Fecha</th>
              </tr>
            </thead>
            <tbody>
              {docsFiltrados.map((doc, i) => (
                <tr
                  key={doc.id}
                  onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, doc }); }}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/doc-id", doc.id);
                    e.dataTransfer.effectAllowed = "move";
                    (e.currentTarget as HTMLElement).style.opacity = "0.5";
                  }}
                  onDragEnd={(e) => { (e.currentTarget as HTMLElement).style.opacity = ""; }}
                  className={`border-b border-[#e8e9eb] hover:bg-[#f7f8f9] transition-colors cursor-context-menu ${doc.archivado && !soloArchivados ? "opacity-50" : ""} ${doc.importante ? "border-l-2 border-l-amber-500" : ""}`}
                >
                  <td className="px-3 py-2 text-center">
                    {doc.importante && <span className="text-amber-500 text-xs">★</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Link href={`/documentos/${doc.id}`} className="text-[#1C6B30] hover:underline font-medium">
                      {doc.titulo}
                    </Link>
                    {doc.archivado && <span className="ml-2 text-[10px] text-[#9ea3aa] border border-[#d4d6d8] px-1">arch.</span>}
                    {doc.carpeta && !carpetaIdFilter && (
                      <span className="ml-2 text-[10px] text-[#5a5f67] border border-[#d4d6d8] px-1">📁 {doc.carpeta.nombre}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="text-xs text-[#5a5f67] border border-[#d4d6d8] px-1.5 py-0.5">
                      {TIPO_DOC_LABELS[doc.tipo as keyof typeof TIPO_DOC_LABELS] ?? doc.tipo}
                    </span>
                  </td>
                  <td className="px-3 py-2 hidden md:table-cell">
                    {doc.maquina ? (
                      <div>
                        <p className="text-xs font-medium text-[#1d2023]">{doc.maquina.nombre}</p>
                        <p className="text-[10px] text-[#9ea3aa]">{doc.maquina.linea?.subsector?.sector?.nombre} › {doc.maquina.linea?.subsector?.nombre} › {doc.maquina.linea?.nombre}</p>
                      </div>
                    ) : <span className="text-[#9ea3aa]">—</span>}
                  </td>
                  <td className="px-3 py-2 hidden lg:table-cell">
                    <span className="flex items-center gap-1.5 text-xs text-[#5a5f67]">
                      <UserDot color={doc.creadoPor?.color} />
                      {doc.creadoPor?.name}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    {doc.ordenTrabajo ? (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-medium text-[#1d2023]">{ESTADO_OT_LABELS[doc.ordenTrabajo.estado as keyof typeof ESTADO_OT_LABELS]}</p>
                        <p className="text-[10px] text-[#5a5f67]">{PRIORIDAD_LABELS[doc.ordenTrabajo.prioridad as keyof typeof PRIORIDAD_LABELS]}</p>
                      </div>
                    ) : <span className="text-[#9ea3aa]">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <LecturaCell lecturas={doc.lecturas ?? []} totalUsuarios={totalUsuarios} />
                  </td>
                  <td className="px-3 py-2 text-xs text-[#5a5f67] whitespace-nowrap">
                    {format(new Date(doc.createdAt), "dd/MM/yy")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {ctxMenu && <ContextMenu x={ctxMenu.x} y={ctxMenu.y} items={buildMenu(ctxMenu.doc)} onClose={() => setCtxMenu(null)} />}

      {moverModal && (
        <MoverModal
          docId={moverModal.docId}
          currentMaquinaId={moverModal.maquinaId}
          maquinas={maquinas}
          onSave={async (maquinaId) => { await patch(moverModal.docId, { maquinaId }); setMoverModal(null); }}
          onClose={() => setMoverModal(null)}
        />
      )}

      {carpetaModal && (
        <CarpetaModal
          carpetas={carpetasData}
          currentCarpetaId={carpetaModal.carpetaId}
          onSave={async (carpetaId) => { await patch(carpetaModal.docId, { carpetaId }); mutate(); setCarpetaModal(null); }}
          onClose={() => setCarpetaModal(null)}
        />
      )}
    </div>
  );
}

function LecturaCell({ lecturas, totalUsuarios }: { lecturas: { userId: string; user: { name: string } }[]; totalUsuarios: number }) {
  if (lecturas.length === 0) return <span className="text-[10px] text-[#9ea3aa]">—</span>;
  if (lecturas.length >= totalUsuarios) return <span className="text-[10px] text-[#1C6B30] font-medium">Todos</span>;
  return (
    <div className="flex items-center gap-1">
      {lecturas.slice(0, 3).map((l) => (
        <span key={l.userId} title={l.user.name} className="w-5 h-5 bg-[#e8e9eb] text-[#5a5f67] text-[9px] font-bold flex items-center justify-center">
          {l.user.name.charAt(0).toUpperCase()}
        </span>
      ))}
      {lecturas.length > 3 && <span className="text-[10px] text-[#9ea3aa]">+{lecturas.length - 3}</span>}
    </div>
  );
}

const NUEVO_TIPOS = [
  {
    value: "REPORTE_INTERVENCION", label: "Reporte de Intervención", desc: "Falla, corrección y diagnóstico",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>,
  },
  {
    value: "MEJORA_MODIFICACION", label: "Mejora/Modificación", desc: "Modificación o mejora de equipo",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  },
  {
    value: "ORDEN_TRABAJO", label: "Orden de Trabajo", desc: "Tarea planificada o correctiva",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
  },
  {
    value: "CIERRE_TURNO", label: "Cierre de Turno", desc: "Novedades y pendientes del turno",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  },
  {
    value: "DESCARGA_REPUESTOS", label: "Descarga de Repuestos", desc: "Materiales y repuestos utilizados",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>,
  },
  {
    value: "GENERICO", label: "Documento", desc: "Documento de contenido libre",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  },
];

function NuevoDocumentoDropdown() {
  const router = useRouter();
  const { data: session } = useSession();
  const canCreateOT = ["ADMIN", "SUPERVISOR"].includes(session?.user?.role ?? "");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const tipos = NUEVO_TIPOS.filter((t) => t.value !== "ORDEN_TRABAJO" || canCreateOT);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-2 text-sm font-semibold text-white px-3 py-1.5 transition-colors"
        style={{ backgroundColor: "#1C6B30" }}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Nuevo
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#d4d6d8] z-50 w-60 shadow-md">
          {tipos.map((t) => (
            <button key={t.value} onClick={() => { setOpen(false); router.push(`/documentos/nuevo?tipo=${t.value}`); }}
              className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#f7f8f9] text-left border-b border-[#e8e9eb] last:border-0 transition-colors">
              <span className="text-[#9ea3aa] shrink-0">{t.icon}</span>
              <div>
                <p className="text-sm font-medium text-[#1d2023]">{t.label}</p>
                <p className="text-[10px] text-[#9ea3aa]">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MoverModal({ docId, currentMaquinaId, maquinas, onSave, onClose }: {
  docId: string; currentMaquinaId: string | null; maquinas: any[]; onSave: (id: string | null) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState(currentMaquinaId ?? "");
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#d4d6d8] w-full max-w-md shadow-lg">
        <div className="px-5 py-3 border-b border-[#d4d6d8] bg-[#f7f8f9]">
          <h2 className="text-sm font-semibold text-[#1d2023]">Mover a otra máquina</h2>
        </div>
        <div className="p-5">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white" size={8}>
            <option value="">— Sin máquina —</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>
                {m.linea?.subsector?.sector?.nombre} › {m.linea?.subsector?.nombre} › {m.linea?.nombre} › {m.nombre}
              </option>
            ))}
          </select>
          <div className="flex gap-2 mt-4">
            <button onClick={() => onSave(selected || null)} className="flex-1 text-sm font-semibold text-white py-2 transition-colors" style={{ backgroundColor: "#1C6B30" }}>Confirmar</button>
            <button onClick={onClose} className="flex-1 text-sm text-[#5a5f67] py-2 border border-[#d4d6d8] hover:bg-[#f7f8f9]">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CarpetaModal({ carpetas, currentCarpetaId, onSave, onClose }: {
  carpetas: any[]; currentCarpetaId: string | null; onSave: (id: string | null) => void; onClose: () => void;
}) {
  const [selected, setSelected] = useState(currentCarpetaId ?? "");

  function renderOptions(list: any[], depth = 0): React.ReactNode {
    return list.map((c: any) => (
      <>
        <option key={c.id} value={c.id}>{" ".repeat(depth * 3)}{depth > 0 ? "↳ " : ""}{c.nombre}</option>
        {c.children?.length > 0 && renderOptions(c.children, depth + 1)}
      </>
    ));
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white border border-[#d4d6d8] w-full max-w-sm shadow-lg">
        <div className="px-5 py-3 border-b border-[#d4d6d8] bg-[#f7f8f9]">
          <h2 className="text-sm font-semibold text-[#1d2023]">Mover a carpeta</h2>
        </div>
        <div className="p-5">
          <select value={selected} onChange={(e) => setSelected(e.target.value)}
            className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white" size={7}>
            <option value="">— Sin carpeta —</option>
            {renderOptions(carpetas)}
          </select>
          <div className="flex gap-2 mt-4">
            <button onClick={() => onSave(selected || null)} className="flex-1 text-sm font-semibold text-white py-2" style={{ backgroundColor: "#1C6B30" }}>Confirmar</button>
            <button onClick={onClose} className="flex-1 text-sm text-[#5a5f67] py-2 border border-[#d4d6d8]">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
