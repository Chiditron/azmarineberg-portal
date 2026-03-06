import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function AdminDashboard() {
  const { user } = useAuth();
  const canAccessClients = user?.role === 'staff' || user?.role === 'super_admin';

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h2>
      <div className="bg-white rounded-lg shadow p-6">
        <p className="text-gray-600">
          Manage clients, facilities, services, and documents from the navigation menu.
        </p>
        {canAccessClients && (
          <div className="mt-6 flex gap-4">
            <Link
              to="/admin/clients"
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-dark"
            >
              Manage Clients
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
