"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const EMPTY_VALUE = "__form_select_empty__";

export type FormSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

type FormSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: FormSelectOption[];
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
  disabled?: boolean;
  id?: string;
};

function toInternalValue(value: string) {
  return value === "" ? EMPTY_VALUE : value;
}

function fromInternalValue(value: string) {
  return value === EMPTY_VALUE ? "" : value;
}

export function FormSelect({
  value,
  onValueChange,
  options,
  placeholder = "請選擇",
  className,
  triggerClassName,
  disabled,
  id,
}: FormSelectProps) {
  return (
    <Select
      value={toInternalValue(value)}
      onValueChange={(next) => onValueChange(fromInternalValue(next))}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        className={cn(
          "h-auto min-h-11 w-full justify-between rounded-xl border-slate-800 bg-slate-950/50 px-3 py-3 text-sm text-white hover:bg-slate-900 hover:border-slate-700",
          triggerClassName,
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        className="max-h-64 border-slate-700 bg-slate-900 text-slate-100"
        position="popper"
      >
        {options.map((opt) => (
          <SelectItem
            key={`${opt.value || EMPTY_VALUE}-${opt.label}`}
            value={toInternalValue(opt.value)}
            disabled={opt.disabled}
            className="focus:bg-slate-800 focus:text-white"
          >
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
