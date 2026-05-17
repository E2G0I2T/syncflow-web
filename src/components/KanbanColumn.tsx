import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Task, ColumnId } from "../types";
import { useBoardStore } from "../store/useBoardStore";
import CardItem from "./CardItem";

interface Props {
  column: { id: ColumnId; title: string; color: string };
  tasks: Task[];
}

const KanbanColumn = ({ column, tasks }: Props) => {
  const addTask = useBoardStore((s) => s.addTask);
  const [newContent, setNewContent] = useState("");
  const [adding, setAdding] = useState(false);
  const [inputOpen, setInputOpen] = useState(false);

  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  const handleAdd = async () => {
    if (!newContent.trim()) return;
    setAdding(true);
    await addTask(column.id, newContent.trim());
    setNewContent("");
    setInputOpen(false);
    setAdding(false);
  };

  return (
    <div style={styles.column}>
      {/* 헤더 */}
      <div style={{ ...styles.header, backgroundColor: column.color }}>
        <span style={styles.headerTitle}>{column.title}</span>
        <span style={styles.count}>{tasks.length}</span>
      </div>

      {/* 카드 목록 */}
      <div
        ref={setNodeRef}
        style={{
          ...styles.cardList,
          backgroundColor: isOver ? "#e8eeff" : "transparent",
        }}
      >
        {tasks.map((task) => (
          <CardItem key={task.id} task={task} columnId={column.id} />
        ))}
      </div>

      {/* 카드 추가 */}
      {inputOpen ? (
        <div style={styles.inputArea}>
          <textarea
            style={styles.textarea}
            placeholder="카드 제목 입력..."
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            autoFocus
            rows={2}
          />
          <div style={styles.inputActions}>
            <button style={styles.addBtn} onClick={handleAdd} disabled={adding}>
              {adding ? "추가 중..." : "추가"}
            </button>
            <button
              style={styles.cancelBtn}
              onClick={() => {
                setInputOpen(false);
                setNewContent("");
              }}
            >
              취소
            </button>
          </div>
        </div>
      ) : (
        <button style={styles.openInputBtn} onClick={() => setInputOpen(true)}>
          + 카드 추가
        </button>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  column: {
    width: 280,
    minWidth: 280,
    backgroundColor: "#ebecf0",
    borderRadius: 12,
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
  },
  header: {
    padding: "12px 16px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { color: "#fff", fontWeight: "bold", fontSize: 15 },
  count: {
    backgroundColor: "rgba(255,255,255,0.3)",
    color: "#fff",
    borderRadius: 10,
    padding: "2px 8px",
    fontSize: 13,
    fontWeight: "bold",
  },
  cardList: { padding: 8, minHeight: 100, transition: "background-color 0.2s" },
  inputArea: { padding: "0 8px 8px" },
  textarea: {
    width: "100%",
    border: "1px solid #ddd",
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    resize: "none",
    boxSizing: "border-box",
  },
  inputActions: { display: "flex", gap: 8, marginTop: 6 },
  addBtn: {
    backgroundColor: "#4C6EF5",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    padding: "8px 16px",
    cursor: "pointer",
    fontWeight: "bold",
  },
  cancelBtn: {
    background: "none",
    border: "none",
    color: "#888",
    cursor: "pointer",
    fontSize: 14,
  },
  openInputBtn: {
    margin: "0 8px 8px",
    padding: "10px",
    background: "none",
    border: "none",
    color: "#555",
    cursor: "pointer",
    borderRadius: 8,
    textAlign: "left",
    fontSize: 14,
    width: "calc(100% - 16px)",
  },
};

export default KanbanColumn;
