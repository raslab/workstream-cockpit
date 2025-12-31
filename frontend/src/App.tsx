import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout/Layout';
import Login from '@/pages/Login';
import OAuthCallback from '@/pages/OAuthCallback';
import Cockpit from '@/pages/Cockpit';
import Timeline from '@/pages/Timeline';
import Archive from '@/pages/Archive';
import TagManagement from '@/pages/TagManagement';
import WorkstreamDetail from '@/pages/WorkstreamDetail';

function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/auth/callback" element={<OAuthCallback />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout>
                <Cockpit />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/timeline"
          element={
            <ProtectedRoute>
              <Layout>
                <Timeline />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/archive"
          element={
            <ProtectedRoute>
              <Layout>
                <Archive />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/tags"
          element={
            <ProtectedRoute>
              <Layout>
                <TagManagement />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/workstreams/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <WorkstreamDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
