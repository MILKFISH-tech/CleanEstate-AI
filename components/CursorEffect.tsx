import React, { useEffect, useState } from 'react';

const CursorEffect = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trailingPosition, setTrailingPosition] = useState({ x: -100, y: -100 });
  const [isHovering, setIsHovering] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
      
      // Check if hovering over clickable elements
      const target = e.target as HTMLElement;
      const isClickable = target.closest('button') || target.closest('a') || target.closest('input') || target.closest('textarea') || target.closest('.cursor-pointer');
      setIsHovering(!!isClickable);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Smooth trailing effect
  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
      setTrailingPosition(prev => {
        const dx = position.x - prev.x;
        const dy = position.y - prev.y;
        return {
          x: prev.x + dx * 0.2, 
          y: prev.y + dy * 0.2
        };
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [position]);

  return (
    <>
      {/* 1. Center Dot (Solid) */}
      <div 
        className="fixed top-0 left-0 w-2 h-2 bg-neon-orange rounded-full pointer-events-none z-[9999] shadow-[0_0_10px_theme('colors.neon.orange')]"
        style={{ 
          transform: `translate(${position.x - 4}px, ${position.y - 4}px)`,
        }}
      />

      {/* 2. Crosshair Lines (Sniper Style) */}
      <div 
        className="fixed top-0 left-0 w-8 h-8 pointer-events-none z-[9999] transition-all duration-100 ease-out"
        style={{ 
          transform: `translate(${position.x - 16}px, ${position.y - 16}px) scale(${isHovering ? 0.8 : 1})`,
          opacity: 0.8
        }}
      >
          {/* Horizontal Line */}
          <div className="absolute top-1/2 left-0 w-full h-[1px] bg-neon-orange/50"></div>
          {/* Vertical Line */}
          <div className="absolute left-1/2 top-0 h-full w-[1px] bg-neon-orange/50"></div>
      </div>

      {/* 3. Outer Glowing Ring (Lagging Trail) */}
      <div 
        className={`fixed top-0 left-0 border border-neon-orange/40 rounded-full pointer-events-none z-[9998] transition-all duration-75 ease-out backdrop-blur-[1px] ${isHovering ? 'w-16 h-16 border-dashed border-neon-orange' : 'w-12 h-12'}`}
        style={{ 
          transform: `translate(${trailingPosition.x - (isHovering ? 32 : 24)}px, ${trailingPosition.y - (isHovering ? 32 : 24)}px) rotate(${isHovering ? '45deg' : '0deg'})`,
        }}
      />
    </>
  );
};

export default CursorEffect;