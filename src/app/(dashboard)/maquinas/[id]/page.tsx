"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TIPO_DOC_LABELS, ESTADO_OT_COLORS, ESTADO_OT_LABELS } from "@/lib/utils";
import { useSession } from "next-auth/react";

export default function MaquinaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [maquina, setMaquina] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const canEdit = ["ADMIN", "SUPERVISOR"].includes(session?.user?.role as string);

  useEffect(() => {
    fetch(`/api/maquinas/${id}`)
      .then((r) => r.json())
      .then(setMaquina)
      .finally(() => setLoading(false));
  }, [id]);

if (loading) return <div className="p-8 text-center text-slate-400">Cargando...</div>;
  if (!maquina || maquina.error) return <div className="p-8 text-center text-red-500">Máquina no encontrada</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-3 mb-6">
        <button onClick={() => router.back()} className="text-slate-400 hover:text-slate-700 mt-1">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <p className="text-xs text-slate-400 mb-1">
            {maquina.linea?.subsector?.sector?.nombre} › {maquina.linea?.subsector?.nombre} › {maquina.linea?.nombre}
          </p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{maquina.nombre}</h1>
            {maquina.codigo && <span className="text-sm text-slate-400 font-mono">{maquina.codigo}</span>}
          </div>
        </div>
        <NuevoDocDropdown maquinaId={id} />
      </div>

      {maquina.descripcion && (
        <p className="text-slate-600 text-sm mb-6 bg-white rounded-xl border border-slate-200 px-5 py-4">{maquina.descripcion}</p>
      )}

      {/* Documentos */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="flex-1">
            <h2 className="font-semibold text-slate-800">Historial de Documentos</h2>
            <p className="text-xs text-slate-400 mt-0.5">{maquina.documentos?.length ?? 0} documentos</p>
          </div>
          <input
            type="text" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] w-44 bg-white"
          />
        </div>
        {maquina.documentos?.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-400 text-sm">Sin documentos para esta máquina</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {maquina.documentos?.filter((doc: any) => !search || doc.titulo.toLowerCase().includes(search.toLowerCase())).map((doc: any) => (
              <Link
                key={doc.id}
                href={`/documentos/${doc.id}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
              >
                <TipoIcon tipo={doc.tipo} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{doc.titulo}</p>
                  <p className="text-xs text-slate-400">
                    {TIPO_DOC_LABELS[doc.tipo as keyof typeof TIPO_DOC_LABELS]}
                    {doc.reporteIntervencion && ` · ${doc.reporteIntervencion.tipoFalla}`}
                    {` · ${doc.creadoPor?.name}`}
                  </p>
                </div>
                {doc.ordenTrabajo && (
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${ESTADO_OT_COLORS[doc.ordenTrabajo.estado as keyof typeof ESTADO_OT_COLORS]}`}>
                    {ESTADO_OT_LABELS[doc.ordenTrabajo.estado as keyof typeof ESTADO_OT_LABELS]}
                  </span>
                )}
                <span className="text-xs text-slate-400 shrink-0">
                  {format(new Date(doc.createdAt), "dd/MM/yy", { locale: es })}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const TIPOS_NUEVO = [
  { value: "REPORTE_INTERVENCION", label: "Reporte de Intervención", desc: "Falla, corrección y diagnóstico" },
  { value: "ORDEN_TRABAJO",        label: "Orden de Trabajo",        desc: "Tarea planificada o correctiva", supervisorOnly: true },
  { value: "CIERRE_TURNO",         label: "Cierre de Turno",         desc: "Novedades y pendientes del turno" },
  { value: "DESCARGA_REPUESTOS",   label: "Descarga de Repuestos",   desc: "Materiales y repuestos utilizados" },
];

function NuevoDocDropdown({ maquinaId }: { maquinaId: string }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const canOT = ["ADMIN", "SUPERVISOR"].includes(session?.user?.role ?? "");

  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const tipos = TIPOS_NUEVO.filter(t => !t.supervisorOnly || canOT);

  return (
    <div ref={ref} className="relative shrink-0">
      <button onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2 text-sm font-semibold text-white px-3 py-1.5 transition-colors"
        style={{ backgroundColor: "#1C6B30" }}>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
        Nuevo Documento
        <svg className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#d4d6d8] z-50 w-60 shadow-md">
          {tipos.map(t => (
            <button key={t.value} onClick={() => { setOpen(false); router.push(`/documentos/nuevo?tipo=${t.value}&maquinaId=${maquinaId}`); }}
              className="w-full flex flex-col px-4 py-2.5 hover:bg-[#f7f8f9] text-left border-b border-[#e8e9eb] last:border-0 transition-colors">
              <span className="text-sm font-medium text-[#1d2023]">{t.label}</span>
              <span className="text-[10px] text-[#9ea3aa]">{t.desc}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TipoIcon({ tipo }: { tipo: string }) {
  if (tipo === "REPORTE_INTERVENCION")
    return <div className="w-8 h-8 bg-[#e8f2eb] rounded-lg flex items-center justify-center shrink-0"><svg className="w-4 h-4 text-[#1C6B30]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg></div>;
  if (tipo === "ORDEN_TRABAJO")
    return <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center shrink-0"><svg className="w-4 h-4 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg></div>;
  return <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0"><svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div>;
}
