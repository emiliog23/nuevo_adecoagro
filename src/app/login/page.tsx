"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const result = await signIn("credentials", { email: usuario, password, redirect: false });
    if (result?.error) {
      setError("Usuario o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/documentos");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#f0f1f3" }}>
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-center items-center w-72 p-10" style={{ backgroundColor: "#23282e" }}>
        <p className="text-3xl font-semibold tracking-tight">
          <span className="text-white">adeco</span>
          <span style={{ color: "#5ab575" }}>agro</span>
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="bg-white border border-[#d4d6d8] w-full max-w-sm p-8">
          <div className="lg:hidden mb-6">
            <p className="text-2xl font-semibold tracking-tight">
              <span className="text-[#2B2B2B]">adeco</span>
              <span style={{ color: "#1C6B30" }}>agro</span>
            </p>
          </div>

          <h2 className="text-base font-semibold text-[#1d2023] mb-6">Ingresar</h2>

          {error && (
            <div className="border border-red-300 bg-red-50 text-red-700 px-3 py-2 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">Usuario</label>
              <input
                type="text"
                value={usuario}
                onChange={(e) => setUsuario(e.target.value)}
                className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white"
                autoComplete="username"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5a5f67] uppercase tracking-wider mb-1">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[#d4d6d8] text-sm text-[#1d2023] focus:outline-none focus:border-[#1C6B30] bg-white"
                autoComplete="current-password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 text-sm font-semibold text-white transition-colors"
              style={{ backgroundColor: loading ? "#4a9a60" : "#1C6B30" }}
            >
              {loading ? "Ingresando..." : "Ingresar"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
