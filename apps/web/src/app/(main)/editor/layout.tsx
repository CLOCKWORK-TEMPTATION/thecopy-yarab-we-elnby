import "./src/styles/system.css";

export default function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div data-editor-root="true">{children}</div>;
}
