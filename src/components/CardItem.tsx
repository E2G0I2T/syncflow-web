import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Task, ColumnId } from '../types';
import { useBoardStore } from '../store/useBoardStore';

interface Props {
  task:      Task;
  columnId?: ColumnId;
  overlay?:  boolean;
}

const CardItem = ({ task, columnId, overlay = false }: Props) => {
  const deleteTask = useBoardStore((s) => s.deleteTask);

  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id:   task.id,
      data: { columnId },
    });

  const style: React.CSSProperties = {
    ...styles.card,
    transform:  CSS.Translate.toString(transform),
    opacity:    isDragging ? 0.3 : 1,
    boxShadow:  overlay ? '0 8px 24px rgba(0,0,0,0.2)' : styles.card.boxShadow,
  };

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={styles.content}>
        <p style={styles.text}>{task.content}</p>
        {!overlay && columnId && (
          <button
            style={styles.deleteBtn}
            onClick={(e) => {
              e.stopPropagation();
              deleteTask(task.id, columnId);
            }}
          >
            ✕
          </button>
        )}
      </div>
      {task.labels && task.labels.length > 0 && (
        <div style={styles.labels}>
          {task.labels.map((label) => (
            <span
              key={label.id}
              style={{ ...styles.label, backgroundColor: label.color }}
            >
              {label.text}
            </span>
          ))}
        </div>
      )}
      {(task.assignee || task.dueDate) && (
        <div style={styles.meta}>
          {task.assignee && <span style={styles.metaText}>👤 {task.assignee}</span>}
          {task.dueDate  && <span style={styles.metaText}>📅 {task.dueDate}</span>}
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14,
    marginBottom: 8, border: '1px solid #eee', cursor: 'grab',
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  content:   { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  text:      { margin: 0, fontSize: 14, color: '#333', flex: 1, lineHeight: 1.5 },
  deleteBtn: {
    background: 'none', border: 'none', color: '#ccc',
    cursor: 'pointer', fontSize: 14, padding: '0 0 0 8px', flexShrink: 0,
  },
  labels:    { display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 },
  label:     { borderRadius: 12, padding: '3px 8px', fontSize: 11, color: '#fff', fontWeight: 500 },
  meta:      { display: 'flex', gap: 10, marginTop: 8 },
  metaText:  { fontSize: 12, color: '#888' },
};

export default CardItem;