import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../services/api';

/** After success, redirect to login if the user is idle (no input) for this long. */
const IDLE_REDIRECT_MS = 2 * 60 * 1000;

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!success) return;

    const goLogin = () => {
      navigate('/login', { replace: true });
    };

    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(goLogin, IDLE_REDIRECT_MS);
    };

    resetIdleTimer();
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetIdleTimer, { passive: true }));

    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
      events.forEach((ev) => window.removeEventListener(ev, resetIdleTimer));
    };
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await api.forgotPassword(email.trim().toLowerCase());
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-xl font-bold text-primary mb-2">Forgot Password</h1>
        <p className="text-gray-600 mb-6">Enter your email to receive a reset link.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error ? <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{error}</div> : null}
          {success ? (
            <div className="space-y-2">
              <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">{success}</div>
              <p className="text-xs text-gray-500">
                After 2 minutes of inactivity, you will be redirected to the client login page. Moving the mouse or typing
                resets this timer.
              </p>
            </div>
          ) : null}
          <div>
            <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="forgot-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder="you@company.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-primary hover:bg-primary-dark text-white font-medium rounded-md disabled:opacity-50"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
        <div className="mt-5 text-center text-sm space-y-1">
          <p>
            <Link to="/login" className="text-primary hover:underline">
              Back to client login
            </Link>
          </p>
          <p>
            <Link to="/admin/login" className="text-primary hover:underline">
              Back to staff login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
