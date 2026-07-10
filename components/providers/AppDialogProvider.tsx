"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { setAppDialogApi } from "@/lib/app-dialog";

type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
};

type AlertOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
};

type PromptOptions = {
  title?: string;
  message?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

type DialogState =
  | { kind: "confirm"; options: ConfirmOptions; resolve: (v: boolean) => void }
  | { kind: "alert"; options: AlertOptions; resolve: () => void }
  | { kind: "prompt"; options: PromptOptions; resolve: (v: string | null) => void };

const AppDialogContext = createContext<{
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
  prompt: (options: PromptOptions | string, defaultValue?: string) => Promise<string | null>;
} | null>(null);

export function useAppDialog() {
  const ctx = useContext(AppDialogContext);
  if (!ctx) throw new Error("useAppDialog must be used within AppDialogProvider");
  return ctx;
}

export function AppDialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [promptValue, setPromptValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => setState(null), []);

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise<boolean>((resolve) => {
      setState({ kind: "confirm", options: opts, resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string) => {
    const opts = typeof options === "string" ? { message: options } : options;
    return new Promise<void>((resolve) => {
      setState({ kind: "alert", options: opts, resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions | string, defaultValue = "") => {
    const opts =
      typeof options === "string"
        ? { message: options, defaultValue }
        : { ...options, defaultValue: options.defaultValue ?? defaultValue };
    return new Promise<string | null>((resolve) => {
      setPromptValue(opts.defaultValue ?? "");
      setState({ kind: "prompt", options: opts, resolve });
    });
  }, []);

  useEffect(() => {
    setAppDialogApi({ confirm, alert, prompt });
    return () => setAppDialogApi(null);
  }, [confirm, alert, prompt]);

  useEffect(() => {
    if (state?.kind === "prompt") {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [state]);

  const handleOpenChange = (open: boolean) => {
    if (!open && state) {
      if (state.kind === "confirm") state.resolve(false);
      if (state.kind === "alert") state.resolve();
      if (state.kind === "prompt") state.resolve(null);
      close();
    }
  };

  return (
    <AppDialogContext.Provider value={{ confirm, alert, prompt }}>
      {children}
      <Dialog open={state !== null} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={false}
          className="border-slate-700 bg-slate-900 text-slate-100 sm:max-w-md"
          onOpenAutoFocus={(e) => {
            if (state?.kind === "prompt") e.preventDefault();
          }}
        >
          {state?.kind === "confirm" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">
                  {state.options.title ?? "請確認"}
                </DialogTitle>
                <DialogDescription className="whitespace-pre-wrap text-slate-300">
                  {state.options.message}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="border-slate-800 bg-slate-900/80 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  onClick={() => {
                    state.resolve(false);
                    close();
                  }}
                >
                  {state.options.cancelLabel ?? "取消"}
                </Button>
                <Button
                  type="button"
                  variant={state.options.destructive ? "destructive" : "default"}
                  className={
                    state.options.destructive
                      ? undefined
                      : "bg-blue-600 text-white hover:bg-blue-500"
                  }
                  onClick={() => {
                    state.resolve(true);
                    close();
                  }}
                >
                  {state.options.confirmLabel ?? "確定"}
                </Button>
              </DialogFooter>
            </>
          )}

          {state?.kind === "alert" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">
                  {state.options.title ?? "提示"}
                </DialogTitle>
                <DialogDescription className="whitespace-pre-wrap text-slate-300">
                  {state.options.message}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="border-slate-800 bg-slate-900/80">
                <Button
                  type="button"
                  className="bg-blue-600 text-white hover:bg-blue-500"
                  onClick={() => {
                    state.resolve();
                    close();
                  }}
                >
                  {state.options.confirmLabel ?? "知道了"}
                </Button>
              </DialogFooter>
            </>
          )}

          {state?.kind === "prompt" && (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">
                  {state.options.title ?? "請輸入"}
                </DialogTitle>
                {state.options.message ? (
                  <DialogDescription className="whitespace-pre-wrap text-slate-300">
                    {state.options.message}
                  </DialogDescription>
                ) : null}
              </DialogHeader>
              <Input
                ref={inputRef}
                value={promptValue}
                onChange={(e) => setPromptValue(e.target.value)}
                placeholder={state.options.placeholder}
                className="border-slate-700 bg-slate-950 text-white"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    state.resolve(promptValue);
                    close();
                  }
                }}
              />
              <DialogFooter className="border-slate-800 bg-slate-900/80 sm:gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
                  onClick={() => {
                    state.resolve(null);
                    close();
                  }}
                >
                  {state.options.cancelLabel ?? "取消"}
                </Button>
                <Button
                  type="button"
                  className="bg-blue-600 text-white hover:bg-blue-500"
                  onClick={() => {
                    state.resolve(promptValue);
                    close();
                  }}
                >
                  {state.options.confirmLabel ?? "確定"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppDialogContext.Provider>
  );
}
