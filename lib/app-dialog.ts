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

export type AppDialogApi = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
  prompt: (options: PromptOptions | string, defaultValue?: string) => Promise<string | null>;
};

let api: AppDialogApi | null = null;

export function setAppDialogApi(next: AppDialogApi | null) {
  api = next;
}

export async function appConfirm(options: ConfirmOptions | string): Promise<boolean> {
  if (!api) {
    const message = typeof options === "string" ? options : options.message;
    return window.confirm(message);
  }
  return api.confirm(options);
}

export async function appAlert(options: AlertOptions | string): Promise<void> {
  if (!api) {
    const message = typeof options === "string" ? options : options.message;
    window.alert(message);
    return;
  }
  return api.alert(options);
}

export async function appPrompt(
  options: PromptOptions | string,
  defaultValue = ""
): Promise<string | null> {
  if (!api) {
    const message = typeof options === "string" ? options : options.message ?? "";
    return window.prompt(message, defaultValue);
  }
  return api.prompt(options, defaultValue);
}
