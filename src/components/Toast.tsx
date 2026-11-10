import React from 'react';
import { Check, Copy } from 'lucide-react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 bg-[#1C1917] text-[#FBF9F5] px-4 py-2.5 rounded shadow-lg text-xs tracking-wide font-mono transition-all animate-fade-in"
    >
      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span>{message}</span>
    </div>
  );
};
