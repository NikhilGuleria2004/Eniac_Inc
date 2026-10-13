interface DatePickerProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  className?: string;
}

export function DatePicker({ value, onChange, placeholder = "Select date", min, max, className = "" }: DatePickerProps) {
  return (
    <input
      type="date"
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      min={min}
      max={max}
      className={`form-input ${className}`}
    />
  );
}
