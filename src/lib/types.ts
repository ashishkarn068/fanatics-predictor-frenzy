
export interface Team {
  id: string;
  name: string;
  shortName: string;
  primaryColor: string;
  secondaryColor: string;
  logo: string;
}

export interface Player {
  id: string;
  name: string;
  teamId: string;
  role: 'Batsman' | 'Bowler' | 'All-rounder' | 'Wicket-keeper';
  image?: string;
}

export interface Match {
  id: string;
  team1Id: string;
  team2Id: string;
  venue: string;
  date: string; // ISO string
  status: 'upcoming' | 'live' | 'completed';
  result?: string;
}

export interface PredictionOption {
  id: string;
  value: string;
  label: string;
}

export interface PredictionPoll {
  id: string;
  matchId: string;
  type: 'match-winner' | 'top-batsman' | 'top-bowler' | 'powerplay-score' | 'total-runs' | 'winning-margin' | 'number-of-sixes' | 'century-scored';
  title: string;
  description: string;
  options: PredictionOption[];
  points: number;
  deadline: string; // ISO string
}

export interface UserPrediction {
  id: string;
  userId: string;
  matchId: string;
  pollId: string;
  selectedOptionId: string;
  createdAt: string; // ISO string
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  bio?: string;
  totalPoints: number;
  predictions: UserPrediction[];
}

export interface Leaderboard {
  matchId?: string;
  timeframe?: 'match' | 'weekly' | 'season';
  entries: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  position: number;
  userId: string;
  userName: string;
  userAvatar?: string;
  points: number;
  correctPredictions: number;
  totalPredictions: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'match-reminder' | 'prediction-result' | 'leaderboard-update' | 'achievement';
  read: boolean;
  createdAt: string; // ISO string
  linkTo?: string;
}
