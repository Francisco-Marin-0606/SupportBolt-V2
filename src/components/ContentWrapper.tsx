"use client";

import { useSidebarContext } from "@/contexts/SidebarContext";

export default function ContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isOpen } = useSidebarContext();

  return (
    <main
      className={`
      transition-all duration-300 ease-in-out min-h-screen
      ${isOpen ? "lg:ml-64" : "lg:ml-20"}
      ml-0
    `}
    >
      <div className="p-4 sm:p-6 lg:p-8">{children}</div>
    </main>
  );
}
