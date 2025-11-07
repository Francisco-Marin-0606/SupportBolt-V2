interface SpinnerProps {
  percentage?: number;
  size?: "sm" | "md" | "lg";
  color?: "green" | "orange" | "blue";
  showPercentage?: boolean;
}

export default function Spinner({
  percentage = 0,
  size = "md",
  color = "blue",
  showPercentage = true,
}: SpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const colorClasses = {
    green: "text-green-600",
    orange: "text-orange-600",
    blue: "text-blue-600",
  };

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        {/* Spinner animado */}
        <svg
          className={`${sizeClasses[size]} animate-spin ${colorClasses[color]}`}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>

        {/* Círculo de progreso si hay porcentaje */}
        {showPercentage && percentage > 0 && (
          <svg
            className={`${sizeClasses[size]} absolute inset-0 transform -rotate-90`}
            viewBox="0 0 24 24"
          >
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              className="opacity-20"
            />
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
              strokeDasharray={`${2 * Math.PI * 10}`}
              strokeDashoffset={`${2 * Math.PI * 10 * (1 - percentage / 100)}`}
              className={`transition-all duration-300 ${colorClasses[color]}`}
            />
          </svg>
        )}
      </div>

      {/* Porcentaje */}
      {showPercentage && (
        <span className={`text-sm font-medium ${colorClasses[color]}`}>
          {percentage}%
        </span>
      )}
    </div>
  );
}
