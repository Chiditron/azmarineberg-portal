const API_BASE = 'https://azmarineberg-portal.onrender.com/api';

async function getToken(): Promise<string | null> {
  return localStorage.getItem('accessToken');
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (token) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (res.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      try {
        const refreshRes = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (refreshRes.ok) {
          const data = await refreshRes.json().catch(() => null);
          if (
            !data ||
            typeof data !== 'object' ||
            typeof (data as { accessToken?: unknown }).accessToken !== 'string' ||
            typeof (data as { refreshToken?: unknown }).refreshToken !== 'string'
          ) {
            throw new Error('Invalid refresh response');
          }
          localStorage.setItem('accessToken', data.accessToken);
          localStorage.setItem('refreshToken', data.refreshToken);
          return request(path, options);
        }
      } catch {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
        window.location.href = loginPath;
        throw new Error('Session expired');
      }
    }
    const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
    window.location.href = loginPath;
    throw new Error('Unauthorized');
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }

  // 204 No Content: success with no body (e.g. DELETE)
  if (res.status === 204) {
    return undefined as T;
  }

  try {
    return await res.json();
  } catch {
    throw new Error(`Invalid response from server (${res.status})`);
  }
}

export const api = {
  async login(email: string, password: string) {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });
    } catch {
      throw new Error(
        'Cannot reach the API. From the portal folder run `npm run dev` (starts client + server), or ensure the server is on port 3000.'
      );
    }
    const raw = await res.json().catch(() => null);
    if (!res.ok) {
      const errMsg =
        raw && typeof raw === 'object' && 'error' in raw && typeof (raw as { error: unknown }).error === 'string'
          ? (raw as { error: string }).error
          : null;
      throw new Error(
        errMsg ||
          (res.status >= 502 && res.status <= 504
            ? 'API unavailable (bad gateway). Is the backend running on port 3000?'
            : `Login failed (${res.status})`)
      );
    }
    if (
      !raw ||
      typeof raw !== 'object' ||
      typeof (raw as { accessToken?: unknown }).accessToken !== 'string' ||
      typeof (raw as { refreshToken?: unknown }).refreshToken !== 'string' ||
      typeof (raw as { user?: unknown }).user !== 'object' ||
      (raw as { user: unknown }).user === null
    ) {
      throw new Error('Invalid login response from server.');
    }
    return raw as {
      user: {
        id: string;
        email: string;
        role: string;
        companyId: string | null;
        mustChangePassword?: boolean;
        firstName?: string | null;
        lastName?: string | null;
        companyName?: string | null;
      };
      accessToken: string;
      refreshToken: string;
      expiresIn?: number;
    };
  },

  async getCurrentUser() {
    return request<{
      user: {
        id: string;
        email: string;
        role: string;
        companyId: string | null;
        firstName?: string | null;
        lastName?: string | null;
        companyName?: string | null;
      };
    }>('/auth/me');
  },

  async forgotPassword(email: string) {
    return request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string, confirmPassword: string) {
    return request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword, confirmPassword }),
    });
  },

  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  async downloadBlob(path: string): Promise<Blob> {
    const token = await getToken();
    const headers: HeadersInit = {};
    if (token) (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, { headers, credentials: 'include' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Download failed: ${res.status}`);
    }
    return res.blob();
  },

  async uploadFile(path: string, file: File, documentType?: string) {
    const token = await getToken();
    const formData = new FormData();
    formData.append('file', file);
    if (documentType) formData.append('documentType', documentType);
    const headers: HeadersInit = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  notifications: {
    getUnreadCount() {
      return request<{ count: number }>('/notifications/unread-count');
    },
    list() {
      return request<Array<{ id: string; title: string; message: string; type: string; entity_type: string | null; entity_id: string | null; read_at: string | null; created_at: string }>>('/notifications');
    },
    markRead(id: string) {
      return request<{ message: string }>(`/notifications/${id}/read`, { method: 'POST' });
    },
    markAllRead() {
      return request<{ message: string }>('/notifications/read-all', { method: 'POST' });
    },
  },

  messages: {
    list(params: { folder: 'inbox' | 'sent'; limit?: number; offset?: number }) {
      const sp = new URLSearchParams();
      sp.set('folder', params.folder);
      if (params.limit != null) sp.set('limit', String(params.limit));
      if (params.offset != null) sp.set('offset', String(params.offset));
      return request<{ rows: MessageListItem[]; total: number }>(`/messages?${sp.toString()}`);
    },
    get(id: string) {
      return request<{
        message: MessageThreadItem;
        thread: MessageThreadItem[];
        bulk?: { recipientCount: number };
      }>(`/messages/${id}`);
    },
    send(body: SendMessageBody) {
      return request<{ id?: string; ids?: string[]; count?: number }>('/messages', { method: 'POST', body: JSON.stringify(body) });
    },
    markRead(id: string) {
      return request<{ message: string }>(`/messages/${id}/read`, { method: 'POST' });
    },
    getUnreadCount() {
      return request<{ count: number }>('/messages/unread-count');
    },
    listStaffRecipients() {
      return request<Array<{ id: string; label: string; email: string }>>('/messages/recipients/staff');
    },
    listClientRecipients() {
      return request<Array<{ id: string; label: string }>>('/messages/recipients/clients');
    },
  },
};

export interface MessageListItem {
  id: string;
  subject: string;
  body: string;
  readAt: string | null;
  createdAt: string;
  parentId: string | null;
  senderId?: string;
  senderDisplay?: string;
  recipientId?: string;
  recipientDisplay?: string;
  isBulk?: boolean;
  bulkRecipientCount?: number;
}

export interface MessageThreadItem {
  id: string;
  senderId: string;
  recipientId: string;
  subject: string;
  body: string;
  parentId: string | null;
  readAt: string | null;
  createdAt: string;
  senderDisplay: string;
  recipientDisplay: string;
}

export interface SendMessageBody {
  recipientType?: 'staff' | 'client';
  recipientId?: string;
  companyId?: string;
  broadcastToAllClients?: boolean;
  subject?: string;
  body?: string;
  parentId?: string;
}
