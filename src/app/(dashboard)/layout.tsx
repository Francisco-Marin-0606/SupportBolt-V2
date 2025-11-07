// src/app/(dashboard)/layout.js
"use client";

import SidebarNew from "@/components/sidebar/SidebarNew";
import { SidebarProvider, useSidebarContext } from "@/contexts/SidebarContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { isOpen } = useSidebarContext();

  return (
    <main
      className={`
      transition-all duration-300 ease-in-out min-h-screen
      ${isOpen ? "ml-64" : "ml-16 lg:ml-20"}
    `}
    >
      <div className="p-4 sm:p-6 lg:p-8">{children}</div>
    </main>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Crear QueryClient una sola vez
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10 * 60 * 1000, // 10 minutos - más conservador
        gcTime: 15 * 60 * 1000, // 15 minutos
        refetchOnWindowFocus: false,
        refetchOnReconnect: false, // No refetch automático al reconectar
        refetchOnMount: false, // Solo refetch manual
        retry: 1, // Solo 1 retry para evitar demasiados requests
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Backoff exponencial
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <div className="min-h-screen bg-background">
          <SidebarNew />
          <LayoutContent>{children}</LayoutContent>
        </div>
      </SidebarProvider>
    </QueryClientProvider>
  );
}
