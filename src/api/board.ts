import client from "./client";

export interface BoardSummary {
  id: number;
  title: string;
  ownerName: string;
  createdAt: string;
  cardCount: number;
}

export interface CardResponse {
  id: number;
  title: string;
  description?: string;
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  columnKey: string;
  position: number;
  labels: { id: number; text: string; color: string }[];
  createdAt: string;
}

export const boardApi = {
  getBoards: async (): Promise<BoardSummary[]> => {
    const res = await client.get("/api/boards");
    return res.data;
  },
  createBoard: async (title: string) => {
    const res = await client.post("/api/boards", { title });
    return res.data;
  },
  deleteBoard: async (boardId: number) => {
    await client.delete(`/api/boards/${boardId}`);
  },
  getCards: async (boardId: number): Promise<CardResponse[]> => {
    const res = await client.get(`/api/boards/${boardId}/cards`);
    return res.data;
  },
  createCard: async (
    boardId: number,
    title: string,
    columnKey: string,
  ): Promise<CardResponse> => {
    const res = await client.post(`/api/boards/${boardId}/cards`, {
      title,
      columnKey,
    });
    return res.data;
  },
};

export const cardApi = {
  moveCard: async (cardId: number, columnKey: string, position: number) => {
    const res = await client.patch(`/api/cards/${cardId}/move`, {
      columnKey,
      position,
    });
    return res.data;
  },
  deleteCard: async (cardId: number) => {
    await client.delete(`/api/cards/${cardId}`);
  },
  updateCard: async (
    cardId: number,
    data: {
      title?: string;
      description?: string;
      assignee?: string;
      startDate?: string;
      dueDate?: string;
      labels?: { id?: number; text: string; color: string }[];
    },
  ) => {
    const res = await client.put(`/api/cards/${cardId}`, data);
    return res.data;
  },
};
