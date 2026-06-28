"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ic, se, REPUESTO_VACIO,
  Lbl,
  ReporteF, MejoraF, GenericoF, OrdenF, CierreF, DescargaF,
  getTurnoFromHora, localToUTC,
} from "@/components/DocumentoForms";

const TIPO_LABELS: Record<string, string> = {
  REPORTE_INTERVENCION: "Reporte de Intervención",
  MEJORA_MODIFICACION:  "Mejora/Modificación",
  ORDEN_TRABAJO:        "Orden de Trabajo",
  CIERRE_TURNO:         "Cierre de Turno",
  DESCARGA_REPUESTOS:   "Descarga de Repuestos",
  GENERICO:             "Documento",
};

function fmtLocal(isoUtc: string | null | undefined): string {
  if (!isoUtc) return "";
  return format(new Date(isoUtc), "yyyy-MM-dd'T'HH:mm");
}

export default function EditarDocumentoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const [doc, setDoc] = useState<any>(null);
  const [datos, setDatos] = useState<Record<string, any>>({});
  const [titulo, setTitulo] = useState("");
  const [maquinaId, setMaquinaId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    fetch(`/api/documentos/${id}`).then((r) => r.json()).then((d) => {
      if (d.creadoPorId !== session?.user?.id) { router.push(`/documentos/${id}`); return; }
      setDoc(d);
      setTitulo(d.titulo);
      setMaquinaId(d.maquinaId ?? "");

      if (d.tipo === "REPORTE_INTERVENCION" && d.reporteIntervencion) {
        const r = d.reporteIntervencion;
        setDatos({
          fechaInicio: fmtLocal(r.fechaInicio),
          fechaFin:    fmtLocal(r.fechaFin),
          tipoFalla: r.tipoFalla,
          descripcionFalla: r.descripcionFalla,
          trabajoRealizado: r.trabajoRealizado,
          observaciones: r.observaciones ?? "",
          tecnicosIds: (() => { try { return JSON.parse(r.tecnicosIds || "[]"); } catch { return []; } })(),
        });
      } else if (d.tipo === "MEJORA_MODIFICACION" && d.mejoraModificacion) {
        const m = d.mejoraModificacion;
        setDatos({
          fechaInicio: fmtLocal(m.fechaInicio),
          fechaFin:    fmtLocal(m.fechaFin),
          descripcion: m.descripcion,
          trabajoRealizado: m.trabajoRealizado,
          observaciones: m.observaciones ?? "",
          tecnicosIds: (() => { try { return JSON.parse(m.tecnicosIds || "[]"); } catch { return []; } })(),
        });
      } else if (d.tipo === "GENERICO" && d.documentoGenerico) {
        setDatos({
          contenido: d.documentoGenerico.contenido,
          tecnicosIds: (() => { try { return JSON.parse(d.documentoGenerico.tecnicosIds || "[]"); } catch { return []; } })(),
        });
      } else if (d.tipo === "ORDEN_TRABAJO" && d.ordenTrabajo) {
        const ot = d.ordenTrabajo;
        setDatos({
          descripcion: ot.descripcion,
          prioridad: ot.prioridad,
          estado: ot.estado,
          observaciones: ot.observaciones ?? "",
          fechaVencimiento: ot.fechaVencimiento ? format(new Date(ot.fechaVencimiento), "yyyy-MM-dd") : "",
          tecnicosIds: (() => { try { return JSON.parse(ot.tecnicosIds || "[]"); } catch { return []; } })(),
        });
      } else if (d.tipo === "CIERRE_TURNO" && d.cierreTurno) {
        const ct = d.cierreTurno;
        setDatos({
          fecha: fmtLocal(ct.fecha),
          novedades: ct.novedades,
          trabajosRealizados: ct.trabajosRealizados ?? "",
          pendientes: ct.pendientes ?? "",
        });
      } else if (d.tipo === "DESCARGA_REPUESTOS" && d.descargaRepuestos) {
        const dr = d.descargaRepuestos;
        setDatos({
          fecha: fmtLocal(dr.fecha),
          items: (() => { try { return JSON.parse(dr.items || "[]"); } catch { return [REPUESTO_VACIO()]; } })(),
          observaciones: dr.observaciones ?? "",
        });
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

    // Compute turno from local time BEFORE converting to UTC
    let datosEnvio: Record<string, any> = { ...datos };
    if (doc.tipo === "CIERRE_TURNO" && datos.fecha) {
      datosEnvio = { ...datosEnvio, turno: getTurnoFromHora(datos.fecha) };
    }

    // Convert datetime-local strings (local time) to UTC ISO for correct DB storage
    datosEnvio = {
      ...datosEnvio,
      ...(datosEnvio.fechaInicio != null && { fechaInicio: localToUTC(datosEnvio.fechaInicio) }),
      ...(datosEnvio.fechaFin    != null && { fechaFin:    localToUTC(datosEnvio.fechaFin) }),
      ...(datosEnvio.fecha       != null && { fecha:       localToUTC(datosEnvio.fecha) }),
    };

    const res = await fetch(`/api/documentos/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        titulo,
        tipo: doc.tipo,
        datos: datosEnvio,
        maquinaId: maquinaId || null,
        edicion: true,
        resumen: "Editó el documento",
      }),
    });

    if (res.ok) {
      if (imageFiles.length > 0) {
        const form = new FormData();
        imageFiles.forEach((f) => form.append("files", f));
        await fetch(`/api/documentos/${id}/imagenes`, { method: "POST", body: form });
      }
      router.push(`/documentos/${id}`);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar");
      setSaving(false);
    }
  }

  if (!doc) return <div className="p-8 text-sm text-[#5a5f67]">Cargando...</div>;

  const sesId = session?.user?.id as string;
  const esAutoTitulo = ["REPORTE_INTERVENCION", "CIERRE_TURNO", "DESCARGA_REPUESTOS"].includes(doc.tipo);

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-[#d4d6d8] px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#5a5f67] hover:text-[#1d2023]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-sm font-semibold text-[#1d2023]">
          Editando — {TIPO_LABELS[doc.tipo] ?? doc.tipo}
        </h1>
        {doc.version > 1 && <span className="text-[10px] text-[#9ea3aa] border border-[#d4d6d8] px-1.5 py-0.5">v{doc.version}</span>}
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl">
          {error && <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm mb-4">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">

            {doc.tipo !== "CIERRE_TURNO" && (
              <div className="bg-white border border-[#d4d6d8] p-4 space-y-3">
                {!esAutoTitulo && (
                  <div>
                    <Lbl req>Título</Lbl>
                    <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ic} required />
                  </div>
                )}
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
              <p className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider border-b border-[#e8e9eb] pb-2">
                {TIPO_LABELS[doc.tipo]}
              </p>
              {doc.tipo === "REPORTE_INTERVENCION" && <ReporteF datos={datos} upd={upd} setDatos={setDatos} imageFiles={imageFiles} setImageFiles={setImageFiles} tecnicos={tecnicos} sessionId={sesId} mode="edit" />}
              {doc.tipo === "MEJORA_MODIFICACION"  && <MejoraF  datos={datos} upd={upd} setDatos={setDatos} imageFiles={imageFiles} setImageFiles={setImageFiles} tecnicos={tecnicos} sessionId={sesId} mode="edit" />}
              {doc.tipo === "GENERICO"             && <GenericoF datos={datos} upd={upd} tecnicos={tecnicos} sessionId={sesId} />}
              {doc.tipo === "ORDEN_TRABAJO"        && <OrdenF   datos={datos} upd={upd} tecnicos={tecnicos} imageFiles={imageFiles} setImageFiles={setImageFiles} mode="edit" />}
              {doc.tipo === "CIERRE_TURNO"         && <CierreF  datos={datos} upd={upd} setDatos={setDatos} mode="edit" />}
              {doc.tipo === "DESCARGA_REPUESTOS"   && <DescargaF datos={datos} upd={upd} setDatos={setDatos} />}
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
