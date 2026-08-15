import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  User,
  Upload,
  Megaphone,
  History,
  Settings,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  path: string;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Profile', icon: User, path: '/profile' },
  { label: 'Upload', icon: Upload, path: '/upload' },
  { label: 'Campaigns', icon: Megaphone, path: '/campaigns' },
  { label: 'History', icon: History, path: '/history' },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`
        hidden lg:flex flex-col bg-surface border-r border-border
        transition-all duration-200 ease-in-out relative
        ${collapsed ? 'w-[68px]' : 'w-60'}
      `}
    >
      {/* Nav Items */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            location.pathname === item.path ||
            (item.path !== '/dashboard' &&
              location.pathname.startsWith(item.path));

          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${
                  isActive
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-tertiary'
                }
              `}
            >
              <item.icon
                className={`w-5 h-5 shrink-0 ${
                  isActive ? 'text-primary-600' : ''
                }`}
              />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-6 w-6 h-6 bg-surface border border-border rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors shadow-xs cursor-pointer"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-3.5 h-3.5" />
        ) : (
          <ChevronLeft className="w-3.5 h-3.5" />
        )}
      </button>
    </aside>
  );
}
