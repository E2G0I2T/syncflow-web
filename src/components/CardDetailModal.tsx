import type { Task, ColumnId, Label } from "../types";
import { useState, useEffect, useRef } from "react";
import { useBoardStore, LABEL_PRESETS } from "../store/useBoardStore";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { commentApi } from "../api/comment";
import type { CommentResponse } from "../api/comment";
import { getSocket } from "../api/socket";

interface Props {
  task:     Task | null;
  columnId: ColumnId | null;
  onClose:  () => void;
}

const CardDetailModal = ({ task, columnId, onClose }: Props) => {
  const updateTask = useBoardStore((s) => s.updateTask);
  const deleteTask = useBoardStore((s) => s.deleteTask);
  const currentBoardId = useBoardStore((s) => s.currentBoardId);

  const [title,     setTitle]     = useState(task?.content ?? '');
  const [assignee,  setAssignee]  = useState(task?.assignee ?? '');
  const [startDate, setStartDate] = useState(task?.startDate ?? '');
  const [dueDate,   setDueDate]   = useState(task?.dueDate ?? '');
  const [labels,    setLabels]    = useState<Label[]>(task?.labels ?? []);
  const [error,     setError]     = useState('');

  const [comments,     setComments]     = useState<CommentResponse[]>([]);
  const [commentInput, setCommentInput] = useState('');
  const [editingId,    setEditingId]    = useState<number | null>(null);
  const [editingText,  setEditingText]  = useState('');
  const [commentLoading, setCommentLoading] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('syncflow_user') ?? '{}');
  const commentsEndRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [StarterKit],
    content: task?.description ?? '',
  });

  // 댓글 목록 불러오기
  useEffect(() => {
    if (!task) return;
    commentApi.getComments(task.id).then(setComments).catch(() => {});
  }, [task]);

  // 소켓 댓글 이벤트 수신
  useEffect(() => {
    if (!task) return;
    const socket = getSocket();
    if (!socket) return;

    const onAdded = ({ cardId, comment }: { cardId: number; comment: CommentResponse }) => {
      if (cardId !== task.id) return;
      setComments((prev) => {
        if (prev.find((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    };

    const onUpdated = ({ cardId, comment }: { cardId: number; comment: CommentResponse }) => {
      if (cardId !== task.id) return;
      setComments((prev) => prev.map((c) => c.id === comment.id ? comment : c));
    };

    const onDeleted = ({ cardId, commentId }: { cardId: number; commentId: number }) => {
      if (cardId !== task.id) return;
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    };

    socket.on('comment_added',   onAdded);
    socket.on('comment_updated', onUpdated);
    socket.on('comment_deleted', onDeleted);

    return () => {
      socket.off('comment_added',   onAdded);
      socket.off('comment_updated', onUpdated);
      socket.off('comment_deleted', onDeleted);
    };
  }, [task]);

  // 댓글 추가 시 스크롤 하단 이동
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length]);

  if (!task || !columnId) return null;

  const toggleLabel = (preset: Omit<Label, 'id'>) => {
    setLabels((prev) => {
      const exists = prev.find((l) => l.text === preset.text);
      if (exists) return prev.filter((l) => l.text !== preset.text);
      return [...prev, { id: Date.now(), ...preset }];
    });
  };

  const handleSave = async () => {
    if (!title.trim()) { setError('제목을 입력해주세요.'); return; }
    await updateTask(task.id, columnId, {
      content:     title.trim(),
      description: editor?.getHTML() ?? '',
      assignee:    assignee.trim() || undefined,
      startDate:   startDate || undefined,
      dueDate:     dueDate   || undefined,
      labels:      labels.length ? labels : undefined,
    });
    onClose();
  };

  const handleDelete = async () => {
    if (!confirm('정말 삭제할까요?')) return;
    await deleteTask(task.id, columnId);
    onClose();
  };

  // 댓글 추가
  const handleAddComment = () => {
    if (!commentInput.trim() || commentLoading) return;
    const socket = getSocket();
    const token  = localStorage.getItem('syncflow_token');
    if (!socket || !currentBoardId) return;

    setCommentLoading(true);
    socket.emit('add_comment', {
      boardId:  currentBoardId,
      cardId:   task.id,
      content:  commentInput.trim(),
      token,
    });
    setCommentInput('');
    setCommentLoading(false);
  };

  // 댓글 수정 시작
  const handleEditStart = (comment: CommentResponse) => {
    setEditingId(comment.id);
    setEditingText(comment.content);
  };

  // 댓글 수정 완료
  const handleEditSave = (commentId: number) => {
    if (!editingText.trim()) return;
    const socket = getSocket();
    const token  = localStorage.getItem('syncflow_token');
    if (!socket || !currentBoardId) return;

    socket.emit('update_comment', {
      boardId:   currentBoardId,
      cardId:    task.id,
      commentId,
      content:   editingText.trim(),
      token,
    });
    setEditingId(null);
    setEditingText('');
  };

  // 댓글 삭제
  const handleDeleteComment = (commentId: number) => {
    if (!confirm('댓글을 삭제할까요?')) return;
    const socket = getSocket();
    const token  = localStorage.getItem('syncflow_token');
    if (!socket || !currentBoardId) return;

    socket.emit('delete_comment', {
      boardId:   currentBoardId,
      cardId:    task.id,
      commentId,
      token,
    });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>

        <div style={styles.header}>
          <button style={styles.closeBtn} onClick={onClose}>✕</button>
          <h2 style={styles.headerTitle}>카드 상세</h2>
          <button style={styles.saveBtn} onClick={handleSave}>저장</button>
        </div>

        <div style={styles.body}>
          <div style={styles.section}>
            <label style={styles.label}>제목</label>
            <input
              style={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="카드 제목"
            />
            {error && <p style={styles.error}>{error}</p>}
          </div>

          <div style={styles.section}>
            <label style={styles.label}>담당자</label>
            <input
              style={styles.input}
              value={assignee}
              onChange={(e) => setAssignee(e.target.value)}
              placeholder="이름 입력"
            />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>일정</label>
            <div style={styles.dateRow}>
              <div style={styles.dateField}>
                <span style={styles.dateLabel}>시작일</span>
                <input
                  style={styles.dateInput}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <span style={styles.dateSep}>→</span>
              <div style={styles.dateField}>
                <span style={styles.dateLabel}>마감일</span>
                <input
                  style={styles.dateInput}
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>카테고리 라벨</label>
            <div style={styles.labelRow}>
              {LABEL_PRESETS.map((preset) => {
                const active = labels.some((l) => l.text === preset.text);
                return (
                  <button
                    key={preset.text}
                    onClick={() => toggleLabel(preset)}
                    style={{
                      ...styles.labelChip,
                      backgroundColor: active ? preset.color : '#f0f0f0',
                      color:           active ? '#fff' : '#555',
                    }}
                  >
                    {preset.text}
                  </button>
                );
              })}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>상세 내용</label>
            <div style={styles.toolbar}>
              <button
                style={toolbarBtnStyle(editor?.isActive('bold'))}
                onClick={() => editor?.chain().focus().toggleBold().run()}
                title="굵게"
              >B</button>
              <button
                style={toolbarBtnStyle(editor?.isActive('italic'))}
                onClick={() => editor?.chain().focus().toggleItalic().run()}
                title="기울임"
              ><em>I</em></button>
              <button
                style={toolbarBtnStyle(editor?.isActive('strike'))}
                onClick={() => editor?.chain().focus().toggleStrike().run()}
                title="취소선"
              ><s>S</s></button>
              <div style={styles.toolbarDivider} />
              <button
                style={toolbarBtnStyle(editor?.isActive('bulletList'))}
                onClick={() => editor?.chain().focus().toggleBulletList().run()}
                title="글머리 기호"
              >• 목록</button>
              <button
                style={toolbarBtnStyle(editor?.isActive('orderedList'))}
                onClick={() => editor?.chain().focus().toggleOrderedList().run()}
                title="번호 목록"
              >1. 목록</button>
              <div style={styles.toolbarDivider} />
              <button
                style={toolbarBtnStyle(false)}
                onClick={() => editor?.chain().focus().undo().run()}
                title="실행 취소"
              >↩</button>
              <button
                style={toolbarBtnStyle(false)}
                onClick={() => editor?.chain().focus().redo().run()}
                title="다시 실행"
              >↪</button>
            </div>
            <EditorContent editor={editor} style={styles.editorWrapper} />
          </div>

          <div style={styles.section}>
            <label style={styles.label}>댓글 {comments.length > 0 && `(${comments.length})`}</label>

            <div style={styles.commentList}>
              {comments.length === 0 && (
                <p style={styles.noComment}>아직 댓글이 없어요</p>
              )}
              {comments.map((comment) => (
                <div key={comment.id} style={styles.commentItem}>
                  <div style={styles.commentHeader}>
                    <div style={styles.commentAvatar}>
                      {comment.userName.charAt(0).toUpperCase()}
                    </div>
                    <span style={styles.commentAuthor}>{comment.userName}</span>
                    <span style={styles.commentDate}>{formatDate(comment.createdAt)}</span>
                    {/* 본인 댓글만 수정/삭제 */}
                    {comment.userName === currentUser.name && (
                      <div style={styles.commentActions}>
                        <button
                          style={styles.commentActionBtn}
                          onClick={() => handleEditStart(comment)}
                        >수정</button>
                        <button
                          style={{ ...styles.commentActionBtn, color: '#e03131' }}
                          onClick={() => handleDeleteComment(comment.id)}
                        >삭제</button>
                      </div>
                    )}
                  </div>

                  {/* 수정 */}
                  {editingId === comment.id ? (
                    <div style={styles.editRow}>
                      <input
                        style={styles.editInput}
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleEditSave(comment.id);
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                        autoFocus
                      />
                      <button
                        style={styles.editSaveBtn}
                        onClick={() => handleEditSave(comment.id)}
                      >저장</button>
                      <button
                        style={styles.editCancelBtn}
                        onClick={() => setEditingId(null)}
                      >취소</button>
                    </div>
                  ) : (
                    <p style={styles.commentContent}>{comment.content}</p>
                  )}
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>

            {/* 댓글 입력 */}
            <div style={styles.commentInputRow}>
              <input
                style={styles.commentInput}
                placeholder="댓글을 입력하세요..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleAddComment(); }}
              />
              <button
                style={{
                  ...styles.commentSubmitBtn,
                  opacity: commentInput.trim() ? 1 : 0.4,
                }}
                onClick={handleAddComment}
                disabled={!commentInput.trim() || commentLoading}
              >
                등록
              </button>
            </div>
          </div>

          <button style={styles.deleteBtn} onClick={handleDelete}>
            🗑️ 카드 삭제
          </button>
        </div>
      </div>
    </div>
  );
};

const toolbarBtnStyle = (active?: boolean): React.CSSProperties => ({
  padding: '4px 8px',
  border: 'none',
  borderRadius: 4,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  backgroundColor: active ? '#e8eeff' : 'transparent',
  color: active ? '#4C6EF5' : '#555',
  transition: 'background-color 0.15s',
});

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#f8f9fa', borderRadius: 16,
    width: '100%', maxWidth: 560,
    maxHeight: '90vh', display: 'flex', flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', padding: '16px 20px',
    borderBottom: '1px solid #eee',
  },
  headerTitle: { margin: 0, fontSize: 17, fontWeight: 'bold', color: '#222' },
  closeBtn: {
    background: 'none', border: 'none', fontSize: 18,
    color: '#555', cursor: 'pointer',
  },
  saveBtn: {
    background: 'none', border: 'none', fontSize: 16,
    color: '#4C6EF5', fontWeight: 'bold', cursor: 'pointer',
  },
  body: {
    overflowY: 'auto', padding: 16,
    display: 'flex', flexDirection: 'column', gap: 12,
  },
  section: {
    backgroundColor: '#fff', borderRadius: 12,
    padding: 14, border: '1px solid #f0f0f0',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  label: {
    fontSize: 12, fontWeight: '600', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  error:      { color: '#e03131', fontSize: 13, margin: 0 },
  titleInput: {
    border: 'none', borderBottom: '1px solid #eee',
    fontSize: 17, fontWeight: '600', color: '#222',
    padding: '4px 0', outline: 'none',
  },
  input: {
    border: 'none', borderBottom: '1px solid #eee',
    fontSize: 15, color: '#333', padding: '6px 0', outline: 'none',
  },
  dateRow:   { display: 'flex', alignItems: 'center', gap: 12 },
  dateField: { display: 'flex', flexDirection: 'column', gap: 4, flex: 1 },
  dateLabel: { fontSize: 11, color: '#aaa' },
  dateInput: {
    border: '1px solid #eee', borderRadius: 6,
    padding: '6px 8px', fontSize: 14, outline: 'none',
  },
  dateSep:   { color: '#aaa', fontSize: 16 },
  labelRow:  { display: 'flex', flexWrap: 'wrap', gap: 8 },
  labelChip: {
    padding: '6px 12px', borderRadius: 20, border: 'none',
    fontSize: 13, fontWeight: 500, cursor: 'pointer',
  },
  toolbar: {
    display: 'flex', alignItems: 'center', gap: 2,
    backgroundColor: '#f5f5f5', borderRadius: '8px 8px 0 0',
    border: '1px solid #e8e8e8', borderBottom: 'none',
    padding: '6px 8px',
  },
  toolbarDivider: {
    width: 1, height: 18,
    backgroundColor: '#ddd', margin: '0 4px',
  },
  editorWrapper: {
    border: '1px solid #e8e8e8', borderRadius: '0 0 8px 8px',
    minHeight: 160, backgroundColor: '#fff',
  },
  commentList: {
    display: 'flex', flexDirection: 'column', gap: 10,
    maxHeight: 240, overflowY: 'auto',
  },
  noComment: { fontSize: 13, color: '#bbb', textAlign: 'center', margin: '8px 0' },
  commentItem: {
    display: 'flex', flexDirection: 'column', gap: 4,
    padding: '8px 0', borderBottom: '1px solid #f5f5f5',
  },
  commentHeader: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  commentAvatar: {
    width: 24, height: 24, borderRadius: '50%',
    backgroundColor: '#4C6EF5', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 'bold', flexShrink: 0,
  },
  commentAuthor: { fontSize: 13, fontWeight: '600', color: '#333' },
  commentDate:   { fontSize: 11, color: '#bbb', flex: 1 },
  commentActions: { display: 'flex', gap: 6 },
  commentActionBtn: {
    background: 'none', border: 'none',
    fontSize: 11, color: '#aaa', cursor: 'pointer',
  },
  commentContent: { fontSize: 14, color: '#444', margin: '2px 0 0 30px', lineHeight: 1.5 },
  editRow: { display: 'flex', gap: 6, marginLeft: 30 },
  editInput: {
    flex: 1, border: '1px solid #ddd', borderRadius: 6,
    padding: '4px 8px', fontSize: 14, outline: 'none',
  },
  editSaveBtn: {
    padding: '4px 10px', backgroundColor: '#4C6EF5',
    color: '#fff', border: 'none', borderRadius: 6,
    cursor: 'pointer', fontSize: 13,
  },
  editCancelBtn: {
    padding: '4px 10px', backgroundColor: '#f0f0f0',
    color: '#555', border: 'none', borderRadius: 6,
    cursor: 'pointer', fontSize: 13,
  },
  commentInputRow: {
    display: 'flex', gap: 8, marginTop: 4,
  },
  commentInput: {
    flex: 1, border: '1px solid #eee', borderRadius: 8,
    padding: '8px 12px', fontSize: 14, outline: 'none',
  },
  commentSubmitBtn: {
    padding: '8px 16px', backgroundColor: '#4C6EF5',
    color: '#fff', border: 'none', borderRadius: 8,
    cursor: 'pointer', fontSize: 14, fontWeight: 'bold',
    transition: 'opacity 0.2s',
  },

  deleteBtn: {
    padding: 14, borderRadius: 10, border: '1px solid #ffc9c9',
    backgroundColor: '#fff5f5', color: '#e03131',
    fontWeight: '600', fontSize: 15, cursor: 'pointer',
  },
};

export default CardDetailModal;