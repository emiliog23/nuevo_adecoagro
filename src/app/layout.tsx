import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Adecoagro",
  description: "Sistema de gestión de mantenimiento industrial",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="es" className="h-full">
      <body className="h-full">
        <SessionProvider session={session}>{children}</SessionProvider>
      </body>
    </html>
  );
}
