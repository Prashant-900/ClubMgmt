"use client";

// PageTabs.tsx — GitHub repository-style underline tab navigation.
// The active tab's LABEL is Google blue, while its UNDERLINE cycles through the
// other three brand hues (green, red, yellow) by tab position — so adjacent
// tabs never share an underline color.
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

// Underline palette (excludes blue, which is reserved for the label text).
const UNDERLINE_COLORS = ["#34a853", "#ea4335", "#fbbc05"];

export function PageTabs<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  className = "",
}: PageTabsProps<T>) {
  return (
    <div
      className={`flex items-center gap-0 border-b border-[#dadce0] ${className}`}
    >
      {tabs.map((tab, i) => {
        const isActive = tab.id === activeTab;
        const underline = UNDERLINE_COLORS[i % UNDERLINE_COLORS.length];
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-3 text-sm font-medium
              transition-colors duration-150 cursor-pointer whitespace-nowrap
              border-b-2 -mb-px
              ${isActive ? "text-[#1a73e8]" : "text-[#5f6368] hover:text-[#202124]"}
            `}
            style={{ borderBottomColor: isActive ? underline : "transparent" }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={`
                  inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[11px] font-medium
                  ${isActive
                    ? "bg-[#dadce0] text-[#202124]"
                    : "bg-[#f1f3f4] text-[#5f6368]"}
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
