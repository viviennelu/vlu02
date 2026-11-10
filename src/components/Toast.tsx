import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

export type ToastTone = 'info' | 'error';

interface ToastProps {
  message: string | null;
  tone?: ToastTone;
}

export const Toast: React.FC<ToastProps> = ({ message, tone = 'info' }) => {
  if (!message) return null;
  const isError = tone === 'error';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-lg text-xs tracking-wide max-w-[calc(100vw-3rem)] ${
        isError ? 'bg-[#7F1D1D] text-white' : 'bg-ink text-paper'
      }`}
    >
      {isError ? (
        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      ) : (
        <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
      )}
      <span>{message}</span>
    </div>
  );
};
