import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { DialogHost } from "@/components/ui/DialogHost";
import "./globals.css";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "GTM Tools — Manage your tag manager, smarter",
  description:
    "Inspect, audit, and export every tag, trigger, variable, and template in your Google Tag Manager stack. An AnalyticsLiv product.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${geist.variable} ${geistMono.variable}`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}

          {/* Imperative confirm-dialog host (single instance) */}
          <DialogHost />

          {/* Toast Provider */}
          <ToastContainer position="top-right" autoClose={3000} theme="dark" />
        </AuthProvider>
      </body>
    </html>
  );
}