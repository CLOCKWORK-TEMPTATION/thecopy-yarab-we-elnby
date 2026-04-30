import { AuthGuard } from "@/components/auth/AuthGuard";
import "./src/styles/system.css";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div data-editor-root="true">{children}</div>
    </AuthGuard>
  );
}
