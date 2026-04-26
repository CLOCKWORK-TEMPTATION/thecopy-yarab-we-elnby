import { CheckCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface Task {
  id: string;
  title: string;
  status: "pending" | "in-progress" | "completed";
}

interface TasksBoardProps {
  tasks?: Task[];
  onTaskMove?: (taskId: string, from: string, to: string) => void;
  onTaskDelete?: (taskId: string) => void;
  onTaskAdd?: (column: string) => void;
}

export function TasksBoard({ tasks = [] }: TasksBoardProps) {
  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">لوحة المهام</h3>
      {tasks.length === 0 ? (
        <Card className="p-6 text-center text-white/55">
          لا توجد مهام حالياً
        </Card>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <Card
              key={task.id}
              className="p-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                <span>{task.title}</span>
              </div>
              <Badge
                variant={task.status === "completed" ? "default" : "secondary"}
              >
                {task.status}
              </Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
