import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { PasswordInput } from '../components/PasswordInput';

function getPasswordError(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (!/[a-z]/.test(password)) return 'Password must include a lowercase letter.';
  if (!/[A-Z]/.test(password)) return 'Password must include an uppercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include a number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include a special character.';
  return null;
}

export default function InvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);

  useEffect(() => {
    if (!token) {
      setValidating(false);
      setInviteError('Invalid invite link');
      return;
    }
    api
      .get<{ email: string }>(`/auth/accept-invite?token=${token}`)
      .then((data) => setEmail(data.email))
      .catch(() => setInviteError('Invalid or expired invite link'))
      .finally(() => setValidating(false));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (password !== confirmPassword) {
      setFormError('Passwords do not match');
      return;
    }
    const passwordError = getPasswordError(password);
    if (passwordError) {
      setFormError(passwordError);
      return;
    }
    setLoading(true);
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: { role: string } }>(
        '/auth/accept-invite',
        { token, password, confirmPassword }
      );
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      const dest = data.user.role === 'client' ? '/dashboard' : '/admin';
      navigate(dest, { replace: true });
      window.location.reload();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setLoading(false);
    }
  };

  if (validating) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!token || inviteError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white rounded-lg shadow p-8 max-w-md w-full text-center">
          <p className="text-red-600">{inviteError || 'Invalid invite link'}</p>
          <div className="mt-4 flex flex-col sm:flex-row gap-2 justify-center">
            <a href="/login" className="text-primary hover:underline">
              Client login
            </a>
            <span className="hidden sm:inline text-gray-400">|</span>
            <a href="/admin/login" className="text-primary hover:underline">
              Staff login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-primary mb-2">Set Your Password</h1>
        <p className="text-gray-600 mb-6">Complete your Azmarineberg Portal account setup</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{formError}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              readOnly
              className="w-full px-4 py-2 border border-gray-200 rounded-md bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>
          <p className="text-xs text-gray-500">
            Use at least 8 characters with uppercase, lowercase, number, and special character.
          </p>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-md disabled:opacity-50"
          >
            {loading ? 'Setting up...' : 'Complete Setup'}
          </button>
        </form>
      </div>
    </div>
  );
}
