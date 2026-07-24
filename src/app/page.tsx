"use client";

import { AppShell } from "@/components/AppShell";
import { AppProvider } from "@/contexts/AppProvider";

export default function Page() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}
