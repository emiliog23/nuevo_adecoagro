"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { ROLE_LABELS } from "@/lib/utils";
import type { Role } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const COLOR_BG: Record<string, string> = {
  AZUL: "bg-blue-500",
  ROJO: "bg-red-500",
  VERDE: "bg-green-600",
  AMARILLO: "bg-yellow-400",
  BLANCO:   "bg-white border border-gray-300",
};
const COLOR_LABEL: Record<string, string> = {
  AZUL: "Azul", ROJO: "Rojo", VERDE: "Verde", AMARILLO: "Amarillo", BLANCO: "Central",
};

export default function UsuariosPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    if (session && !["ADMIN","SUPERVISOR"].includes(session.user.role)) {
      router.replace("/");
    }
  }, [session, router]);

  async function fetchUsuarios() {
    const res = await fetch("/api/usuarios");
    if (res.ok) setUsuarios(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchUsuarios(); }, []);

  async function handleToggleActivo(u: any) {
    await fetch(`/api/usuarios/${u.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...u, activo: !u.activo }),
    });
    fetchUsuarios();
  }

  async function handleSave(data: any) {
    const method = editing ? "PUT" : "POST";
    const url = editing ? `/api/usuarios/${editing.id}` : "/api/usuarios";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      setShowForm(false);
      setEditing(null);
      fetchUsuarios();
    }
  }

  const roleColors: Record<string, string> = {
    ADMIN: "bg-slate-100 text-slate-600",
    SUPERVISOR: "bg-[#e8f2eb] text-[#155024]",
    TECNICO: "bg-slate-100 text-slate-700",
    VIEWER: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Usuarios</h1>
          <p className="text-slate-500 text-sm mt-0.5">{usuarios.length} usuarios registrados</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true); }}
          className="bg-[#1C6B30] hover:bg-[#155024] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {/* Roles info */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(ROLE_LABELS).map(([role, label]) => (
          <div key={role} className="bg-white rounded-xl border border-slate-200 p-4">
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${roleColors[role]}`}>{label}</span>
            <p className="text-xs text-slate-400 mt-2">
              {role === "ADMIN" && "Acceso total al sistema"}
              {role === "SUPERVISOR" && "Gestión de documentos y planta"}
              {role === "TECNICO" && "Crear y editar documentos"}
              {role === "VIEWER" && "Solo lectura"}
            </p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Nombre</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Usuario</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Rol</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Color</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3">Estado</th>
                <th className="text-left text-xs font-medium text-slate-500 px-4 py-3 hidden lg:table-cell">Creado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${COLOR_BG[u.color] ?? "bg-slate-400"}`}>
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-slate-800">{u.name}</span>
                      {u.id === session?.user?.id && (
                        <span className="text-[10px] text-[#1C6B30] font-medium">(yo)</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[10px] font-medium px-2.5 py-0.5 rounded-full ${roleColors[u.role]}`}>
                      {ROLE_LABELS[u.role as Role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-medium`}>
                      <span className={`w-3 h-3 rounded-full ${COLOR_BG[u.color] ?? "bg-slate-300"}`} />
                      {COLOR_LABEL[u.color] ?? u.color}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActivo(u)}
                      disabled={u.id === session?.user?.id}
                      className={`text-xs font-medium px-2.5 py-0.5 rounded-full cursor-pointer ${
                        u.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      } disabled:cursor-default`}
                    >
                      {u.activo ? "Activo" : "Inactivo"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400 hidden lg:table-cell">
                    {format(new Date(u.createdAt), "dd/MM/yy", { locale: es })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => { setEditing(u); setShowForm(true); }}
                      className="text-slate-400 hover:text-[#1C6B30] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showForm && (
        <UsuarioModal
          initial={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null); }}
        />
      )}

    </div>
  );
}

function UsuarioModal({ initial, onSave, onClose }: { initial: any; onSave: (d: any) => void; onClose: () => void }) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    role: initial?.role ?? "TECNICO",
    color: initial?.color ?? "AZUL",
    password: "",
    activo: initial?.activo ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function set(key: string, value: any) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!initial && !form.password) { setError("La contraseña es requerida para nuevos usuarios"); return; }
    setSaving(true);
    setError("");
    await onSave(form);
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-800">{initial ? "Editar Usuario" : "Nuevo Usuario"}</h2>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre *</label>
            <input type="text" value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30]" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Usuario *</label>
            <input type="text" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30]" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Contraseña {initial ? "(dejar vacío para no cambiar)" : "*"}
            </label>
            <input type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30]" placeholder="••••••••" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
            <select value={form.role} onChange={(e) => set("role", e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1C6B30] bg-white">
              <option value="ADMIN">Administrador</option>
              <option value="SUPERVISOR">Supervisor</option>
              <option value="TECNICO">Técnico</option>
              <option value="VIEWER">Visualizador</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Color *</label>
            <div className="grid grid-cols-3 gap-2">
              {Object.entries(COLOR_LABEL).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => set("color", val)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border-2 text-sm transition-all ${form.color === val ? "border-slate-700 font-semibold" : "border-slate-200 hover:border-slate-400"}`}
                >
                  <span className={`w-4 h-4 rounded-full shrink-0 ${COLOR_BG[val]}`} />
                  {label}
                </button>
              ))}
            </div>
          </div>
          {initial && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.activo} onChange={(e) => set("activo", e.target.checked)} className="rounded" />
              <span className="text-sm text-slate-700">Usuario activo</span>
            </label>
          )}
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="flex-1 bg-[#1C6B30] hover:bg-[#155024] disabled:bg-[#2d8a48] text-white font-medium py-2.5 rounded-lg transition-colors text-sm">
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button type="button" onClick={onClose} className="flex-1 border border-slate-200 text-slate-600 hover:bg-slate-50 font-medium py-2.5 rounded-lg transition-colors text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

