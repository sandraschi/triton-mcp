import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Boxes, Cog, Cpu, Gauge, HelpCircle, Send } from 'lucide-react';

const navItems = [
  { to: '/', label: 'Dashboard', icon: Activity },
  { to: '/models', label: 'Models', icon: Boxes },
  { to: '/config', label: 'Config', icon: Cog },
  { to: '/inference', label: 'Inference', icon: Send },
  { to: '/metrics', label: 'Metrics', icon: Gauge },
  { to: '/status', label: 'Status', icon: Cpu },
  { to: '/help', label: 'Help', icon: HelpCircle },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-screen">
      <aside className={`bg-gray-900 border-r border-gray-800 transition-all ${collapsed ? 'w-14' : 'w-56'}`}>
        <div className="p-3 border-b border-gray-800 flex items-center gap-2">
          <Boxes size={20} className="text-cyan-400 shrink-0" />
          {!collapsed && <span className="font-semibold text-sm">Triton MCP</span>}
        </div>
        <button
          className="w-full p-2 text-xs text-gray-500 hover:text-gray-300 border-b border-gray-800"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? '>' : '<'}
        </button>
        <nav className="p-2 space-y-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-2 py-2 rounded text-sm transition ${
                  isActive ? 'bg-cyan-900/40 text-cyan-300' : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
