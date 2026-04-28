import type { AppSettings } from "@/app/(main)/arabic-creative-writing-studio/types";
import type { RefObject } from "react";

interface EditorWorkspaceProps {
  content: string;
  editorRef: RefObject<HTMLTextAreaElement | null>;
  onContentChange: (value: string) => void;
  settings: AppSettings;
}

export function EditorWorkspace({
  content,
  editorRef,
  onContentChange,
  settings,
}: EditorWorkspaceProps) {
  return (
    <div className="overflow-hidden rounded-[22px] border border-white/8 bg-white/[0.04] shadow-lg backdrop-blur-2xl">
      <textarea
        ref={editorRef}
        value={content}
        onChange={(event) => onContentChange(event.target.value)}
        placeholder="ابدأ كتابة إبداعك هنا... 🖋️"
        className={`h-96 w-full resize-none border-none bg-transparent p-6 text-white placeholder-white/45 focus:outline-none ${
          settings.fontSize === "small"
            ? "text-sm"
            : settings.fontSize === "large"
              ? "text-lg"
              : "text-base"
        }`}
        style={{
          fontFamily:
            "'Noto Sans Arabic', 'Cairo', 'Tajawal', Arial, sans-serif",
          lineHeight: 1.8,
          direction: settings.textDirection,
        }}
      />
    </div>
  );
}
