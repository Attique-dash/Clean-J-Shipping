"use client";

import { Plus } from "lucide-react";

type AddButtonProps = {
  onClick: () => void;
  label: string;
  className?: string;
};

export default function AddButton({ onClick, label, className = "" }: AddButtonProps) {
  return (
    <button 
      onClick={onClick} 
      className={`group flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-[#0f4d8a] shadow-lg transition-all hover:shadow-xl hover:scale-105 ${className}`}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0f4d8a] transition-transform group-hover:rotate-90">
        <Plus className="h-5 w-5 text-white" strokeWidth={3} />
      </div>
      {label}
    </button>
  );
}

