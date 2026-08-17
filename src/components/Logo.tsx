import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  showText?: boolean;
  textColor?: 'dark' | 'light';
  customLogoUrl?: string; // Optional custom logo image URL (e.g. /logo.png)
  showFrame?: boolean; // Smooth rounded frame
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  textColor = 'dark',
  customLogoUrl,
  showFrame = true
}) => {
  const sizeMap = {
    sm: { 
      icon: 'w-11 h-11 sm:w-12 sm:h-12', 
      frame: 'p-0.5 rounded-full', 
      imgRounded: 'rounded-full',
      text: 'text-sm font-black' 
    },
    md: { 
      icon: 'w-18 h-18 sm:w-20 sm:h-20', 
      frame: 'p-1 rounded-full', 
      imgRounded: 'rounded-full',
      text: 'text-lg font-black' 
    },
    lg: { 
      icon: 'w-24 h-24 sm:w-28 sm:h-28', 
      frame: 'p-1.5 rounded-full', 
      imgRounded: 'rounded-full',
      text: 'text-2xl font-black' 
    },
    xl: { 
      icon: 'w-32 h-32 sm:w-36 sm:h-36', 
      frame: 'p-2 rounded-full', 
      imgRounded: 'rounded-full',
      text: 'text-3xl font-black' 
    },
    '2xl': { 
      icon: 'w-40 h-40 sm:w-44 sm:h-44', 
      frame: 'p-2.5 rounded-full', 
      imgRounded: 'rounded-full',
      text: 'text-4xl font-black' 
    }
  };

  // Image source priorities: custom prop -> localStorage -> default static image `/logo.png` -> `/logo.svg`
  const [imageError, setImageError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState<string>(
    customLogoUrl || (typeof window !== 'undefined' ? localStorage.getItem('app_custom_logo') : null) || '/logo.png'
  );

  const handleImageError = () => {
    if (currentSrc === '/logo.png') {
      // Try SVG fallback in public folder
      setCurrentSrc('/logo.svg');
    } else {
      // Fallback to embedded vector logo
      setImageError(true);
    }
  };

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      {/* Logo Container with Smooth Rounded Corners and Soft Frame */}
      <div 
        className={`${sizeMap[size].icon} ${
          showFrame 
            ? `${sizeMap[size].frame} bg-white/95 border border-[#E8E2D8] shadow-md` 
            : `${sizeMap[size].frame}`
        } rounded-full relative flex items-center justify-center overflow-hidden transition-all duration-300`}
      >
        {!imageError ? (
          <img 
            src={currentSrc} 
            alt="شعار مؤسسة نماذج التميز" 
            className={`w-full h-full object-cover scale-140 ${sizeMap[size].imgRounded} select-none drop-shadow-sm`}
            onError={handleImageError}
          />
        ) : (
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full scale-135">
            {/* Main Tall Right Tower (Sand / Beige) */}
            <path
              d="M104 22 L116 26 V96 L104 93 Z"
              fill="#C5B198"
            />
            <path
              d="M104 107 C116 110 128 116 142 124 L142 150 L132 150 V136 C124 130 114 125 104 121 Z"
              fill="#C5B198"
            />

            {/* Middle Medium Tower (Sand / Beige) */}
            <path
              d="M80 50 L91 53 V136 L59 150 L80 141 Z"
              fill="#C5B198"
            />
            <path
              d="M80 50 L91 53 V136 L80 132 Z"
              fill="#C5B198"
            />

            {/* Left Dark Green Architectural Windows & Block */}
            <path
              d="M58 80 H69 V102 H58 Z"
              fill="#1C3022"
            />
            <path
              d="M58 108 H69 V132 H58 Z"
              fill="#1C3022"
            />

            {/* Bottom Right Green Accent Door/Opening */}
            <path
              d="M104 135 H115 V150 H104 Z"
              fill="#1C3022"
            />
          </svg>
        )}
      </div>

      {showText && (
        <div className={`mt-2 tracking-wide font-black ${sizeMap[size].text} ${textColor === 'light' ? 'text-[#F5F3EF]' : 'text-[#1C3022]'}`}>
          نماذج التميز
        </div>
      )}
    </div>
  );
};
