import client from './client';

export interface CommentResponse {
  id: number;
  content: string;
  userId: number;
  userName: string;
  createdAt: string;
}

export const commentApi = {
  getComments: async (cardId: number): Promise<CommentResponse[]> => {
    const res = await client.get(`/api/cards/${cardId}/comments`);
    return res.data;
  },

  createComment: async (cardId: number, content: string): Promise<CommentResponse> => {
    const res = await client.post(`/api/cards/${cardId}/comments`, { content });
    return res.data;
  },

  updateComment: async (cardId: number, commentId: number, content: string): Promise<CommentResponse> => {
    const res = await client.put(`/api/cards/${cardId}/comments/${commentId}`, { content });
    return res.data;
  },

  deleteComment: async (cardId: number, commentId: number): Promise<void> => {
    await client.delete(`/api/cards/${cardId}/comments/${commentId}`);
  },
};