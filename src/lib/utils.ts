import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { Team, Match, PredictionPoll, User } from "./types";
import { teams } from "./mock-data";

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

export function formatDateTime(date: string): string {
  return `${formatDate(date)} at ${formatTime(date)}`;
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
  return teams.find(team => team.id === teamId);
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
