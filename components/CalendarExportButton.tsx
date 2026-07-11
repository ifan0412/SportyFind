"use client";

import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
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
  /** Where the options menu opens relative to the button. */
  menuPlacement?: "up" | "down";
}

const MENU_WIDTH = 208;
const MENU_GAP = 8;
const VIEWPORT_PAD = 12;

export default function CalendarExportButton({
  event,
  menuPlacement = "down",
}: EventCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const updateMenuPosition = () => {
    const btn = buttonRef.current;
    if (!btn) return;

    const rect = btn.getBoundingClientRect();
    const menuHeight = menuRef.current?.offsetHeight ?? 88;

    let left = rect.left;
    if (left + MENU_WIDTH > window.innerWidth - VIEWPORT_PAD) {
      left = rect.right - MENU_WIDTH;
    }
    left = Math.max(
      VIEWPORT_PAD,
      Math.min(left, window.innerWidth - MENU_WIDTH - VIEWPORT_PAD)
    );

    const top =
      menuPlacement === "up"
        ? rect.top - menuHeight - MENU_GAP
        : rect.bottom + MENU_GAP;

    setMenuPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!isOpen) {
      setMenuPos(null);
      return;
    }

    updateMenuPosition();
    requestAnimationFrame(updateMenuPosition);

    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    return () => {
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [isOpen, menuPlacement]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const formatIcsDate = (dateStr: string) => {
    return new Date(dateStr).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

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

  const menu =
    isOpen &&
    menuPos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: MENU_WIDTH,
        }}
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-1.5 z-[200] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        <button
          type="button"
          onClick={downloadIcsFile}
          className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-slate-800 flex items-center gap-2.5 transition"
        >
          <Download className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Apple／Outlook 行事曆（.ics）</span>
        </button>

        <button
          type="button"
          onClick={openGoogleCalendar}
          className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-zinc-200 hover:bg-slate-800 flex items-center gap-2.5 transition"
        >
          <ExternalLink className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span>Google 行事曆</span>
        </button>
      </div>,
      document.body
    );

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
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
      {menu}
    </div>
  );
}
