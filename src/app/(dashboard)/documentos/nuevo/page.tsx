"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  ic, se, REPUESTO_VACIO,
  ReporteF, MejoraF, GenericoF, OrdenF, CierreF, DescargaF,
  getTurnoFromHora, localToUTC, localDateToUTC,
} from "@/components/DocumentoForms";

const TIPOS = [
  { value: "REPORTE_INTERVENCION", label: "Reporte de Intervención" },
  { value: "MEJORA_MODIFICACION",  label: "Mejora/Modificación" },
  { value: "ORDEN_TRABAJO",        label: "Orden de Trabajo" },
  { value: "CIERRE_TURNO",         label: "Cierre de Turno" },
  { value: "DESCARGA_REPUESTOS",   label: "Descarga de Repuestos" },
  { value: "GENERICO",             label: "Documento" },
];

const COLOR_LABEL_MAP: Record<string, string> = { AZUL: "Azul", ROJO: "Rojo", VERDE: "Verde", AMARILLO: "Amarillo" };
const TURNO_LABEL: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" };

export default function NuevoDocumentoPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tipoParam = searchParams.get("tipo") ?? "";
  const [tipo, setTipo] = useState("");
  const [titulo, setTitulo] = useState("");
  const [maquinaId, setMaquinaId] = useState(searchParams.get("maquinaId") ?? "");
  const { data: session } = useSession();
  const [maquinas, setMaquinas] = useState<any[]>([]);
  const [tecnicos, setTecnicos] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [datos, setDatos] = useState<Record<string, any>>({});
  const [imageFiles, setImageFiles] = useState<File[]>([]);

  useEffect(() => {
    fetch("/api/maquinas").then((r) => r.json()).then(setMaquinas).catch(() => {});
    fetch("/api/usuarios").then((r) => r.json()).then(setTecnicos).catch(() => {});
    if (tipoParam) init(tipoParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function init(t: string) {
    setTipo(t);
    const now = format(new Date(), "yyyy-MM-dd'T'HH:mm");
    if (t === "REPORTE_INTERVENCION") setDatos({ fechaInicio: now, tipoFalla: "", descripcionFalla: "", trabajoRealizado: "", observaciones: "", tecnicosIds: session?.user?.id ? [session.user.id] : [] });
    else if (t === "MEJORA_MODIFICACION") setDatos({ fechaInicio: now, descripcion: "", trabajoRealizado: "", observaciones: "", tecnicosIds: session?.user?.id ? [session.user.id] : [] });
    else if (t === "GENERICO") setDatos({ contenido: "", tecnicosIds: session?.user?.id ? [session.user.id] : [] });
    else if (t === "ORDEN_TRABAJO") setDatos({ descripcion: "", prioridad: "MEDIA", estado: "PENDIENTE", observaciones: "" });
    else if (t === "CIERRE_TURNO") setDatos({ fecha: now, novedades: "", trabajosRealizados: "", pendientes: "" });
    else if (t === "DESCARGA_REPUESTOS") setDatos({ fecha: now, items: [REPUESTO_VACIO()], observaciones: "" });
  }

  function upd(key: string, value: any) { setDatos((p) => ({ ...p, [key]: value })); }

  function buildTitulo(): string {
    if (tipo === "REPORTE_INTERVENCION") {
      const maq = maquinas.find((m) => m.id === maquinaId);
      const fecha = format(new Date(datos.fechaInicio ?? new Date()), "dd/MM/yyyy HH:mm");
      return maq ? `Reporte – ${maq.nombre} – ${fecha}` : `Reporte – ${fecha}`;
    }
    if (tipo === "CIERRE_TURNO") {
      const turno = getTurnoFromHora(datos.fecha);
      const fecha = format(new Date(datos.fecha ?? new Date()), "dd/MM/yyyy");
      const color = session?.user?.color ?? "AZUL";
      return `Cierre de Turno – Turno ${TURNO_LABEL[turno]} – ${COLOR_LABEL_MAP[color] ?? color} – ${fecha}`;
    }
    if (tipo === "DESCARGA_REPUESTOS") {
      const maq = maquinas.find((m) => m.id === maquinaId);
      const fecha = format(new Date(datos.fecha ?? new Date()), "dd/MM/yyyy HH:mm");
      return maq ? `Descarga Repuestos – ${maq.nombre} – ${fecha}` : `Descarga Repuestos – ${fecha}`;
    }
    if (tipo === "MEJORA_MODIFICACION") {
      return titulo ? `Mejora/Modificación – ${titulo}` : `Mejora/Modificación – ${format(new Date(), "dd/MM/yyyy HH:mm")}`;
    }
    return titulo;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!tipo) { setError("Seleccioná un tipo"); return; }
    setSaving(true); setError("");

    const tituloFinal = buildTitulo();

    // Compute turno from local time BEFORE converting to UTC
    let datosFinales: Record<string, any> = tipo === "CIERRE_TURNO"
      ? { ...datos, turno: getTurnoFromHora(datos.fecha) }
      : { ...datos };

    // Convert datetime-local strings (local time) to UTC ISO for correct DB storage
    datosFinales = {
      ...datosFinales,
      ...(datosFinales.fechaInicio      != null && { fechaInicio:      localToUTC(datosFinales.fechaInicio) }),
      ...(datosFinales.fechaFin         != null && { fechaFin:         localToUTC(datosFinales.fechaFin) }),
      ...(datosFinales.fecha            != null && { fecha:            localToUTC(datosFinales.fecha) }),
      ...(datosFinales.fechaVencimiento != null && { fechaVencimiento: localDateToUTC(datosFinales.fechaVencimiento) }),
    };

    const res = await fetch("/api/documentos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: tituloFinal, tipo, maquinaId: maquinaId || null, datos: datosFinales }),
    });
    if (res.ok) {
      const doc = await res.json();
      if (imageFiles.length > 0) {
        const form = new FormData();
        imageFiles.forEach((f) => form.append("files", f));
        await fetch(`/api/documentos/${doc.id}/imagenes`, { method: "POST", body: form });
      }
      router.push(`/documentos/${doc.id}`);
    } else { const d = await res.json(); setError(d.error ?? "Error al guardar"); setSaving(false); }
  }

  const esAutoTitulo = tipo === "REPORTE_INTERVENCION" || tipo === "CIERRE_TURNO" || tipo === "DESCARGA_REPUESTOS";

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b border-[#d4d6d8] px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-[#5a5f67] hover:text-[#1d2023]">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="text-sm font-semibold text-[#1d2023]">
          {tipo ? `Nuevo documento — ${TIPOS.find(t => t.value === tipo)?.label}` : "Nuevo Documento"}
        </h1>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl space-y-4">
          {error && <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!tipoParam && (
              <div className="bg-white border border-[#d4d6d8] p-4">
                <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">Tipo de Documento *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {TIPOS.map((t) => (
                    <button key={t.value} type="button" onClick={() => init(t.value)}
                      className={`px-3 py-2 text-sm text-left border transition-colors ${tipo === t.value ? "border-[#1C6B30] bg-[#f0f7f2] text-[#1C6B30] font-medium" : "border-[#d4d6d8] text-[#5a5f67] hover:border-[#b0b4b8]"}`}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {tipo && (
              <>
                {tipo !== "CIERRE_TURNO" && (
                  <div className="bg-white border border-[#d4d6d8] p-4 space-y-3">
                    {!esAutoTitulo && (
                      <div>
                        <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">Título *</label>
                        <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ic} required />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">Máquina</label>
                      <select value={maquinaId} onChange={(e) => setMaquinaId(e.target.value)} className={se}>
                        <option value="">Sin máquina asignada</option>
                        {maquinas.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.linea?.subsector?.sector?.nombre} › {m.linea?.subsector?.nombre} › {m.linea?.nombre} › {m.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-[#d4d6d8] p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider border-b border-[#e8e9eb] pb-2">
                    {TIPOS.find(t => t.value === tipo)?.label}
                  </p>
                  {tipo === "REPORTE_INTERVENCION" && <ReporteF datos={datos} upd={upd} setDatos={setDatos} imageFiles={imageFiles} setImageFiles={setImageFiles} tecnicos={tecnicos} sessionId={session?.user?.id} mode="create" />}
                  {tipo === "MEJORA_MODIFICACION"  && <MejoraF  datos={datos} upd={upd} setDatos={setDatos} imageFiles={imageFiles} setImageFiles={setImageFiles} tecnicos={tecnicos} sessionId={session?.user?.id} mode="create" />}
                  {tipo === "GENERICO"             && <GenericoF datos={datos} upd={upd} tecnicos={tecnicos} sessionId={session?.user?.id} />}
                  {tipo === "ORDEN_TRABAJO"        && <OrdenF   datos={datos} upd={upd} tecnicos={tecnicos} imageFiles={imageFiles} setImageFiles={setImageFiles} mode="create" />}
                  {tipo === "CIERRE_TURNO"         && <CierreF  datos={datos} upd={upd} setDatos={setDatos} mode="create" />}
                  {tipo === "DESCARGA_REPUESTOS"   && <DescargaF datos={datos} upd={upd} setDatos={setDatos} />}
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="text-sm font-semibold text-white px-5 py-2" style={{ backgroundColor: saving ? "#4a9a60" : "#1C6B30" }}>
                    {saving ? "Guardando..." : "Guardar"}
                  </button>
                  <button type="button" onClick={() => router.back()} className="text-sm text-[#5a5f67] px-5 py-2 border border-[#d4d6d8] hover:bg-[#f7f8f9]">Cancelar</button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
