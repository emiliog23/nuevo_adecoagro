"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { TecnicosInput } from "@/components/TecnicosInput";
import { ImageDropzone } from "@/components/ImageDropzone";
import { format } from "date-fns";

const TIPOS = [
  { value: "REPORTE_INTERVENCION", label: "Reporte de Intervención" },
  { value: "MEJORA_MODIFICACION",  label: "Mejora/Modificación" },
  { value: "ORDEN_TRABAJO",        label: "Orden de Trabajo" },
  { value: "CIERRE_TURNO",         label: "Cierre de Turno" },
  { value: "DESCARGA_REPUESTOS",   label: "Descarga de Repuestos" },
  { value: "GENERICO",             label: "Documento" },
];

const ic = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white";
const ta = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white resize-y min-h-[72px]";
const se = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white";
const celda = "px-2 py-1 border border-[#d4d6d8] text-sm focus:outline-none focus:border-[#1C6B30] w-full";

function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">{children}{req && " *"}</label>;
}

const REPUESTO_VACIO = () => ({ codigo: "", nombre: "", cantidad: "", estanteria: "", estante: "", cajon: "" });
const COLOR_LABEL_MAP: Record<string, string> = { AZUL: "Azul", ROJO: "Rojo", VERDE: "Verde", AMARILLO: "Amarillo" };

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

  function getTurno(fechaISO: string): "MANANA" | "TARDE" | "NOCHE" {
    if (!fechaISO) return "NOCHE";
    const hora = new Date(fechaISO).getHours();
    if (hora >= 4 && hora < 12) return "MANANA";
    if (hora >= 12 && hora < 20) return "TARDE";
    return "NOCHE";
  }

  const TURNO_LABEL: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" };

  function buildTitulo(): string {
    if (tipo === "REPORTE_INTERVENCION") {
      const maq = maquinas.find((m) => m.id === maquinaId);
      const fecha = format(new Date(datos.fechaInicio ?? new Date()), "dd/MM/yyyy HH:mm");
      return maq ? `Reporte – ${maq.nombre} – ${fecha}` : `Reporte – ${fecha}`;
    }
    if (tipo === "CIERRE_TURNO") {
      const turno = getTurno(datos.fecha);
      const fecha = format(new Date(datos.fecha ?? new Date()), "dd/MM/yyyy");
      const color = session?.user?.color ?? "AZUL";
      const colorLabel = COLOR_LABEL_MAP[color] ?? color;
      return `Cierre de Turno – Turno ${TURNO_LABEL[turno]} – ${colorLabel} – ${fecha}`;
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
    // Inject auto-detected turno for cierres
    const datosFinales = tipo === "CIERRE_TURNO"
      ? { ...datos, turno: getTurno(datos.fecha) }
      : datos;

    const res = await fetch("/api/documentos", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: tituloFinal, tipo, maquinaId: maquinaId || null, datos: datosFinales }),
    });
    if (res.ok) {
      const doc = await res.json();
      // Upload any attached images
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
            {/* Tipo selector */}
            {!tipoParam && (
              <div className="bg-white border border-[#d4d6d8] p-4">
                <Lbl req>Tipo de Documento</Lbl>
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
                {/* Cabecera: título + máquina — se oculta si no hay nada que mostrar */}
                {tipo !== "CIERRE_TURNO" && (
                  <div className="bg-white border border-[#d4d6d8] p-4 space-y-3">
                    {!esAutoTitulo && (
                      <div><Lbl req>Título</Lbl><input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} className={ic} required /></div>
                    )}
                    <div><Lbl>Máquina</Lbl>
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

                {/* Campos específicos */}
                <div className="bg-white border border-[#d4d6d8] p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider border-b border-[#e8e9eb] pb-2">
                    {TIPOS.find(t => t.value === tipo)?.label}
                  </p>
                  {tipo === "REPORTE_INTERVENCION" && <ReporteF datos={datos} upd={upd} setDatos={setDatos} imageFiles={imageFiles} setImageFiles={setImageFiles} tecnicos={tecnicos} sessionId={session?.user?.id} />}
                  {tipo === "MEJORA_MODIFICACION" && <MejoraF datos={datos} upd={upd} setDatos={setDatos} imageFiles={imageFiles} setImageFiles={setImageFiles} tecnicos={tecnicos} sessionId={session?.user?.id} />}
                  {tipo === "GENERICO" && <GenericoF datos={datos} upd={upd} tecnicos={tecnicos} sessionId={session?.user?.id} />}
                  {tipo === "ORDEN_TRABAJO" && <OrdenF datos={datos} upd={upd} tecnicos={tecnicos} />}
                  {tipo === "CIERRE_TURNO" && <CierreF datos={datos} upd={upd} setDatos={setDatos} />}
                  {tipo === "DESCARGA_REPUESTOS" && <DescargaF datos={datos} upd={upd} setDatos={setDatos} />}
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

// ── Repuestos inline (usada en Reporte y Cierre) ──────────────────────────────
function RepuestosInline({ datos, setDatos }: any) {
  const [show, setShow] = useState(!!(datos.repuestos?.length));
  const items: any[] = datos.repuestos ?? [];

  function toggle() {
    const next = !show;
    setDatos((p: any) => ({ ...p, repuestos: next ? [REPUESTO_VACIO()] : [] }));
    setShow(next);
  }

  const updItem = (idx: number, k: string, v: any) =>
    setDatos((p: any) => ({ ...p, repuestos: p.repuestos.map((it: any, i: number) => i === idx ? { ...it, [k]: v } : it) }));
  const addItem = () => setDatos((p: any) => ({ ...p, repuestos: [...(p.repuestos ?? []), REPUESTO_VACIO()] }));
  const removeItem = (idx: number) => setDatos((p: any) => ({ ...p, repuestos: p.repuestos.filter((_: any, i: number) => i !== idx) }));

  return (
    <div className="border-t border-[#e8e9eb] pt-3 mt-1">
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={show} onChange={toggle} className="w-3.5 h-3.5 accent-[#1C6B30]" />
        <span className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">¿Se utilizaron repuestos?</span>
      </label>

      {show && (
        <div className="mt-3 space-y-2">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="border border-[#d4d6d8] p-3 relative">
              <button
                type="button"
                onClick={() => removeItem(idx)}
                disabled={items.length === 1}
                className="absolute top-2 right-2 text-[#9ea3aa] hover:text-red-500 disabled:opacity-30 text-xs"
              >✕</button>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="col-span-2">
                  <Lbl>Nombre</Lbl>
                  <input value={item.nombre} onChange={(e) => updItem(idx, "nombre", e.target.value)} className={celda} required={show} />
                </div>
                <div>
                  <Lbl>Código</Lbl>
                  <input value={item.codigo ?? ""} onChange={(e) => updItem(idx, "codigo", e.target.value)} className={celda} />
                </div>
                <div>
                  <Lbl>Cantidad</Lbl>
                  <input type="number" min="0.01" step="any" value={item.cantidad} onChange={(e) => updItem(idx, "cantidad", e.target.value)} className={celda} />
                </div>
                <div>
                  <Lbl>Estantería</Lbl>
                  <input value={item.estanteria} onChange={(e) => updItem(idx, "estanteria", e.target.value)} className={celda} />
                </div>
                <div>
                  <Lbl>Estante</Lbl>
                  <input value={item.estante} onChange={(e) => updItem(idx, "estante", e.target.value)} className={celda} />
                </div>
                <div>
                  <Lbl>Cajón</Lbl>
                  <input value={item.cajon} onChange={(e) => updItem(idx, "cajon", e.target.value)} className={celda} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={addItem} className="text-xs text-[#1C6B30] hover:underline">+ Agregar repuesto</button>
          <p className="text-[10px] text-[#9ea3aa]">Se creará automáticamente un documento de Descarga de Repuestos vinculado.</p>
        </div>
      )}
    </div>
  );
}

// ── Sub-formularios por tipo ──────────────────────────────────────────────────

function ReporteF({ datos, upd, setDatos, imageFiles, setImageFiles, tecnicos, sessionId }: any) {
  return <>
    {/* Técnicos — primero */}
    {tecnicos?.length > 0 && sessionId && (
      <div>
        <Lbl>Técnicos</Lbl>
        <TecnicosInput
          tecnicos={tecnicos}
          value={datos.tecnicosIds?.length ? datos.tecnicosIds : [sessionId]}
          creatorId={sessionId}
          onChange={(ids) => upd("tecnicosIds", ids)}
        />
      </div>
    )}

    <div className="grid grid-cols-2 gap-3">
      <div><Lbl req>Inicio</Lbl><input type="datetime-local" value={datos.fechaInicio ?? ""} onChange={(e) => upd("fechaInicio", e.target.value)} className={ic} required /></div>
      <div><Lbl>Fin</Lbl><input type="datetime-local" value={datos.fechaFin ?? ""} onChange={(e) => upd("fechaFin", e.target.value)} className={ic} /></div>
    </div>
    <div><Lbl req>Tipo de Falla</Lbl>
      <select value={datos.tipoFalla ?? ""} onChange={(e) => upd("tipoFalla", e.target.value)} className={se} required>
        <option value="">Seleccionar...</option>
        {["Mecánica","Eléctrica","Hidráulica","Neumática","Software/Control","Mantenimiento Preventivo","Cambio de formato","Otro"].map(t => <option key={t}>{t}</option>)}
      </select>
    </div>
    <div><Lbl req>Descripción de la Falla</Lbl><textarea value={datos.descripcionFalla ?? ""} onChange={(e) => upd("descripcionFalla", e.target.value)} className={ta} required /></div>
    <div><Lbl req>Trabajo Realizado</Lbl><textarea value={datos.trabajoRealizado ?? ""} onChange={(e) => upd("trabajoRealizado", e.target.value)} className={ta} required /></div>
    <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>

    <div className="border-t border-[#e8e9eb] pt-3 mt-1">
      <Lbl>Imágenes</Lbl>
      <ImageDropzone files={imageFiles} onChange={setImageFiles} />
    </div>

    <RepuestosInline datos={datos} setDatos={setDatos} />
  </>;
}

function OrdenF({ datos, upd, tecnicos }: any) {
  return <>
    <div><Lbl req>Descripción</Lbl><textarea value={datos.descripcion ?? ""} onChange={(e) => upd("descripcion", e.target.value)} className={ta} required /></div>
    <div className="grid grid-cols-2 gap-3">
      <div><Lbl>Prioridad</Lbl>
        <select value={datos.prioridad ?? "MEDIA"} onChange={(e) => upd("prioridad", e.target.value)} className={se}>
          {[["BAJA","Baja"],["MEDIA","Media"],["ALTA","Alta"],["CRITICA","Crítica"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div><Lbl>Estado</Lbl>
        <select value={datos.estado ?? "PENDIENTE"} onChange={(e) => upd("estado", e.target.value)} className={se}>
          {[["PENDIENTE","Pendiente"],["EN_CURSO","En Curso"],["COMPLETADA","Completada"],["COMPLETADA_CON_PROBLEMAS","Completado con problemas"],["IMPOSIBLE_TERMINAR","Imposible de terminar"],["CANCELADA","Cancelada"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div><Lbl>Vencimiento</Lbl><input type="date" value={datos.fechaVencimiento ?? ""} onChange={(e) => upd("fechaVencimiento", e.target.value)} className={ic} /></div>
      <div><Lbl>Técnico</Lbl>
        <select value={datos.tecnicoId ?? ""} onChange={(e) => upd("tecnicoId", e.target.value)} className={se}>
          <option value="">Sin asignar</option>
          {tecnicos.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
        </select>
      </div>
    </div>
    <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
  </>;
}

const TURNO_RANGES: Record<string, string> = {
  MANANA: "04:00 – 11:59",
  TARDE:  "12:00 – 19:59",
  NOCHE:  "20:00 – 03:59",
};
const TURNO_LABEL_MAP: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" };

function getTurnoFromFecha(fechaISO: string): string {
  if (!fechaISO) return "NOCHE";
  const hora = new Date(fechaISO).getHours();
  if (hora >= 4 && hora < 12) return "MANANA";
  if (hora >= 12 && hora < 20) return "TARDE";
  return "NOCHE";
}

function CierreF({ datos, upd, setDatos }: any) {
  const turnoDetectado = getTurnoFromFecha(datos.fecha ?? "");
  const turnoLabel = TURNO_LABEL_MAP[turnoDetectado];

  return <>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Lbl req>Fecha y Hora</Lbl>
        <input type="datetime-local" value={datos.fecha ?? ""} onChange={(e) => upd("fecha", e.target.value)} className={ic} required />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1 invisible">placeholder</label>
        <div className="px-3 py-1.5 border border-[#d4d6d8] bg-[#f7f8f9] text-sm text-[#1d2023] flex items-center justify-between">
          <span className="font-semibold">Turno {turnoLabel}</span>
          <span className="text-xs text-[#9ea3aa]">{TURNO_RANGES[turnoDetectado]}</span>
        </div>
      </div>
    </div>
    <div><Lbl req>Novedades</Lbl><textarea value={datos.novedades ?? ""} onChange={(e) => upd("novedades", e.target.value)} className={ta} required /></div>
    <div><Lbl>Trabajos Realizados</Lbl><textarea value={datos.trabajosRealizados ?? ""} onChange={(e) => upd("trabajosRealizados", e.target.value)} className={ta} /></div>
    <div><Lbl>Pendientes</Lbl><textarea value={datos.pendientes ?? ""} onChange={(e) => upd("pendientes", e.target.value)} className={ta} /></div>
    <RepuestosInline datos={datos} setDatos={setDatos} />
  </>;
}

// Descarga de repuestos standalone — mismos campos
function DescargaF({ datos, upd, setDatos }: any) {
  const items: any[] = datos.items ?? [];
  const updItem = (idx: number, k: string, v: any) =>
    setDatos((p: any) => ({ ...p, items: p.items.map((it: any, i: number) => i === idx ? { ...it, [k]: v } : it) }));
  const addItem = () => setDatos((p: any) => ({ ...p, items: [...(p.items ?? []), REPUESTO_VACIO()] }));
  const removeItem = (idx: number) => setDatos((p: any) => ({ ...p, items: p.items.filter((_: any, i: number) => i !== idx) }));

  return <>
    <div><Lbl>Fecha</Lbl><input type="datetime-local" value={datos.fecha ?? ""} onChange={(e) => upd("fecha", e.target.value)} className={ic} /></div>
    <div className="space-y-2">
      <Lbl req>Repuestos</Lbl>
      {items.map((item: any, idx: number) => (
        <div key={idx} className="border border-[#d4d6d8] p-3 relative">
          <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
            className="absolute top-2 right-2 text-[#9ea3aa] hover:text-red-500 disabled:opacity-30 text-xs">✕</button>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="col-span-2"><Lbl>Nombre</Lbl><input value={item.nombre ?? ""} onChange={(e) => updItem(idx, "nombre", e.target.value)} className={celda} required /></div>
            <div><Lbl>Código</Lbl><input value={item.codigo ?? ""} onChange={(e) => updItem(idx, "codigo", e.target.value)} className={celda} /></div>
            <div><Lbl>Cantidad</Lbl><input type="number" min="0.01" step="any" value={item.cantidad ?? ""} onChange={(e) => updItem(idx, "cantidad", e.target.value)} className={celda} /></div>
            <div><Lbl>Estantería</Lbl><input value={item.estanteria ?? ""} onChange={(e) => updItem(idx, "estanteria", e.target.value)} className={celda} /></div>
            <div><Lbl>Estante</Lbl><input value={item.estante ?? ""} onChange={(e) => updItem(idx, "estante", e.target.value)} className={celda} /></div>
            <div><Lbl>Cajón</Lbl><input value={item.cajon ?? ""} onChange={(e) => updItem(idx, "cajon", e.target.value)} className={celda} /></div>
          </div>
        </div>
      ))}
      <button type="button" onClick={addItem} className="text-xs text-[#1C6B30] hover:underline">+ Agregar repuesto</button>
    </div>
    <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
  </>;
}

function MejoraF({ datos, upd, setDatos, imageFiles, setImageFiles, tecnicos, sessionId }: any) {
  return <>
    {tecnicos?.length > 0 && sessionId && (
      <div>
        <Lbl>Técnicos</Lbl>
        <TecnicosInput tecnicos={tecnicos} value={datos.tecnicosIds?.length ? datos.tecnicosIds : [sessionId]} creatorId={sessionId} onChange={(ids) => upd("tecnicosIds", ids)} />
      </div>
    )}
    <div className="grid grid-cols-2 gap-3">
      <div><Lbl req>Inicio</Lbl><input type="datetime-local" value={datos.fechaInicio ?? ""} onChange={(e) => upd("fechaInicio", e.target.value)} className={ic} required /></div>
      <div><Lbl>Fin</Lbl><input type="datetime-local" value={datos.fechaFin ?? ""} onChange={(e) => upd("fechaFin", e.target.value)} className={ic} /></div>
    </div>
    <div><Lbl req>Descripción</Lbl><textarea value={datos.descripcion ?? ""} onChange={(e) => upd("descripcion", e.target.value)} className={ta} required /></div>
    <div><Lbl req>Trabajo Realizado</Lbl><textarea value={datos.trabajoRealizado ?? ""} onChange={(e) => upd("trabajoRealizado", e.target.value)} className={ta} required /></div>
    <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
    <div className="border-t border-[#e8e9eb] pt-3 mt-1">
      <Lbl>Imágenes</Lbl>
      <ImageDropzone files={imageFiles} onChange={setImageFiles} />
    </div>
    <RepuestosInline datos={datos} setDatos={setDatos} />
  </>;
}

function GenericoF({ datos, upd, tecnicos, sessionId }: any) {
  return <>
    {tecnicos?.length > 0 && sessionId && (
      <div>
        <Lbl>Técnicos</Lbl>
        <TecnicosInput tecnicos={tecnicos} value={datos.tecnicosIds?.length ? datos.tecnicosIds : [sessionId]} creatorId={sessionId} onChange={(ids: string[]) => upd("tecnicosIds", ids)} />
      </div>
    )}
    <div>
      <Lbl>Contenido</Lbl>
      <textarea value={datos.contenido ?? ""} onChange={(e) => upd("contenido", e.target.value)} className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white resize-y min-h-[200px]" placeholder="Escribí el contenido del documento..." />
    </div>
  </>;
}
