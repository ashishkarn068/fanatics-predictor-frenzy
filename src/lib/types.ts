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

export interface MatchResult {
  winner: string;
  team1Score?: string;
  team2Score?: string;
}

export interface Match {
  id: string;
  team1Id: string; // Can be a team ID or 'tbd' for playoff matches
  team2Id: string; // Can be a team ID or 'tbd' for playoff matches
  venue: string;
  date: string; // ISO string
  status: 'upcoming' | 'live' | 'completed';
  result?: MatchResult;
  name?: string; // Optional name for playoff matches (Qualifier 1, Eliminator, etc.)
}

export interface PredictionOption {
  id: string;
  value: string;
  label: string;
}

export interface PredictionPoll {
  id: string;
  matchId: string;
  type: 'single' | 'number' | 'text';
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
  correctPredictions?: number;
  totalPredictions?: number;
  accuracy?: number;
  streak?: number;
  trend?: 'up' | 'down' | 'neutral';
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

export interface Prediction {
  userId: string;
  matchId: string;
  winnerTeamId: string;
  topBatsmanId?: string;
  topBowlerId?: string;
  createdAt: string | any; // Allow Firestore Timestamp
  updatedAt: string | any; // Allow Firestore Timestamp
}

// New interfaces for the updated prediction system
export interface Question {
  id: string;
  text: string;
  type: 'winner' | 'topBatsman' | 'topBowler' | 'highestTotal' | 'moreSixes' | 'totalSixes' | 'custom';
  points: number;
  negativePoints?: number; // Points deducted for wrong answers
  options?: { id: string; value: string; label: string }[];
  createdAt?: string | any; // Allow Firestore Timestamp
  updatedAt?: string | any; // Allow Firestore Timestamp
}

export interface PredictionGame {
  id: string;
  matchId: string;
  title: string;
  description?: string;
  startTime: string | any; // Allow Firestore Timestamp
  endTime: string | any; // Allow Firestore Timestamp
  isActive: boolean;
  questionIds: string[]; // References to questions
  createdAt?: string | any; // Allow Firestore Timestamp
  updatedAt?: string | any; // Allow Firestore Timestamp
}

export interface PredictionAnswer {
  id: string;
  userId: string;
  matchId: string;
  predictionGameId: string;
  questionId: string;
  answer: string; // Could be teamId, playerId, etc. depending on question type
  isCorrect?: boolean;
  pointsEarned?: number;
  createdAt?: string | any; // Allow Firestore Timestamp
  updatedAt?: string | any; // Allow Firestore Timestamp
}
