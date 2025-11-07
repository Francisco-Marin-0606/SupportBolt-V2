import { TabProps } from "@/app/types/audioDetail";

export const Tab = ({ label, isActive, onClick }: TabProps) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 font-bold ${
      isActive
        ? "text-black border-b-2 border-black"
        : "text-gray-500 hover:text-gray-700"
    }`}
  >
    {label}
  </button>
);
