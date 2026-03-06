interface SignOutConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function SignOutConfirmDialog({ open, onClose, onConfirm }: SignOutConfirmDialogProps) {
  if (!open) return null;

  const handleYes = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-dialog-title"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-sm w-full p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="signout-dialog-title" className="text-lg font-semibold text-gray-900 mb-4">
          Do you want to sign out?
        </h3>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-sm font-medium"
          >
            No
          </button>
          <button
            type="button"
            onClick={handleYes}
            className="px-4 py-2 rounded-md bg-primary text-white hover:bg-primary/90 text-sm font-medium"
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
