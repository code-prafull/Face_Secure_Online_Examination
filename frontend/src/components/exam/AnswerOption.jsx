
function AnswerOption({
  option,
  selected,
  onSelect,
  name,
  disabled = false,
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
        selected
          ? "border-blue-500 bg-blue-50"
          : "border-gray-200 bg-white hover:border-blue-300"
      } ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      }`}
    >
      <input
        type="radio"
        name={name}
        value={option.id}
        checked={selected}
        onChange={() => onSelect?.(option.id)}
        disabled={disabled}
        className="h-4 w-4 accent-blue-600"
      />

      <span className="text-sm font-medium text-gray-800">
        {option.text}
      </span>
    </label>
  );
}

export default AnswerOption;
