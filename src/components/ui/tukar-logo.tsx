import React from "react";

export function TukarLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Brand Logo - Infinity arrows matching the Brand Guidelines */}
      <div className="relative flex h-10 w-10 items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 120 72"
          fill="none"
          className="h-9 w-auto text-primary"
        >
          {/* Main Infinity Loop Path */}
          <path
            d="M 60,36 
               C 42,16 20,16 20,36 
               C 20,56 42,56 60,36 
               C 78,16 100,16 100,36 
               C 100,56 78,56 60,36 Z"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Top-Right Arrowhead (pointing up-right) */}
          <path
            d="M 88,24 L 105,31 L 98,48"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bottom-Left Arrowhead (pointing down-left) */}
          <path
            d="M 32,48 L 15,41 L 22,24"
            stroke="currentColor"
            strokeWidth="11"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Text (Poppins font & Color Palette matching guidelines) */}
      <span className="text-2xl font-extrabold tracking-tight text-[#0D1B2A] dark:text-[#E8F1FF]">
        Tukar<span className="text-[#1565D8]">.in</span>
      </span>
    </div>
  );
}
