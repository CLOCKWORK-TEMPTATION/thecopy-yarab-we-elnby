import { Button } from "@/components/ui/button";

type ActiveTool = "teleprompter" | "recorder" | "comparison" | "notes" | "export";

interface ToolNavigationProps {
  activeTool: ActiveTool;
  setActiveTool: (tool: ActiveTool) => void;
}

export const ToolNavigation: React.FC<ToolNavigationProps> = ({ activeTool, setActiveTool }) => {
  const tools = [
    { id: "teleprompter" as const, label: "📜 Teleprompter" },
    { id: "recorder" as const, label: "🎬 التسجيل" },
    { id: "comparison" as const, label: "⚖️ المقارنة" },
    { id: "notes" as const, label: "📝 الملاحظات" },
    { id: "export" as const, label: "📤 التصدير" },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tools.map((tool) => (
        <Button
          key={tool.id}
          variant={activeTool === tool.id ? "default" : "outline"}
          className={
            activeTool === tool.id
              ? "bg-purple-600 text-white hover:bg-purple-700"
              : "border-purple-500/50 text-purple-300 hover:bg-purple-500/20"
          }
          onClick={() => setActiveTool(tool.id)}
        >
          {tool.label}
        </Button>
      ))}
    </div>
  );
};
