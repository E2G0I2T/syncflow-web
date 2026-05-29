import { useEffect, useState, useRef } from "react";
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
  const boardTitle =
    (location.state as { title?: string })?.title ?? "SyncFlow 보드";
  const numericId = Number(boardId);

  const tasks = useBoardStore((s) => s.tasks);
  const isLoading = useBoardStore((s) => s.isLoading);
  const loadBoard = useBoardStore((s) => s.loadBoard);
  const joinBoard = useBoardStore((s) => s.joinBoard);
  const leaveBoard = useBoardStore((s) => s.leaveBoard);
  const moveTask = useBoardStore((s) => s.moveTask);

  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [activeTabId, setActiveTabId] = useState<ColumnId>("todo");
  const [showTabBar, setShowTabBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const boardRef = useRef<HTMLDivElement>(null);
  const columnRefs = useRef<Partial<Record<ColumnId, HTMLDivElement>>>({});
  const searchRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  useEffect(() => {
    if (!numericId) return;
    loadBoard(numericId).then(() => joinBoard(numericId));
    return () => leaveBoard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericId]);

  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;
    const handleScroll = () => {
      const scrollLeft = board.scrollLeft;
      const boardWidth = board.clientWidth;
      const center = scrollLeft + boardWidth / 2;
      let closestCol: ColumnId = "todo";
      let closestDist = Infinity;
      COLUMNS.forEach((col) => {
        const el = columnRefs.current[col.id];
        if (!el) return;
        const colCenter = el.offsetLeft + el.offsetWidth / 2;
        const dist = Math.abs(center - colCenter);
        if (dist < closestDist) {
          closestDist = dist;
          closestCol = col.id;
        }
      });
      setActiveTabId(closestCol);
    };
    board.addEventListener("scroll", handleScroll, { passive: true });
    return () => board.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isLoading) return;
    const board = boardRef.current;
    if (!board) return;
    setShowTabBar(board.scrollWidth > board.clientWidth);
    const observer = new ResizeObserver(() => {
      setShowTabBar(board.scrollWidth > board.clientWidth);
    });
    observer.observe(board);
    return () => observer.disconnect();
  }, [isLoading]);

  // 검색창 열릴 때 자동 포커스
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [searchOpen]);

  // 검색창 닫기 핸들러
  const handleSearchClose = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  const handleTabClick = (colId: ColumnId) => {
    const el = columnRefs.current[colId];
    if (!el || !boardRef.current) return;
    boardRef.current.scrollTo({ left: el.offsetLeft - 24, behavior: "smooth" });
    setActiveTabId(colId);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const allTasks = Object.values(tasks).flat();
    const task = allTasks.find((t) => t.id === event.active.id);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const fromCol = active.data.current?.columnId as ColumnId;
    const toCol = over.id as ColumnId;
    if (!fromCol || !toCol || fromCol === toCol) return;
    moveTask(Number(active.id), fromCol, toCol);
  };

  // 검색 필터링 — 제목, 담당자 기준
  const filterTasks = (colTasks: Task[]) => {
    if (!searchQuery.trim()) return colTasks;
    const q = searchQuery.toLowerCase();
    return colTasks.filter(
      (t) =>
        t.content.toLowerCase().includes(q) ||
        t.assignee?.toLowerCase().includes(q),
    );
  };

  // 검색 결과 총 개수
  const totalMatches = searchQuery.trim()
    ? COLUMNS.reduce((acc, col) => acc + filterTasks(tasks[col.id]).length, 0)
    : null;

  if (isLoading) {
    return <div style={styles.center}>보드 불러오는 중...</div>;
  }

  return (
    <div style={styles.container}>
      {/* 페이지 헤더 */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate("/boards")}>
          ‹ 보드 목록
        </button>

        {/* 검색창 */}
        {searchOpen ? (
          <div style={styles.searchBox}>
            <span style={styles.searchIcon}>🔍</span>
            <input
              ref={searchRef}
              style={styles.searchInput}
              placeholder="카드 제목, 담당자 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {totalMatches !== null && (
              <span style={styles.matchCount}>{totalMatches}건</span>
            )}
            <button style={styles.searchCloseBtn} onClick={handleSearchClose}>
              ✕
            </button>
          </div>
        ) : (
          <h2 style={styles.title}>{boardTitle}</h2>
        )}

        <button
          style={styles.searchToggleBtn}
          onClick={() =>
            searchOpen ? handleSearchClose() : setSearchOpen(true)
          }
          title="검색"
        >
          🔍
        </button>
      </div>

      {/* 컬럼 탭바 */}
      {showTabBar && (
        <div style={styles.tabBar}>
          {COLUMNS.map((col) => (
            <button
              key={col.id}
              style={{
                ...styles.tabItem,
                borderBottomColor:
                  activeTabId === col.id ? col.color : "transparent",
                color: activeTabId === col.id ? col.color : "#888",
                fontWeight: activeTabId === col.id ? "bold" : "normal",
              }}
              onClick={() => handleTabClick(col.id)}
            >
              {col.title.split(" ")[0]}
              <span
                style={{
                  ...styles.tabCount,
                  backgroundColor:
                    activeTabId === col.id ? col.color : "#e0e0e0",
                }}
              >
                {filterTasks(tasks[col.id]).length}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 칸반 보드 */}
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div ref={boardRef} style={styles.board}>
          {COLUMNS.map((col) => (
            <div
              key={col.id}
              ref={(el) => {
                if (el) columnRefs.current[col.id] = el;
              }}
            >
              <KanbanColumn column={col} tasks={filterTasks(tasks[col.id])} />
            </div>
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
    flexShrink: 0,
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: "bold",
    color: "#222",
    flex: 1,
  },
  searchBox: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: "6px 12px",
  },
  searchIcon: { fontSize: 14, color: "#aaa" },
  searchInput: {
    flex: 1,
    border: "none",
    background: "none",
    fontSize: 15,
    outline: "none",
    color: "#333",
  },
  matchCount: {
    fontSize: 12,
    color: "#4C6EF5",
    fontWeight: "bold",
    flexShrink: 0,
  },
  searchCloseBtn: {
    background: "none",
    border: "none",
    color: "#aaa",
    cursor: "pointer",
    fontSize: 14,
    flexShrink: 0,
  },
  searchToggleBtn: {
    background: "none",
    border: "none",
    fontSize: 18,
    cursor: "pointer",
    flexShrink: 0,
  },
  tabBar: {
    display: "flex",
    backgroundColor: "#fff",
    borderBottom: "1px solid #eee",
    padding: "0 24px",
  },
  tabItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: 1,
    justifyContent: "center",
    padding: "12px 8px",
    background: "none",
    border: "none",
    borderBottom: "3px solid transparent",
    cursor: "pointer",
    fontSize: 14,
    transition: "color 0.2s, border-color 0.2s",
  },
  tabCount: {
    fontSize: 11,
    color: "#fff",
    borderRadius: 10,
    padding: "1px 7px",
    fontWeight: "bold",
    transition: "background-color 0.2s",
  },
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
