"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import { TecnicosInput } from "@/components/TecnicosInput";

const ic = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white";
const ta = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white resize-y min-h-[72px]";
const se = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white";

function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">{children}{req && " *"}</label>;
}

export default function EditarDocumentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [doc, setDoc] = useState<any>(null);
  const [datos, setDatos] = useState<Record<string, any>>({});
  const [titulo, setTitulo] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [maquinaId, setMaquinaId] = useState<string>("");

  useEffect(() => {
    fetch(`/api/documentos/${id}`).then((r) => r.json()).then((d) => {
      if (d.creadoPorId !== session?.user?.id) { router.push(`/documentos/${id}`); return; }
      setDoc(d);
      setTitulo(d.titulo);
      setMaquinaId(d.maquinaId ?? "");
      if (d.tipo === "REPORTE_INTERVENCION" && d.reporteIntervencion) {
        const r = d.reporteIntervencion;
        setDatos({ fechaInicio: format(new Date(r.fechaInicio), "yyyy-MM-dd'T'HH:mm"), fechaFin: r.fechaFin ? format(new Date(r.fechaFin), "yyyy-MM-dd'T'HH:mm") : "", tipoFalla: r.tipoFalla, descripcionFalla: r.descripcionFalla, trabajoRealizado: r.trabajoRealizado, observaciones: r.observaciones ?? "", tecnicosIds: (() => { try { return JSON.parse(r.tecnicosIds || "[]"); } catch { return []; } })() });
      } else if (d.tipo === "MEJORA_MODIFICACION" && d.mejoraModificacion) {
        const m = d.mejoraModificacion;
        setDatos({ fechaInicio: format(new Date(m.fechaInicio), "yyyy-MM-dd'T'HH:mm"), fechaFin: m.fechaFin ? format(new Date(m.fechaFin), "yyyy-MM-dd'T'HH:mm") : "", descripcion: m.descripcion, trabajoRealizado: m.trabajoRealizado, observaciones: m.observaciones ?? "", tecnicosIds: (() => { try { return JSON.parse(m.tecnicosIds || "[]"); } catch { return []; } })() });
      } else if (d.tipo === "GENERICO" && d.documentoGenerico) {
        setDatos({ contenido: d.documentoGenerico.contenido, tecnicosIds: (() => { try { return JSON.parse(d.documentoGenerico.tecnicosIds || "[]"); } catch { return []; } })() });
      } else if (d.tipo === "ORDEN_TRABAJO" && d.ordenTrabajo) {
        const ot = d.ordenTrabajo;
        setDatos({ descripcion: ot.descripcion, prioridad: ot.prioridad, estado: ot.estado, observaciones: ot.observaciones ?? "", fechaVencimiento: ot.fechaVencimiento ? format(new Date(ot.fechaVencimiento), "yyyy-MM-dd") : "", tecnicosIds: (() => { try { return JSON.parse(ot.tecnicosIds || "[]"); } catch { return []; } })() });
      } else if (d.tipo === "CIERRE_TURNO" && d.cierreTurno) {
        setDatos({ novedades: d.cierreTurno.novedades, trabajosRealizados: d.cierreTurno.trabajosRealizados ?? "", pendientes: d.cierreTurno.pendientes ?? "" });
      }
    });
    fetch("/api/usuarios").then((r) => r.json()).then(setTecnicos).catch(() => {});
    fetch("/api/maquinas").then((r) => r.json()).then(setMaquinas).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, session?.user?.id]);

  function upd(k: string, v: any) { setDatos((p) => ({ ...p, [k]: v })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    const res = await fetch(`/api/documentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, tipo: doc.tipo, datos, maquinaId: maquinaId || null, edicion: true, resumen: `Editó el documento` }),
    });
    if (res.ok) { router.push(`/documentos/${id}`); }
    else { const d = await res.json(); setError(d.error ?? "Error al guardar"); setSaving(false); }
  }

  if (!doc) return <div className="p-8 text-sm text-[#5a5f67]">Cargando...</div>;

  const sesId = session?.user?.id as string;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-[#d4d6d8] px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#5a5f67] hover:text-[#1d2023]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-sm font-semibold text-[#1d2023]">Editando — {doc.titulo}</h1>
        {doc.version > 1 && <span className="text-[10px] text-[#9ea3aa] border border-[#d4d6d8] px-1.5 py-0.5">v{doc.version}</span>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          {error && <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">

            {!["CIERRE_TURNO"].includes(doc.tipo) && (
              <div className="bg-white border border-[#d4d6d8] p-4 space-y-3">
                <div>
                  <Lbl req>Título</Lbl>
                  <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ic} required />
                </div>
                {!["CIERRE_TURNO", "DESCARGA_REPUESTOS"].includes(doc.tipo) && (
                  <div>
                    <Lbl>Máquina</Lbl>
                    <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)} className={se}>
                      <option value="">Sin máquina asignada</option>
                      {maquinas.map((m: any) => (
                        <option key={m.id} value={m.id}>
                          {m.linea?.subsector?.sector?.nombre} › {m.linea?.subsector?.nombre} › {m.linea?.nombre} › {m.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white border border-[#d4d6d8] p-4 space-y-3">
              <p className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider border-b border-[#e8e9eb] pb-2">Contenido</p>

              {/* Técnicos (shared) */}
              {["REPORTE_INTERVENCION", "MEJORA_MODIFICACION", "GENERICO"].includes(doc.tipo) && tecnicos.length > 0 && (
                <div>
                  <Lbl>Técnicos</Lbl>
                  <TecnicosInput
                    tecnicos={tecnicos}
                    value={datos.tecnicosIds?.length ? datos.tecnicosIds : [sesId]}
                    creatorId={sesId}
                    onChange={(ids) => upd("tecnicosIds", ids)}
                  />
                </div>
              )}

              {/* REPORTE */}
              {doc.tipo === "REPORTE_INTERVENCION" && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Lbl req>Inicio</Lbl><input type="datetime-local" value={datos.fechaInicio ?? ""} onChange={(e) => upd("fechaInicio", e.target.value)} className={ic} required /></div>
                  <div><Lbl>Fin</Lbl><input type="datetime-local" value={datos.fechaFin ?? ""} onChange={(e) => upd("fechaFin", e.target.value)} className={ic} /></div>
                </div>
                <div><Lbl req>Tipo de Falla</Lbl>
                  <select value={datos.tipoFalla ?? ""} onChange={(e) => upd("tipoFalla", e.target.value)} className={se} required>
                    {["Mecánica","Eléctrica","Hidráulica","Neumática","Software/Control","Mantenimiento Preventivo","Cambio de formato","Otro"].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div><Lbl req>Descripción de la Falla</Lbl><textarea value={datos.descripcionFalla ?? ""} onChange={(e) => upd("descripcionFalla", e.target.value)} className={ta} required /></div>
                <div><Lbl req>Trabajo Realizado</Lbl><textarea value={datos.trabajoRealizado ?? ""} onChange={(e) => upd("trabajoRealizado", e.target.value)} className={ta} required /></div>
                <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
              </>}

              {/* MEJORA */}
              {doc.tipo === "MEJORA_MODIFICACION" && <>
                <div className="grid grid-cols-2 gap-3">
                  <div><Lbl req>Inicio</Lbl><input type="datetime-local" value={datos.fechaInicio ?? ""} onChange={(e) => upd("fechaInicio", e.target.value)} className={ic} required /></div>
                  <div><Lbl>Fin</Lbl><input type="datetime-local" value={datos.fechaFin ?? ""} onChange={(e) => upd("fechaFin", e.target.value)} className={ic} /></div>
                </div>
                <div><Lbl req>Descripción</Lbl><textarea value={datos.descripcion ?? ""} onChange={(e) => upd("descripcion", e.target.value)} className={ta} required /></div>
                <div><Lbl req>Trabajo Realizado</Lbl><textarea value={datos.trabajoRealizado ?? ""} onChange={(e) => upd("trabajoRealizado", e.target.value)} className={ta} required /></div>
                <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
              </>}

              {/* GENÉRICO */}
              {doc.tipo === "GENERICO" && (
                <div><Lbl>Contenido</Lbl><textarea value={datos.contenido ?? ""} onChange={(e) => upd("contenido", e.target.value)} className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white resize-y min-h-[200px]" /></div>
              )}

              {/* OT */}
              {doc.tipo === "ORDEN_TRABAJO" && <>
                {tecnicos.length > 0 && (
                  <div>
                    <Lbl>Técnicos</Lbl>
                    <TecnicosInput
                      tecnicos={tecnicos}
                      value={datos.tecnicosIds ?? []}
                      creatorId=""
                      onChange={(ids) => upd("tecnicosIds", ids)}
                    />
                  </div>
                )}
                <div><Lbl req>Descripción</Lbl><textarea value={datos.descripcion ?? ""} onChange={(e) => upd("descripcion", e.target.value)} className={ta} required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><Lbl>Prioridad</Lbl>
                    <select value={datos.prioridad ?? "MEDIA"} onChange={(e) => upd("prioridad", e.target.value)} className={se}>
                      {[["BAJA","Baja"],["MEDIA","Media"],["ALTA","Alta"],["CRITICA","Crítica"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                    </select>
                  </div>
                  <div><Lbl>Vencimiento</Lbl><input type="date" value={datos.fechaVencimiento ?? ""} onChange={(e) => upd("fechaVencimiento", e.target.value)} className={ic} /></div>
                </div>
                <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
              </>}

              {/* CIERRE */}
              {doc.tipo === "CIERRE_TURNO" && <>
                <div><Lbl req>Novedades</Lbl><textarea value={datos.novedades ?? ""} onChange={(e) => upd("novedades", e.target.value)} className={ta} required /></div>
                <div><Lbl>Trabajos Realizados</Lbl><textarea value={datos.trabajosRealizados ?? ""} onChange={(e) => upd("trabajosRealizados", e.target.value)} className={ta} /></div>
                <div><Lbl>Pendientes</Lbl><textarea value={datos.pendientes ?? ""} onChange={(e) => upd("pendientes", e.target.value)} className={ta} /></div>
              </>}
            </div>

            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="text-sm font-semibold text-white px-5 py-2" style={{ backgroundColor: saving ? "#4a9a60" : "#1C6B30" }}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button type="button" onClick={() => router.back()} className="text-sm text-[#5a5f67] px-5 py-2 border border-[#d4d6d8]">Cancelar</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
