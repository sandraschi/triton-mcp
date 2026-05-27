import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/AppLayout';
import Dashboard from './pages/Dashboard';
import ModelsPage from './pages/ModelsPage';
import ConfigPage from './pages/ConfigPage';
import InferencePage from './pages/InferencePage';
import MetricsPage from './pages/MetricsPage';
import StatusPage from './pages/StatusPage';
import HelpPage from './pages/HelpPage';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/models" element={<ModelsPage />} />
        <Route path="/config" element={<ConfigPage />} />
        <Route path="/inference" element={<InferencePage />} />
        <Route path="/metrics" element={<MetricsPage />} />
        <Route path="/status" element={<StatusPage />} />
        <Route path="/help" element={<HelpPage />} />
      </Routes>
    </AppLayout>
  );
}
