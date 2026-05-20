import { create } from "zustand";
import type { TaskMap, ColumnId, Task } from "../types";
import { boardApi, cardApi } from "../api/board";
import type { CardResponse } from "../api/board";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  getSocketId,
} from "../api/socket";

export const COLUMNS = [
  { id: "todo" as ColumnId, title: "할 일 📝", color: "#4C6EF5" },
  { id: "doing" as ColumnId, title: "진행 중 🚀", color: "#FAB005" },
  { id: "done" as ColumnId, title: "완료 ✅", color: "#40C057" },
  { id: "archive" as ColumnId, title: "보관함 📦", color: "#868E96" },
];

const emptyTasks = (): TaskMap => ({
  todo: [],
  doing: [],
  done: [],
  archive: [],
});

const toTask = (card: CardResponse): Task => ({
  id: card.id,
  content: card.title,
  description: card.description,
  assignee: card.assignee,
  startDate: card.startDate,
  dueDate: card.dueDate,
  labels: card.labels,
  columnKey: card.columnKey as ColumnId,
  position: card.position,
});

interface BoardState {
  tasks: TaskMap;
  isLoading: boolean;
  currentBoardId: number | null;

  updateTask: (
    taskId: number,
    colId: ColumnId,
    patch: Partial<Task>,
  ) => Promise<void>;
  applyRemoteMove: (taskId: number, fromCol: ColumnId, toCol: ColumnId) => void;
  loadBoard: (boardId: number) => Promise<void>;
  joinBoard: (boardId: number) => void;
  leaveBoard: () => void;
  moveTask: (taskId: number, fromCol: ColumnId, toCol: ColumnId) => void;
  addTask: (colId: ColumnId, content: string) => Promise<void>;
  deleteTask: (taskId: number, colId: ColumnId) => Promise<void>;
  clearBoard: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  tasks: emptyTasks(),
  isLoading: false,
  currentBoardId: null,

  loadBoard: async (boardId) => {
    set({ isLoading: true, currentBoardId: boardId });
    try {
      const cards = await boardApi.getCards(boardId);
      const tasks = emptyTasks();
      cards.forEach((card) => {
        const col = card.columnKey as ColumnId;
        if (tasks[col]) tasks[col].push(toTask(card));
      });
      set({ tasks, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  joinBoard: (boardId) => {
    const socket = connectSocket();
    socket.emit("join_board", { boardId });

    socket.off("card_moved");
    socket.on("card_moved", ({ cardId, fromCol, toCol }) => {
      get().applyRemoteMove(cardId, fromCol as ColumnId, toCol as ColumnId);
    });
  },

  leaveBoard: () => {
    const boardId = get().currentBoardId;
    const socket = getSocket();
    if (socket && boardId) {
      socket.emit("leave_board", { boardId });
    }
    disconnectSocket();
  },

  moveTask: (taskId, fromCol, toCol) => {
    if (fromCol === toCol) return;

    // 낙관적 업데이트
    set((state) => {
      const task = state.tasks[fromCol].find((t) => t.id === taskId);
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [fromCol]: state.tasks[fromCol].filter((t) => t.id !== taskId),
          [toCol]: [...state.tasks[toCol], { ...task, columnKey: toCol }],
        },
      };
    });

    // 소켓으로 이벤트 발송
    const socket = getSocket();
    const boardId = get().currentBoardId;
    if (socket && boardId) {
      const newPosition = get().tasks[toCol].length - 1;
      socket.emit("move_card", {
        boardId,
        cardId: taskId,
        fromCol,
        toCol,
        position: newPosition,
        token: localStorage.getItem("syncflow_token"),
        socketId: getSocketId(),
      });
    }
  },

  // 원격 이벤트 수신 시 — 소켓 발송 없이 UI만 업데이트
  applyRemoteMove: (taskId, fromCol, toCol) => {
    if (fromCol === toCol) return;
    set((state) => {
      const task = state.tasks[fromCol].find((t) => t.id === taskId);
      if (!task) return state;
      return {
        tasks: {
          ...state.tasks,
          [fromCol]: state.tasks[fromCol].filter((t) => t.id !== taskId),
          [toCol]: [...state.tasks[toCol], { ...task, columnKey: toCol }],
        },
      };
    });
  },

  addTask: async (colId, content) => {
    const boardId = get().currentBoardId;
    if (!boardId || !content.trim()) return;
    try {
      const card = await boardApi.createCard(boardId, content.trim(), colId);
      set((state) => ({
        tasks: {
          ...state.tasks,
          [colId]: [...state.tasks[colId], toTask(card)],
        },
      }));
    } catch {
      console.warn("카드 추가 실패");
    }
  },

  deleteTask: async (taskId, colId) => {
    set((state) => ({
      tasks: {
        ...state.tasks,
        [colId]: state.tasks[colId].filter((t) => t.id !== taskId),
      },
    }));
    try {
      await cardApi.deleteCard(taskId);
    } catch {
      console.warn("카드 삭제 실패");
    }
  },

  updateTask: async (taskId, colId, patch) => {
    const task = get().tasks[colId].find((t) => t.id === taskId);
    if (!task) return;
    const updatedTask = { ...task, ...patch };

    set((state) => ({
      tasks: {
        ...state.tasks,
        [colId]: state.tasks[colId].map((t) =>
          t.id === taskId ? updatedTask : t,
        ),
      },
    }));

    try {
      await cardApi.updateCard(taskId, {
        title: updatedTask.content,
        description: updatedTask.description,
        assignee: updatedTask.assignee,
        startDate: updatedTask.startDate,
        dueDate: updatedTask.dueDate,
        labels: updatedTask.labels?.map((l) => ({
          id: l.id,
          text: l.text,
          color: l.color,
        })),
      });
    } catch {
      console.warn("카드 수정 실패");
    }
  },

  clearBoard: () => set({ tasks: emptyTasks(), currentBoardId: null }),
}));

export const LABEL_PRESETS = [
  { text: "기획", color: "#845EF7" },
  { text: "디자인", color: "#F06595" },
  { text: "개발", color: "#339AF0" },
  { text: "테스트", color: "#20C997" },
  { text: "긴급", color: "#F03E3E" },
  { text: "문서", color: "#F59F00" },
];
