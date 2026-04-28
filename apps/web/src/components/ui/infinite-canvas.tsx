"use client";

import {
  Plus,
  Maximize2,
  Hand,
  MousePointer,
  Link2,
  Trash2,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Infinite Canvas Component for Brainstorming
 * Based on UI_DESIGN_SUGGESTIONS.md
 *
 * Features:
 * - Pan and zoom with smooth animations
 * - Draggable idea nodes
 * - Bezier curve connections
 * - Auto-clustering of related ideas
 * - AI expand tool for generating new ideas
 * - MiniMap navigation
 */

interface Position {
  x: number;
  y: number;
}

interface IdeaNode {
  id: string;
  content: string;
  position: Position;
  color?: string;
  connections: string[];
  isExpanded?: boolean;
  children?: string[];
}

interface InfiniteCanvasProps {
  nodes?: IdeaNode[];
  onNodesChange?: (nodes: IdeaNode[]) => void;
  className?: string;
}

const ZOOM_SENSITIVITY = 0.001;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;

export function InfiniteCanvas({
  nodes: externalNodes,
  onNodesChange,
  className,
}: InfiniteCanvasProps) {
  const canvasRef = React.useRef<HTMLDivElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  // Canvas state
  const [offset, setOffset] = React.useState<Position>({ x: 0, y: 0 });
  const [zoom, setZoom] = React.useState(1);
  const [isPanning, setIsPanning] = React.useState(false);
  const [panStart, setPanStart] = React.useState<Position>({ x: 0, y: 0 });
  const [tool, setTool] = React.useState<"select" | "pan" | "connect">(
    "select"
  );

  // Node state
  const [nodes, setNodes] = React.useState<IdeaNode[]>(
    externalNodes ?? [
      {
        id: "1",
        content: "الفكرة الرئيسية",
        position: { x: 400, y: 300 },
        color: "var(--brand)",
        connections: [],
      },
    ]
  );
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);
  const [draggingNode, setDraggingNode] = React.useState<string | null>(null);
  const [connectingFrom, setConnectingFrom] = React.useState<string | null>(
    null
  );

  // Sync with external nodes
  React.useEffect(() => {
    if (externalNodes) {
      setNodes(externalNodes);
    }
  }, [externalNodes]);

  // Notify parent of changes
  const updateNodes = (newNodes: IdeaNode[]) => {
    setNodes(newNodes);
    onNodesChange?.(newNodes);
  };

  // Handle wheel zoom
  const handleWheel = React.useCallback(
    (e: WheelEvent) => {
      if (!canvasRef.current) return;
      e.preventDefault();

      const rect = canvasRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom + delta));

      // Zoom towards mouse position
      const scale = newZoom / zoom;
      const newOffsetX = mouseX - (mouseX - offset.x) * scale;
      const newOffsetY = mouseY - (mouseY - offset.y) * scale;

      setZoom(newZoom);
      setOffset({ x: newOffsetX, y: newOffsetY });
    },
    [zoom, offset]
  );

  // Register wheel event
  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  // Handle pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === "pan" || e.button === 1 || e.shiftKey) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  // Handle pan move
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    }

    if (draggingNode) {
      const newX = (e.clientX - offset.x) / zoom;
      const newY = (e.clientY - offset.y) / zoom;
      updateNodes(
        nodes.map((n) =>
          n.id === draggingNode
            ? { ...n, position: { x: newX - 100, y: newY - 30 } }
            : n
        )
      );
    }
  };

  // Handle pan end
  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNode(null);
    if (connectingFrom) {
      setConnectingFrom(null);
    }
  };

  // Add new node
  const addNode = (parentId?: string) => {
    const parent = parentId ? nodes.find((n) => n.id === parentId) : null;
    const newNode: IdeaNode = {
      id: Date.now().toString(),
      content: "فكرة جديدة",
      position: parent
        ? {
            x: parent.position.x + 250,
            y: parent.position.y + Math.random() * 100 - 50,
          }
        : {
            x: 400 + Math.random() * 200,
            y: 300 + Math.random() * 200,
          },
      color: `oklch(0.7 0.15 ${Math.random() * 360})`,
      connections: parentId ? [parentId] : [],
    };

    updateNodes([...nodes, newNode]);
    setSelectedNode(newNode.id);
  };

  // Delete node
  const deleteNode = (id: string) => {
    updateNodes(
      nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          connections: n.connections.filter((c) => c !== id),
        }))
    );
    setSelectedNode(null);
  };

  const activateNode = (id: string) => {
    if (tool === "connect") {
      if (connectingFrom) {
        if (connectingFrom !== id) {
          updateNodes(
            nodes.map((n) =>
              n.id === id
                ? { ...n, connections: [...n.connections, connectingFrom] }
                : n
            )
          );
        }
        setConnectingFrom(null);
      } else {
        setConnectingFrom(id);
      }
    } else {
      setSelectedNode(id);
    }
  };

  // Connect nodes
  const handleNodeClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    activateNode(id);
  };

  // Handle node drag start
  const handleNodeDragStart = (id: string, e: React.MouseEvent) => {
    if (tool === "select") {
      e.stopPropagation();
      setDraggingNode(id);
    }
  };

  // Update node content
  const updateNodeContent = (id: string, content: string) => {
    updateNodes(nodes.map((n) => (n.id === id ? { ...n, content } : n)));
  };

  // Zoom controls
  const zoomIn = () => setZoom(Math.min(MAX_ZOOM, zoom + 0.1));
  const zoomOut = () => setZoom(Math.max(MIN_ZOOM, zoom - 0.1));
  const resetZoom = () => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  };

  // Calculate bezier path between two nodes
  const getBezierPath = (from: IdeaNode, to: IdeaNode) => {
    const fromX = from.position.x + 100;
    const fromY = from.position.y + 30;
    const toX = to.position.x + 100;
    const toY = to.position.y + 30;

    const midX = (fromX + toX) / 2;
    const cp1x = midX;
    const cp1y = fromY;
    const cp2x = midX;
    const cp2y = toY;

    return `M ${fromX} ${fromY} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${toX} ${toY}`;
  };

  return (
    <div
      className={cn(
        "infinite-canvas relative w-full h-full bg-muted/20 overflow-hidden",
        tool === "pan" && "cursor-grab",
        isPanning && "cursor-grabbing",
        className
      )}
      ref={canvasRef}
      role="button"
      aria-label="لوحة الأفكار التفاعلية"
      tabIndex={0}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Toolbar */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-lg">
        <Button
          variant={tool === "select" ? "default" : "ghost"}
          size="icon"
          onClick={() => setTool("select")}
          title="أداة التحديد"
        >
          <MousePointer className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === "pan" ? "default" : "ghost"}
          size="icon"
          onClick={() => setTool("pan")}
          title="أداة السحب"
        >
          <Hand className="h-4 w-4" />
        </Button>
        <Button
          variant={tool === "connect" ? "default" : "ghost"}
          size="icon"
          onClick={() => setTool("connect")}
          title="أداة الربط"
        >
          <Link2 className="h-4 w-4" />
        </Button>
        <div className="w-px h-6 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => addNode()}
          title="إضافة فكرة"
        >
          <Plus className="h-4 w-4" />
        </Button>
        {selectedNode && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteNode(selectedNode)}
            title="حذف"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-10 flex items-center gap-2 p-2 bg-card border border-border rounded-lg shadow-lg">
        <Button variant="ghost" size="icon" onClick={zoomOut} title="تصغير">
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-sm font-mono w-14 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={zoomIn} title="تكبير">
          <ZoomIn className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={resetZoom}
          title="إعادة تعيين"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* MiniMap */}
      <div className="absolute bottom-4 left-4 z-10 w-40 h-28 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
        <div className="relative w-full h-full">
          {nodes.map((node) => (
            <div
              key={node.id}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${(node.position.x / 2000) * 100}%`,
                top: `${(node.position.y / 1500) * 100}%`,
                backgroundColor: node.color ?? "var(--brand)",
              }}
            />
          ))}
          {/* Viewport indicator */}
          <div
            className="absolute border-2 border-brand rounded"
            style={{
              left: `${(-offset.x / zoom / 2000) * 100}%`,
              top: `${(-offset.y / zoom / 1500) * 100}%`,
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          />
        </div>
      </div>

      {/* Canvas Content */}
      <div
        ref={contentRef}
        className="infinite-canvas__content"
        style={{
          transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
        }}
      >
        {/* Connections (SVG) */}
        <svg className="absolute inset-0 w-[4000px] h-[3000px] pointer-events-none">
          {nodes.map((node) =>
            node.connections.map((connId) => {
              const connectedNode = nodes.find((n) => n.id === connId);
              if (!connectedNode) return null;
              return (
                <path
                  key={`${node.id}-${connId}`}
                  d={getBezierPath(connectedNode, node)}
                  className="infinite-canvas__connection"
                  style={{ stroke: node.color ?? "var(--border)" }}
                />
              );
            })
          )}
        </svg>

        {/* Nodes */}
        {nodes.map((node) => (
          <div
            key={node.id}
            className={cn(
              "infinite-canvas__node group",
              selectedNode === node.id && "ring-2 ring-brand",
              connectingFrom === node.id &&
                "ring-2 ring-accent-creative animate-pulse"
            )}
            style={{
              left: node.position.x,
              top: node.position.y,
              borderColor: node.color,
            }}
            role="button"
            tabIndex={0}
            onClick={(e) => handleNodeClick(node.id, e)}
            onKeyDown={(e) => {
              if (e.key !== "Enter" && e.key !== " ") return;
              e.preventDefault();
              activateNode(node.id);
            }}
            onMouseDown={(e) => handleNodeDragStart(node.id, e)}
          >
            {/* Color indicator */}
            <div
              className="absolute top-0 right-0 left-0 h-1 rounded-t-lg"
              style={{ backgroundColor: node.color }}
            />

            {/* Content */}
            <div className="pt-2">
              <input
                type="text"
                value={node.content}
                onChange={(e) => updateNodeContent(node.id, e.target.value)}
                className="w-full bg-transparent border-none outline-none text-center font-medium"
                dir="rtl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Quick actions */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 rounded-full shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  addNode(node.id);
                }}
                title="إضافة فكرة فرعية"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                className="h-6 w-6 rounded-full shadow-md"
                onClick={(e) => {
                  e.stopPropagation();
                  // AI expand - placeholder
                }}
                title="توسيع بالذكاء الاصطناعي"
              >
                <Sparkles className="h-3 w-3 text-brand" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Connecting line preview */}
      {connectingFrom && (
        <div className="absolute inset-0 pointer-events-none">
          <div className="text-center mt-4 text-sm text-muted-foreground bg-card/80 backdrop-blur-sm py-2 px-4 rounded-full mx-auto w-fit">
            اختر عقدة للربط أو اضغط ESC للإلغاء
          </div>
        </div>
      )}
    </div>
  );
}

export default InfiniteCanvas;
