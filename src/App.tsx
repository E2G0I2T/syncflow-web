import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage     from './pages/LoginPage';
import BoardListPage from './pages/BoardListPage';
import BoardPage     from './pages/BoardPage';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('syncflow_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/boards" element={
          <PrivateRoute><BoardListPage /></PrivateRoute>
        } />
        <Route path="/boards/:boardId" element={
          <PrivateRoute><BoardPage /></PrivateRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;