
function Modal({
  open,
  title,
  children,
  onClose,
  size = "max-w-lg",
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={`w-full ${size} max-h-[85vh] overflow-y-auto rounded-xl bg-white shadow-xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2
            id="modal-title"
            className="text-lg font-semibold text-slate-800"
          >
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="rounded-md px-2 py-1 text-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            ×
          </button>
        </div>

        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

export default Modal;
