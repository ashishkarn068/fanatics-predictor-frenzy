import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import * as firestoreCollections from '@/utils/firestore-collections';
import { Match, PollQuestion, PredictionGame, LeaderboardEntry, User, Squad } from '@/utils/firestore-collections';
import { DocumentData } from 'firebase/firestore';

// Hook for fetching matches
export const useMatches = (upcomingOnly = false) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      try {
        setLoading(true);
        const matchesData = upcomingOnly 
          ? await firestoreCollections.getUpcomingMatches()
          : await firestoreCollections.getMatches();
        setMatches(matchesData);
      } catch (err) {
        console.error('Error fetching matches:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch matches'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [upcomingOnly]);

  return { matches, loading, error };
};

// Hook for fetching a single match
export const useMatch = (matchId: string | undefined) => {
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const fetchMatch = async () => {
      try {
        setLoading(true);
        const matchData = await firestoreCollections.getMatch(matchId);
        setMatch(matchData);
      } catch (err) {
        console.error('Error fetching match:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch match'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [matchId]);

  return { match, loading, error };
};

// Hook for fetching poll questions for a match
export const usePollQuestions = (matchId: string | undefined) => {
  const [pollQuestions, setPollQuestions] = useState<PollQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const fetchPollQuestions = async () => {
      try {
        setLoading(true);
        const questionsData = await firestoreCollections.getPollQuestions(matchId);
        setPollQuestions(questionsData);
      } catch (err) {
        console.error('Error fetching poll questions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch poll questions'));
      } finally {
        setLoading(false);
      }
    };

    fetchPollQuestions();
  }, [matchId]);

  return { pollQuestions, loading, error };
};

// Hook for fetching user predictions
export const useUserPredictions = () => {
  const { currentUser } = useAuth();
  const [predictions, setPredictions] = useState<PredictionGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const fetchUserPredictions = async () => {
      try {
        setLoading(true);
        const predictionsData = await firestoreCollections.getUserPredictions(currentUser.uid);
        setPredictions(predictionsData);
      } catch (err) {
        console.error('Error fetching user predictions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user predictions'));
      } finally {
        setLoading(false);
      }
    };

    fetchUserPredictions();
  }, [currentUser]);

  return { predictions, loading, error };
};

// Hook for fetching match predictions
export const useMatchPredictions = (matchId: string | undefined) => {
  const [predictions, setPredictions] = useState<PredictionGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    const fetchMatchPredictions = async () => {
      try {
        setLoading(true);
        const predictionsData = await firestoreCollections.getMatchPredictions(matchId);
        setPredictions(predictionsData);
      } catch (err) {
        console.error('Error fetching match predictions:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch match predictions'));
      } finally {
        setLoading(false);
      }
    };

    fetchMatchPredictions();
  }, [matchId]);

  return { predictions, loading, error };
};

// Hook for fetching leaderboard
export const useLeaderboard = (limit = 100) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        const leaderboardData = await firestoreCollections.getLeaderboard(limit);
        setLeaderboard(leaderboardData);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch leaderboard'));
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [limit]);

  return { leaderboard, loading, error };
};

// Hook for fetching user data
export const useUserData = (userId: string | undefined) => {
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        setLoading(true);
        const user = await firestoreCollections.getUser(userId);
        setUserData(user);
      } catch (err) {
        console.error('Error fetching user data:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [userId]);

  return { userData, loading, error };
};

// Hook for fetching squads
export const useSquads = () => {
  const [squads, setSquads] = useState<Squad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchSquads = async () => {
      try {
        setLoading(true);
        const squadsData = await firestoreCollections.getSquads();
        setSquads(squadsData);
      } catch (err) {
        console.error('Error fetching squads:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch squads'));
      } finally {
        setLoading(false);
      }
    };

    fetchSquads();
  }, []);

  return { squads, loading, error };
};

// Hook for fetching a single squad
export const useSquad = (squadId: string | undefined) => {
  const [squad, setSquad] = useState<Squad | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!squadId) {
      setLoading(false);
      return;
    }

    const fetchSquad = async () => {
      try {
        setLoading(true);
        const squadData = await firestoreCollections.getSquad(squadId);
        setSquad(squadData);
      } catch (err) {
        console.error('Error fetching squad:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch squad'));
      } finally {
        setLoading(false);
      }
    };

    fetchSquad();
  }, [squadId]);

  return { squad, loading, error };
};
