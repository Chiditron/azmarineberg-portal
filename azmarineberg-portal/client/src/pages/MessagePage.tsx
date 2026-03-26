import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, type MessageThreadItem, type SendMessageBody } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const LIMIT = 50;

export default function MessagePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const openId = searchParams.get('open');
  const queryClient = useQueryClient();

  const isStaff = user?.role === 'staff' || user?.role === 'admin' || user?.role === 'super_admin';

  const [folder, setFolder] = useState<'inbox' | 'sent'>('inbox');
  const [selectedId, setSelectedId] = useState<string | null>(openId || null);

  useEffect(() => {
    if (openId) setSelectedId(openId);
  }, [openId]);

  // Separate queries so Inbox and Sent never share one cache entry (avoids wrong list after tab switch).
  const { data: inboxData } = useQuery({
    queryKey: ['messages', 'inbox', LIMIT],
    queryFn: ({ queryKey }) =>
      api.messages.list({ folder: queryKey[1] as 'inbox', limit: LIMIT, offset: 0 }),
  });
  const { data: sentData } = useQuery({
    queryKey: ['messages', 'sent', LIMIT],
    queryFn: ({ queryKey }) =>
      api.messages.list({ folder: queryKey[1] as 'sent', limit: LIMIT, offset: 0 }),
  });

  const rows = folder === 'inbox' ? (inboxData?.rows ?? []) : (sentData?.rows ?? []);
  const inboxTotal = inboxData?.total ?? 0;
  const sentTotal = sentData?.total ?? 0;

  const { data: threadData, isLoading: loadingThread } = useQuery({
    queryKey: ['message', selectedId],
    queryFn: () => api.messages.get(selectedId!),
    enabled: !!selectedId,
  });
  const thread = threadData?.thread ?? [];
  const currentMessage = threadData?.message;

  const markReadMutation = useMutation({
    mutationFn: (id: string) => api.messages.markRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
    },
  });

  useEffect(() => {
    if (currentMessage && currentMessage.recipientId === user?.id && !currentMessage.readAt) {
      markReadMutation.mutate(currentMessage.id);
    }
  }, [currentMessage?.id, currentMessage?.readAt, currentMessage?.recipientId, user?.id]);

  const handleSelectMessage = (id: string) => {
    setSelectedId(id);
    setSearchParams((p) => {
      p.set('open', id);
      return p;
    });
  };

  const handleFolderChange = (next: 'inbox' | 'sent') => {
    setFolder(next);
    setSelectedId(null);
    setSearchParams((p) => {
      p.delete('open');
      return p;
    });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-gray-900">Message</h1>

      {isStaff && (
        <ComposeForm
          onSent={() => {
            queryClient.invalidateQueries({ queryKey: ['messages'] });
            queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
          }}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => handleFolderChange('inbox')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${folder === 'inbox' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            >
              Inbox {inboxTotal > 0 ? `(${inboxTotal})` : ''}
            </button>
            <button
              type="button"
              onClick={() => handleFolderChange('sent')}
              className={`flex-1 px-4 py-3 text-sm font-medium ${folder === 'sent' ? 'bg-primary text-white' : 'bg-gray-50 text-gray-700 hover:bg-gray-100'}`}
            >
              Sent {sentTotal > 0 ? `(${sentTotal})` : ''}
            </button>
          </div>
          <ul className="divide-y divide-gray-200 max-h-[400px] overflow-y-auto">
            {rows.length === 0 ? (
              <li className="p-4 text-sm text-gray-500">No messages</li>
            ) : (
              rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => handleSelectMessage(row.id)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${selectedId === row.id ? 'bg-primary/10' : ''} ${!row.readAt && folder === 'inbox' ? 'font-medium' : ''}`}
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-sm text-gray-900 truncate">{row.subject}</span>
                      <span className="text-xs text-gray-500 shrink-0">{new Date(row.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-0.5 truncate">
                      {folder === 'inbox' ? (row.senderDisplay || 'Unknown') : (row.recipientDisplay || 'Unknown')}
                    </div>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          {!selectedId ? (
            <div className="p-8 text-center text-gray-500 text-sm">Select a message to view</div>
          ) : loadingThread ? (
            <div className="p-8 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <MessageThread
              thread={thread}
              folder={folder}
              currentUserId={user?.id ?? ''}
              bulkMeta={folder === 'sent' ? threadData?.bulk : undefined}
              onReplySent={() => {
                queryClient.invalidateQueries({ queryKey: ['message', selectedId] });
                queryClient.invalidateQueries({ queryKey: ['messages'] });
                queryClient.invalidateQueries({ queryKey: ['notifications-unread'] });
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ComposeForm({ onSent }: { onSent: () => void }) {
  const [recipientType, setRecipientType] = useState<'staff' | 'client'>('staff');
  const [staffId, setStaffId] = useState('');
  const [clientMode, setClientMode] = useState<'one' | 'bulk'>('one');
  const [companyId, setCompanyId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  const { data: staffList = [] } = useQuery({
    queryKey: ['messages-recipients-staff'],
    queryFn: () => api.messages.listStaffRecipients(),
  });
  const { data: clientList = [] } = useQuery({
    queryKey: ['messages-recipients-clients'],
    queryFn: () => api.messages.listClientRecipients(),
    enabled: recipientType === 'client',
  });

  const sendMutation = useMutation({
    mutationFn: (payload: SendMessageBody) => api.messages.send(payload),
    onSuccess: () => {
      setSubject('');
      setBody('');
      setStaffId('');
      setCompanyId('');
      onSent();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) return;
    const payload: SendMessageBody = {
      subject: subject.trim(),
      body: body.trim() || '',
    };
    if (recipientType === 'staff') {
      payload.recipientType = 'staff';
      payload.recipientId = staffId || undefined;
      if (!staffId) return;
    } else {
      payload.recipientType = 'client';
      if (clientMode === 'bulk') {
        payload.broadcastToAllClients = true;
      } else {
        payload.companyId = companyId || undefined;
        if (!companyId) return;
      }
    }
    sendMutation.mutate(payload);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">New message</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Recipient</label>
          <div className="flex gap-4 mb-2">
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="recipientType"
                checked={recipientType === 'staff'}
                onChange={() => setRecipientType('staff')}
                className="rounded border-gray-300 text-primary"
              />
              <span className="text-sm">Staff</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="radio"
                name="recipientType"
                checked={recipientType === 'client'}
                onChange={() => setRecipientType('client')}
                className="rounded border-gray-300 text-primary"
              />
              <span className="text-sm">Client</span>
            </label>
          </div>
          {recipientType === 'staff' && (
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
              required
            >
              <option value="">Select staff</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.label || s.email}</option>
              ))}
            </select>
          )}
          {recipientType === 'client' && (
            <>
              <div className="flex gap-4 mb-2">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="clientMode"
                    checked={clientMode === 'one'}
                    onChange={() => setClientMode('one')}
                    className="rounded border-gray-300 text-primary"
                  />
                  <span className="text-sm">One client</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="clientMode"
                    checked={clientMode === 'bulk'}
                    onChange={() => setClientMode('bulk')}
                    className="rounded border-gray-300 text-primary"
                  />
                  <span className="text-sm">Bulk (all clients)</span>
                </label>
              </div>
              {clientMode === 'one' && (
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select client (company)</option>
                  {clientList.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              )}
            </>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            placeholder="Subject"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm min-h-[100px]"
            placeholder="Message"
          />
        </div>
        <button
          type="submit"
          disabled={sendMutation.isPending}
          className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-50"
        >
          {sendMutation.isPending ? 'Sending…' : 'Send'}
        </button>
        {sendMutation.isError && (
          <p className="text-sm text-red-600">{sendMutation.error?.message}</p>
        )}
      </form>
    </div>
  );
}

function MessageThread({
  thread,
  folder,
  currentUserId,
  bulkMeta,
  onReplySent,
}: {
  thread: MessageThreadItem[];
  folder: 'inbox' | 'sent';
  currentUserId: string;
  bulkMeta?: { recipientCount: number };
  onReplySent: () => void;
}) {
  const [replyBody, setReplyBody] = useState('');
  // Inbox: show only what others sent you. Sent: show only what you sent. Full thread still used for reply chain.
  const displayThread =
    folder === 'inbox'
      ? thread.filter((m) => m.recipientId === currentUserId)
      : thread.filter((m) => m.senderId === currentUserId);

  const sendMutation = useMutation({
    mutationFn: (body: string) =>
      api.messages.send({ parentId: thread[thread.length - 1]?.id, body }),
    onSuccess: () => {
      setReplyBody('');
      toast.success('Message sent', { duration: 3000, icon: '✓' });
      onReplySent();
    },
  });

  const canReply = thread.length > 0 && thread[thread.length - 1].recipientId === currentUserId;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {bulkMeta && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-800">
            <p className="font-medium text-gray-900">
              Bulk message to {bulkMeta.recipientCount} client{bulkMeta.recipientCount === 1 ? '' : 's'}
            </p>
          </div>
        )}
        {displayThread.length === 0 ? (
          <p className="text-sm text-gray-500">No messages in this folder for this conversation.</p>
        ) : null}
        {displayThread.map((m, idx) => (
          <div
            key={m.id}
            className={`rounded-lg p-4 ${m.senderId === currentUserId ? 'bg-primary/10 ml-8' : 'bg-gray-50 mr-8'}`}
          >
            <div className="flex justify-between items-start gap-2 mb-1">
              <span className="text-sm font-medium text-gray-900">
                {m.senderId === currentUserId ? 'You' : m.senderDisplay}
              </span>
              <span className="text-xs text-gray-500">{new Date(m.createdAt).toLocaleString()}</span>
            </div>
            {idx === 0 && <p className="text-sm font-medium text-gray-700 mb-1">{m.subject}</p>}
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{m.body}</p>
          </div>
        ))}
      </div>
      {canReply && (
        <div className="p-4 border-t border-gray-200">
          <textarea
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm min-h-[80px] mb-2"
            placeholder="Reply…"
          />
          <button
            type="button"
            onClick={() => replyBody.trim() && sendMutation.mutate(replyBody.trim())}
            disabled={sendMutation.isPending || !replyBody.trim()}
            className="px-4 py-2 bg-primary text-white text-sm font-medium rounded hover:opacity-90 disabled:opacity-50"
          >
            {sendMutation.isPending ? 'Sending…' : 'Reply'}
          </button>
          {sendMutation.isError && (
            <p className="text-sm text-red-600 mt-1">{sendMutation.error?.message}</p>
          )}
        </div>
      )}
    </div>
  );
}
