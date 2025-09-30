import React from 'react'

// Minimal UI primitives used by SupportTickets.tsx. These are simple wrappers
// to avoid build-time missing-module errors. Replace with your real shadcn
// components if/when available.

export const Badge: React.FC<React.HTMLAttributes<HTMLSpanElement>> = ({ children, className, ...rest }) => (
  <span className={['inline-flex items-center px-2 py-0.5 text-xs rounded-full', className].filter(Boolean).join(' ')} {...rest}>{children}</span>
)

// Use a permissive prop type here because the real design system Button
// supports extra props like `variant` and `size` that are not standard
// HTML attributes. Keeping this as `any` avoids excessive type errors in
// pages that expect the design-system API.
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'outline' | 'primary' | 'ghost' | string;
  size?: 'icon' | 'sm' | 'md' | string;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({ children, className, variant, size, ...rest }, ref) => {
  const base = 'inline-flex items-center px-3 py-1.5 rounded-md bg-blue-600 text-white';
  const variants: Record<string, string> = {
    outline: 'bg-white border',
    ghost: 'bg-transparent',
    primary: 'bg-blue-600 text-white',
  };
  const variantClass = variant ? (variants[variant] ?? '') : '';
  const sizeClass = size === 'icon' ? 'p-2 rounded-full' : '';
  const cls = [base, variantClass, sizeClass, className].filter(Boolean).join(' ');
  return (
    <button ref={ref} className={cls} {...rest}>{children}</button>
  );
});
Button.displayName = 'Button';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className, ...rest }) => (
  <div className={['bg-white rounded-lg shadow-sm', className].filter(Boolean).join(' ')} {...rest}>{children}</div>
)
export const CardContent = ({ children, className, ...rest }: any) => (
  <div className={['p-4', className].filter(Boolean).join(' ')} {...rest}>{children}</div>
)

export const Dialog: React.FC<any> = ({ children }) => <div>{children}</div>
export const DialogContent: React.FC<any> = ({ children }) => <div>{children}</div>
export const DialogFooter: React.FC<any> = ({ children }) => <div>{children}</div>
export const DialogHeader: React.FC<any> = ({ children }) => <div>{children}</div>
export const DialogTitle: React.FC<any> = ({ children }) => <h3>{children}</h3>
export const DialogTrigger: React.FC<any> = ({ children }) => <>{children}</>

export const DropdownMenu: React.FC<any> = ({ children }) => <div>{children}</div>
export const DropdownMenuTrigger: React.FC<any> = ({ children }) => <>{children}</>
export const DropdownMenuContent: React.FC<any> = ({ children }) => <div>{children}</div>
export const DropdownMenuItem: React.FC<any> = ({ children }) => <div>{children}</div>
export const DropdownMenuLabel: React.FC<any> = ({ children }) => <div className="text-sm text-gray-500">{children}</div>
export const DropdownMenuSeparator: React.FC<any> = () => <hr />

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(({ className, ...props }, ref) => (
  <input ref={ref} className={['border rounded px-2 py-1', className].filter(Boolean).join(' ')} {...props} />
))

export const Label: React.FC<React.LabelHTMLAttributes<HTMLLabelElement>> = ({ children, className, ...rest }) => (
  <label className={['block text-sm font-medium text-gray-700', className].filter(Boolean).join(' ')} {...rest}>{children}</label>
)

export const ScrollArea: React.FC<any> = ({ children, className, ...rest }) => (
  <div className={['overflow-auto', className].filter(Boolean).join(' ')} {...rest}>{children}</div>
)

export const Select: React.FC<any> = ({ children, className, ...rest }) => (
  <select className={['border rounded px-2 py-1', className].filter(Boolean).join(' ')} {...rest}>{children}</select>
)
export const SelectTrigger: React.FC<any> = ({ children }) => <>{children}</>
export const SelectValue: React.FC<any> = ({ children }) => <>{children}</>
export const SelectContent: React.FC<any> = ({ children }) => <>{children}</>
export const SelectItem: React.FC<any> = ({ children }) => <option>{children}</option>

export const Separator: React.FC<any> = () => <div className="my-2 border-t" />

export const Sheet: React.FC<any> = ({ children }) => <div>{children}</div>
export const SheetContent: React.FC<any> = ({ children }) => <div>{children}</div>
export const SheetHeader: React.FC<any> = ({ children }) => <div>{children}</div>
export const SheetTitle: React.FC<any> = ({ children }) => <h3>{children}</h3>

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...props }, ref) => (
  <textarea ref={ref} className={['border rounded p-2', className].filter(Boolean).join(' ')} {...props} />
))

export default {}
