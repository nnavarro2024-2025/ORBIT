"use client";

import { useState, useEffect, useRef } from "react";

type CountdownProps = {
  expiry: string | Date | undefined;
  onExpire?: () => void;
};

export function Countdown({ expiry, onExpire }: CountdownProps) {
  const [now, setNow] = useState(new Date());
  const hasFiredRef = useRef(false);
  
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  
  if (!expiry) return null;
  
  const exp = new Date(expiry);
  const diff = Math.max(0, Math.floor((exp.getTime() - now.getTime()) / 1000));
  
  useEffect(() => {
    if (diff <= 0 && onExpire && !hasFiredRef.current) {
      hasFiredRef.current = true;
      onExpire();
    }
  }, [diff, onExpire]);
  
  const hours = Math.floor(diff / 3600).toString().padStart(2, '0');
  const minutes = Math.floor((diff % 3600) / 60).toString().padStart(2, '0');
  const seconds = (diff % 60).toString().padStart(2, '0');
  
  return <span className="font-mono text-lg font-semibold text-green-700">{hours}:{minutes}:{seconds}</span>;
}
