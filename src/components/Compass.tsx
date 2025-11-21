import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';

interface CompassProps {
  busLocation: { lat: number; lng: number } | null;
  previousLocation: { lat: number; lng: number } | null;
  /** Optional neon gradient colors [start, end] */
  neonGradient?: [string, string];
}

const Compass: React.FC<CompassProps> = ({ busLocation, previousLocation, neonGradient }) => {
  const gradientId = useRef<string>('needleGrad-' + Math.random().toString(36).slice(2, 9));
  const gradient = neonGradient ?? ['#6EE7B7', '#3B82F6'];
  const [direction, setDirection] = useState<string>('N');
  const [degrees, setDegrees] = useState<number>(0);
  const [animatedDeg, setAnimatedDeg] = useState<number>(0);
  const animRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  // Calculate bearing between two points (from previous to current location)
  const calculateBearing = (start: { lat: number; lng: number }, end: { lat: number; lng: number }): number => {
    // Handle case where locations are the same or invalid
    if (!start || !end || (start.lat === end.lat && start.lng === end.lng)) {
      return 0;
    }
    
    const lat1 = start.lat * Math.PI / 180;
    const lat2 = end.lat * Math.PI / 180;
    const dLng = (end.lng - start.lng) * Math.PI / 180;
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let bearing = Math.atan2(y, x) * 180 / Math.PI;
    bearing = (bearing + 360) % 360;
    
    return bearing;
  };

  // Convert bearing to compass direction
  const bearingToDirection = (bearing: number): string => {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(bearing / 22.5) % 16;
    return directions[index];
  };

  // Update compass when locations change
  useEffect(() => {
    if (busLocation && previousLocation) {
      const bearing = calculateBearing(previousLocation, busLocation);
      setDegrees(bearing);
      setDirection(bearingToDirection(bearing));
    }
  }, [busLocation, previousLocation]);

  // Smoothly animate the displayed rotation towards the target `degrees`.
  useEffect(() => {
    // cancel previous frame
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const step = () => {
      const current = animRef.current;
      let target = degrees;

      // shortest angular distance
      let delta = ((target - current + 540) % 360) - 180;

      // if very small, snap to target
      if (Math.abs(delta) < 0.3) {
        animRef.current = target;
        setAnimatedDeg(animRef.current);
        return;
      }

      // ease factor
      animRef.current = (current + delta * 0.18 + 360) % 360;
      setAnimatedDeg(animRef.current);
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [degrees]);

  return (
    <Card className="bg-card/95 backdrop-blur-md border-border/50 w-full">
      <CardContent className="p-3 sm:p-4">
        <div className="flex flex-col items-center">
          <h3 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">Bus Direction</h3>
          
          {/* Compass visualization - responsive sizing */}
          <div className="relative w-24 h-24 sm:w-32 sm:h-32 md:w-40 md:h-40 mb-2 sm:mb-3 neon-compass animate-glow flex items-center justify-center">
            {/* Outer ring */}
            <svg 
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 200 200" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id={gradientId.current} x1="0" x2="1">
                  <stop offset="0%" stopColor={gradient[0]} />
                  <stop offset="100%" stopColor={gradient[1]} />
                </linearGradient>
              </defs>
              
              {/* Circle background */}
              <circle cx="100" cy="100" r="95" fill="rgba(20, 20, 40, 0.8)" stroke={`url(#${gradientId.current})`} strokeWidth="2" />
              
              {/* Cardinal direction markers */}
              <text x="100" y="25" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">N</text>
              <text x="175" y="105" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">E</text>
              <text x="100" y="180" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">S</text>
              <text x="25" y="105" textAnchor="middle" fontSize="16" fontWeight="bold" fill="white">W</text>
              
              {/* Tick marks */}
              {[...Array(360)].map((_, i) => {
                const angle = (i * Math.PI) / 180;
                const isCardinal = i % 90 === 0;
                const isIntercardinal = i % 45 === 0;
                const length = isCardinal ? 12 : isIntercardinal ? 8 : 4;
                const x1 = 100 + 90 * Math.sin(angle);
                const y1 = 100 - 90 * Math.cos(angle);
                const x2 = 100 + (90 - length) * Math.sin(angle);
                const y2 = 100 - (90 - length) * Math.cos(angle);
                return (
                  <line
                    key={i}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke={isCardinal ? gradient[0] : 'rgba(255,255,255,0.3)'}
                    strokeWidth={isCardinal ? 1.5 : 0.5}
                  />
                );
              })}
            </svg>

            {/* Moving needle */}
            <div
              className="absolute inset-0 flex items-center justify-center transition-transform"
              style={{ transform: `rotate(${animatedDeg}deg)` }}
            >
              <svg
                className="w-3/4 h-3/4"
                viewBox="0 0 64 64"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                {/* Arrow shaft */}
                <rect x="30" y="8" width="4" height="32" rx="2" fill={`url(#${gradientId.current})`} />
                {/* Arrow head */}
                <path d="M32 4 L42 22 L32 16 L22 22 Z" fill="#7C3AED" />
                {/* Tail */}
                <circle cx="32" cy="52" r="3" fill="#ffffff" />
              </svg>
            </div>

            {/* Center glow dot */}
            <div className="absolute w-2 h-2 sm:w-3 sm:h-3 rounded-full bg-gradient-to-r from-green-400 to-blue-400 shadow-lg shadow-green-400/50 z-10" />
          </div>
          
          {/* Direction and degree display */}
          <div className="text-center">
            <div className="text-lg sm:text-2xl font-bold text-white">{direction}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{Math.round(animatedDeg)}°</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Compass;