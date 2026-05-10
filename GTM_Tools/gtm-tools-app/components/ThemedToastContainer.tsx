"use client";

import { ToastContainer } from "react-toastify";
import { useTheme } from "./ThemeToggle";

export function ThemedToastContainer() {
  const { theme } = useTheme();
  return (
    <ToastContainer
      position="top-right"
      autoClose={3000}
      theme={theme ?? "light"}
    />
  );
}
