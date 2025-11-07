interface StatusBadgeProps {
  status: string;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center w-[142px] py-2.5 px-4 rounded-[24px] text-[14px] font-semibold m-0 ${
        status === "sended"
          ? "bg-[#d2fecc] text-[#326830]"
          : status === "review"
          ? "bg-[#ffe98f] text-[#ff9e1f]"
          : status === "completed"
          ? "bg-[#adadad] text-[#383838]"
          : status === "created"
          ? "bg-[#c2ddfd] text-[#2246d8]"
          : status === "exporting"
          ? "bg-[#eecbff] text-[#ac2bad]"
          : status === "pending"
          ? "bg-[#e4d4f4] text-[#7c3aed]"
          : status === "error"
          ? "bg-[#ffc9cc] text-[#ff0013]"
          : "bg-gray-100 text-gray-800"
      } ${className || ""}`}
    >
      {status === "sended"
        ? "Enviada"
        : status === "review"
        ? "En revisión"
        : status === "completed"
        ? "Completado"
        : status === "created"
        ? "Creando"
        : status === "exporting"
        ? "Exportando"
        : status === "pending"
        ? "Pendiente"
        : status === "error"
        ? "Error"
        : "Desconocido"}
    </span>
  );
}
