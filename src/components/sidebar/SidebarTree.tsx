"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface Maquina   { id: string; nombre: string; }
interface Linea     { id: string; nombre: string; maquinas: Maquina[]; }
interface Subsector { id: string; nombre: string; lineas: Linea[]; }
interface Sector    { id: string; nombre: string; subsectores: Subsector[]; }
interface Fabrica   { id: string; nombre: string; sectores: Sector[]; }

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg className={cn("w-2.5 h-2.5 shrink-0 transition-transform", open ? "rotate-90" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

const BTN = "flex items-center gap-1.5 py-1.5 rounded-lg text-xs transition-colors select-none";

export function SidebarTree() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [fabricas, setFabricas] = useState<Fabrica[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  const activeSectorId    = searchParams.get("sectorId");
  const activeSubsectorId = searchParams.get("subsectorId");
  const activeLineaId     = searchParams.get("lineaId");

  const fetchTree = useCallback(() => {
    fetch("/api/fabricas")
      .then((r) => r.json())
      .then((data: Fabrica[]) => {
        setFabricas(data);
        setOpen((prev) => {
          if (Object.keys(prev).length > 0) return prev;
          const init: Record<string, boolean> = {};
          if (data[0]) { init[data[0].id] = true; }
          return init;
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchTree();
    window.addEventListener("plant-updated", fetchTree);
    return () => window.removeEventListener("plant-updated", fetchTree);
  }, [fetchTree]);

  function toggle(id: string) { setOpen((p) => ({ ...p, [id]: !p[id] })); }

  function nav(param: string, id: string, nombre: string) {
    router.push(`/documentos?${param}=${id}&label=${encodeURIComponent(nombre)}`);
  }

  function isActive(bg: boolean, param: string, id: string) {
    return bg && searchParams.get(param) === id;
  }

  function rowStyle(active: boolean, isOver = false) {
    return active ? { backgroundColor: "#1C6B30" }
      : isOver ? { backgroundColor: "#2e5c3a" }
      : {};
  }

  function rowClass(active: boolean) {
    return active ? "text-white" : "text-[#9ea8b4] hover:text-white";
  }

  if (loading) {
    return (
      <div className="px-6 py-2 space-y-2">
        {[1, 2, 3].map(i => <div key={i} className="h-2.5 rounded animate-pulse" style={{ backgroundColor: "#2e3540", width: `${60 + i * 10}%` }} />)}
      </div>
    );
  }

  if (fabricas.length === 0) {
    return <p className="px-6 py-2 text-[10px] text-[#4a5260]">Sin plantas</p>;
  }

  return (
    <div className="px-3">
      {fabricas.map((fab) => (
        <div key={fab.id}>
          {/* FÁBRICA */}
          <div
            className={cn(BTN, "px-3", rowClass(false))}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#2e3540")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
          >
            <button onClick={() => toggle(fab.id)} className="shrink-0 text-[#4a5260] hover:text-white p-0.5">
              <ChevronIcon open={!!open[fab.id]} />
            </button>
            <svg className="w-3.5 h-3.5 shrink-0 text-[#4a5260]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 21h18M3 7l9-4 9 4M4 11h16M9 11v10M15 11v10M4 21V7M20 21V7" />
            </svg>
            <span className="flex-1 truncate font-semibold text-white text-sm">{fab.nombre}</span>
          </div>

          {open[fab.id] && (
            <div className="ml-3">
              {fab.sectores.map((sector) => {
                const secActive = activeSectorId === sector.id;
                return (
                  <div key={sector.id}>
                    {/* SECTOR */}
                    <div
                      className={cn(BTN, "px-3", rowClass(secActive))}
                      style={rowStyle(secActive)}
                      onMouseEnter={(e) => { if (!secActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#2e3540"; }}
                      onMouseLeave={(e) => { if (!secActive) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                    >
                      <button onClick={() => toggle(sector.id)} className="shrink-0 text-[#4a5260] hover:text-white p-0.5">
                        <ChevronIcon open={!!open[sector.id]} />
                      </button>
                      <svg className="w-3.5 h-3.5 shrink-0 text-[#4a5260]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <button onClick={() => nav("sectorId", sector.id, sector.nombre)} className="flex-1 text-left truncate font-medium hover:text-white">
                        {sector.nombre}
                      </button>
                    </div>

                    {open[sector.id] && (
                      <div className="ml-3">
                        {sector.subsectores.map((sub) => {
                          const subActive = activeSubsectorId === sub.id;
                          return (
                            <div key={sub.id}>
                              {/* SUBSECTOR */}
                              <div
                                className={cn(BTN, "px-3", rowClass(subActive))}
                                style={rowStyle(subActive)}
                                onMouseEnter={(e) => { if (!subActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#2e3540"; }}
                                onMouseLeave={(e) => { if (!subActive) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                              >
                                <button onClick={() => toggle(sub.id)} className="shrink-0 text-[#4a5260] hover:text-white p-0.5">
                                  <ChevronIcon open={!!open[sub.id]} />
                                </button>
                                <svg className="w-3 h-3 shrink-0 text-[#4a5260]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <button onClick={() => nav("subsectorId", sub.id, sub.nombre)} className="flex-1 text-left truncate hover:text-white">
                                  {sub.nombre}
                                </button>
                              </div>

                              {open[sub.id] && (
                                <div className="ml-3">
                                  {sub.lineas.map((linea) => {
                                    const lineaActive = activeLineaId === linea.id;
                                    return (
                                      <div key={linea.id}>
                                        {/* LÍNEA */}
                                        <div
                                          className={cn(BTN, "px-3", rowClass(lineaActive))}
                                          style={rowStyle(lineaActive)}
                                          onMouseEnter={(e) => { if (!lineaActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#2e3540"; }}
                                          onMouseLeave={(e) => { if (!lineaActive) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                                        >
                                          <button onClick={() => toggle(linea.id)} className="shrink-0 text-[#4a5260] hover:text-white p-0.5">
                                            <ChevronIcon open={!!open[linea.id]} />
                                          </button>
                                          <svg className="w-3 h-3 shrink-0 text-[#4a5260]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                          </svg>
                                          <button onClick={() => nav("lineaId", linea.id, linea.nombre)} className="flex-1 text-left truncate hover:text-white">
                                            {linea.nombre}
                                          </button>
                                        </div>

                                        {open[linea.id] && (
                                          <div className="ml-3">
                                            {linea.maquinas.map((m) => {
                                              const maqActive = pathname === `/maquinas/${m.id}`;
                                              return (
                                                <Link
                                                  key={m.id}
                                                  href={`/maquinas/${m.id}`}
                                                  className={cn(BTN, "px-3", maqActive ? "text-white" : "text-[#7a8898] hover:text-white")}
                                                  style={maqActive ? { backgroundColor: "#1C6B30" } : {}}
                                                  onMouseEnter={(e) => { if (!maqActive) (e.currentTarget as HTMLElement).style.backgroundColor = "#2e3540"; }}
                                                  onMouseLeave={(e) => { if (!maqActive) (e.currentTarget as HTMLElement).style.backgroundColor = ""; }}
                                                >
                                                  <svg className="w-3 h-3 shrink-0 opacity-50 ml-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                  </svg>
                                                  <span className="truncate">{m.nombre}</span>
                                                </Link>
                                              );
                                            })}
                                            {linea.maquinas.length === 0 && (
                                              <p className="px-3 py-1 text-[10px] text-[#3a4250]">Sin máquinas</p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                  {sub.lineas.length === 0 && <p className="px-3 py-1 text-[10px] text-[#3a4250]">Sin líneas</p>}
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {sector.subsectores.length === 0 && <p className="px-3 py-1 text-[10px] text-[#3a4250]">Sin subsectores</p>}
                      </div>
                    )}
                  </div>
                );
              })}
              {fab.sectores.length === 0 && <p className="px-3 py-1 text-[10px] text-[#3a4250]">Sin sectores</p>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
