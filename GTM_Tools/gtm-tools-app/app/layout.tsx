import type { Metadata } from "next";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "GTM Tools - Tag Manager Dashboard",
  description: "Manage your Google Tag Manager containers with ease",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          {children}

          {/* Toast Provider */}
          <ToastContainer position="top-right" autoClose={3000} />
        </AuthProvider>
      </body>
    </html>
  );
}