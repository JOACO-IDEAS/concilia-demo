import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ConcilIA · Demo operativa",
  description: "Showroom interactivo de ConcilIA para administradores de consorcios, con datos 100% sintéticos.",
  openGraph: {
    title: "ConcilIA · Demo operativa",
    description: "Conocé una operación administrativa asistida por IA con datos 100% sintéticos.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
