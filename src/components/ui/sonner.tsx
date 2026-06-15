"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

/** App toaster (shadcn/sonner). Themed via next-themes, rich colors for clear errors. */
export function Toaster(props: ToasterProps) {
  const { theme = "dark" } = useTheme();
  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{ duration: 6000 }}
      {...props}
    />
  );
}
