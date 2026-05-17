import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { boardApi } from '../api/board';
import type { BoardSummary } from '../api/board';
import { useBoardStore } from '../store/useBoardStore';

const BoardListPage = () => {
  const navigate  = useNavigate();
  const clearBoard = useBoardStore((s) => s.clearBoard);

  const [boards,   setBoards]   = useState<BoardSummary[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [loading,  setLoading]  = useState(true);
  const [creating, setCreating] = useState(false);

  const user = JSON.parse(localStorage.getItem('syncflow_user') ?? '{}');

  useEffect(() => {
    boardApi.getBoards()
      .then(setBoards)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const board = await boardApi.createBoard(newTitle.trim());
      setBoards((prev) => [{ ...board, cardCount: 0 }, ...prev]);
      setNewTitle('');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (boardId: number) => {
    if (!confirm('정말 삭제할까요?')) return;
    await boardApi.deleteBoard(boardId);
    setBoards((prev) => prev.filter((b) => b.id !== boardId));
  };

  const handleLogout = () => {
    localStorage.removeItem('syncflow_token');
    localStorage.removeItem('syncflow_user');
    clearBoard();
    navigate('/login');
  };

  if (loading) return <div style={styles.center}>불러오는 중...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>내 보드</h1>
          <p style={styles.sub}>{user.name}님 안녕하세요 👋</p>
        </div>
        <button style={styles.logoutBtn} onClick={handleLogout}>로그아웃</button>
      </div>

      <form onSubmit={handleCreate} style={styles.form}>
        <input
          style={styles.input}
          placeholder="새 보드 이름..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button style={styles.createBtn} type="submit" disabled={creating}>
          {creating ? '생성 중...' : '+ 만들기'}
        </button>
      </form>

      <div style={styles.list}>
        {boards.length === 0 && (
          <p style={styles.empty}>아직 보드가 없어요. 위에서 만들어보세요!</p>
        )}
        {boards.map((board) => (
          <div key={board.id} style={styles.card}
            onClick={() => navigate(`/boards/${board.id}`, { state: { title: board.title } })}>
            <div style={styles.cardLeft}>
              <div style={styles.icon}>
                {board.title.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={styles.boardTitle}>{board.title}</p>
                <p style={styles.boardMeta}>카드 {board.cardCount}개</p>
              </div>
            </div>
            <button style={styles.deleteBtn}
              onClick={(e) => { e.stopPropagation(); handleDelete(board.id); }}>
              🗑️
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: { maxWidth: 600, margin: '0 auto', padding: 24 },
  center:    { display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' },
  header:    { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  title:     { fontSize: 24, fontWeight: 'bold', color: '#222', margin: 0 },
  sub:       { fontSize: 14, color: '#888', margin: '4px 0 0' },
  logoutBtn: { background: 'none', border: 'none', color: '#e03131', fontSize: 14, cursor: 'pointer' },
  form:      { display: 'flex', gap: 10, marginBottom: 24 },
  input:     { flex: 1, border: '1px solid #ddd', borderRadius: 10, padding: '12px 16px', fontSize: 15 },
  createBtn: {
    backgroundColor: '#4C6EF5', color: '#fff', border: 'none',
    borderRadius: 10, padding: '12px 20px', fontSize: 15, cursor: 'pointer', fontWeight: 'bold',
  },
  list:      { display: 'flex', flexDirection: 'column', gap: 12 },
  empty:     { color: '#aaa', textAlign: 'center', marginTop: 60 },
  card: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)', cursor: 'pointer',
  },
  cardLeft:   { display: 'flex', alignItems: 'center', gap: 14 },
  icon: {
    width: 46, height: 46, borderRadius: 12, backgroundColor: '#4C6EF5',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 'bold', fontSize: 20,
  },
  boardTitle: { margin: 0, fontWeight: '600', fontSize: 16, color: '#222' },
  boardMeta:  { margin: '2px 0 0', fontSize: 12, color: '#aaa' },
  deleteBtn:  { background: 'none', border: 'none', cursor: 'pointer', fontSize: 18 },
};

export default BoardListPage;