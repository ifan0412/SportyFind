import { Activity, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";

const iconCls = "shrink-0";

export function CoachRoleLabel({
  label = "教練",
  iconClassName = "w-3 h-3",
  className,
}: {
  label?: string;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <GraduationCap className={cn(iconCls, iconClassName)} strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  );
}

export function PhysioRoleLabel({
  label = "物理治療",
  iconClassName = "w-3 h-3",
  className,
}: {
  label?: string;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <Activity className={cn(iconCls, iconClassName)} strokeWidth={2.5} aria-hidden />
      {label}
    </span>
  );
}
