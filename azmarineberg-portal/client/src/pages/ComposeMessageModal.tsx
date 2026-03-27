import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { api, type SendMessageBody } from '../services/api';
import Modal from '../components/ui/Modal';

interface ComposeMessageModalProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}

export default function ComposeMessageModal({ open, onClose, onSent }: ComposeMessageModalProps) {
  const [recipientType, setRecipientType] = useState<'staff' | 'client'>('staff');
  const [staffId, setStaffId] = useState('');
  const [clientMode, setClientMode] = useState<'one' | 'bulk'>('one');
  const [companyId, setCompanyId] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');


  const { data: staffList = [] } = useQuery({
    queryKey: ['messages-recipients-staff'],
    queryFn: () => api.messages.listStaffRecipients(),
    enabled: open,
  });

  const { data: clientList = [] } = useQuery({
    queryKey: ['messages-recipients-clients'],
    queryFn: () => api.messages.listClientRecipients(),
    enabled: open && recipientType === 'client',
  });

  const sendMutation = useMutation({
    mutationFn: (payload: SendMessageBody) => api.messages.send(payload),
    onSuccess: () => {
      setSubject('');
      setBody('');
      setStaffId('');
      setCompanyId('');
      onSent();
      onClose();
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
    <Modal
      isOpen={open}
      onClose={onClose}
      title="New message"
      description="Send a message to staff or clients"
    >
      <form onSubmit={handleSubmit} className="space-y-4 font-lato">
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
          className="w-full py-4 bg-primary text-white rounded-xl font-bold font-poppins shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {sendMutation.isPending ? 'Sending…' : 'Send Message'}
        </button>
        {sendMutation.isError && (
          <p className="text-sm text-red-600">{sendMutation.error?.message}</p>
        )}
      </form>
    </Modal>
  );
}
