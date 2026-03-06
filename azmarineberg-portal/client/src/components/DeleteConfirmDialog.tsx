interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  /** Main question, e.g. "Delete Environmental Health Officers Registration Council of Nigeria?" */
  message: string;
  /** Optional warning below the message, e.g. "This will fail if it has service types." */
  warning?: string;
  /** Button label for the destructive action. Default: "Delete" */
  confirmLabel?: string;
  /** When true, disables the confirm button and shows loading state */
  loading?: boolean;
}

export default function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  message,
  warning,
  confirmLabel = 'Delete',
  loading = false,
}: DeleteConfirmDialogProps) {
  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    // Caller closes the dialog on success (e.g. in mutation onSuccess) or user cancels via onClose
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="delete-dialog-title" className="text-lg font-semibold text-gray-900 mb-2">
          Delete confirmation
        </h3>
        <p className="text-gray-700 mb-1">{message}</p>
        {warning && (
          <p className="text-amber-700 text-sm mt-2 mb-4 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
            {warning}
          </p>
        )}
        {!warning && <div className="mb-4" />}
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 text-sm font-medium"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
          >
            {loading ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
