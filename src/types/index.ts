export interface Label {
  id: number;
  text: string;
  color: string;
}

export interface Task {
  id: number;
  content: string;
  description?: string;
  assignee?: string;
  startDate?: string;
  dueDate?: string;
  labels?: Label[];
  columnKey: ColumnId;
  position: number;
}

export type ColumnId = 'todo' | 'doing' | 'done' | 'archive';

export interface Column {
  id: ColumnId;
  title: string;
  color: string;
}

export type TaskMap = Record<ColumnId, Task[]>;

export interface BoardSummary {
  id: number;
  title: string;
  ownerName: string;
  createdAt: string;
  cardCount: number;
}