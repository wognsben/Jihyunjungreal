import { useState } from 'react';

interface SplitTextLinkProps {
  text: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onFocus?: () => void;
  onBlur?: () => void;
  isActive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  activeColor?: string;
  inactiveColor?: string;
  hoverColor?: string;
  underlineColor?: string;
  showUnderline?: boolean;
}

export const SplitTextLink = ({
  text,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  isActive = false,
  className = '',
  style = {},
  activeColor = 'text-white',
  inactiveColor = 'text-white/60',
  hoverColor = 'text-white',
  underlineColor = 'bg-white',
  showUnderline = true,
}: SplitTextLinkProps) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => {
        setIsHovered(true);
        onMouseEnter?.();
      }}
      onMouseLeave={() => {
        setIsHovered(false);
        onMouseLeave?.();
      }}
      onFocus={() => {
        setIsHovered(true);
        onFocus?.();
      }}
      onBlur={() => {
        setIsHovered(false);
        onBlur?.();
      }}
      className={`relative inline-block ${className} transition-colors duration-300 ease-out`}
      style={style}
      type="button"
    >
      <span
        className={`block transition-colors duration-300 ${
          isActive || isHovered ? activeColor : inactiveColor
        }`}
      >
        {text}
      </span>

      {showUnderline && (
        <span
          className={`absolute bottom-[-4px] left-0 h-[1px] ${underlineColor} transition-all duration-300 ease-out`}
          style={{
            width: isActive ? '100%' : isHovered ? '100%' : '0%',
            opacity: isActive || isHovered ? 1 : 0,
            transformOrigin: 'left center',
          }}
          aria-hidden="true"
        />
      )}
    </button>
  );
};