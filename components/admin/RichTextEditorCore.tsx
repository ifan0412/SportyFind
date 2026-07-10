"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { plainTextLength } from "@/lib/content/body";
import { isRichHtmlEmpty, normalizeRichHtml, richHtmlEquivalent } from "@/lib/content/rich-html";
import { FONT_SIZE_OPTIONS, FontSize } from "@/lib/tiptap/font-size";
import { FormSelect } from "@/components/ui/form-select";
import { appPrompt } from "@/lib/app-dialog";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Heading2,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Quote,
  Redo,
  Strikethrough,
  Underline as UnderlineIcon,
  Undo,
} from "lucide-react";

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  variant?: "default" | "compact";
  enableImages?: boolean;
  minHeight?: string;
  showCharCount?: boolean;
  suggestedLength?: number;
}

function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`p-2 rounded-lg transition touch-manipulation min-w-[2rem] min-h-[2rem] flex items-center justify-center ${
        active
          ? "bg-blue-600/20 text-blue-400"
          : "text-zinc-400 hover:bg-slate-800 hover:text-white disabled:opacity-40"
      }`}
    >
      {children}
    </button>
  );
}

const EDITOR_ATTRIBUTES = {
  class:
    "tiptap max-w-none px-4 py-3 focus:outline-none text-base md:text-[15px] leading-relaxed text-zinc-200 min-h-[inherit]",
  autocapitalize: "sentences",
  autocorrect: "on",
  spellcheck: "true",
  tabindex: "0",
} as const;

const STABLE_EDITOR_PROPS = {
  attributes: EDITOR_ATTRIBUTES,
  handleDOMEvents: {
    mousedown: (view: { hasFocus: () => boolean; focus: () => void }, event: MouseEvent) => {
      if ((event.target as HTMLElement | null)?.closest?.("a[href]")) return false;
      if (!view.hasFocus()) view.focus();
      return false;
    },
    touchstart: (view: { hasFocus: () => boolean; focus: () => void }) => {
      if (!view.hasFocus()) view.focus();
      return false;
    },
  },
} as const;

function buildExtensions(imagesEnabled: boolean, placeholder: string) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      hardBreak: { keepMarks: true },
    }),
    Underline,
    TextStyle,
    FontSize,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-400 underline" } }),
    ...(imagesEnabled
      ? [Image.configure({ HTMLAttributes: { class: "rounded-xl max-w-full h-auto my-4" } })]
      : []),
    Placeholder.configure({ placeholder }),
  ];
}

function editorTextLength(editor: { getText: () => string }) {
  return editor.getText().replace(/\u200b/g, "").trim().length;
}

/** editor.view is a truthy Proxy before mount — never touch .view.dom without this guard. */
function safeViewDom(editor: Editor | null): HTMLElement | null {
  if (!editor) return null;
  try {
    return editor.view.dom ?? null;
  } catch {
    return null;
  }
}

function editorIsMounted(editor: Editor | null): editor is Editor {
  const dom = safeViewDom(editor);
  return Boolean(dom && dom.isConnected);
}

export function RichTextEditorCore({
  value,
  onChange,
  placeholder,
  variant = "default",
  enableImages,
  minHeight,
  showCharCount = false,
  suggestedLength,
}: RichTextEditorProps) {
  const imagesEnabled = enableImages ?? variant === "default";
  const editorMinHeight = minHeight ?? (variant === "compact" ? "140px" : "280px");
  const resolvedPlaceholder = placeholder || "開始撰寫內容…";

  const supabase = useRef(createSupabaseBrowserClient()).current;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  const mountRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const showCharCountRef = useRef(showCharCount);
  const lastEmittedHtml = useRef(isRichHtmlEmpty(value) ? "" : normalizeRichHtml(value));
  const initialContentRef = useRef(isRichHtmlEmpty(value) ? null : normalizeRichHtml(value));

  const [editor, setEditor] = useState<Editor | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [charCount, setCharCount] = useState(() => plainTextLength(value || ""));
  const [toolbarTick, setToolbarTick] = useState(0);

  const [extensions] = useState(() => buildExtensions(imagesEnabled, resolvedPlaceholder));

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    showCharCountRef.current = showCharCount;
  }, [showCharCount]);

  const emitChangeRef = useRef((html: string) => {
    const normalized = isRichHtmlEmpty(html) ? "" : normalizeRichHtml(html);
    lastEmittedHtml.current = normalized;
    if (!richHtmlEquivalent(normalized, valueRef.current)) {
      onChangeRef.current(normalized);
    }
  });

  useEffect(() => {
    emitChangeRef.current = (html: string) => {
      const normalized = isRichHtmlEmpty(html) ? "" : normalizeRichHtml(html);
      lastEmittedHtml.current = normalized;
      if (!richHtmlEquivalent(normalized, valueRef.current)) {
        onChangeRef.current(normalized);
      }
    };
  }, [onChange]);

  // Create editor + mount into visible container in one layout pass (no race).
  useLayoutEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const instance = new Editor({
      extensions,
      element: null,
      autofocus: false,
      editable: true,
      editorProps: STABLE_EDITOR_PROPS,
    });

    editorRef.current = instance;
    el.replaceChildren();
    instance.mount(el);

    const initial = initialContentRef.current;
    if (initial) {
      instance.commands.setContent(initial, { emitUpdate: false });
      lastEmittedHtml.current = initial;
    }

    if (showCharCountRef.current) {
      setCharCount(editorTextLength(instance));
    }

    setEditor(instance);
    setIsReady(true);

    return () => {
      setIsReady(false);
      setEditor(null);
      editorRef.current = null;
      instance.destroy();
      el.replaceChildren();
    };
  }, [extensions]);

  useEffect(() => {
    if (!isReady) return;
    const instance = editorRef.current;
    if (!editorIsMounted(instance)) return;

    const onBlur = () => emitChangeRef.current(instance.getHTML());
    const onUpdate = () => {
      if (showCharCountRef.current) {
        const next = editorTextLength(instance);
        setCharCount((prev) => (prev === next ? prev : next));
      }
    };

    instance.on("blur", onBlur);
    instance.on("update", onUpdate);

    return () => {
      instance.off("blur", onBlur);
      instance.off("update", onUpdate);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady) return;
    const instance = editorRef.current;
    if (!editorIsMounted(instance) || instance.isFocused) return;
    if (isRichHtmlEmpty(value)) return;
    if (richHtmlEquivalent(value, instance.getHTML())) return;
    if (richHtmlEquivalent(value, lastEmittedHtml.current)) return;

    const next = normalizeRichHtml(value);
    instance.commands.setContent(next, { emitUpdate: false });
    lastEmittedHtml.current = next;

    if (showCharCountRef.current) {
      const nextCount = editorTextLength(instance);
      setCharCount((prev) => (prev === nextCount ? prev : nextCount));
    }
  }, [isReady, value]);

  useEffect(() => {
    if (!isReady) return;
    const instance = editorRef.current;
    const dom = safeViewDom(instance);
    if (!dom) return;

    const form = dom.closest("form");
    if (!form) return;

    const flush = () => {
      const current = editorRef.current;
      if (editorIsMounted(current)) emitChangeRef.current(current.getHTML());
    };

    form.addEventListener("submit", flush, true);
    return () => form.removeEventListener("submit", flush, true);
  }, [isReady]);

  const bumpToolbar = useCallback(() => {
    setToolbarTick((n) => n + 1);
  }, []);

  const uploadImage = useCallback(
    async (file: File): Promise<string | null> => {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const filePath = `content/${fileName}`;
      const { error } = await supabase.storage.from("highlights").upload(filePath, file, { upsert: true });
      if (error) {
        console.error("Image upload failed:", error.message);
        return null;
      }
      return supabase.storage.from("highlights").getPublicUrl(filePath).data.publicUrl;
    },
    [supabase]
  );

  const handleImageUpload = async (file: File) => {
    const instance = editorRef.current;
    if (!editorIsMounted(instance) || uploadingRef.current) return;
    uploadingRef.current = true;
    const url = await uploadImage(file);
    uploadingRef.current = false;
    if (url) {
      instance.chain().focus().setImage({ src: url }).run();
      bumpToolbar();
    }
  };

  const applyFontSize = (size: string) => {
    const instance = editorRef.current;
    if (!editorIsMounted(instance)) return;
    if (size === "1rem") instance.chain().focus().unsetFontSize().run();
    else instance.chain().focus().setFontSize(size).run();
    bumpToolbar();
  };

  const setLink = async () => {
    const instance = editorRef.current;
    if (!editorIsMounted(instance)) return;
    const prev = instance.getAttributes("link").href as string | undefined;
    const url = await appPrompt({
      title: "插入連結",
      message: "輸入連結網址",
      defaultValue: prev || "https://",
      placeholder: "https://",
    });
    if (url === null) return;
    if (url === "") {
      instance.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      instance.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
    bumpToolbar();
  };

  const runCommand = (fn: () => void) => {
    fn();
    bumpToolbar();
  };

  void toolbarTick;

  const currentFontSize =
    (editorIsMounted(editor) ? editor.getAttributes("textStyle").fontSize : undefined) || "1rem";

  const counterOverSuggested = suggestedLength != null && charCount > suggestedLength;

  const focusSurface = () => {
    const instance = editorRef.current;
    if (editorIsMounted(instance)) instance.chain().focus().run();
  };

  return (
    <div
      className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950"
      style={{ ["--editor-min-height" as string]: editorMinHeight }}
    >
      {isReady && editor && (
        <div className="border-b border-slate-800 bg-slate-900/80 overflow-x-auto [&::-webkit-scrollbar]:hidden touch-pan-x">
          <div className="flex items-center gap-0.5 p-2 flex-nowrap min-w-max">
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleBold().run())}
              active={editor.isActive("bold")}
              title="粗體"
            >
              <Bold className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleItalic().run())}
              active={editor.isActive("italic")}
              title="斜體"
            >
              <Italic className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleUnderline().run())}
              active={editor.isActive("underline")}
              title="底線"
            >
              <UnderlineIcon className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleStrike().run())}
              active={editor.isActive("strike")}
              title="刪除線"
            >
              <Strikethrough className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-6 bg-slate-700 mx-1" />

            <div onMouseDown={(e) => e.preventDefault()} title="字體大小">
              <FormSelect
                value={currentFontSize}
                onValueChange={applyFontSize}
                triggerClassName="h-8 min-h-8 w-auto min-w-[4.5rem] px-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 touch-manipulation"
                options={[...FONT_SIZE_OPTIONS]}
              />
            </div>

            <div className="w-px h-6 bg-slate-700 mx-1" />

            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().setTextAlign("left").run())}
              active={editor.isActive({ textAlign: "left" })}
              title="靠左對齊"
            >
              <AlignLeft className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().setTextAlign("center").run())}
              active={editor.isActive({ textAlign: "center" })}
              title="置中對齊"
            >
              <AlignCenter className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().setTextAlign("right").run())}
              active={editor.isActive({ textAlign: "right" })}
              title="靠右對齊"
            >
              <AlignRight className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-6 bg-slate-700 mx-1" />

            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleHeading({ level: 2 }).run())}
              active={editor.isActive("heading", { level: 2 })}
              title="標題"
            >
              <Heading2 className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleBulletList().run())}
              active={editor.isActive("bulletList")}
              title="項目符號"
            >
              <List className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleOrderedList().run())}
              active={editor.isActive("orderedList")}
              title="編號清單"
            >
              <ListOrdered className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().toggleBlockquote().run())}
              active={editor.isActive("blockquote")}
              title="引用"
            >
              <Quote className="w-4 h-4" />
            </ToolbarButton>

            <div className="w-px h-6 bg-slate-700 mx-1" />

            <ToolbarButton onClick={setLink} active={editor.isActive("link")} title="連結">
              <Link2 className="w-4 h-4" />
            </ToolbarButton>
            {imagesEnabled && (
              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingRef.current}
                title="插入圖片"
              >
                {uploadingRef.current ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
              </ToolbarButton>
            )}

            <div className="w-px h-6 bg-slate-700 mx-1" />

            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().undo().run())}
              disabled={!editor.can().undo()}
              title="復原"
            >
              <Undo className="w-4 h-4" />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => runCommand(() => editor.chain().focus().redo().run())}
              disabled={!editor.can().redo()}
              title="重做"
            >
              <Redo className="w-4 h-4" />
            </ToolbarButton>
          </div>
        </div>
      )}

      {!isReady && (
        <div className="border-b border-slate-800 bg-slate-900/80 h-[52px] animate-pulse" aria-hidden />
      )}

      <div
        ref={mountRef}
        className={`rich-text-editor-surface cursor-text ${isReady ? "" : "animate-pulse bg-slate-950/80"}`}
        style={{ minHeight: editorMinHeight }}
        aria-label={resolvedPlaceholder}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest("a[href]")) return;
          if (e.target === mountRef.current) focusSurface();
        }}
      />

      {showCharCount && (
        <div className="flex justify-end px-4 py-2 border-t border-slate-800/80 bg-slate-900/40">
          <span
            className={`text-[11px] font-bold tabular-nums ${
              counterOverSuggested ? "text-amber-400/90" : "text-zinc-600"
            }`}
          >
            {charCount}
            {suggestedLength != null ? ` / 建議 ${suggestedLength} 字內` : " 字"}
          </span>
        </div>
      )}

      {imagesEnabled && isReady && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleImageUpload(file);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}
