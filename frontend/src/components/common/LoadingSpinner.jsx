function LoadingSpinner({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <div className="h-9 w-9 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      <p className="mt-4 text-sm text-slate-500">{label}</p>
    </div>
  );
}

export default LoadingSpinner;
