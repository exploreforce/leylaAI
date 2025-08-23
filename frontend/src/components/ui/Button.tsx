import { cn } from '@/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button: React.FC<ButtonProps> = ({
  children,
  className,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center rounded-md font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-elysPink-600 to-elysViolet-600 text-white hover:from-elysPink-500 hover:to-elysBlue-700 focus:ring-elysPink-500 shadow-lg hover:shadow-elysPink-500/25 transition-all duration-300 hover:-translate-y-0.5',
    secondary: 'bg-dark-600 text-dark-100 border border-dark-500 hover:bg-dark-500 hover:border-elysViolet-400 hover:text-elysViolet-400 focus:ring-elysViolet-500 transition-all duration-300',
    danger: 'bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 focus:ring-red-500 transition-all duration-300',
    ghost: 'bg-transparent text-dark-200 hover:bg-dark-700 hover:text-dark-50 focus:ring-elysPink-500 transition-all duration-300',
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  const finalClasses = cn(
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className
  );

  return (
    <button className={finalClasses} disabled={isLoading} {...props}>
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v8H4z"
          ></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button; 