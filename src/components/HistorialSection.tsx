"use client";

import useSWR from "swr";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { COLOR_DOT } from "@/components/UserDot";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function HistorialSection({ documentoId }: { documentoId: string }) {
  const { data: historial = [] } = useSWR(`/api/documentos/${documentoId}/historial`, fetcher);

  if (historial.length === 0) return null;

  return (
    <div className="bg-white border border-[#d4d6d8] mt-4">
      <div className="px-4 py-2.5 bg-[#f7f8f9] border-b border-[#d4d6d8]">
        <h3 className="text-xs font-semibold text-[#5a5f67] uppercase tracking-wider">
          Historial de cambios ({historial.length})
        </h3>
      </div>
      <div className="divide-y divide-[#e8e9eb]">
        {historial.map((h: any) => (
          <div key={h.id} className="flex items-center gap-2.5 px-4 py-2.5">
            <div className={`w-6 h-6 text-white text-[9px] font-bold flex items-center justify-center shrink-0 ${COLOR_DOT[h.editadoPor?.color ?? ""] ?? "bg-slate-400"}`}>
              {h.editadoPor?.name?.charAt(0) ?? "?"}
            </div>
            <span className="text-xs text-[#1d2023] flex-1">
              <span className="font-medium">{h.editadoPor?.name}</span> editó el documento
            </span>
            <span className="text-[10px] text-[#9ea3aa] shrink-0">
              {format(new Date(h.createdAt), "d MMM, HH:mm", { locale: es })}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
