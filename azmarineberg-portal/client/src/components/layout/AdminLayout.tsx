import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import SignOutConfirmDialog from '../SignOutConfirmDialog';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const handleLogoutClick = () => setShowSignOutConfirm(true);

  const handleSignOutConfirm = () => {
    logout();
    navigate('/admin/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-primary text-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-8">
              <h1 className="text-xl font-semibold">Azmarineberg Portal</h1>
              <nav className="flex gap-4">
                <NavLink
                  to="/admin"
                  end
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? 'bg-primary-light' : 'hover:bg-primary-light/80'
                    }`
                  }
                >
                  Dashboard
                </NavLink>
                <NavLink
                  to="/admin/clients"
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-md text-sm font-medium ${
                      isActive ? 'bg-primary-light' : 'hover:bg-primary-light/80'
                    }`
                  }
                >
                  Clients
                </NavLink>
                {user?.role === 'super_admin' && (
                  <NavLink
                    to="/admin/super"
                    className={({ isActive }) =>
                      `px-3 py-2 rounded-md text-sm font-medium ${
                        isActive ? 'bg-primary-light' : 'hover:bg-primary-light/80'
                      }`
                    }
                  >
                    Analytics
                  </NavLink>
                )}
              </nav>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm">{user?.email}</span>
              <span className="text-sm opacity-80">({user?.role})</span>
              <button
                onClick={handleLogoutClick}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-md text-sm"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
      <SignOutConfirmDialog
        open={showSignOutConfirm}
        onClose={() => setShowSignOutConfirm(false)}
        onConfirm={handleSignOutConfirm}
      />
    </div>
  );
}
