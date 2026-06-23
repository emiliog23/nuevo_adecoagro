"use client";

import { useState, useRef } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useSession } from "next-auth/react";
import { UserDot, COLOR_DOT, avatarTextClass } from "@/components/UserDot";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function ComentariosSection({ documentoId }: { documentoId: string }) {
  const { data: session } = useSession();
  const { data: comentarios = [], mutate } = useSWR(
    `/api/documentos/${documentoId}/comentarios`,
    fetcher,
    { refreshInterval: 15000 }
  );

  const [texto, setTexto] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canDelete = (userId: string) =>
    userId === (session?.user?.id as string) ||
    ["ADMIN", "SUPERVISOR"].includes(session?.user?.role as string);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim() && pendingFiles.length === 0) return;
    setSaving(true);

    // 1. Create the comment
    const res = await fetch(`/api/documentos/${documentoId}/comentarios`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contenido: texto.trim() || " " }),
    });

    if (res.ok && pendingFiles.length > 0) {
      const comment = await res.json();
      // 2. Upload images linked to this comment
      const form = new FormData();
      pendingFiles.forEach((f) => form.append("files", f));
      form.append("comentarioId", comment.id);
      await fetch(`/api/documentos/${documentoId}/imagenes`, { method: "POST", body: form });
    }

    setTexto("");
    setPendingFiles([]);
    setSaving(false);
    mutate();
  }

  async function deleteComentario(id: string) {
    if (!confirm("¿Eliminar comentario?")) return;
    await fetch(`/api/documentos/${documentoId}/comentarios?cid=${id}`, { method: "DELETE" });
    mutate();
  }

  const previews = pendingFiles.map((f) => URL.createObjectURL(f));

  return (
    <div className="bg-white border border-[#d4d6d8] mt-4">
      <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8]">
        <h3 className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">
          Comentarios {comentarios.length > 0 && `(${comentarios.length})`}
        </h3>
      </div>

      {/* Lista */}
      {comentarios.length > 0 && (
        <div className="divide-y divide-[#e8e9eb]">
          {comentarios.map((c: any) => (
            <div key={c.id} className="px-4 py-3 flex gap-3">
              <div className={`w-7 h-7 text-white text-xs font-bold flex items-center justify-center shrink-0 ${COLOR_DOT[c.user.color ?? ""] ?? "bg-slate-400"} ${avatarTextClass(c.user.color)}`}>
                {c.user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-[#1d2023]">
                    <UserDot color={c.user.color} />
                    {c.user.name}
                  </span>
                  <span className="text-[10px] text-[#9ea3aa]">
                    {format(new Date(c.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
                  </span>
                </div>
                {c.contenido.trim() && (
                  <p className="text-sm text-[#1d2023] whitespace-pre-wrap">{c.contenido}</p>
                )}
                {/* Imágenes adjuntas al comentario */}
                {c.imagenes?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {c.imagenes.map((img: any) => (
                      <ComentarioImagen key={img.id} img={img} documentoId={documentoId} onDelete={() => mutate()} />
                    ))}
                  </div>
                )}
              </div>
              {canDelete(c.userId) && (
                <button onClick={() => deleteComentario(c.id)} className="text-[#d4d6d8] hover:text-red-400 text-xs mt-0.5 shrink-0">✕</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Form */}
      <form onSubmit={submit} className="px-4 py-3 border-t border-[#e8e9eb]">
        <div className="flex gap-3">
          <div className={`w-7 h-7 text-white text-xs font-bold flex items-center justify-center shrink-0 ${COLOR_DOT[session?.user?.color ?? ""] ?? "bg-slate-400"} ${avatarTextClass(session?.user?.color)}`}>
            {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e as any); }}
              placeholder="Escribí un comentario... (Ctrl+Enter para enviar)"
              className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white resize-none"
              rows={2}
            />

            {/* Image previews */}
            {previews.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" className="w-14 h-14 object-cover border border-[#d4d6d8]" />
                    <button type="button" onClick={() => setPendingFiles((p) => p.filter((_, i) => i !== idx))}
                      className="absolute top-0 right-0 hidden group-hover:flex w-4 h-4 bg-black/60 text-white text-[9px] items-center justify-center">✕</button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between mt-1.5">
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 text-xs text-[#9ea3aa] hover:text-[#5a5f67] transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Imagen
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                onChange={(e) => { if (e.target.files) { setPendingFiles((p) => [...p, ...Array.from(e.target.files!).filter(f => f.type.startsWith("image/"))]); e.target.value = ""; } }} />
              <button type="submit" disabled={saving || (!texto.trim() && pendingFiles.length === 0)}
                className="text-xs font-semibold text-white px-4 py-1.5 disabled:opacity-40"
                style={{ backgroundColor: "#1C6B30" }}>
                {saving ? "Enviando..." : "Comentar"}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

function ComentarioImagen({ img, documentoId, onDelete }: { img: any; documentoId: string; onDelete: () => void }) {
  const [lightbox, setLightbox] = useState(false);

  async function del() {
    if (!confirm("¿Eliminar imagen?")) return;
    await fetch(`/api/documentos/${documentoId}/imagenes?iid=${img.id}`, { method: "DELETE" });
    onDelete();
  }

  return (
    <>
      <div className="relative group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.nombre} className="w-16 h-16 object-cover border border-[#d4d6d8] cursor-pointer hover:opacity-80" onClick={() => setLightbox(true)} />
        <button onClick={del} className="absolute top-0 right-0 hidden group-hover:flex w-4 h-4 bg-black/60 text-white text-[9px] items-center justify-center">✕</button>
      </div>
      {lightbox && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightbox(false)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" className="max-w-full max-h-[90vh] object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightbox(false)} className="absolute top-4 right-4 text-white bg-black/50 w-8 h-8 flex items-center justify-center text-lg">✕</button>
        </div>
      )}
    </>
  );
}
