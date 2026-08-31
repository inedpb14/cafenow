import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full px-4 py-2.5 border rounded-lg
            focus:outline-none focus:ring-2 focus:ring-[#b8863b]
            transition-colors
            ${error ? 'border-[#a6472f]' : 'border-[#dcd2c0]'}
            ${className}
          `}
          {...props}
        />
        {error && <p className="text-[#a6472f] text-xs mt-1">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
