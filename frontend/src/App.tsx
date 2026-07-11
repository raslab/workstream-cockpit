import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import ProtectedRoute from '@/components/ProtectedRoute';
import Layout from '@/components/Layout/Layout';
import Login from '@/pages/Login';
import OAuthCallback from '@/pages/OAuthCallback';
import Cockpit from '@/pages/Cockpit';
import Timeline from '@/pages/Timeline';
import Archive from '@/pages/Archive';
import Settings from '@/pages/Settings';
import WorkstreamDetail from '@/pages/WorkstreamDetail';
import { RouteDocumentTitle } from '@/components/DocumentTitle';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RouteDocumentTitle />
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
            path="/settings/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
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
    </ThemeProvider>
  );
}

export default App;
