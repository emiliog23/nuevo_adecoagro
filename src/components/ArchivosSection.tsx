"use client";

import { useRef, useState } from "react";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const EXT_ICON: Record<string, string> = {
  docx: "📄", doc: "📄", xlsx: "📊", xls: "📊", pdf: "📕", txt: "📃",
};

function extIcon(nombre: string) {
  const ext = nombre.split(".").pop()?.toLowerCase() ?? "";
  return EXT_ICON[ext] ?? "📎";
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}

export function ArchivosSection({ documentoId }: { documentoId: string }) {
  const { data: archivos = [], mutate } = useSWR(`/api/documentos/${documentoId}/archivos`, fetcher);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    const form = new FormData();
    Array.from(files).forEach((f) => form.append("files", f));
    await fetch(`/api/documentos/${documentoId}/archivos`, { method: "POST", body: form });
    mutate();
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function deleteArchivo(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return;
    await fetch(`/api/documentos/${documentoId}/archivos?aid=${id}`, { method: "DELETE" });
    mutate();
  }

  return (
    <div className="bg-white border border-[#d4d6d8] mt-4">
      <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8] flex items-center justify-between">
        <h3 className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">
          Archivos {archivos.length > 0 && `(${archivos.length})`}
        </h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="text-xs font-semibold text-white px-3 py-1 disabled:opacity-50"
          style={{ backgroundColor: "#1C6B30" }}
        >
          {uploading ? "Subiendo..." : "+ Adjuntar archivo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".docx,.doc,.xlsx,.xls,.pdf,.txt"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {archivos.length === 0 ? (
        <div
          className="m-4 p-6 border-2 border-dashed border-[#d4d6d8] text-center cursor-pointer hover:border-[#1C6B30] transition-colors"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
        >
          <p className="text-sm text-[#9ea3aa]">Arrastrá o hacé click · Word, Excel, PDF</p>
        </div>
      ) : (
        <div className="divide-y divide-[#e8e9eb]">
          {archivos.map((a: any) => (
            <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="text-xl shrink-0">{extIcon(a.nombre)}</span>
              <div className="flex-1 min-w-0">
                <a href={a.url} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium text-[#1C6B30] hover:underline truncate block">
                  {a.nombre}
                </a>
                <p className="text-[10px] text-[#9ea3aa]">{fmtSize(a.size)}</p>
              </div>
              <a href={a.url} download={a.nombre} className="text-[#9ea3aa] hover:text-[#1C6B30] transition-colors" title="Descargar">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </a>
              <button onClick={() => deleteArchivo(a.id, a.nombre)} className="text-[#d4d6d8] hover:text-red-400 transition-colors text-xs">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
