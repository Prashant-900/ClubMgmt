"use client";

// PageTabs.tsx — GitHub repository-style underline tab navigation
import React from "react";

export interface Tab<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

interface PageTabsProps<T extends string = string> {
  tabs: Tab<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  className?: string;
}

export function PageTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: PageTabsProps<T>) {
  return (
    <div
      className={`flex items-center gap-0 border-b border-[#30363d] ${className}`}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === activeTab;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-3 text-sm font-medium
              transition-colors duration-150 cursor-pointer whitespace-nowrap
              ${
                isActive
                  ? "text-[#e6edf3] border-b-2 border-[#f78166] -mb-px"
                  : "text-[#8b949e] hover:text-[#e6edf3] border-b-2 border-transparent -mb-px"
              }
            `}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`
                  inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[11px] font-medium
                  ${isActive
                    ? "bg-[#30363d] text-[#e6edf3]"
                    : "bg-[#21262d] text-[#8b949e]"}
                `}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
