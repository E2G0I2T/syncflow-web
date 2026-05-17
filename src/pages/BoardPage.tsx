import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useBoardStore, COLUMNS } from "../store/useBoardStore";
import type { ColumnId, Task } from "../types";
import KanbanColumn from "../components/KanbanColumn";
import CardItem from "../components/CardItem";

const BoardPage = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const boardTitle   = (location.state as { title?: string })?.title ?? 'SyncFlow 보드';
  const numericId = Number(boardId);

  const tasks = useBoardStore((s) => s.tasks);
  const isLoading = useBoardStore((s) => s.isLoading);
  const loadBoard = useBoardStore((s) => s.loadBoard);
  const joinBoard = useBoardStore((s) => s.joinBoard);
  const leaveBoard = useBoardStore((s) => s.leaveBoard);
  const moveTask = useBoardStore((s) => s.moveTask);

  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (!numericId) return;
    loadBoard(numericId).then(() => joinBoard(numericId));
    return () => leaveBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericId]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const allTasks = Object.values(tasks).flat();
    const task = allTasks.find((t) => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;

    const fromCol = active.data.current?.columnId as ColumnId;
    const toCol = over.id as ColumnId;

    // fromCol과 toCol이 같으면 아무것도 하지 않음
    if (!fromCol || !toCol || fromCol === toCol) return;

    moveTask(Number(active.id), fromCol, toCol);
  };

  if (isLoading) {
    return <div style={styles.center}>보드 불러오는 중...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate("/boards")}>
          ‹ 보드 목록
        </button>
        <h2 style={styles.title}>{boardTitle}</h2>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div style={styles.board}>
          {COLUMNS.map((col) => (
            <KanbanColumn key={col.id} column={col} tasks={tasks[col.id]} />
          ))}
        </div>

        <DragOverlay>
          {activeTask && <CardItem task={activeTask} overlay />}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    height: "100vh",
    display: "flex",
    flexDirection: "column",
    backgroundColor: "#f8f9fa",
  },
  center: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: "100vh",
  },
  header: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#fff",
    padding: "12px 24px",
    borderBottom: "1px solid #eee",
    boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#4C6EF5",
    fontSize: 18,
    cursor: "pointer",
    fontWeight: "bold",
  },
  title: { margin: 0, fontSize: 18, fontWeight: "bold", color: "#222" },
  board: {
    display: "flex",
    gap: 16,
    padding: 24,
    overflowX: "auto",
    flex: 1,
    alignItems: "flex-start",
  },
};

export default BoardPage;
