import React from 'react';

// Mock Material Tailwind components for testing
export const ThemeProvider = ({ children }) => <>{children}</>;

export const Input = React.forwardRef(({ 
  value, 
  onChange, 
  onFocus,
  onBlur,
  onKeyDown,
  placeholder, 
  disabled, 
  'aria-label': ariaLabel,
  'aria-expanded': ariaExpanded,
  'aria-haspopup': ariaHaspopup,
  'aria-autocomplete': ariaAutocomplete,
  icon,
  labelProps,
  containerProps,
  className,
  ...props 
}, ref) => (
  <div className="input-wrapper">
    <input
      ref={ref}
      type="text"
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-expanded={ariaExpanded}
      aria-haspopup={ariaHaspopup}
      aria-autocomplete={ariaAutocomplete}
      className={className}
    />
    {icon}
  </div>
));

export const Button = ({ children, onClick, disabled, variant, size, className, ...props }) => (
  <button onClick={onClick} disabled={disabled} className={className} {...props}>
    {children}
  </button>
);

export const Chip = ({ value, dismissible, icon, className, ...props }) => (
  <div className={`chip ${className || ''}`} {...props}>
    {value}
    {dismissible && (
      <button onClick={dismissible.onClose} aria-label="dismiss">×</button>
    )}
  </div>
);

export const IconButton = ({ children, onClick, disabled, 'aria-label': ariaLabel, ...props }) => (
  <button onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
    {children}
  </button>
);

export const Typography = ({ children, variant, className, ...props }) => (
  <span className={className} {...props}>{children}</span>
);

export const List = ({ children, className, ...props }) => (
  <ul className={className} {...props}>{children}</ul>
);

export const ListItem = ({ children, onClick, className, role, ...props }) => (
  <li onClick={onClick} className={className} role={role} {...props}>{children}</li>
);

export const Spinner = ({ className }) => (
  <div className={`spinner ${className || ''}`}>Loading...</div>
);

export const Menu = ({ children, placement }) => <div className="menu">{children}</div>;
export const MenuHandler = ({ children }) => <>{children}</>;
export const MenuList = ({ children, className }) => <div className={className}>{children}</div>;
export const MenuItem = ({ children, onClick, className }) => (
  <button onClick={onClick} className={className}>{children}</button>
);

export const Card = ({ children, className, ...props }) => (
  <div className={`card ${className || ''}`} {...props}>{children}</div>
);
