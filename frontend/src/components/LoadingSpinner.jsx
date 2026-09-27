function LoadingSpinner({ message = "Loading..." }) {
  return (
    <div
      className="flex min-h-[200px] flex-col items-center justify-center gap-4"
      role="status"
      aria-live="polite"
    >
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />

      <p className="text-sm font-medium text-slate-600">
        {message}
      </p>
    </div>
  );
}

export default LoadingSpinner;
