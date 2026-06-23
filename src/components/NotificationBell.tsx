"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TIPO_ICON: Record<string, string> = {
  DOCUMENTO_NUEVO: "📄",
  OT_ASIGNADA: "🔧",
  ESTADO_ACTUALIZADO: "🔄",
  COMENTARIO_NUEVO: "💬",
  REVISION: "👁",
};

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data, mutate } = useSWR("/api/notificaciones", fetcher, {
    refreshInterval: 20000,
    revalidateOnFocus: true,
  });

  const notificaciones = data?.notificaciones ?? [];
  const noLeidas: number = data?.noLeidas ?? 0;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  async function handleOpen() {
    setOpen((p) => !p);
    if (!open && noLeidas > 0) {
      await fetch("/api/notificaciones", { method: "PATCH" });
      mutate();
    }
  }

  function handleClick(n: any) {
    setOpen(false);
    if (n.documentoId) router.push(`/documentos/${n.documentoId}`);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={handleOpen}
        className="relative text-[#4a5260] hover:text-white transition-colors p-1"
        title="Notificaciones"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
            {noLeidas > 9 ? "9+" : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute bottom-8 left-0 w-80 bg-[#1e2530] border border-[#2e3540] shadow-2xl z-50">
          <div className="px-4 py-2.5 border-b border-[#2e3540] flex items-center justify-between">
            <span className="text-xs font-semibold text-white uppercase tracking-wider">Notificaciones</span>
            {notificaciones.length > 0 && (
              <button onClick={async () => { await fetch("/api/notificaciones", { method: "PATCH" }); mutate(); }}
                className="text-[10px] text-[#5ab575] hover:underline">
                Marcar todo leído
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <p className="text-xs text-[#6b7888] text-center py-6">Sin notificaciones</p>
            ) : (
              notificaciones.map((n: any) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-[#2e3540] hover:bg-[#2e3540] transition-colors flex gap-2.5 items-start ${!n.leida ? "bg-[#1a2d1e]" : ""}`}
                >
                  <span className="text-sm shrink-0 mt-0.5">{TIPO_ICON[n.tipo] ?? "🔔"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs leading-snug ${!n.leida ? "text-white font-medium" : "text-[#9ea8b4]"}`}>
                      {n.mensaje}
                    </p>
                    <p className="text-[10px] text-[#4a5260] mt-0.5">
                      {format(new Date(n.createdAt), "d MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  {!n.leida && <span className="w-1.5 h-1.5 bg-[#5ab575] rounded-full shrink-0 mt-1.5" />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
