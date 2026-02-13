import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Login } from './pages/Login';
import { Usuarios } from './pages/Usuarios';
import { SGI } from './pages/SGI';
import { SGIGenerado } from './pages/SGIGenerado';
import { AppLayout } from './components/Layout';
import type { ReactNode } from 'react';
import './App.css';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return auth.isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<SGI />} />
        <Route path="/usuarios" element={<Usuarios />} />
        <Route path="/sgi" element={<Navigate to="/" replace />} />
        <Route path="/sgi-generado" element={<SGIGenerado />} />
      </Route>
    </Routes>
  );
}

export default App;
