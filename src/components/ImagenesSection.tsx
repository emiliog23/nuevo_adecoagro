"use client";

import { useRef, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  documentoId: string;
  comentarioId?: string;        // when used inside a comment
  compact?: boolean;            // smaller variant for comments
}

export function ImagenesSection({ documentoId, comentarioId, compact }: Props) {
  const swrKey = comentarioId
    ? `/api/documentos/${documentoId}/imagenes?cid=${comentarioId}`
    : `/api/documentos/${documentoId}/imagenes`;

  const { data: imagenes = [], mutate } = useSWR(swrKey, fetcher);

  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    if (comentarioId) form.append("comentarioId", comentarioId);
    await fetch(`/api/documentos/${documentoId}/imagenes`, { method: "POST", body: form });
    mutate();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function deleteImagen(id: string) {
    if (!confirm("¿Eliminar imagen?")) return;
    await fetch(`/api/documentos/${documentoId}/imagenes?iid=${id}`, { method: "DELETE" });
    mutate();
  }

  if (compact) {
    // Compact mode: just thumbnails + add button, used inside comments
    return (
      <div>
        {imagenes.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {imagenes.map((img: any) => (
              <div key={img.id} className="relative group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.nombre}
                  className="w-16 h-16 object-cover border border-[#d4d6d8] cursor-pointer hover:opacity-80"
                  onClick={() => setLightbox(img.url)}
                />
                <button
                  onClick={() => deleteImagen(img.id)}
                  className="absolute top-0 right-0 hidden group-hover:flex w-4 h-4 bg-black/60 text-white text-[9px] items-center justify-center"
                >✕</button>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="mt-1.5 text-xs text-[#9ea3aa] hover:text-[#5a5f67] flex items-center gap-1 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          {uploading ? "Subiendo..." : "Adjuntar imagen"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />

        {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
      </div>
    );
  }

  // Full mode: section with header, used in document detail
  return (
    <div className="bg-white border border-[#d4d6d8] mt-4">
      <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">
          Imágenes {imagenes.length > 0 && `(${imagenes.length})`}
        </h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-semibold text-white px-3 py-1 disabled:opacity-50"
          style={{ backgroundColor: "#1C6B30" }}
        >
          {uploading ? "Subiendo..." : "+ Subir imagen"}
        </button>
        <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>

      {imagenes.length === 0 ? (
        <div
          className="p-8 text-center border-2 border-dashed border-[#d4d6d8] m-4 cursor-pointer hover:border-[#1C6B30] transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <svg className="w-8 h-8 text-[#d4d6d8] mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm text-[#9ea3aa]">Arrastrá imágenes aquí o hacé click</p>
          <p className="text-xs text-[#d4d6d8] mt-1">PNG, JPG, WEBP · máx. 10 MB</p>
        </div>
      ) : (
        <div
          className="p-4 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          {imagenes.map((img: any) => (
            <div key={img.id} className="relative group border border-[#d4d6d8]">
              <div className="relative w-full" style={{ paddingBottom: "75%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt={img.nombre}
                  className="absolute inset-0 w-full h-full object-cover cursor-pointer hover:opacity-90"
                  onClick={() => setLightbox(img.url)}
                />
              </div>
              <div className="px-1.5 py-1 border-t border-[#e8e9eb] flex items-center justify-between">
                <span className="text-[10px] text-[#9ea3aa] truncate">{img.nombre}</span>
                <button onClick={() => deleteImagen(img.id)} className="text-[#d4d6d8] hover:text-red-400 text-xs ml-1 shrink-0">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lightbox && <Lightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}

function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-w-full max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
      <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/50 w-8 h-8 flex items-center justify-center text-lg">✕</button>
    </div>
  );
}
