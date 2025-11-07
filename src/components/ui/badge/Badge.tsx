import React from "react";

export type BadgeVariant = "success" | "error" | "warning" | "info" | "default";

interface BadgeProps {
  text: string;
  variant?: BadgeVariant;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  text,
  variant = "default",
  className = "",
}) => {
  // Estilos base para todos los badges
  const baseStyles =
    "inline-flex items-center justify-center w-[130px] py-2.5 rounded-[24px] text-[14px] font-semibold";

  // Estilos específicos por variante
  const variantStyles: Record<BadgeVariant, string> = {
    success: "bg-[#d2fecc] text-[#326830]", // Para "Activa"
    error: "bg-[#ffc9cc] text-[#ff0013]", // Para "Cancelada"
    warning: "bg-[#ffe98f] text-[#ff9e1f]", // Para "Trial"
    info: "bg-[#c2ddfd] text-[#2246d8]", // Para PayPal/Stripe
    default: "bg-[#adadad] text-[#383838]", // Para otros estados
  };

  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {text}
    </span>
  );
};

export default Badge;
