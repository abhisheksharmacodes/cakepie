"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

export function MonthSelector() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Default to current month if no param is set
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const monthParam = searchParams.get("month") || currentMonth;
  
  const [value, setValue] = useState(monthParam);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMonth = e.target.value;
    setValue(newMonth);
    
    // Update the URL with the new month
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", newMonth);
    router.push(`/analytics?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-3">
      <label htmlFor="month-select" className="text-sm font-medium text-slate-500">
        Filter by Month:
      </label>
      <input
        id="month-select"
        type="month"
        value={value}
        onChange={handleChange}
        className="bg-white border border-slate-300 text-slate-900 rounded-full px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
      />
    </div>
  );
}
