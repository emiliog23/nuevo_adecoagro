"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { SidebarTree } from "./SidebarTree";
import { CarpetasTree } from "./CarpetasTree";
import { ROLE_LABELS } from "@/lib/utils";
import type { Role } from "@/lib/utils";
import { NotificationBell } from "@/components/NotificationBell";
import { COLOR_DOT, avatarTextClass } from "@/components/UserDot";

interface NavItem { href: string; label: string; icon: React.ReactNode; }

const TIPOS_DOC = [
  { tipo: "",                      label: "Todos" },
  { tipo: "REPORTE_INTERVENCION",  label: "Reportes de Intervención" },
  { tipo: "MEJORA_MODIFICACION",   label: "Mejoras y Modificaciones" },
  { tipo: "ORDEN_TRABAJO",         label: "Órdenes de Trabajo" },
  { tipo: "CIERRE_TURNO",          label: "Cierres de Turno" },
  { tipo: "DESCARGA_REPUESTOS",    label: "Descargas de Repuestos" },
  { tipo: "GENERICO",              label: "Genericos" },
];

const adminNav: NavItem[] = [
  {
    href: "/admin/usuarios",
    label: "Usuarios",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  },
  {
    href: "/admin/sectores",
    label: "Estructura Planta",
    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);
  const [docsOpen, setDocsOpen] = useState(pathname.startsWith("/documentos"));
  const [showPwd, setShowPwd] = useState(false);

  // ── Resizable sidebar ──────────────────────────────────────────────────────
  const MIN_W = 160;
  const MAX_W = 420;
  const DEFAULT_W = 224; // w-56

  const [width, setWidth] = useState<number>(DEFAULT_W);

  // Restore saved width after hydration (client-only)
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-width");
    if (saved) {
      const parsed = parseInt(saved);
      if (!isNaN(parsed)) setWidth(Math.min(MAX_W, Math.max(MIN_W, parsed)));
    }
  }, []);

  const dragging = useRef(false);
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = true;
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [width]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!dragging.current) return;
      const delta = e.clientX - startX.current;
      const next = Math.min(MAX_W, Math.max(MIN_W, startW.current + delta));
      setWidth(next);
    }
    function onUp() {
      if (!dragging.current) return;
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setWidth((w) => { localStorage.setItem("sidebar-width", String(w)); return w; });
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);
  // ──────────────────────────────────────────────────────────────────────────
  const [archivadosDragOver, setArchivadosDragOver] = useState(false);
  const [archivadosOpen, setArchivadosOpen] = useState(false);
  const isAdmin = ["ADMIN","SUPERVISOR"].includes(session?.user?.role ?? "");

  async function handleDropArchivados(e: React.DragEvent) {
    e.preventDefault();
    setArchivadosDragOver(false);
    const docId = e.dataTransfer.getData("application/doc-id");
    if (!docId) return;
    await fetch(`/api/documentos/${docId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archivado: true }),
    });
    window.dispatchEvent(new CustomEvent("docs-updated"));
  }

  const currentTipo = pathname.startsWith("/documentos") ? (searchParams.get("tipo") ?? "") : null;
  const isArchivados = pathname.startsWith("/documentos") && searchParams.get("archivado") === "true";

  async function handleSignOut() {
    setSigningOut(true);
    await signOut({ redirect: false });
    router.push("/login");
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = pathname.startsWith(item.href);
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-2.5 px-3 py-2 text-sm mb-px transition-colors",
          active ? "text-white font-medium" : "text-[#9ea8b4] hover:text-white hover:bg-[#2e3540]"
        )}
        style={active ? { backgroundColor: "#1C6B30" } : {}}
      >
        {item.icon}
        {item.label}
      </Link>
    );
  }

  return (
    <aside
      className="min-h-screen flex flex-col shrink-0 relative"
      style={{ width: `${width}px`, backgroundColor: "#23282e" }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={onMouseDown}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group"
        title="Arrastrar para redimensionar"
      >
        <div className="absolute right-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-[#1C6B30] transition-colors duration-150" />
      </div>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#2e3540]">
        <p className="text-base font-semibold tracking-tight">
          <span className="text-white">adeco</span>
          <span style={{ color: "#5ab575" }}>agro</span>
        </p>
        <p className="text-[10px] text-[#6b7888] mt-0.5">Mantenimiento</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <div className="px-2 mb-2">
          {/* Documentos con submenu expandible */}
          <div>
            <button
              onClick={() => setDocsOpen((p) => !p)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 text-sm mb-px transition-colors",
                pathname.startsWith("/documentos") && !docsOpen
                  ? "text-white font-medium"
                  : pathname.startsWith("/documentos")
                  ? "text-white"
                  : "text-[#9ea8b4] hover:text-white hover:bg-[#2e3540]"
              )}
              style={pathname.startsWith("/documentos") && !docsOpen ? { backgroundColor: "#1C6B30" } : {}}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span className="flex-1 text-left">Documentos</span>
              <svg className={cn("w-3 h-3 shrink-0 transition-transform", docsOpen ? "rotate-90" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {docsOpen && (
              <div className="ml-2 mb-1">
                {TIPOS_DOC.map(({ tipo, label }) => {
                  const href = tipo ? `/documentos?tipo=${tipo}` : "/documentos";
                  const isActive = !isArchivados && currentTipo === tipo;
                  return (
                    <Link
                      key={tipo || "todos"}
                      href={href}
                      className={cn(
                        "flex items-center gap-2 pl-5 pr-3 py-1.5 text-xs transition-colors mb-px",
                        isActive ? "text-white font-medium" : "text-[#7a8898] hover:text-white hover:bg-[#2e3540]"
                      )}
                      style={isActive ? { backgroundColor: "#1C6B30" } : {}}
                    >
                      <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                      {label}
                    </Link>
                  );
                })}

                <div className="my-1 mx-3 border-t border-[#2e3540]" />

                {/* Archivados — dropdown, collapsed by default */}
                <div>
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setArchivadosDragOver(true); }}
                    onDragLeave={(e) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) setArchivadosDragOver(false); }}
                    onDrop={handleDropArchivados}
                    onClick={() => setArchivadosOpen((p) => !p)}
                    className={cn(
                      "flex items-center gap-2 pl-5 pr-3 py-1.5 text-xs transition-colors mb-px cursor-pointer select-none",
                      isArchivados ? "text-white font-medium" :
                      archivadosDragOver ? "text-white" :
                      "text-[#7a8898] hover:text-white hover:bg-[#2e3540]"
                    )}
                    style={
                      isArchivados && !archivadosOpen ? { backgroundColor: "#1C6B30" } :
                      archivadosDragOver ? { backgroundColor: "#5a3a1a" } :
                      {}
                    }
                  >
                    <svg className="w-3 h-3 shrink-0 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                    </svg>
                    <span className="flex-1">Archivados</span>
                    <svg className={cn("w-3 h-3 shrink-0 transition-transform opacity-60", archivadosOpen ? "rotate-90" : "")} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>

                  {archivadosOpen && (
                    <div className="ml-2">
                      {TIPOS_DOC.map(({ tipo: t, label }) => {
                        const href = t ? `/documentos?archivado=true&tipo=${t}` : "/documentos?archivado=true";
                        const archTipo = searchParams.get("tipo") ?? "";
                        const isActive = isArchivados && archTipo === t;
                        return (
                          <Link
                            key={t || "arch-todos"}
                            href={href}
                            className={cn(
                              "flex items-center gap-2 pl-8 pr-3 py-1.5 text-xs transition-colors mb-px",
                              isActive ? "text-white font-medium" : "text-[#7a8898] hover:text-white hover:bg-[#2e3540]"
                            )}
                            style={isActive ? { backgroundColor: "#1C6B30" } : {}}
                          >
                            <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                            {label}
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Tablero OT */}
          <NavLink item={{
            href: "/tablero",
            label: "Tablero OT",
            icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /></svg>,
          }} />

          {/* Análisis — solo supervisores y admins */}
          {["ADMIN", "SUPERVISOR"].includes(session?.user?.role ?? "") && (
            <NavLink item={{
              href: "/analisis",
              label: "Análisis",
              icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
            }} />
          )}
        </div>

        <div className="px-2 mb-1">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5260] px-3 py-1">Planta</p>
        </div>
        <SidebarTree />

        <div className="mt-3 border-t border-[#2e3540] pt-3">
          <CarpetasTree />
        </div>

        {isAdmin && (
          <div className="px-2 mt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#4a5260] px-3 py-1">Admin</p>
            {adminNav.map((item) => <NavLink key={item.href} item={item} />)}
          </div>
        )}
      </nav>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-[#2e3540]">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-sm flex items-center justify-center text-xs font-bold shrink-0 ${COLOR_DOT[session?.user?.color ?? ""] ?? "bg-slate-400"} ${avatarTextClass(session?.user?.color)}`}>
            {session?.user?.name?.charAt(0).toUpperCase() ?? "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-white truncate">{session?.user?.name}</p>
            <p className="text-[10px] text-[#6b7888] truncate">{ROLE_LABELS[session?.user?.role as Role] ?? session?.user?.role}</p>
            <button
              onClick={() => setShowPwd(true)}
              className="text-[10px] text-[#4a5260] hover:text-[#5ab575] transition-colors mt-0.5 text-left"
            >
              Cambiar contraseña
            </button>
          </div>
          <NotificationBell />
          <button onClick={handleSignOut} disabled={signingOut} title="Salir" className="text-[#4a5260] hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>

      {showPwd && (
        <CambiarPasswordModal
          userId={session?.user?.id as string}
          onClose={() => setShowPwd(false)}
        />
      )}
    </aside>
  );
}

function CambiarPasswordModal({ userId, onClose }: { userId: string; onClose: () => void }) {
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd.length < 6) { setError("Mínimo 6 caracteres"); return; }
    if (pwd !== confirm) { setError("Las contraseñas no coinciden"); return; }
    setSaving(true);
    setError("");
    const res = await fetch(`/api/usuarios/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwd }),
    });
    setSaving(false);
    if (res.ok) { setOk(true); setTimeout(onClose, 1200); }
    else setError("Error al cambiar la contraseña");
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">Cambiar contraseña</h2>
        </div>
        {ok ? (
          <div className="p-6 text-center text-[#1C6B30] font-medium">✓ Contraseña actualizada</div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nueva contraseña</label>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} autoFocus required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar contraseña</label>
              <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30]" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="submit" disabled={saving} className="flex-1 text-white font-medium py-2.5 rounded-lg text-sm" style={{ backgroundColor: "#1C6B30" }}>
                {saving ? "Guardando..." : "Confirmar"}
              </button>
              <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 font-medium py-2.5 rounded-lg text-sm">
                Cancelar
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
