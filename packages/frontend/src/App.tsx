import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProjectList } from './pages/ProjectList';
import { ProjectCreate } from './pages/ProjectCreate';
import { ProjectDetail } from './pages/ProjectDetail';
import { Login } from './pages/Login';
import { useAuth } from './hooks/useAuth';

export function App() {
  const { token } = useAuth();

  if (!token) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/projects/new" element={<ProjectCreate />} />
        <Route path="/projects/:projectId" element={<ProjectDetail />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
