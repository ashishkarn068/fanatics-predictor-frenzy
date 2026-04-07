import { useState, useEffect } from "react";

interface CountdownProps {
  targetDate: Date | string;
  onComplete?: () => void;
  className?: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function Countdown({ targetDate, onComplete, className = "" }: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;

    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date().getTime();
      const difference = target.getTime() - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      setTimeLeft(newTimeLeft);

      if (newTimeLeft.total <= 0) {
        clearInterval(timer);
        onComplete?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, onComplete]);

  if (timeLeft.total <= 0) {
    return (
      <div className={`flex items-center gap-1 text-red-500 font-semibold ${className}`}>
        <span className="animate-pulse">● LIVE NOW</span>
      </div>
    );
  }

  const TimeBox = ({ value, label }: { value: number; label: string }) => (
    <div className="flex flex-col items-center">
      <div className="bg-white/20 backdrop-blur-sm rounded-lg px-3 py-2 min-w-[48px]">
        <div className="text-2xl font-bold tabular-nums">{String(value).padStart(2, '0')}</div>
      </div>
      <div className="text-[10px] uppercase tracking-wider mt-1 opacity-80">{label}</div>
    </div>
  );

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {timeLeft.days > 0 && <TimeBox value={timeLeft.days} label="Days" />}
      <TimeBox value={timeLeft.hours} label="Hrs" />
      <span className="text-xl font-bold opacity-60 self-start mt-2">:</span>
      <TimeBox value={timeLeft.minutes} label="Min" />
      <span className="text-xl font-bold opacity-60 self-start mt-2">:</span>
      <TimeBox value={timeLeft.seconds} label="Sec" />
    </div>
  );
}

export function CountdownCompact({ targetDate, className = "" }: Omit<CountdownProps, 'onComplete'>) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({ days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 });

  useEffect(() => {
    const target = typeof targetDate === 'string' ? new Date(targetDate) : targetDate;

    const calculateTimeLeft = (): TimeLeft => {
      const now = new Date().getTime();
      const difference = target.getTime() - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((difference % (1000 * 60)) / 1000),
        total: difference,
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) {
    return <span className={`text-red-500 font-semibold ${className}`}>LIVE</span>;
  }

  const parts: string[] = [];
  if (timeLeft.days > 0) parts.push(`${timeLeft.days}d`);
  if (timeLeft.hours > 0 || timeLeft.days > 0) parts.push(`${timeLeft.hours}h`);
  parts.push(`${timeLeft.minutes}m`);

  return <span className={className}>{parts.join(' ')}</span>;
}
