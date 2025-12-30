import { Routes, Route } from 'react-router-dom';
import Login from '@/pages/Login';
import Cockpit from '@/pages/Cockpit';
import Timeline from '@/pages/Timeline';
import Archive from '@/pages/Archive';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Cockpit />} />
        <Route path="/timeline" element={<Timeline />} />
        <Route path="/archive" element={<Archive />} />
      </Routes>
    </div>
  );
}

export default App;
