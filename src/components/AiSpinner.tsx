"use client";

export function AiSpinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6">
      <div className="relative h-12 w-12">
        {/* Outer ring */}
        <svg className="absolute inset-0 animate-spin" viewBox="0 0 48 48" fill="none">
          <circle
            cx="24" cy="24" r="20"
            stroke="url(#grad1)"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray="90 36"
          />
          <defs>
            <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a78bfa" />
              <stop offset="100%" stopColor="#4c1d95" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        {/* Inner pulse */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#a78bfa]" />
        </div>
      </div>
      {label && (
        <p className="text-xs font-medium text-[#7c3aed] animate-pulse">{label}</p>
      )}
    </div>
  );
}
