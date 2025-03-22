import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Team, Match, PredictionPoll, User } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function formatTime(date: string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

export function formatDateTime(date: string | Date): string {
  if (typeof date === 'string') {
    return `${formatDate(date)} at ${formatTime(date)}`;
  } else {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }
}

/**
 * Returns the initials from a display name for use in avatar fallbacks
 */
export function getAvatarFallback(displayName: string): string {
  if (!displayName) return "?";
  
  const names = displayName.trim().split(/\s+/);
  
  if (names.length === 1) {
    // Get the first two characters of the name if only one name is provided
    return displayName.substring(0, 2).toUpperCase();
  }
  
  // Get initials from first and last name
  return `${names[0].charAt(0)}${names[names.length - 1].charAt(0)}`.toUpperCase();
}

export function getTeamById(teamId: string): Team | undefined {
  if (teamId === 'tbd') {
    // Return a placeholder team for TBD
    return {
      id: 'tbd',
      name: 'To Be Determined',
      shortName: 'TBD',
      primaryColor: '#808080', // Gray color
      secondaryColor: '#D3D3D3',
      logo: '/placeholder.svg'
    };
  }
  
  // Create a fallback team with basic info
  return {
    id: teamId,
    name: teamId === '1' ? 'Mumbai Indians' : 
          teamId === '2' ? 'Chennai Super Kings' :
          teamId === '3' ? 'Royal Challengers Bangalore' :
          teamId === '4' ? 'Kolkata Knight Riders' :
          teamId === '5' ? 'Delhi Capitals' :
          teamId === '6' ? 'Punjab Kings' :
          teamId === '7' ? 'Rajasthan Royals' :
          teamId === '8' ? 'Sunrisers Hyderabad' :
          teamId === '9' ? 'Gujarat Titans' :
          teamId === '10' ? 'Lucknow Super Giants' : 'Unknown Team',
    shortName: teamId === '1' ? 'MI' : 
               teamId === '2' ? 'CSK' :
               teamId === '3' ? 'RCB' :
               teamId === '4' ? 'KKR' :
               teamId === '5' ? 'DC' :
               teamId === '6' ? 'PBKS' :
               teamId === '7' ? 'RR' :
               teamId === '8' ? 'SRH' :
               teamId === '9' ? 'GT' :
               teamId === '10' ? 'LSG' : 'TBD',
    primaryColor: '#1976D2',
    secondaryColor: '#FFFFFF',
    logo: `/images/teams/${teamId === '1' ? 'mi' : 
                           teamId === '2' ? 'csk' :
                           teamId === '3' ? 'rcb' :
                           teamId === '4' ? 'kkr' :
                           teamId === '5' ? 'dc' :
                           teamId === '6' ? 'pbks' :
                           teamId === '7' ? 'rr' :
                           teamId === '8' ? 'srh' :
                           teamId === '9' ? 'gt' :
                           teamId === '10' ? 'lsg' : 'default'}.png`
  };
}

export function getMatchStatus(match: Match): string {
  switch (match.status) {
    case 'upcoming':
      return `${formatDate(match.date)} at ${formatTime(match.date)}`;
    case 'live':
      return 'LIVE';
    case 'completed':
      return match.result || 'Completed';
    default:
      return '';
  }
}

export function getTimeUntilMatch(matchDate: string): string {
  const now = new Date();
  const match = new Date(matchDate);
  const diffMs = match.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Match has started';
  
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) {
    return `${diffDays}d ${diffHours}h until match`;
  }
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m until match`;
  }
  
  return `${diffMinutes}m until match`;
}

/**
 * Checks if a match is within the 24-hour prediction window
 * Returns true if the match is less than 24 hours away, false otherwise
 * This is a client-side validation only, security rules should enforce this on the server
 */
export function isMatchWithinPredictionWindow(matchDate: string): boolean {
  // Convert both dates to UTC timestamps to ensure consistent comparison
  const now = new Date();
  const match = new Date(matchDate);
  
  // Calculate the difference in milliseconds
  const timeDifference = match.getTime() - now.getTime();
  
  // Convert to hours (1000 ms * 60 s * 60 min)
  const hoursDifference = timeDifference / (1000 * 60 * 60);
  
  // Return true if match is less than 24 hours away and in the future
  return hoursDifference > 0 && hoursDifference <= 24;
}

/**
 * Enhanced version that checks if predictions are allowed for a match
 * Takes into account both time window and admin override
 */
export function isPredictionAllowed(match: any): boolean {
  // Check if admin has enabled predictions for this match
  if (match.isPredictionEnabledByAdmin === true && match.status === 'upcoming') {
    return true;
  }
  
  // Otherwise, fall back to time-based check
  return match.status === 'upcoming' && isMatchWithinPredictionWindow(match.date);
}

export function isPredictionDeadlinePassed(deadline: string): boolean {
  const now = new Date();
  const deadlineDate = new Date(deadline);
  return now > deadlineDate;
}

export function calculateAccuracy(user: User): number {
  const correctPredictions = user.predictions.filter(p => p.isCorrect).length;
  if (user.predictions.length === 0) return 0;
  return (correctPredictions / user.predictions.length) * 100;
}
