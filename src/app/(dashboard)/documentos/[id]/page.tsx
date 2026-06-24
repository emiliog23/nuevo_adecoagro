"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { TIPO_DOC_LABELS, ESTADO_OT_LABELS, PRIORIDAD_LABELS, TURNO_LABELS } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { ComentariosSection } from "@/components/ComentariosSection";
import { ImagenesSection } from "@/components/ImagenesSection";
import Link from "next/link";
import { UserDot } from "@/components/UserDot";

interface LecturaInfo { lecturas: { userId: string; name: string; createdAt: string }[]; totalUsuarios: number; todos: boolean; }

export default function DocumentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [lecturas, setLecturas] = useState<LecturaInfo | null>(null);

  useEffect(() => {
    fetch(`/api/documentos/${id}`).then((r) => r.json()).then(setDoc).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!session?.user?.id) return;
    fetch(`/api/documentos/${id}/leer`, { method: "POST" })
      .then(() => fetch(`/api/documentos/${id}/leer`)).then((r) => r.json()).then(setLecturas);
  }, [id, session?.user?.id]);

  async function handleDelete() {
    if (!confirm("¿Eliminar este documento?")) return;
    setDeleting(true);
    await fetch(`/api/documentos/${id}`, { method: "DELETE" });
    router.push("/documentos");
  }

  if (loading) return <div className="p-8 text-sm text-[#5a5f67]">Cargando...</div>;
  if (!doc) return <div className="p-8 text-sm text-red-600">Documento no encontrado</div>;

  const canDelete = ["ADMIN", "SUPERVISOR"].includes(session?.user?.role as string);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="bg-white border-b border-[#d4d6d8] px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#5a5f67] hover:text-[#1d2023]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <div className="flex items-center gap-2 flex-1">
          <span className="text-xs font-semibold text-[#5a5f67] border border-[#d4d6d8] px-1.5 py-0.5">
            {TIPO_DOC_LABELS[doc.tipo as keyof typeof TIPO_DOC_LABELS] ?? doc.tipo}
          </span>
          <h1 className="text-sm font-semibold text-[#1d2023]">{doc.titulo}</h1>
        </div>
        {canDelete && (
          <button onClick={handleDelete} disabled={deleting} className="text-[#9ea3aa] hover:text-red-500 transition-colors" title="Eliminar">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        )}
      </div>

      {/* Meta bar */}
      <div className="bg-[#f7f8f9] border-b border-[#d4d6d8] px-6 py-1.5 flex items-center gap-6 text-xs text-[#5a5f67]">
        <span className="flex items-center gap-1.5">Por <UserDot color={doc.creadoPor?.color} /> <strong className="text-[#1d2023] font-medium">{doc.creadoPor?.name}</strong></span>
        <span>{format(new Date(doc.createdAt), "d MMM yyyy, HH:mm", { locale: es })}</span>
        {doc.maquina && (
          <span>{doc.maquina.linea?.subsector?.sector?.nombre} › {doc.maquina.linea?.subsector?.nombre} › {doc.maquina.linea?.nombre} › <strong className="text-[#1d2023] font-medium">{doc.maquina.nombre}</strong></span>
        )}
        {doc.carpeta && (
          <span className="flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
            {doc.carpeta.nombre}
          </span>
        )}
        {lecturas && <LecturaTag info={lecturas} />}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-3xl">
          {doc.tipo === "REPORTE_INTERVENCION" && doc.reporteIntervencion && <ReporteView r={doc.reporteIntervencion} />}
          {doc.tipo === "ORDEN_TRABAJO" && doc.ordenTrabajo && <OrdenView ot={doc.ordenTrabajo} docId={id} />}
          {doc.tipo === "CIERRE_TURNO" && doc.cierreTurno && <CierreView c={doc.cierreTurno} />}
          {doc.tipo === "DESCARGA_REPUESTOS" && doc.descargaRepuestos && <DescargaView d={doc.descargaRepuestos} />}
          {doc.tipo === "MEJORA_MODIFICACION" && doc.mejoraModificacion && <MejoraView m={doc.mejoraModificacion} />}
          {/* Descargas de repuestos generadas desde este documento */}
          {doc.descargasOriginadas?.length > 0 && (
            <div className="bg-white border border-[#d4d6d8] mt-4">
              <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8]">
                <h3 className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">Descargas de Repuestos Asociadas</h3>
              </div>
              <div className="divide-y divide-[#e8e9eb]">
                {doc.descargasOriginadas.map((d: any) => (
                  <Link key={d.id} href={`/documentos/${d.documento.id}`}
                    className="flex items-center gap-2 px-4 py-2.5 hover:bg-[#f7f8f9] transition-colors">
                    <svg className="w-3.5 h-3.5 text-[#9ea3aa] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <span className="text-sm text-[#1C6B30] hover:underline">{d.documento.titulo}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
          {/* Si esta ES una descarga, mostrar el doc origen */}
          {doc.descargaRepuestos?.documentoOrigen && (
            <div className="bg-white border border-[#d4d6d8] mt-1 px-4 py-2.5 flex items-center gap-2">
              <span className="text-xs text-[#5a5f67]">Generado desde:</span>
              <Link href={`/documentos/${doc.descargaRepuestos.documentoOrigen.id}`} className="text-sm text-[#1C6B30] hover:underline">
                {doc.descargaRepuestos.documentoOrigen.titulo}
              </Link>
            </div>
          )}
          <ImagenesSection documentoId={id} />
          <ComentariosSection documentoId={id} />
        </div>
      </div>
    </div>
  );
}

function LecturaTag({ info }: { info: LecturaInfo }) {
  const { lecturas, todos } = info;
  const [open, setOpen] = useState(false);
  if (lecturas.length === 0) return null;
  return (
    <div className="relative">
      <button onClick={() => setOpen((p) => !p)} className="flex items-center gap-1 text-[#1C6B30] hover:underline">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
        {todos ? "Leído por todos" : `Leído por ${lecturas.slice(0,2).map(l => l.name).join(", ")}${lecturas.length > 2 ? ` +${lecturas.length - 2}` : ""}`}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-5 left-0 z-20 bg-white border border-[#d4d6d8] shadow-md p-3 min-w-[180px]">
            <p className="text-[10px] font-semibold text-[#9ea3aa] uppercase mb-2">{lecturas.length} lectura{lecturas.length !== 1 ? "s" : ""}</p>
            {lecturas.map((l) => (
              <div key={l.userId} className="flex items-center gap-2 mb-1.5">
                <div className="w-5 h-5 bg-[#e8e9eb] text-[#5a5f67] text-[9px] font-bold flex items-center justify-center shrink-0">{l.name.charAt(0)}</div>
                <div>
                  <p className="text-xs font-medium text-[#1d2023]">{l.name}</p>
                  <p className="text-[10px] text-[#9ea3aa]">{format(new Date(l.createdAt), "d MMM HH:mm", { locale: es })}</p>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <tr className="border-b border-[#e8e9eb]">
      <td className="py-2 pr-6 text-xs font-semibold text-[#5a5f67] uppercase tracking-wider whitespace-nowrap w-44 align-top">{label}</td>
      <td className="py-2 text-sm text-[#1d2023]">{value}</td>
    </tr>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#d4d6d8] mb-4">
      <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8]">
        <h3 className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-4 py-1">
        <table className="w-full">{children}</table>
      </div>
    </div>
  );
}

function duracion(inicio: string, fin: string): string {
  const diff = new Date(fin).getTime() - new Date(inicio).getTime();
  if (diff <= 0) return "—";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function ReporteView({ r }: { r: any }) {
  const adicionales: string[] = (() => { try { return JSON.parse(r.tecnicosIds || "[]"); } catch { return []; } })();

  // Build technician display
  const tecnicosList = [r.tecnico?.name].filter(Boolean);
  // Additional technician names come via the doc creadoPor — we just show IDs here
  // They'll be resolved client-side if needed; for now show count

  return (
    <Section title="Reporte de Intervención">
      <Field label="Técnicos" value={
        adicionales.length > 0
          ? <>{r.tecnico?.name} + <TecnicosAdicionales ids={adicionales} /></>
          : r.tecnico?.name
      } />
      <Field label="Inicio" value={format(new Date(r.fechaInicio), "d MMM yyyy HH:mm", { locale: es })} />
      {r.fechaFin && (
        <>
          <Field label="Fin" value={format(new Date(r.fechaFin), "d MMM yyyy HH:mm", { locale: es })} />
          <Field label="Duración total" value={<strong>{duracion(r.fechaInicio, r.fechaFin)}</strong>} />
        </>
      )}
      <Field label="Tipo de Falla" value={<strong>{r.tipoFalla}</strong>} />
      <Field label="Descripción" value={<pre className="whitespace-pre-wrap font-sans text-sm">{r.descripcionFalla}</pre>} />
      <Field label="Trabajo Realizado" value={<pre className="whitespace-pre-wrap font-sans text-sm">{r.trabajoRealizado}</pre>} />
      {r.observaciones && <Field label="Observaciones" value={<pre className="whitespace-pre-wrap font-sans text-sm">{r.observaciones}</pre>} />}
    </Section>
  );
}

function TecnicosAdicionales({ ids }: { ids: string[] }) {
  const [nombres, setNombres] = useState<string[]>([]);
  useEffect(() => {
    if (!ids.length) return;
    fetch("/api/usuarios")
      .then(r => r.json())
      .then((users: any[]) => {
        setNombres(users.filter(u => ids.includes(u.id)).map(u => u.name));
      })
      .catch(() => {});
  }, [ids]);
  if (!nombres.length) return <span className="text-[#9ea3aa]">Cargando...</span>;
  return <span>{nombres.join(", ")}</span>;
}

function OrdenView({ ot, docId }: { ot: any; docId: string }) {
  const { data: session } = useSession();
  const [estado, setEstado] = useState(ot.estado);
  const [saving, setSaving] = useState(false);
  const canEdit = ["ADMIN", "SUPERVISOR", "TECNICO"].includes(session?.user?.role as string);

  async function updateEstado(s: string) {
    setSaving(true);
    await fetch(`/api/documentos/${docId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tipo: "ORDEN_TRABAJO", datos: { ...ot, estado: s } }) });
    setEstado(s);
    setSaving(false);
  }

  return (
    <>
      <Section title="Orden de Trabajo">
        <Field label="Prioridad" value={PRIORIDAD_LABELS[ot.prioridad as keyof typeof PRIORIDAD_LABELS]} />
        <Field label="Estado" value={<span className="font-medium">{ESTADO_OT_LABELS[estado as keyof typeof ESTADO_OT_LABELS]}</span>} />
        {ot.tecnico && <Field label="Técnico" value={ot.tecnico.name} />}
        {ot.fechaVencimiento && <Field label="Vencimiento" value={format(new Date(ot.fechaVencimiento), "d MMM yyyy", { locale: es })} />}
        <Field label="Descripción" value={<pre className="whitespace-pre-wrap font-sans text-sm">{ot.descripcion}</pre>} />
        {ot.observaciones && <Field label="Observaciones" value={<pre className="whitespace-pre-wrap font-sans text-sm">{ot.observaciones}</pre>} />}
      </Section>
      {canEdit && (
        <div className="bg-white border border-[#d4d6d8] p-4 flex items-center gap-2">
          <span className="text-xs text-[#5a5f67] font-semibold mr-2">Cambiar estado:</span>
          {["PENDIENTE","EN_CURSO","COMPLETADA","COMPLETADA_CON_PROBLEMAS","IMPOSIBLE_TERMINAR","CANCELADA"].map((s) => (
            <button key={s} onClick={() => updateEstado(s)} disabled={saving || estado === s}
              className={`text-xs px-3 py-1 border transition-colors ${estado === s ? "border-[#1C6B30] bg-[#f0f7f2] text-[#1C6B30] font-semibold" : "border-[#d4d6d8] text-[#5a5f67] hover:border-[#b0b4b8]"}`}>
              {ESTADO_OT_LABELS[s as keyof typeof ESTADO_OT_LABELS]}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function CierreView({ c }: { c: any }) {
  return (
    <Section title="Cierre de Turno">
      <Field label="Fecha" value={format(new Date(c.fecha), "d MMM yyyy HH:mm", { locale: es })} />
      <Field label="Turno" value={TURNO_LABELS[c.turno as keyof typeof TURNO_LABELS] ?? c.turno} />
      <Field label="Novedades" value={<pre className="whitespace-pre-wrap font-sans text-sm">{c.novedades}</pre>} />
      {c.trabajosRealizados && <Field label="Trabajos" value={<pre className="whitespace-pre-wrap font-sans text-sm">{c.trabajosRealizados}</pre>} />}
      {c.pendientes && <Field label="Pendientes" value={<pre className="whitespace-pre-wrap font-sans text-sm">{c.pendientes}</pre>} />}
    </Section>
  );
}

function DescargaView({ d }: { d: any }) {
  const items: any[] = (() => { try { return JSON.parse(d.items); } catch { return []; } })();
  return (
    <div className="bg-white border border-[#d4d6d8] mb-4">
      <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">Descarga de Repuestos</h3>
        <span className="text-xs text-[#9ea3aa]">{format(new Date(d.fecha), "d MMM yyyy HH:mm", { locale: es })}</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e8e9eb] bg-[#f7f8f9]">
            <th className="text-left text-xs font-semibold text-[#5a5f67] px-4 py-2">Nombre</th>
            <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2 hidden sm:table-cell">Código</th>
            <th className="text-right text-xs font-semibold text-[#5a5f67] px-4 py-2">Cantidad</th>
            <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2 hidden sm:table-cell">Estantería</th>
            <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2 hidden sm:table-cell">Estante</th>
            <th className="text-left text-xs font-semibold text-[#5a5f67] px-3 py-2 hidden sm:table-cell">Cajón</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item: any, idx: number) => (
            <tr key={idx} className="border-b border-[#e8e9eb]">
              <td className="px-4 py-2 text-[#1d2023]">{item.nombre || item.descripcion || "—"}</td>
              <td className="px-3 py-2 text-[#5a5f67] font-mono text-xs hidden sm:table-cell">{item.codigo || "—"}</td>
              <td className="px-4 py-2 text-right font-medium text-[#1d2023]">{item.cantidad ?? "—"}</td>
              <td className="px-3 py-2 text-[#5a5f67] hidden sm:table-cell">{item.estanteria || "—"}</td>
              <td className="px-3 py-2 text-[#5a5f67] hidden sm:table-cell">{item.estante || "—"}</td>
              <td className="px-3 py-2 text-[#5a5f67] hidden sm:table-cell">{item.cajon || "—"}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-[#d4d6d8] bg-[#f7f8f9]">
            <td className="px-4 py-2 text-xs font-semibold text-[#5a5f67]">Total: {items.length} ítem{items.length !== 1 ? "s" : ""}</td>
            <td colSpan={5}></td>
          </tr>
        </tfoot>
      </table>
      {d.observaciones && (
        <div className="px-4 py-2.5 border-t border-[#e8e9eb]">
          <span className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">Observaciones: </span>
          <span className="text-sm text-[#1d2023]">{d.observaciones}</span>
        </div>
      )}
    </div>
  );
}

function MejoraView({ m }: { m: any }) {
  const adicionales: string[] = (() => { try { return JSON.parse(m.tecnicosIds || "[]"); } catch { return []; } })();
  return (
    <Section title="Mejora/Modificación">
      <Field label="Técnicos" value={adicionales.length > 0 ? <>{m.tecnico?.name ?? "—"} + <TecnicosAdicionales ids={adicionales} /></> : (m.tecnico?.name ?? "—")} />
      <Field label="Inicio" value={format(new Date(m.fechaInicio), "d MMM yyyy HH:mm", { locale: es })} />
      {m.fechaFin && (
        <>
          <Field label="Fin" value={format(new Date(m.fechaFin), "d MMM yyyy HH:mm", { locale: es })} />
          <Field label="Duración" value={<strong>{duracion(m.fechaInicio, m.fechaFin)}</strong>} />
        </>
      )}
      <Field label="Descripción" value={<pre className="whitespace-pre-wrap font-sans text-sm">{m.descripcion}</pre>} />
      <Field label="Trabajo Realizado" value={<pre className="whitespace-pre-wrap font-sans text-sm">{m.trabajoRealizado}</pre>} />
      {m.observaciones && <Field label="Observaciones" value={<pre className="whitespace-pre-wrap font-sans text-sm">{m.observaciones}</pre>} />}
    </Section>
  );
}
