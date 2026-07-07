"use client";

import { useState, useRef, useEffect } from "react";
import { Calendar, Download, ExternalLink } from "lucide-react";

interface EventCalendarProps {
  event: {
    title: string;
    description?: string;
    start_time: string;
    end_time: string;
    location_name: string;
    location_address?: string;
  };
}

export default function CalendarExportButton({ event }: EventCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 點擊選單外部自動關閉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 將 ISO 日期轉換為 iCalendar (RFC 5545) UTC 標準格式：YYYYMMDDTHHMMSSZ
  const formatIcsDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  // 下載 .ics 檔案 (支援 Apple Calendar、Outlook 與系統內建行事曆)
  const downloadIcsFile = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startUtc = formatIcsDate(event.start_time);
    const endUtc = formatIcsDate(event.end_time || event.start_time);
    const fullLocation = `${event.location_name}${event.location_address ? ` (${event.location_address})` : ""}`;
    const cleanDesc = (event.description || "運動約戰活動行程").replace(/\n/g, "\\n");

    const icsContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//SPORTYFIND Sports Platform//Events//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `SUMMARY:${event.title}`,
      `DTSTART:${startUtc}`,
      `DTEND:${endUtc}`,
      `LOCATION:${fullLocation}`,
      `DESCRIPTION:${cleanDesc}`,
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${event.title.replace(/\s+/g, "_")}.ics`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsOpen(false);
  };

  // 一鍵開啟 Google 行事曆新增頁面
  const openGoogleCalendar = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const startUtc = formatIcsDate(event.start_time);
    const endUtc = formatIcsDate(event.end_time || event.start_time);
    const fullLocation = `${event.location_name}${event.location_address ? ` (${event.location_address})` : ""}`;

    const googleUrl = new URL("https://calendar.google.com/calendar/render");
    googleUrl.searchParams.append("action", "TEMPLATE");
    googleUrl.searchParams.append("text", event.title);
    googleUrl.searchParams.append("dates", `${startUtc}/${endUtc}`);
    googleUrl.searchParams.append("details", event.description || "運動約戰活動行程");
    googleUrl.searchParams.append("location", fullLocation);

    window.open(googleUrl.toString(), "_blank", "noopener,noreferrer");
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-zinc-300 hover:text-white transition border border-slate-700/80 flex items-center gap-1.5 text-xs font-bold shrink-0 shadow-sm"
        title="加入行事曆"
      >
        <Calendar className="w-3.5 h-3.5 text-amber-400" />
        <span>加入行事曆</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-2 w-52 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
          <button
            type="button"
            onClick={downloadIcsFile}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <Download className="w-3.5 h-3.5 text-blue-400" />
            <span>Apple／Outlook 行事曆（.ics）</span>
          </button>

          <button
            type="button"
            onClick={openGoogleCalendar}
            className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-slate-800 flex items-center gap-2.5 transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
            <span>Google 行事曆</span>
          </button>
        </div>
      )}
    </div>
  );
}