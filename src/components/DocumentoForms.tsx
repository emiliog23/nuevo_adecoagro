"use client";

import { useState } from "react";
import { TecnicosInput } from "@/components/TecnicosInput";
import { ImageDropzone } from "@/components/ImageDropzone";

export const ic   = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white";
export const ta   = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white resize-y min-h-[72px]";
export const se   = "w-full px-3 py-1.5 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white";
export const celda = "px-2 py-1 border border-[#d4d6d8] text-sm focus:outline-none focus:border-[#1C6B30] w-full";
export const REPUESTO_VACIO = () => ({ codigo: "", nombre: "", cantidad: "", estanteria: "", estante: "", cajon: "" });

export function Lbl({ children, req }: { children: React.ReactNode; req?: boolean }) {
  return (
    <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">
      {children}{req && " *"}
    </label>
  );
}

export function RepuestosInline({ datos, setDatos }: { datos: any; setDatos: React.Dispatch<React.SetStateAction<any>> }) {
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
              <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                className="absolute top-2 right-2 text-[#9ea3aa] hover:text-red-500 disabled:opacity-30 text-xs">✕</button>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <div className="col-span-2"><Lbl>Nombre</Lbl><input value={item.nombre} onChange={(e) => updItem(idx, "nombre", e.target.value)} className={celda} required={show} /></div>
                <div><Lbl>Código</Lbl><input value={item.codigo ?? ""} onChange={(e) => updItem(idx, "codigo", e.target.value)} className={celda} /></div>
                <div><Lbl>Cantidad</Lbl><input type="number" min="0.01" step="any" value={item.cantidad} onChange={(e) => updItem(idx, "cantidad", e.target.value)} className={celda} /></div>
                <div><Lbl>Estantería</Lbl><input value={item.estanteria} onChange={(e) => updItem(idx, "estanteria", e.target.value)} className={celda} /></div>
                <div><Lbl>Estante</Lbl><input value={item.estante} onChange={(e) => updItem(idx, "estante", e.target.value)} className={celda} /></div>
                <div><Lbl>Cajón</Lbl><input value={item.cajon} onChange={(e) => updItem(idx, "cajon", e.target.value)} className={celda} /></div>
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

interface FormProps {
  datos: Record<string, any>;
  upd: (k: string, v: any) => void;
  setDatos?: React.Dispatch<React.SetStateAction<any>>;
  imageFiles?: File[];
  setImageFiles?: React.Dispatch<React.SetStateAction<File[]>>;
  tecnicos?: any[] | undefined;
  sessionId?: string;
  mode?: "create" | "edit";
}

export function ReporteF({ datos, upd, setDatos, imageFiles, setImageFiles, tecnicos, sessionId, mode = "create" }: FormProps) {
  return <>
    {(tecnicos?.length ?? 0) > 0 && sessionId && (
      <div>
        <Lbl>Técnicos</Lbl>
        <TecnicosInput tecnicos={tecnicos!} value={datos.tecnicosIds?.length ? datos.tecnicosIds : [sessionId]}
          creatorId={sessionId} onChange={(ids) => upd("tecnicosIds", ids)} />
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
    {imageFiles !== undefined && setImageFiles && (
      <div className="border-t border-[#e8e9eb] pt-3 mt-1">
        <Lbl>Imágenes</Lbl>
        <ImageDropzone files={imageFiles} onChange={setImageFiles} />
      </div>
    )}
    {mode === "create" && setDatos && <RepuestosInline datos={datos} setDatos={setDatos} />}
  </>;
}

export function MejoraF({ datos, upd, setDatos, imageFiles, setImageFiles, tecnicos, sessionId, mode = "create" }: FormProps) {
  return <>
    {(tecnicos?.length ?? 0) > 0 && sessionId && (
      <div>
        <Lbl>Técnicos</Lbl>
        <TecnicosInput tecnicos={tecnicos!} value={datos.tecnicosIds?.length ? datos.tecnicosIds : [sessionId]}
          creatorId={sessionId} onChange={(ids) => upd("tecnicosIds", ids)} />
      </div>
    )}
    <div className="grid grid-cols-2 gap-3">
      <div><Lbl req>Inicio</Lbl><input type="datetime-local" value={datos.fechaInicio ?? ""} onChange={(e) => upd("fechaInicio", e.target.value)} className={ic} required /></div>
      <div><Lbl>Fin</Lbl><input type="datetime-local" value={datos.fechaFin ?? ""} onChange={(e) => upd("fechaFin", e.target.value)} className={ic} /></div>
    </div>
    <div><Lbl req>Descripción</Lbl><textarea value={datos.descripcion ?? ""} onChange={(e) => upd("descripcion", e.target.value)} className={ta} required /></div>
    <div><Lbl req>Trabajo Realizado</Lbl><textarea value={datos.trabajoRealizado ?? ""} onChange={(e) => upd("trabajoRealizado", e.target.value)} className={ta} required /></div>
    <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
    {imageFiles !== undefined && setImageFiles && (
      <div className="border-t border-[#e8e9eb] pt-3 mt-1">
        <Lbl>Imágenes</Lbl>
        <ImageDropzone files={imageFiles} onChange={setImageFiles} />
      </div>
    )}
    {mode === "create" && setDatos && <RepuestosInline datos={datos} setDatos={setDatos} />}
  </>;
}

export function GenericoF({ datos, upd, tecnicos, sessionId }: FormProps) {
  return <>
    {(tecnicos?.length ?? 0) > 0 && sessionId && (
      <div>
        <Lbl>Técnicos</Lbl>
        <TecnicosInput tecnicos={tecnicos!} value={datos.tecnicosIds?.length ? datos.tecnicosIds : [sessionId]}
          creatorId={sessionId} onChange={(ids: string[]) => upd("tecnicosIds", ids)} />
      </div>
    )}
    <div>
      <Lbl>Contenido</Lbl>
      <textarea value={datos.contenido ?? ""} onChange={(e) => upd("contenido", e.target.value)}
        className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white resize-y min-h-[200px]"
        placeholder="Escribí el contenido del documento..." />
    </div>
  </>;
}

export function OrdenF({ datos, upd, tecnicos, imageFiles, setImageFiles }: FormProps) {
  return <>
    {(tecnicos?.length ?? 0) > 0 && (
      <div>
        <Lbl>Técnicos</Lbl>
        <TecnicosInput tecnicos={tecnicos!} value={datos.tecnicosIds ?? []} creatorId=""
          onChange={(ids) => upd("tecnicosIds", ids)} />
      </div>
    )}
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
    <div><Lbl>Vencimiento</Lbl><input type="date" value={datos.fechaVencimiento ?? ""} onChange={(e) => upd("fechaVencimiento", e.target.value)} className={ic} /></div>
    <div><Lbl>Observaciones</Lbl><textarea value={datos.observaciones ?? ""} onChange={(e) => upd("observaciones", e.target.value)} className={ta} /></div>
    {imageFiles !== undefined && setImageFiles && (
      <div className="border-t border-[#e8e9eb] pt-3 mt-1">
        <Lbl>Imágenes</Lbl>
        <ImageDropzone files={imageFiles} onChange={setImageFiles} />
      </div>
    )}
  </>;
}

const TURNO_RANGES: Record<string, string> = { MANANA: "04:00 – 11:59", TARDE: "12:00 – 19:59", NOCHE: "20:00 – 03:59" };
const TURNO_LABEL_MAP: Record<string, string> = { MANANA: "Mañana", TARDE: "Tarde", NOCHE: "Noche" };

export function getTurnoFromHora(fechaLocalStr: string): "MANANA" | "TARDE" | "NOCHE" {
  if (!fechaLocalStr) return "NOCHE";
  const hora = new Date(fechaLocalStr).getHours();
  if (hora >= 4 && hora < 12) return "MANANA";
  if (hora >= 12 && hora < 20) return "TARDE";
  return "NOCHE";
}

export function CierreF({ datos, upd, setDatos, mode = "create" }: FormProps) {
  const turnoDetectado = getTurnoFromHora(datos.fecha ?? "");
  return <>
    <div className="grid grid-cols-2 gap-3">
      <div>
        <Lbl req>Fecha y Hora</Lbl>
        <input type="datetime-local" value={datos.fecha ?? ""} onChange={(e) => upd("fecha", e.target.value)} className={ic} required />
      </div>
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider mb-1 invisible">placeholder</label>
        <div className="px-3 py-1.5 border border-[#d4d6d8] bg-[#f7f8f9] text-sm text-[#1d2023] flex items-center justify-between">
          <span className="font-semibold">Turno {TURNO_LABEL_MAP[turnoDetectado]}</span>
          <span className="text-xs text-[#9ea3aa]">{TURNO_RANGES[turnoDetectado]}</span>
        </div>
      </div>
    </div>
    <div><Lbl req>Novedades</Lbl><textarea value={datos.novedades ?? ""} onChange={(e) => upd("novedades", e.target.value)} className={ta} required /></div>
    <div><Lbl>Trabajos Realizados</Lbl><textarea value={datos.trabajosRealizados ?? ""} onChange={(e) => upd("trabajosRealizados", e.target.value)} className={ta} /></div>
    <div><Lbl>Pendientes</Lbl><textarea value={datos.pendientes ?? ""} onChange={(e) => upd("pendientes", e.target.value)} className={ta} /></div>
    {mode === "create" && setDatos && <RepuestosInline datos={datos} setDatos={setDatos} />}
  </>;
}

export function DescargaF({ datos, upd, setDatos }: FormProps) {
  const items: any[] = datos.items ?? [];
  const updItem = (idx: number, k: string, v: any) =>
    setDatos!((p: any) => ({ ...p, items: p.items.map((it: any, i: number) => i === idx ? { ...it, [k]: v } : it) }));
  const addItem = () => setDatos!((p: any) => ({ ...p, items: [...(p.items ?? []), REPUESTO_VACIO()] }));
  const removeItem = (idx: number) => setDatos!((p: any) => ({ ...p, items: p.items.filter((_: any, i: number) => i !== idx) }));

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

/** Convierte un string datetime-local (hora local del browser) a UTC ISO. */
export function localToUTC(s: string | null | undefined): string | undefined {
  if (!s) return undefined;
  return new Date(s).toISOString();
}
