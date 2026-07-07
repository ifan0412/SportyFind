"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { plainTextLength } from "@/lib/content/body";
import { normalizeRichHtml, richHtmlEquivalent } from "@/lib/content/rich-html";
import { PreserveEmptyParagraph } from "@/lib/tiptap/preserve-paragraph";
import { FONT_SIZE_OPTIONS, FontSize } from "@/lib/tiptap/font-size";
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

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Smaller editor without image upload — suited for bios */
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

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  variant = "default",
  enableImages,
  minHeight,
  showCharCount = false,
  suggestedLength,
}: RichTextEditorProps) {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadingRef = useRef(false);
  /** Tracks HTML we emitted so parent echo doesn't reset the editor mid-typing */
  const lastEmittedHtml = useRef(normalizeRichHtml(value || ""));
  const editorWrapperRef = useRef<HTMLDivElement>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const [charCount, setCharCount] = useState(() => plainTextLength(value || ""));
  const [, setToolbarRevision] = useState(0);
  const imagesEnabled = enableImages ?? variant === "default";
  const editorMinHeight = minHeight ?? (variant === "compact" ? "140px" : "280px");

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

  const focusEditor = useCallback((ed: Editor) => {
    if (!ed.isFocused) {
      ed.chain().focus("end").run();
    }
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        hardBreak: { keepMarks: true },
        paragraph: false,
        bulletList: { keepMarks: true, keepAttributes: false },
        orderedList: { keepMarks: true, keepAttributes: false },
      }),
      PreserveEmptyParagraph,
      Underline,
      TextStyle,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "text-blue-400 underline" } }),
      ...(imagesEnabled
        ? [Image.configure({ HTMLAttributes: { class: "rounded-xl max-w-full h-auto my-4" } })]
        : []),
      Placeholder.configure({ placeholder: placeholder || "開始撰寫內容…" }),
    ],
    content: normalizeRichHtml(value || ""),
    immediatelyRender: false,
    autofocus: false,
    editorProps: {
        attributes: {
          class:
            "tiptap rich-body max-w-none px-4 py-3 focus:outline-none text-[15px] leading-relaxed text-zinc-200 min-h-[inherit]",
          style: `min-height: ${editorMinHeight}`,
        autocapitalize: "sentences",
        autocorrect: "on",
        spellcheck: "true",
        "aria-label": placeholder || "Rich text editor",
      },
      handleDOMEvents: {
        touchstart: () => {
          const ed = editorInstanceRef.current;
          if (ed && !ed.isFocused) {
            ed.chain().focus().run();
          }
          return false;
        },
      },
      handleDrop: imagesEnabled
        ? (view, event, _slice, moved) => {
            if (moved || !event.dataTransfer?.files?.length) return false;
            const file = event.dataTransfer.files[0];
            if (!file?.type.startsWith("image/")) return false;
            event.preventDefault();
            uploadImage(file).then((url) => {
              if (url) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                if (coordinates) {
                  const node = schema.nodes.image.create({ src: url });
                  const transaction = view.state.tr.insert(coordinates.pos, node);
                  view.dispatch(transaction);
                }
              }
            });
            return true;
          }
        : undefined,
      handlePaste: imagesEnabled
        ? (view, event) => {
            const items = event.clipboardData?.items;
            if (!items) return false;
            for (const item of items) {
              if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (!file) continue;
                event.preventDefault();
                uploadImage(file).then((url) => {
                  if (url) {
                    const { schema } = view.state;
                    const node = schema.nodes.image.create({ src: url });
                    const transaction = view.state.tr.replaceSelectionWith(node);
                    view.dispatch(transaction);
                  }
                });
                return true;
              }
            }
            return false;
          }
        : undefined,
    },
    onUpdate: ({ editor: ed }) => {
      const html = normalizeRichHtml(ed.getHTML());
      lastEmittedHtml.current = html;
      onChange(html);
      setCharCount(ed.getText().length);
    },
    onBlur: ({ editor: ed }) => {
      const html = normalizeRichHtml(ed.getHTML());
      lastEmittedHtml.current = html;
      if (!richHtmlEquivalent(html, value)) {
        onChange(html);
      }
    },
  });

  // Only apply external value changes — never reset while the user is editing
  useEffect(() => {
    if (!editor) return;

    const next = normalizeRichHtml(value || "");
    if (next === lastEmittedHtml.current) return;
    if (editor.isFocused) return;

    if (!richHtmlEquivalent(editor.getHTML(), next)) {
      editor.commands.setContent(next, { emitUpdate: false });
      lastEmittedHtml.current = next;
      setCharCount(editor.getText().length);
    }
  }, [editor, value]);

  useEffect(() => {
    editorInstanceRef.current = editor;
  }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const refreshToolbar = () => setToolbarRevision((n) => n + 1);
    editor.on("selectionUpdate", refreshToolbar);
    editor.on("transaction", refreshToolbar);
    return () => {
      editor.off("selectionUpdate", refreshToolbar);
      editor.off("transaction", refreshToolbar);
    };
  }, [editor]);

  const applyFontSize = (size: string) => {
    if (!editor) return;
    requestAnimationFrame(() => {
      if (size === "1rem") editor.chain().focus().unsetFontSize().run();
      else editor.chain().focus().setFontSize(size).run();
    });
  };

  const setLink = () => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("輸入連結網址", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleImageUpload = async (file: File) => {
    if (!editor || uploadingRef.current) return;
    uploadingRef.current = true;
    const url = await uploadImage(file);
    uploadingRef.current = false;
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  const currentFontSize =
    (editor?.getAttributes("textStyle").fontSize as string | undefined) || "1rem";

  if (!editor) {
    return (
      <div
        className="border border-slate-800 rounded-2xl bg-slate-950 animate-pulse"
        style={{ minHeight: editorMinHeight }}
      />
    );
  }

  const counterOverSuggested = suggestedLength != null && charCount > suggestedLength;

  return (
    <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950">
      <div className="border-b border-slate-800 bg-slate-900/80 overflow-x-auto [&::-webkit-scrollbar]:hidden touch-pan-x">
        <div className="flex items-center gap-0.5 p-2 flex-nowrap min-w-max">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="粗體">
          <Bold className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="斜體">
          <Italic className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="底線">
          <UnderlineIcon className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="刪除線">
          <Strikethrough className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        <select
          title="字體大小"
          value={currentFontSize}
          onChange={(e) => applyFontSize(e.target.value)}
          className="h-8 min-w-[4.5rem] px-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-zinc-300 focus:outline-none focus:border-blue-500 touch-manipulation"
        >
          {FONT_SIZE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="靠左對齊">
          <AlignLeft className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="置中對齊">
          <AlignCenter className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="靠右對齊">
          <AlignRight className="w-4 h-4" />
        </ToolbarButton>

        <div className="w-px h-6 bg-slate-700 mx-1" />

        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="標題">
          <Heading2 className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="項目符號">
          <List className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="編號清單">
          <ListOrdered className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="引用">
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

        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="復原">
          <Undo className="w-4 h-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="重做">
          <Redo className="w-4 h-4" />
        </ToolbarButton>
        </div>
      </div>

      <div
        ref={editorWrapperRef}
        className="rich-text-editor-surface cursor-text"
        style={{ minHeight: editorMinHeight }}
        onClick={() => focusEditor(editor)}
      >
        <EditorContent editor={editor} />
      </div>

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

      {imagesEnabled && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
            e.target.value = "";
          }}
        />
      )}
    </div>
  );
}
