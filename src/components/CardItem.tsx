import { useState, useRef, useEffect } from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { Task, ColumnId } from "../types";
import { useBoardStore, COLUMNS } from "../store/useBoardStore";
import CardDetailModal from "./CardDetailModal";

interface Props {
  task: Task;
  columnId?: ColumnId;
  overlay?: boolean;
}

const CardItem = ({ task, columnId, overlay = false }: Props) => {
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const moveTask = useBoardStore((s) => s.moveTask);

  const [menuOpen, setMenuOpen] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });

  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: task.id,
      data: { columnId },
    });

  // 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!menuOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        menuBtnRef.current &&
        !menuBtnRef.current.contains(e.target as Node)
      ) {
        setMenuOpen(false);
        setShowSubMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  const handleMenuOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 4, left: rect.left });
    }
    setMenuOpen((prev) => !prev);
    setShowSubMenu(false);
  };

  const handleStatusChange = (toCol: ColumnId) => {
    if (!columnId) return;
    moveTask(task.id, columnId, toCol);
    setMenuOpen(false);
    setShowSubMenu(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!columnId || !confirm("정말 삭제할까요?")) return;
    deleteTask(task.id, columnId);
    setMenuOpen(false);
  };

  const cardStyle: React.CSSProperties = {
    ...styles.card,
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.3 : 1,
    boxShadow: overlay
      ? "0 8px 24px rgba(0,0,0,0.2)"
      : "0 1px 4px rgba(0,0,0,0.08)",
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={cardStyle}
        {...listeners}
        {...attributes}
        onClick={() => !overlay && setModalOpen(true)}
      >
        <div style={styles.content}>
          <p style={styles.text}>{task.content}</p>

          {/* 드롭다운 버튼 */}
          {!overlay && (
            <button
              ref={menuBtnRef}
              style={styles.menuBtn}
              onClick={handleMenuOpen}
            >
              ⋮
            </button>
          )}
        </div>

        {/* 라벨 */}
        {task.labels && task.labels.length > 0 && (
          <div style={styles.labels}>
            {task.labels.map((label) => (
              <span
                key={label.id}
                style={{ ...styles.labelChip, backgroundColor: label.color }}
              >
                {label.text}
              </span>
            ))}
          </div>
        )}

        {/* 담당자 / 날짜 */}
        {(task.assignee || task.dueDate) && (
          <div style={styles.meta}>
            {task.assignee && (
              <span style={styles.metaText}>👤 {task.assignee}</span>
            )}
            {task.dueDate && (
              <span style={styles.metaText}>📅 {task.dueDate}</span>
            )}
          </div>
        )}
      </div>

      {/* 드롭다운 메뉴 — position fixed로 카드 밖에 렌더링 */}
      {menuOpen && (
        <div
          ref={menuRef}
          style={{ ...styles.menu, top: menuPos.top, left: menuPos.left }}
        >
          {/* 상태 변경 */}
          <button
            style={styles.menuItem}
            onClick={() => setShowSubMenu((p) => !p)}
          >
            🔄 상태 변경{" "}
            <span style={styles.arrow}>{showSubMenu ? "▲" : "▼"}</span>
          </button>

          {showSubMenu && (
            <div style={styles.subMenu}>
              {COLUMNS.filter((col) => col.id !== columnId).map((col) => (
                <button
                  key={col.id}
                  style={styles.subMenuItem}
                  onClick={() => handleStatusChange(col.id)}
                >
                  <span style={{ ...styles.dot, backgroundColor: col.color }} />
                  {col.title}
                </button>
              ))}
            </div>
          )}

          <div style={styles.divider} />

          {/* 삭제 */}
          <button
            style={{ ...styles.menuItem, color: "#e03131" }}
            onClick={handleDelete}
          >
            🗑️ 카드 삭제
          </button>
        </div>
      )}

      {modalOpen && (
        <CardDetailModal
          key={task.id}
          task={task}
          columnId={columnId ?? null}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    border: "1px solid #eee",
    cursor: "pointer",
  },
  content: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  text: { margin: 0, fontSize: 14, color: "#333", flex: 1, lineHeight: 1.5 },
  menuBtn: {
    background: "none",
    border: "none",
    color: "#aaa",
    cursor: "pointer",
    fontSize: 20,
    fontWeight: "bold",
    padding: "0 4px",
    lineHeight: 1,
    flexShrink: 0,
  },
  labels: { display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 },
  labelChip: {
    borderRadius: 12,
    padding: "3px 8px",
    fontSize: 11,
    color: "#fff",
    fontWeight: 500,
  },
  meta: { display: "flex", gap: 10, marginTop: 8 },
  metaText: { fontSize: 12, color: "#888" },

  // 드롭다운 메뉴
  menu: {
    position: "fixed",
    zIndex: 9999,
    backgroundColor: "#fff",
    borderRadius: 10,
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
    border: "1px solid #f0f0f0",
    overflow: "hidden",
    width: 180,
  },
  menuItem: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    padding: "13px 16px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    color: "#333",
    textAlign: "left",
  },
  arrow: { fontSize: 10, color: "#aaa" },
  divider: { height: 1, backgroundColor: "#f0f0f0" },
  subMenu: { backgroundColor: "#fafafa", borderBottom: "1px solid #f0f0f0" },
  subMenuItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    width: "100%",
    padding: "11px 20px",
    background: "none",
    border: "none",
    cursor: "pointer",
    fontSize: 13,
    color: "#444",
  },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
};

export default CardItem;
