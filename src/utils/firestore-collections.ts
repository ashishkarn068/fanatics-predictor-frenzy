import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit as firestoreLimit, 
  Timestamp,
  DocumentData,
  QueryDocumentSnapshot,
  DocumentReference,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';

// Collection names
export const COLLECTIONS = {
  TEAMS: 'teams',
  MATCHES: 'matches',
  POLL_QUESTIONS: 'pollQuestions',
  PREDICTION_GAME: 'predictionGame',
  SQUADS: 'squads',
  USERS: 'users',
  LEADERBOARD: 'leaderboard',
  MATCH_RESULTS: 'matchResults',
  QUESTIONS: 'questions',
  MATCH_LEADERBOARDS: 'matchLeaderboards',
  ANSWERS: 'predictionAnswers',
  SYSTEM_SETTINGS: 'systemSettings',
  GLOBAL_LEADERBOARD: 'globalLeaderboard'
} as const;

// Type definitions
export interface User {
  uid: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  role?: string;
  points?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface Match {
  id: string;
  team1: string;
  team2: string;
  venue: string;
  date: string | Timestamp;
  status?: 'upcoming' | 'live' | 'completed';
  name?: string;
  isPlayoff?: boolean;
  playoffRound?: string | null;
  playoffOrder?: number | null;
  isPredictionEnabledByAdmin?: boolean;
  result?: {
    winner: string;
    team1Score?: string;
    team2Score?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface PollQuestion {
  id: string;
  matchId: string;
  question: string;
  margin: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PredictionGame {
  id: string;
  user: string;
  matchId: string;
  prediction: string;
  question: string;
  answer: string;
  points?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaderboardEntry {
  id: string;
  user: string;
  displayName?: string;
  points: number;
  rank?: number;
  gamesPlayed?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlayerData {
  name: string;
  role: string;
  age: string;
}

export interface Squad {
  id?: string;
  team: string;
  squad: PlayerData[];
  createdAt?: string;
  updatedAt?: string;
}

// Add a new interface for comprehensive match results
export interface MatchResult {
  id: string;
  matchId: string;
  winner: string;
  team1Score?: string;
  team2Score?: string;
  highestTotal?: number;
  numberOfSixes?: number;
  moreSixes?: string; // Team that hit more sixes or 'tie'
  totalSixes?: number; // Total number of sixes in the match
  team1PowerplayScore?: number;
  team2PowerplayScore?: number;
  winningMargin?: string;
  centuryScored?: 'yes' | 'no';
  topBatsmanId?: string;
  topBowlerId?: string;
  predictionResults?: Record<string, string>; // Question ID to answer mapping
  isEvaluated: boolean;
  evaluatedAt?: string | Timestamp;
  createdBy: string;
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface GlobalLeaderboardEntry {
  userId: string;
  displayName: string;
  photoURL?: string;
  totalPoints: number;
  correctPredictions: number;
  totalPredictions: number;
  accuracy: number;
  lastUpdated: Timestamp;
  matchesPlayed: number;
}

// Generic helper functions
export const createTimestamps = () => {
  const now = new Date().toISOString();
  return {
    createdAt: now,
    updatedAt: now
  };
};

const updateTimestamp = () => {
  return {
    updatedAt: new Date().toISOString()
  };
};

// Standardize player names to ensure consistent format for comparison
export const standardizePlayerName = (name: string): string => {
  if (!name || typeof name !== 'string') return name;
  
  // If the name is a special value, don't process it
  if (name.startsWith('any-') || name.startsWith('no-')) return name;
  
  // Trim whitespace, convert to lowercase for case-insensitive comparison
  let standardized = name.trim();
  
  // Handle spacing around initials (e.g., "A B de Villiers" -> "AB de Villiers")
  standardized = standardized.replace(/(\b[A-Z])(\s+)([A-Z]\b)/g, '$1$3');
  
  // Remove double spaces
  standardized = standardized.replace(/\s+/g, ' ');
  
  console.log(`Standardized player name: "${name}" -> "${standardized}"`);
  return standardized;
};

// Users Collection
export const getUser = async (userId: string): Promise<User | null> => {
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user:', error);
    throw error;
  }
};

export const createUser = async (userId: string, userData: Partial<User>): Promise<void> => {
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    await setDoc(userDocRef, {
      uid: userId,
      ...userData,
      ...createTimestamps()
    });
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, userData: Partial<User>): Promise<void> => {
  try {
    const userDocRef = doc(db, COLLECTIONS.USERS, userId);
    await updateDoc(userDocRef, {
      ...userData,
      ...updateTimestamp()
    });
  } catch (error) {
    console.error('Error updating user:', error);
    throw error;
  }
};

// Helper function to check and update match status based on date
const syncMatchStatusWithDate = (match: Match): Match => {
  // If match has results, it should be completed regardless of time
  if (match.result) {
    if (match.status !== 'completed') {
      console.log(`Auto-updating match ${match.id} status to 'completed' because results are present`);
      
      // Create a new match object with updated status
      const updatedMatch = {
        ...match,
        status: 'completed' as 'completed'
      };
      
      // Try to update in Firestore (don't await to avoid blocking)
      updateMatch(match.id, { status: 'completed' })
        .then(() => console.log(`Successfully updated match ${match.id} status to 'completed' in database`))
        .catch(error => console.error(`Failed to update match ${match.id} status:`, error));
      
      return updatedMatch;
    }
    return match;
  }
  
  // Skip if match is already completed
  if (match.status === 'completed') {
    return match;
  }
  
  // Parse the match date
  let matchDate: Date;
  try {
    if (typeof match.date === 'string') {
      matchDate = new Date(match.date);
    } else if (match.date && typeof match.date.toDate === 'function') {
      matchDate = match.date.toDate();
    } else {
      console.error('Invalid match date format:', match.date);
      return match; // Return unchanged if we can't parse the date
    }
  } catch (error) {
    console.error('Error parsing match date:', error);
    return match; // Return unchanged if error
  }
  
  const now = new Date();
  
  // Calculate 5 hours after match time
  const fiveHoursAfterMatch = new Date(matchDate.getTime() + (5 * 60 * 60 * 1000));
  
  // If match time has passed but it's not 5 hours after yet, set to 'live'
  if (matchDate <= now && now < fiveHoursAfterMatch && match.status === 'upcoming') {
    console.log(`Auto-updating match ${match.id} status to 'live' because match time has passed`);
    
    // Create a new match object with updated status
    const updatedMatch = {
      ...match,
      status: 'live' as 'live'
    };
    
    // Try to update in Firestore (don't await to avoid blocking)
    updateMatch(match.id, { status: 'live' })
      .then(() => console.log(`Successfully updated match ${match.id} status to 'live' in database`))
      .catch(error => console.error(`Failed to update match ${match.id} status:`, error));
    
    return updatedMatch;
  }
  
  // If it's more than 5 hours after match time and status is still 'live' or 'upcoming', update to 'completed'
  if (now >= fiveHoursAfterMatch && (match.status === 'live' || match.status === 'upcoming')) {
    console.log(`Auto-updating match ${match.id} status to 'completed' because it's 5 hours after match time`);
    
    // Create a new match object with updated status
    const updatedMatch = {
      ...match,
      status: 'completed' as 'completed'
    };
    
    // Try to update in Firestore (don't await to avoid blocking)
    updateMatch(match.id, { status: 'completed' })
      .then(() => console.log(`Successfully updated match ${match.id} status to 'completed' in database`))
      .catch(error => console.error(`Failed to update match ${match.id} status:`, error));
    
    return updatedMatch;
  }
  
  return match;
};

// Matches Collection
export const getMatches = async (): Promise<Match[]> => {
  try {
    const matchesQuery = query(
      collection(db, COLLECTIONS.MATCHES),
      orderBy('date', 'asc')
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Match[];
    
    // Auto-update match status based on date
    return matches.map(match => syncMatchStatusWithDate(match));
  } catch (error) {
    console.error('Error getting matches:', error);
    throw error;
  }
};

export const getUpcomingMatches = async (): Promise<Match[]> => {
  try {
    const now = new Date();
    const matchesQuery = query(
      collection(db, COLLECTIONS.MATCHES),
      where('status', '==', 'upcoming'),
      orderBy('date', 'asc')
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    const matches = matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Match[];
    
    // Filter matches that truly haven't happened yet
    // (this is needed because the query might return matches with upcoming status whose time has actually passed)
    return matches
      .map(match => syncMatchStatusWithDate(match))
      .filter(match => match.status === 'upcoming');
  } catch (error) {
    console.error('Error getting upcoming matches:', error);
    throw error;
  }
};

export const getMatch = async (matchId: string): Promise<Match | null> => {
  try {
    console.log('Attempting to fetch match with ID:', matchId);
    const matchDocRef = doc(db, COLLECTIONS.MATCHES, matchId);
    console.log('Firestore reference created for collection:', COLLECTIONS.MATCHES);
    
    const matchDoc = await getDoc(matchDocRef);
    console.log('Firestore response received. Document exists:', matchDoc.exists());
    
    if (matchDoc.exists()) {
      const data = matchDoc.data();
      console.log('Match data retrieved:', data);
      return {
        id: matchDoc.id,
        ...data
      } as Match;
    }
    
    console.log('No match found with ID:', matchId);
    return null;
  } catch (error: any) {
    console.error('Error getting match:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    // Enhance error message with more specific information
    if (error.code === 'permission-denied') {
      console.warn('User does not have permission to access this match data. Check Firestore rules.');
      error.message = 'You do not have permission to view this match. Please sign in or contact the administrator.';
    }
    
    throw error;
  }
};

export const createMatch = async (matchData: Omit<Match, 'id'>): Promise<string> => {
  try {
    const matchesCollectionRef = collection(db, COLLECTIONS.MATCHES);
    const newMatchRef = doc(matchesCollectionRef);
    
    await setDoc(newMatchRef, {
      ...matchData,
      ...createTimestamps()
    });
    
    return newMatchRef.id;
  } catch (error) {
    console.error('Error creating match:', error);
    throw error;
  }
};

export const updateMatch = async (matchId: string, matchData: Partial<Match>): Promise<void> => {
  try {
    const matchDocRef = doc(db, COLLECTIONS.MATCHES, matchId);
    await updateDoc(matchDocRef, {
      ...matchData,
      ...updateTimestamp()
    });
  } catch (error) {
    console.error('Error updating match:', error);
    throw error;
  }
};

// Poll Questions Collection
export const getPollQuestions = async (matchId: string): Promise<PollQuestion[]> => {
  try {
    const pollQuestionsQuery = query(
      collection(db, COLLECTIONS.POLL_QUESTIONS),
      where('matchId', '==', matchId)
    );
    
    const pollQuestionsSnapshot = await getDocs(pollQuestionsQuery);
    return pollQuestionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PollQuestion[];
  } catch (error) {
    console.error('Error getting poll questions:', error);
    throw error;
  }
};

export const createPollQuestion = async (pollQuestionData: Omit<PollQuestion, 'id'>): Promise<string> => {
  try {
    const pollQuestionsCollectionRef = collection(db, COLLECTIONS.POLL_QUESTIONS);
    const newPollQuestionRef = doc(pollQuestionsCollectionRef);
    
    await setDoc(newPollQuestionRef, {
      ...pollQuestionData,
      ...createTimestamps()
    });
    
    return newPollQuestionRef.id;
  } catch (error) {
    console.error('Error creating poll question:', error);
    throw error;
  }
};

// Prediction Game Collection
export const getUserPredictions = async (userId: string): Promise<PredictionGame[]> => {
  try {
    const predictionsQuery = query(
      collection(db, COLLECTIONS.PREDICTION_GAME),
      where('user', '==', userId)
    );
    
    const predictionsSnapshot = await getDocs(predictionsQuery);
    return predictionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionGame[];
  } catch (error) {
    console.error('Error getting user predictions:', error);
    throw error;
  }
};

export const getMatchPredictions = async (matchId: string): Promise<PredictionGame[]> => {
  try {
    const predictionsQuery = query(
      collection(db, COLLECTIONS.PREDICTION_GAME),
      where('matchId', '==', matchId)
    );
    
    const predictionsSnapshot = await getDocs(predictionsQuery);
    return predictionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as PredictionGame[];
  } catch (error) {
    console.error('Error getting match predictions:', error);
    throw error;
  }
};

/**
 * Helper function to check if a match is within the 24-hour prediction window
 * This provides server-side validation in addition to Firestore security rules
 */
export const isMatchWithinPredictionWindow = async (matchId: string): Promise<boolean> => {
  try {
    // Get the match document
    const matchRef = doc(db, 'matches', matchId);
    const matchSnap = await getDoc(matchRef);
    
    if (!matchSnap.exists()) {
      console.error(`Match ${matchId} not found`);
      return false;
    }
    
    const matchData = matchSnap.data();
    
    // Convert match date to a Date object
    const matchDate = matchData.date instanceof Timestamp 
      ? matchData.date.toDate() 
      : new Date(matchData.date);
    
    // Get current date/time
    const now = new Date();
    
    // IMPORTANT: Always prevent predictions for matches that have already started or ended
    if (matchDate <= now || matchData.status === 'live' || matchData.status === 'completed') {
      console.log(`Match ${matchId} has already started or ended. Predictions not allowed.`);
      return false;
    }
    
    // Check if match status is upcoming
    if (matchData.status !== 'upcoming') {
      return false;
    }
    
    // Check if admin has enabled predictions for this match regardless of time window
    if (matchData.isPredictionEnabledByAdmin === true) {
      return true; // Admin override, but we've already checked the match hasn't started
    }
    
    // Calculate time difference in milliseconds and convert to hours
    const timeDifferenceMs = matchDate.getTime() - now.getTime();
    const timeDifferenceHours = timeDifferenceMs / (1000 * 60 * 60);
    
    // Return true if match is less than 24 hours away and in the future
    return timeDifferenceHours > 0 && timeDifferenceHours <= 24;
  } catch (error) {
    console.error('Error checking if match is within prediction window:', error);
    return false;
  }
};

/**
 * Create a new prediction for a match
 */
export const createPrediction = async (predictionData: Omit<PredictionGame, 'id'>): Promise<string> => {
  try {
    // Server-side validation to ensure match is within prediction window
    const isWithinWindow = await isMatchWithinPredictionWindow(predictionData.matchId);
    if (!isWithinWindow) {
      throw new Error('Predictions are only allowed within 24 hours of the match start time');
    }
    
    const predictionRef = doc(collection(db, 'predictionGames'));
    const id = predictionRef.id;
    const timestampsData = createTimestamps();
    
    await setDoc(predictionRef, {
      id,
      ...predictionData,
      ...timestampsData
    });
    
    return id;
  } catch (error) {
    console.error('Error creating prediction:', error);
    throw error;
  }
};

// Leaderboard Collection
export const getLeaderboard = async (limitCount = 100): Promise<LeaderboardEntry[]> => {
  try {
    const leaderboardQuery = query(
      collection(db, COLLECTIONS.LEADERBOARD),
      orderBy('points', 'desc'),
      firestoreLimit(limitCount)
    );
    
    const leaderboardSnapshot = await getDocs(leaderboardQuery);
    return leaderboardSnapshot.docs.map((doc, index) => ({
      id: doc.id,
      ...doc.data(),
      rank: index + 1
    })) as LeaderboardEntry[];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    throw error;
  }
};

export const updateLeaderboardEntry = async (userId: string, points: number): Promise<void> => {
  try {
    const leaderboardDocRef = doc(db, COLLECTIONS.LEADERBOARD, userId);
    const leaderboardDoc = await getDoc(leaderboardDocRef);
    
    if (leaderboardDoc.exists()) {
      const currentData = leaderboardDoc.data() as LeaderboardEntry;
      await updateDoc(leaderboardDocRef, {
        points: currentData.points + points,
        gamesPlayed: (currentData.gamesPlayed || 0) + 1,
        ...updateTimestamp()
      });
    } else {
      // Get user data to include in leaderboard
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      const userData = userDoc.exists() ? userDoc.data() as User : null;
      
      await setDoc(leaderboardDocRef, {
        user: userId,
        displayName: userData?.displayName || '',
        points,
        gamesPlayed: 1,
        ...createTimestamps()
      });
    }
  } catch (error) {
    console.error('Error updating leaderboard entry:', error);
    throw error;
  }
};

// Squads Collection
export const getSquads = async (): Promise<Squad[]> => {
  try {
    const squadsCollectionRef = collection(db, COLLECTIONS.SQUADS);
    const squadsSnapshot = await getDocs(squadsCollectionRef);
    
    return squadsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Squad[];
  } catch (error) {
    console.error('Error getting squads:', error);
    throw error;
  }
};

export const getSquad = async (squadId: string): Promise<Squad | null> => {
  try {
    const squadDocRef = doc(db, COLLECTIONS.SQUADS, squadId);
    const squadDoc = await getDoc(squadDocRef);
    
    if (squadDoc.exists()) {
      return {
        id: squadDoc.id,
        ...squadDoc.data()
      } as Squad;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting squad:', error);
    throw error;
  }
};

export const createSquad = async (squadData: Omit<Squad, 'id'>): Promise<string> => {
  try {
    // Use team name (with spaces removed and lowercase) as the document ID
    const docId = squadData.team.toLowerCase().replace(/\s+/g, '');
    const squadDocRef = doc(db, COLLECTIONS.SQUADS, docId);
    
    await setDoc(squadDocRef, {
      ...squadData,
      ...createTimestamps()
    });
    
    return docId;
  } catch (error) {
    console.error('Error creating squad:', error);
    throw error;
  }
};

export const updateSquad = async (squadId: string, squadData: Partial<Squad>): Promise<void> => {
  try {
    const squadDocRef = doc(db, COLLECTIONS.SQUADS, squadId);
    await updateDoc(squadDocRef, {
      ...squadData,
      ...updateTimestamp()
    });
  } catch (error) {
    console.error('Error updating squad:', error);
    throw error;
  }
};

export const deleteSquad = async (squadId: string): Promise<void> => {
  try {
    const squadDocRef = doc(db, COLLECTIONS.SQUADS, squadId);
    await deleteDoc(squadDocRef);
  } catch (error) {
    console.error('Error deleting squad:', error);
    throw error;
  }
};

// Add this function after the collection names
export const seedInitialData = async () => {
  try {
    console.log('Checking if database needs seeding...');
    const matchesSnapshot = await getDocs(collection(db, COLLECTIONS.MATCHES));
    const squadsSnapshot = await getDocs(collection(db, COLLECTIONS.SQUADS));
    
    let dataSeeded = false;
    const batch = writeBatch(db);
    
    if (matchesSnapshot.empty) {
      console.log('Matches collection is empty, seeding initial match data...');
      
      // Add some sample matches
      const sampleMatches = [
        {
          id: 'match1',
          team1: 'Mumbai Indians',
          team2: 'Chennai Super Kings',
          venue: 'Wankhede Stadium, Mumbai',
          date: new Date('2024-03-24T14:00:00Z'),
          status: 'upcoming'
        },
        {
          id: 'match2',
          team1: 'Royal Challengers Bangalore',
          team2: 'Kolkata Knight Riders',
          venue: 'M. Chinnaswamy Stadium, Bangalore',
          date: new Date('2024-03-25T14:00:00Z'),
          status: 'upcoming'
        },
        {
          id: 'match3',
          team1: 'Delhi Capitals',
          team2: 'Lucknow Super Giants',
          venue: 'Arun Jaitley Stadium, Delhi',
          date: new Date('2024-03-26T14:00:00Z'),
          status: 'upcoming'
        }
      ];
      
      sampleMatches.forEach(match => {
        const matchRef = doc(db, COLLECTIONS.MATCHES, match.id);
        batch.set(matchRef, match);
      });
      
      dataSeeded = true;
    } else {
      console.log('Matches collection already contains data');
    }
    
    // Check if squads collection is empty and seed sample squad data
    if (squadsSnapshot.empty) {
      console.log('Squads collection is empty, seeding initial squad data...');
      
      // Sample squad data for Mumbai Indians (ID: mumbaiindians)
      const mumbaiIndians = {
        team: 'Mumbai Indians',
        squad: [
          { name: 'Rohit Sharma', role: 'Batsman', age: '35' },
          { name: 'Jasprit Bumrah', role: 'Bowler', age: '29' },
          { name: 'Hardik Pandya', role: 'All-rounder', age: '29' },
          { name: 'Suryakumar Yadav', role: 'Batsman', age: '32' },
          { name: 'Ishan Kishan', role: 'Wicket-keeper', age: '24' },
          { name: 'Arjun Tendulkar', role: 'Bowler', age: '23' },
          { name: 'Kumar Kartikeya', role: 'Bowler', age: '24' },
          { name: 'Tilak Varma', role: 'Batsman', age: '20' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Sample squad data for Chennai Super Kings (ID: chennaisuperkings)
      const chennaiSuperKings = {
        team: 'Chennai Super Kings',
        squad: [
          { name: 'MS Dhoni', role: 'Wicket-keeper', age: '41' },
          { name: 'Ravindra Jadeja', role: 'All-rounder', age: '34' },
          { name: 'Ruturaj Gaikwad', role: 'Batsman', age: '26' },
          { name: 'Deepak Chahar', role: 'Bowler', age: '30' },
          { name: 'Moeen Ali', role: 'All-rounder', age: '35' },
          { name: 'Shivam Dube', role: 'All-rounder', age: '29' },
          { name: 'Mitchell Santner', role: 'Bowler', age: '31' },
          { name: 'Tushar Deshpande', role: 'Bowler', age: '28' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Sample squad data for RCB (ID: royalchallengersbangalore)
      const rcb = {
        team: 'Royal Challengers Bangalore',
        squad: [
          { name: 'Virat Kohli', role: 'Batsman', age: '34' },
          { name: 'Glenn Maxwell', role: 'All-rounder', age: '34' },
          { name: 'Mohammed Siraj', role: 'Bowler', age: '29' },
          { name: 'Faf du Plessis', role: 'Batsman', age: '38' },
          { name: 'Wanindu Hasaranga', role: 'Bowler', age: '25' },
          { name: 'Harshal Patel', role: 'Bowler', age: '32' },
          { name: 'Dinesh Karthik', role: 'Wicket-keeper', age: '37' },
          { name: 'Shahbaz Ahmed', role: 'All-rounder', age: '28' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Sample squad data for KKR (ID: kolkataknightriders)
      const kkr = {
        team: 'Kolkata Knight Riders',
        squad: [
          { name: 'Shreyas Iyer', role: 'Batsman', age: '28' },
          { name: 'Andre Russell', role: 'All-rounder', age: '35' },
          { name: 'Sunil Narine', role: 'All-rounder', age: '35' },
          { name: 'Venkatesh Iyer', role: 'All-rounder', age: '28' },
          { name: 'Umesh Yadav', role: 'Bowler', age: '35' },
          { name: 'Tim Southee', role: 'Bowler', age: '34' },
          { name: 'Varun Chakravarthy', role: 'Bowler', age: '31' },
          { name: 'Lockie Ferguson', role: 'Bowler', age: '31' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Sample squad data for Delhi Capitals (ID: delhicapitals)
      const dc = {
        team: 'Delhi Capitals',
        squad: [
          { name: 'Rishabh Pant', role: 'Wicket-keeper', age: '25' },
          { name: 'Axar Patel', role: 'All-rounder', age: '29' },
          { name: 'Prithvi Shaw', role: 'Batsman', age: '23' },
          { name: 'Anrich Nortje', role: 'Bowler', age: '29' },
          { name: 'Kuldeep Yadav', role: 'Bowler', age: '28' },
          { name: 'Mitchell Marsh', role: 'All-rounder', age: '31' },
          { name: 'David Warner', role: 'Batsman', age: '36' },
          { name: 'Rovman Powell', role: 'Batsman', age: '29' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Sample squad data for Lucknow Super Giants (ID: lucknowsupergiants)
      const lsg = {
        team: 'Lucknow Super Giants',
        squad: [
          { name: 'KL Rahul', role: 'Batsman', age: '31' },
          { name: 'Nicholas Pooran', role: 'Wicket-keeper', age: '27' },
          { name: 'Krunal Pandya', role: 'All-rounder', age: '32' },
          { name: 'Marcus Stoinis', role: 'All-rounder', age: '33' },
          { name: 'Deepak Hooda', role: 'All-rounder', age: '28' },
          { name: 'Ravi Bishnoi', role: 'Bowler', age: '23' },
          { name: 'Mohsin Khan', role: 'Bowler', age: '24' },
          { name: 'Avesh Khan', role: 'Bowler', age: '26' }
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      // Create squad document with an ID based on the team name
      const miDocId = mumbaiIndians.team.toLowerCase().replace(/\s+/g, '');
      const cskDocId = chennaiSuperKings.team.toLowerCase().replace(/\s+/g, '');
      const rcbDocId = rcb.team.toLowerCase().replace(/\s+/g, '');
      const kkrDocId = kkr.team.toLowerCase().replace(/\s+/g, '');
      const dcDocId = dc.team.toLowerCase().replace(/\s+/g, '');
      const lsgDocId = lsg.team.toLowerCase().replace(/\s+/g, '');
      
      batch.set(doc(db, COLLECTIONS.SQUADS, miDocId), mumbaiIndians);
      batch.set(doc(db, COLLECTIONS.SQUADS, cskDocId), chennaiSuperKings);
      batch.set(doc(db, COLLECTIONS.SQUADS, rcbDocId), rcb);
      batch.set(doc(db, COLLECTIONS.SQUADS, kkrDocId), kkr);
      batch.set(doc(db, COLLECTIONS.SQUADS, dcDocId), dc);
      batch.set(doc(db, COLLECTIONS.SQUADS, lsgDocId), lsg);
      
      dataSeeded = true;
    } else {
      console.log('Squads collection already contains data');
    }
    
    if (dataSeeded) {
      await batch.commit();
      console.log('Initial data seeded successfully');
      return true;
    } else {
      console.log('Database already contains all required data, skipping seeding');
      return false;
    }
  } catch (error) {
    console.error('Error seeding initial data:', error);
    throw error;
  }
};

// Add this function to the file
export const seedQuestionsIfNeeded = async () => {
  try {
    console.log('Checking if questions need to be seeded...');
    const questionsCollection = collection(db, 'questions');
    const questionsSnapshot = await getDocs(questionsCollection);
    
    let dataSeeded = false;
    const batch = writeBatch(db);
    
    if (questionsSnapshot.empty) {
      console.log('Questions collection is empty, seeding standard questions...');
      
      // Add standard prediction questions
      const standardQuestions = [
        {
          id: 'winner',
          text: 'Which team will win this match?',
          type: 'winner',
          points: 10,
          negativePoints: 3, // Store as positive value, will be applied as negative
          isActive: true
        },
        {
          id: 'top-batsman',
          text: 'Who will be the top batsman in this match?',
          type: 'topBatsman',
          points: 15,
          negativePoints: 5, // Store as positive value, will be applied as negative
          isActive: true
        },
        {
          id: 'top-bowler',
          text: 'Who will be the top bowler in this match?',
          type: 'topBowler',
          points: 15,
          negativePoints: 5, // Store as positive value, will be applied as negative
          isActive: true
        },
        {
          id: 'highest-total',
          text: 'Will the match total exceed 350 runs?',
          type: 'highestTotal',
          points: 10,
          negativePoints: 3, // Store as positive value, will be applied as negative
          isActive: true
        },
        {
          id: 'more-sixes',
          text: 'Which team will hit more sixes?',
          type: 'moreSixes',
          points: 10,
          negativePoints: 3, // Store as positive value, will be applied as negative
          isActive: true
        },
        {
          id: 'total-sixes',
          text: 'How many sixes will be hit in this match?',
          type: 'totalSixes',
          options: [
            { id: 'range1', value: '12-17', label: '12-17 sixes' },
            { id: 'range2', value: '17-22', label: '17-22 sixes' },
            { id: 'range3', value: '22-37', label: '22-37 sixes' },
            { id: 'range4', value: '37-42', label: '37-42 sixes' }
          ],
          points: 15,
          negativePoints: 5, // Store as positive value, will be applied as negative
          isActive: true
        }
      ];
      
      standardQuestions.forEach(question => {
        const questionRef = doc(questionsCollection, question.id);
        batch.set(questionRef, question);
      });
      
      dataSeeded = true;
    } else {
      // Check if highest-total question exists
      const highestTotalQuery = query(
        questionsCollection, 
        where('type', '==', 'highestTotal')
      );
      const highestTotalSnapshot = await getDocs(highestTotalQuery);
      
      if (highestTotalSnapshot.empty) {
        console.log('Adding highest total question...');
        const highestTotalQuestion = {
          text: 'What will be the highest total of this match?',
          type: 'highestTotal',
          points: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const questionRef = doc(questionsCollection, 'highest-total');
        batch.set(questionRef, highestTotalQuestion);
        dataSeeded = true;
      }
      
      // Check if more-sixes question exists
      const moreSixesQuery = query(
        questionsCollection, 
        where('type', '==', 'moreSixes')
      );
      const moreSixesSnapshot = await getDocs(moreSixesQuery);
      
      if (moreSixesSnapshot.empty) {
        console.log('Adding more sixes question...');
        const moreSixesQuestion = {
          text: 'Which team will hit more sixes?',
          type: 'moreSixes',
          points: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        const questionRef = doc(questionsCollection, 'more-sixes');
        batch.set(questionRef, moreSixesQuestion);
        dataSeeded = true;
      }
    }
    
    if (dataSeeded) {
      await batch.commit();
      console.log('Questions seeded successfully');
      return true;
    } else {
      console.log('Questions already exist, no seeding needed');
      return false;
    }
  } catch (error) {
    console.error('Error seeding questions:', error);
    throw error;
  }
};

// Match Results Collection
export const getMatchResult = async (matchId: string): Promise<MatchResult | null> => {
  try {
    // Query by matchId since the document ID may not match the matchId
    const matchResultsQuery = query(
      collection(db, COLLECTIONS.MATCH_RESULTS),
      where('matchId', '==', matchId)
    );
    
    const matchResultsSnapshot = await getDocs(matchResultsQuery);
    
    if (!matchResultsSnapshot.empty) {
      const doc = matchResultsSnapshot.docs[0]; // Get the first matching result
      return {
        id: doc.id,
        ...doc.data()
      } as MatchResult;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting match result:', error);
    throw error;
  }
};

export const saveMatchResult = async (
  matchId: string, 
  userId: string,
  resultData: Omit<MatchResult, 'id' | 'matchId' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<string> => {
  try {
    // Check if a result already exists
    const existingResult = await getMatchResult(matchId);
    
    if (existingResult) {
      // Update existing result
      const resultRef = doc(db, COLLECTIONS.MATCH_RESULTS, existingResult.id);
      
      await updateDoc(resultRef, {
        ...resultData,
        updatedAt: serverTimestamp()
      });
      
      return existingResult.id;
    } else {
      // Create new result
      const matchResultsCollectionRef = collection(db, COLLECTIONS.MATCH_RESULTS);
      const newResultRef = doc(matchResultsCollectionRef);
      
      await setDoc(newResultRef, {
        matchId,
        createdBy: userId,
        ...resultData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      return newResultRef.id;
    }
  } catch (error) {
    console.error('Error saving match result:', error);
    throw error;
  }
};

export const evaluateMatchPredictions = async (matchId: string): Promise<void> => {
  try {
    // Add logging to track evaluation process
    console.log(`Evaluating predictions for match: ${matchId}`);

    // Get the match result
    const result = await getMatchResult(matchId);
    
    if (!result) {
      console.error(`No match result found for ${matchId}`);
      throw new Error(`No match result found for match ${matchId}`);
    }
    
    // Get the match data
    const matchDoc = await getDoc(doc(db, COLLECTIONS.MATCHES, matchId));
    if (!matchDoc.exists()) {
      throw new Error(`Match ${matchId} not found`);
    }
    const match = matchDoc.data() as Match;
    
    console.log(`Match result retrieved:`, result);
    console.log(`Match data retrieved:`, match);
    console.log(`Prediction results:`, result.predictionResults);
    
    // Check if predictionResults exist
    if (!result.predictionResults || Object.keys(result.predictionResults).length === 0) {
      console.error(`No prediction results defined for match ${matchId}`);
      throw new Error(`No prediction results found for match ${matchId}`);
    }
    
    // First, load all questions to get their point values
    const questionsCollection = collection(db, COLLECTIONS.QUESTIONS);
    const questionsQuery = query(questionsCollection, where("isActive", "==", true));
    const questionsSnapshot = await getDocs(questionsQuery);
    const questionsMap = new Map();
    
    questionsSnapshot.forEach(doc => {
      const question = doc.data();
      questionsMap.set(doc.id, {
        id: doc.id,
        text: question.text,
        type: question.type,
        points: question.points || 10, // Default to 10 points if not specified
        negativePoints: question.negativePoints || 0, // Default to 0 if not specified (no penalty)
        isActive: question.isActive
      });
      
      // Also map by question type for easier lookup
      if (question.type) {
        questionsMap.set(question.type, {
          id: doc.id,
          text: question.text,
          type: question.type,
          points: question.points || 10,
          negativePoints: question.negativePoints || 0,
          isActive: question.isActive
        });
      }
    });
    
    console.log(`Loaded ${questionsMap.size} active questions for evaluation`);
    
    // Get team data for reference
    const team1Doc = await getDoc(doc(db, COLLECTIONS.TEAMS, match.team1));
    const team2Doc = await getDoc(doc(db, COLLECTIONS.TEAMS, match.team2));
    const team1 = team1Doc.exists() ? team1Doc.data() : { name: match.team1 };
    const team2 = team2Doc.exists() ? team2Doc.data() : { name: match.team2 };
    
    // Now let's evaluate predictions
    // Get all prediction answers for this match
    const predictionsCollection = collection(db, 'predictionAnswers');
    const predictionQuery = query(
      predictionsCollection,
      where('matchId', '==', matchId)
    );
    
    const predictionSnapshot = await getDocs(predictionQuery);
    console.log(`Found ${predictionSnapshot.size} prediction answers to evaluate`);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    // Track points by user to update profiles and leaderboards
    const userPointsMap: Record<string, {
      totalPoints: number,
      correctPredictions: number,
      totalPredictions: number
    }> = {};
    
    // Process each prediction answer
    for (const docSnapshot of predictionSnapshot.docs) {
      const prediction = docSnapshot.data();
      const { userId, questionId, answer: userAnswer } = prediction;
      
      // Initialize user in points map if not exists
      if (!userPointsMap[userId]) {
        userPointsMap[userId] = {
          totalPoints: 0,
          correctPredictions: 0,
          totalPredictions: 1
        };
      } else {
        userPointsMap[userId].totalPredictions++;
      }
      
      // Get the correct answer from predictionResults
      // First, standardize the question ID for lookup
      const standardQuestionId = questionId.toLowerCase().replace(/\s+/g, '-');
      
      // Look for the answer in predictionResults with different key formats
      let correctAnswer = result.predictionResults[questionId] || 
                         result.predictionResults[standardQuestionId] || 
                         result.predictionResults[`${matchId}-${standardQuestionId}`];
      
      // If not found but it's a standard question, try to get from direct fields
      if (correctAnswer === undefined) {
        if (standardQuestionId === 'winner') {
          correctAnswer = result.winner;
        } else if (standardQuestionId === 'top-batsman') {
          correctAnswer = result.topBatsmanId;
        } else if (standardQuestionId === 'top-bowler') {
          correctAnswer = result.topBowlerId;
        } else if (standardQuestionId === 'more-sixes') {
          correctAnswer = result.moreSixes;
        } else if (standardQuestionId === 'highest-total') {
          correctAnswer = result.highestTotal?.toString();
        }
      }
            
      // Skip evaluation if no correct answer found
      if (correctAnswer === undefined) {
        console.log(`No correct answer found for question: ${questionId}, skipping evaluation`);
        continue;
      }
      
      // Get question details from our loaded questions map
      const question = questionsMap.get(standardQuestionId) || 
                      questionsMap.get(questionId) || 
                      questionsMap.get(questionId.toLowerCase()) || 
                      { id: questionId, points: 10, negativePoints: 0, type: 'unknown' };
      
      const questionPoints = question.points || 10;
      const negativePoints = question.negativePoints || 0;
      const questionType = question.type || standardQuestionId;
      
      console.log(`Evaluating question: ${questionType} (ID: ${questionId})`);
      console.log(`Points for correct answer: ${questionPoints}, negative points: ${negativePoints}`);
      console.log(`User answer: ${userAnswer}, Correct answer: ${correctAnswer}`);
      
      let isCorrect = false;
      let pointsEarned = 0;
      
      // Only evaluate if user provided an answer
      if (userAnswer) {
        // Evaluate based on question type with simplified logic
        if (questionType === 'winner') {
          // Simple exact match for winner
          isCorrect = userAnswer === correctAnswer;
        } 
        else if (questionType === 'topBatsman') {
          // Normalize player names for comparison
          const standardizedUserAnswer = standardizePlayerName(userAnswer);
          const standardizedCorrectAnswer = standardizePlayerName(correctAnswer);
          isCorrect = standardizedUserAnswer === standardizedCorrectAnswer;
        } 
        else if (questionType === 'topBowler') {
          // Normalize player names for comparison
          const standardizedUserAnswer = standardizePlayerName(userAnswer);
          const standardizedCorrectAnswer = standardizePlayerName(correctAnswer);
          isCorrect = standardizedUserAnswer === standardizedCorrectAnswer;
        }
        else if (questionType === 'moreSixes') {
          // Simple exact match for team with more sixes
          isCorrect = userAnswer === correctAnswer;
        }
        else if (questionType === 'totalSixes') {
          // Handle range-based sixes evaluation
          const actualSixes = parseInt(correctAnswer?.toString() || '0');
          
          // User answer is in the format "X-Y" (e.g., "12-17")
          const userRange = userAnswer.split('-');
          if (userRange.length === 2) {
            const minSixes = parseInt(userRange[0]);
            const maxSixes = parseInt(userRange[1]);
            
            // Check if the actual number falls within the user's selected range
            isCorrect = actualSixes >= minSixes && actualSixes <= maxSixes;
          } else {
            console.log(`Invalid total sixes answer format: ${userAnswer}`);
            isCorrect = false;
          }
        }
        else if (questionType === 'highestTotal') {
          // For "Will total exceed X?" questions
          let actualExceeded = false;
          
          // Handle different formats of the correct answer
          if (typeof correctAnswer === 'number' || !isNaN(parseInt(correctAnswer as string))) {
            const actualTotal = parseInt(correctAnswer?.toString() || '0');
            const defaultThreshold = 350;
            actualExceeded = actualTotal > defaultThreshold;
          } else if (typeof correctAnswer === 'string') {
            const answerLower = correctAnswer.toLowerCase();
            actualExceeded = answerLower === 'yes' || answerLower === 'true';
          }
          
          const userPrediction = userAnswer.toLowerCase();
          const userPredictedExceeded = userPrediction === 'yes' || userPrediction === 'true';
          
          isCorrect = userPredictedExceeded === actualExceeded;
        } 
        else {
          // For any other question type, use simple exact match
          isCorrect = userAnswer === correctAnswer;
        }
        
        // Calculate points - award positive points if correct, deduct negative points if wrong
        pointsEarned = isCorrect ? questionPoints : -negativePoints;
      } else {
        // If no answer provided, set isCorrect to false but don't deduct points
        isCorrect = false;
        pointsEarned = 0;
      }
      
      // Update the prediction answer document
      batch.update(docSnapshot.ref, {
        isCorrect,
        pointsEarned,
        evaluatedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      
      updateCount++;
      
      // Update user points
      userPointsMap[userId].totalPoints += pointsEarned;
      if (isCorrect) {
        userPointsMap[userId].correctPredictions++;
      }
      
      console.log(`Evaluated prediction for user ${userId}: Question: ${questionId}, IsCorrect: ${isCorrect}, Points: ${pointsEarned}`);
    }
    
    // Commit all prediction updates
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Updated ${updateCount} predictions`);
      
      // Update match result to mark as evaluated
      const resultRef = doc(db, COLLECTIONS.MATCH_RESULTS, result.id);
      await updateDoc(resultRef, {
        isEvaluated: true,
        evaluatedAt: serverTimestamp()
      });
      
      // Update match leaderboard
      await createMatchLeaderboard(matchId, userPointsMap);
      
      // Update global leaderboard for each user
      for (const userId of Object.keys(userPointsMap)) {
        await updateGlobalLeaderboard(userId, matchId);
      }
    }
    
    console.log('Prediction evaluation completed successfully');
  } catch (error) {
    console.error('Error evaluating predictions:', error);
    throw error;
  }
};

// Helper function to create or update match-specific leaderboard
const createMatchLeaderboard = async (
  matchId: string, 
  userPointsMap: Record<string, {
    totalPoints: number,
    correctPredictions: number,
    totalPredictions: number
  }>
) => {
  try {
    // Create leaderboard document in leaderboards collection
    const leaderboardsRef = collection(db, 'leaderboards');
    const leaderboardQuery = query(
      leaderboardsRef,
      where('matchId', '==', matchId),
      where('type', '==', 'match')
    );
    
    const leaderboardSnapshot = await getDocs(leaderboardQuery);
    let leaderboardId: string;
    
    // Check if leaderboard already exists
    if (leaderboardSnapshot.empty) {
      // Create new leaderboard
      const newLeaderboardRef = doc(leaderboardsRef);
      leaderboardId = newLeaderboardRef.id;
      
      await setDoc(newLeaderboardRef, {
        id: leaderboardId,
        matchId,
        type: 'match',
        title: `Match ${matchId} Leaderboard`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Use existing leaderboard
      leaderboardId = leaderboardSnapshot.docs[0].id;
    }
    
    // Add entries to the leaderboard
    const batch = writeBatch(db);
    
    for (const [userId, stats] of Object.entries(userPointsMap)) {
      // Get user data
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Create entry in the leaderboard entries subcollection
        const entryRef = doc(db, 'leaderboards', leaderboardId, 'entries', userId);
        
        batch.set(entryRef, {
          userId,
          displayName: userData.displayName || 'Anonymous User',
          photoURL: userData.photoURL,
          points: stats.totalPoints,
          correctPredictions: stats.correctPredictions,
          totalPredictions: stats.totalPredictions,
          accuracy: stats.totalPredictions > 0 
            ? Math.round((stats.correctPredictions / stats.totalPredictions) * 100) 
            : 0,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    }
    
    await batch.commit();
    console.log(`Updated leaderboard for match ${matchId}`);
    
    return leaderboardId;
  } catch (error) {
    console.error('Error creating match leaderboard:', error);
    throw error;
  }
};

// Modify the existing updateMatch function to also update match results
export const updateMatchWithResults = async (
  matchId: string, 
  userId: string,
  matchData: Partial<Match>,
  resultData: Omit<MatchResult, 'id' | 'matchId' | 'createdBy' | 'createdAt' | 'updatedAt'>
): Promise<void> => {
  try {
    // First update the match - always set status to completed when results are added
    const matchDocRef = doc(db, COLLECTIONS.MATCHES, matchId);
    await updateDoc(matchDocRef, {
      ...matchData,
      status: 'completed', // Force status to completed when results are added
      ...updateTimestamp()
    });
    
    // Then save the detailed result
    await saveMatchResult(matchId, userId, resultData);
  } catch (error) {
    console.error('Error updating match with results:', error);
    throw error;
  }
};

/**
 * Delete the match result document for a match
 * @param matchId The ID of the match
 * @returns A promise that resolves when the operation is complete
 */
export const resetMatchResult = async (matchId: string): Promise<void> => {
  try {
    // Get the match result document
    const result = await getMatchResult(matchId);
    
    if (result) {
      // Delete the match result document
      const resultRef = doc(db, COLLECTIONS.MATCH_RESULTS, result.id);
      await deleteDoc(resultRef);
      console.log(`Match result deleted for match: ${matchId}`);
    } else {
      console.log(`No match result found for match: ${matchId}`);
    }
  } catch (error) {
    console.error('Error resetting match result:', error);
    throw error;
  }
};

/**
 * Reset all prediction answers for a match
 * This deletes all prediction answers and resets points for users
 * @param matchId The ID of the match
 * @returns A promise that resolves when the operation is complete
 */
export const resetMatchPredictions = async (matchId: string): Promise<void> => {
  try {
    // 1. Get all prediction answers for this match
    const answersCollection = collection(db, 'predictionAnswers');
    const answersQuery = query(
      answersCollection,
      where('matchId', '==', matchId)
    );
    
    const answersSnapshot = await getDocs(answersQuery);
    
    if (answersSnapshot.empty) {
      console.log(`No prediction answers found for match: ${matchId}`);
      return;
    }
    
    // 2. Track affected users and their points to reset
    const userPointsMap: Record<string, {
      pointsToDeduct: number, 
      correctToDeduct: number, 
      totalToDeduct: number
    }> = {};
    
    // 3. Gather information about which user points to adjust
    answersSnapshot.forEach((docSnapshot) => {
      const answer = docSnapshot.data();
      const userId = answer.userId;
      
      // Only process answers that have been evaluated
      if (answer.isCorrect !== undefined && answer.pointsEarned !== undefined) {
        // Initialize user stats if not already tracked
        if (!userPointsMap[userId]) {
          userPointsMap[userId] = {
            pointsToDeduct: 0,
            correctToDeduct: 0,
            totalToDeduct: 0
          };
        }
        
        // Handle both positive and negative points now
        const pointsEarned = answer.pointsEarned || 0;
        
        // For correct answers, we need to deduct positive points
        // For incorrect answers with negative points, we need to add those points back
        userPointsMap[userId].pointsToDeduct += pointsEarned;
        
        // Only count as correct if it was actually correct
        if (answer.isCorrect) {
          userPointsMap[userId].correctToDeduct += 1;
        }
        
        // Increment total predictions count
        userPointsMap[userId].totalToDeduct += 1;
      }
    });
    
    // 4. Delete all prediction answers for this match in batches
    const deleteBatch = writeBatch(db);
    let deleteCount = 0;
    
    answersSnapshot.forEach((docSnapshot) => {
      deleteBatch.delete(docSnapshot.ref);
      deleteCount++;
      
      // Commit in batches of 500 to avoid exceeding Firestore limits
      if (deleteCount >= 500) {
        deleteBatch.commit();
        deleteCount = 0;
      }
    });
    
    // Commit any remaining deletes
    if (deleteCount > 0) {
      await deleteBatch.commit();
    }
    
    // 5. Update user totals to remove points from reset match
    if (Object.keys(userPointsMap).length > 0) {
      const userBatch = writeBatch(db);
      
      for (const [userId, stats] of Object.entries(userPointsMap)) {
        const userRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // Calculate new values (ensure we don't go below 0)
          const newTotalPoints = Math.max(0, (userData.totalPoints || 0) - stats.pointsToDeduct);
          const newWeeklyPoints = Math.max(0, (userData.weeklyPoints || 0) - stats.pointsToDeduct);
          const newCorrectPredictions = Math.max(0, (userData.correctPredictions || 0) - stats.correctToDeduct);
          const newTotalPredictions = Math.max(0, (userData.totalPredictions || 0) - stats.totalToDeduct);
          
          // Calculate new accuracy or default to 0 if no predictions
          const newOverallAccuracy = newTotalPredictions > 0 
            ? Math.round((newCorrectPredictions / newTotalPredictions) * 100)
            : 0;
          
          // Update user document with adjusted stats
          userBatch.update(userRef, {
            totalPoints: newTotalPoints,
            weeklyPoints: newWeeklyPoints,
            correctPredictions: newCorrectPredictions,
            totalPredictions: newTotalPredictions,
            overallAccuracy: newOverallAccuracy,
            updatedAt: serverTimestamp()
          });
          
          // Log the updates being made for this user
          console.log(`Updating user ${userId} stats: deducting ${stats.pointsToDeduct} points, ${stats.correctToDeduct} correct predictions, ${stats.totalToDeduct} total predictions`);
        }
      }
      
      // Commit user updates
      await userBatch.commit();
      
      // 6. Update the global leaderboard for each affected user
      console.log(`Updating global leaderboard for ${Object.keys(userPointsMap).length} users`);
      
      // Process these sequentially to avoid conflicts
      for (const userId of Object.keys(userPointsMap)) {
        try {
          // Update the global leaderboard entry for this user
          await updateGlobalLeaderboard(userId, matchId);
          console.log(`Updated global leaderboard for user ${userId}`);
        } catch (error) {
          console.error(`Error updating global leaderboard for user ${userId}:`, error);
          // Continue with other users even if one fails
        }
      }
    }
    
    // 7. Delete match leaderboard if it exists
    const leaderboardsRef = collection(db, 'leaderboards');
    const leaderboardQuery = query(
      leaderboardsRef,
      where('matchId', '==', matchId),
      where('type', '==', 'match')
    );
    
    const leaderboardSnapshot = await getDocs(leaderboardQuery);
    
    if (!leaderboardSnapshot.empty) {
      const leaderboardId = leaderboardSnapshot.docs[0].id;
      
      // Get all entries in the leaderboard
      const entriesCollection = collection(db, 'leaderboards', leaderboardId, 'entries');
      const entriesSnapshot = await getDocs(entriesCollection);
      
      // Delete all entries
      if (!entriesSnapshot.empty) {
        const entriesBatch = writeBatch(db);
        let entryCount = 0;
        
        entriesSnapshot.forEach((docSnapshot) => {
          entriesBatch.delete(docSnapshot.ref);
          entryCount++;
          
          if (entryCount >= 500) {
            entriesBatch.commit();
            entryCount = 0;
          }
        });
        
        if (entryCount > 0) {
          await entriesBatch.commit();
        }
      }
      
      // Delete the leaderboard document
      await deleteDoc(doc(db, 'leaderboards', leaderboardId));
    }
    
    console.log(`Reset completed for match: ${matchId}`);
    
  } catch (error) {
    console.error('Error resetting match predictions:', error);
    throw error;
  }
};

// New function to ensure a squad exists for a team
export const ensureSquadExists = async (teamName: string): Promise<string> => {
  try {
    if (!teamName) {
      console.error('Team name is required to ensure squad exists');
      return '';
    }
    
    // Generate squad ID based on team name
    const squadId = teamName.toLowerCase().replace(/\s+/g, '');
    console.log(`Checking if squad exists for team: ${teamName} (ID: ${squadId})`);
    
    // Check if squad already exists
    const squadDocRef = doc(db, COLLECTIONS.SQUADS, squadId);
    const squadDoc = await getDoc(squadDocRef);
    
    if (squadDoc.exists()) {
      console.log(`Squad already exists for team: ${teamName}`);
      return squadId;
    }
    
    // Squad doesn't exist, create a default squad
    console.log(`Creating default squad for team: ${teamName}`);
    const defaultSquad = {
      team: teamName,
      squad: [
        { name: `${teamName} Player 1`, role: 'Batsman', age: '25' },
        { name: `${teamName} Player 2`, role: 'Batsman', age: '27' },
        { name: `${teamName} Player 3`, role: 'Bowler', age: '24' },
        { name: `${teamName} Player 4`, role: 'Bowler', age: '26' },
        { name: `${teamName} Player 5`, role: 'All-rounder', age: '28' },
        { name: `${teamName} Player 6`, role: 'All-rounder', age: '29' },
        { name: `${teamName} Player 7`, role: 'Wicket-keeper', age: '23' },
        { name: `${teamName} Player 8`, role: 'Batsman', age: '30' }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isAutoGenerated: true
    };
    
    await setDoc(squadDocRef, defaultSquad);
    console.log(`Created default squad for team: ${teamName}`);
    
    return squadId;
  } catch (error) {
    console.error(`Error ensuring squad exists for team: ${teamName}`, error);
    return '';
  }
};

export const updateGlobalLeaderboard = async (userId: string, matchId: string) => {
  try {
    const userRef = doc(db, COLLECTIONS.USERS, userId);
    const userData = await getDoc(userRef);
    
    if (!userData.exists()) {
      console.error(`User ${userId} not found`);
      return;
    }
    
    // Get all prediction answers for this user
    const answersQuery = query(
      collection(db, COLLECTIONS.ANSWERS),
      where("userId", "==", userId)
    );
    const answersSnapshot = await getDocs(answersQuery);
    
    // Calculate totals
    let totalPoints = 0;
    let correctPredictions = 0;
    let totalAnsweredQuestions = 0;
    const matchesWithAnswers = new Set<string>();  // Track matches where user actually answered
    
    answersSnapshot.forEach((doc) => {
      const answer = doc.data();
      if (answer.answer) {  // Only count if user actually submitted an answer
        totalPoints += answer.pointsEarned || 0;
        if (answer.isCorrect) correctPredictions++;
        totalAnsweredQuestions++;
        if (answer.matchId) matchesWithAnswers.add(answer.matchId);
      }
    });
    
    // Calculate accuracy only based on answered questions
    const accuracy = totalAnsweredQuestions > 0 ? Math.round((correctPredictions / totalAnsweredQuestions) * 100) : 0;
    
    // Update or create global leaderboard entry
    const globalLeaderboardRef = doc(db, COLLECTIONS.GLOBAL_LEADERBOARD, userId);
    await setDoc(globalLeaderboardRef, {
      userId,
      displayName: userData.data()?.displayName || "Anonymous User",
      photoURL: userData.data()?.photoURL,
      totalPoints,
      correctPredictions,
      totalPredictions: totalAnsweredQuestions,  // Only count answered questions
      accuracy,
      lastUpdated: serverTimestamp(),
      matchesPlayed: matchesWithAnswers.size  // Only count matches where user answered at least one question
    }, { merge: true });
    
  } catch (error) {
    console.error("Error updating global leaderboard:", error);
    throw error;
  }
};

export const savePredictionAnswer = async (answer: Omit<PredictionGame, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Server-side validation to ensure match is within prediction window
    const isWithinWindow = await isMatchWithinPredictionWindow(answer.matchId);
    if (!isWithinWindow) {
      throw new Error('Predictions are only allowed within 24 hours of the match start time');
    }
    
    const answersRef = doc(collection(db, 'predictionAnswers'));
    const id = answersRef.id;
    const timestampsData = createTimestamps();
    
    await setDoc(answersRef, {
      id,
      ...answer,
      ...timestampsData
    });
    
    return id;
  } catch (error) {
    console.error('Error saving prediction answer:', error);
    throw error;
  }
};

export const savePredictionAnswers = async (
  userId: string, 
  matchId: string, 
  predictionGameId: string, 
  answers: Record<string, string>
): Promise<string[]> => {
  try {
    // Server-side validation to ensure match is within prediction window
    const isWithinWindow = await isMatchWithinPredictionWindow(matchId);
    if (!isWithinWindow) {
      throw new Error('Predictions are only allowed within 24 hours of the match start time');
    }
    
    const batch = writeBatch(db);
    const answerIds: string[] = [];
    const predictionAnswersRef = collection(db, 'predictionAnswers');
    
    // Create new answer documents for each question
    for (const [questionId, answer] of Object.entries(answers)) {
      if (!answer) continue; // Skip empty answers
      
      const newAnswerRef = doc(predictionAnswersRef);
      const id = newAnswerRef.id;
      answerIds.push(id);
      
      batch.set(newAnswerRef, {
        id,
        userId,
        matchId,
        predictionGameId,
        questionId,
        answer,
        ...createTimestamps()
      });
    }
    
    await batch.commit();
    return answerIds;
  } catch (error) {
    console.error('Error saving prediction answers:', error);
    throw error;
  }
};

export const seedStandardQuestionsIfNeeded = async (): Promise<boolean> => {
  try {
    console.log('Checking for existing questions...');
    
    // Get all questions from the questions collection
    const questionsCollection = collection(db, COLLECTIONS.QUESTIONS);
    const questionsSnapshot = await getDocs(questionsCollection);
    
    // Check if we have any standard questions
    const hasStandardQuestions = questionsSnapshot.docs.some(doc => {
      const data = doc.data();
      return data.type && ['winner', 'topBatsman', 'topBowler', 'highestTotal', 'moreSixes', 'totalSixes'].includes(data.type);
    });
    
    if (hasStandardQuestions) {
      console.log('Standard questions already exist, skipping seed operation');
      return false;
    }
    
    console.log('No standard questions found, seeding default questions...');
    
    // Define standard questions with clear point values and negative points
    const standardQuestions = [
      {
        id: 'winner',
        text: 'Which team will win this match?',
        type: 'winner',
        points: 10,
        negativePoints: 3, // Store as positive value, will be applied as negative
        isActive: true
      },
      {
        id: 'top-batsman',
        text: 'Who will be the top batsman in this match?',
        type: 'topBatsman',
        points: 15,
        negativePoints: 5, // Store as positive value, will be applied as negative
        isActive: true
      },
      {
        id: 'top-bowler',
        text: 'Who will be the top bowler in this match?',
        type: 'topBowler',
        points: 15,
        negativePoints: 5, // Store as positive value, will be applied as negative
        isActive: true
      },
      {
        id: 'highest-total',
        text: 'Will the match total exceed 350 runs?',
        type: 'highestTotal',
        points: 10,
        negativePoints: 3, // Store as positive value, will be applied as negative
        isActive: true
      },
      {
        id: 'more-sixes',
        text: 'Which team will hit more sixes?',
        type: 'moreSixes',
        points: 10,
        negativePoints: 3, // Store as positive value, will be applied as negative
        isActive: true
      },
      {
        id: 'total-sixes',
        text: 'How many sixes will be hit in this match?',
        type: 'totalSixes',
        options: [
          { id: 'range1', value: '12-17', label: '12-17 sixes' },
          { id: 'range2', value: '17-22', label: '17-22 sixes' },
          { id: 'range3', value: '22-37', label: '22-37 sixes' },
          { id: 'range4', value: '37-42', label: '37-42 sixes' }
        ],
        points: 15,
        negativePoints: 5, // Store as positive value, will be applied as negative
        isActive: true
      }
    ];
    
    // Create batch write
    const batch = writeBatch(db);
    
    // Add each standard question
    standardQuestions.forEach(question => {
      const questionRef = doc(db, COLLECTIONS.QUESTIONS, question.id);
      batch.set(questionRef, {
        ...question,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    });
    
    await batch.commit();
    console.log('Successfully seeded standard questions');
    
    return true;
  } catch (error) {
    console.error('Error seeding standard questions:', error);
    return false;
  }
};

/**
 * Checks if predictions can be reset based on match time
 * Users can reset predictions up until 5 minutes before the match starts
 */
export const canResetPredictions = async (matchId: string): Promise<boolean> => {
  try {
    // Get the match document
    const matchRef = doc(db, COLLECTIONS.MATCHES, matchId);
    const matchSnap = await getDoc(matchRef);
    
    if (!matchSnap.exists()) {
      console.error(`Match ${matchId} not found`);
      return false;
    }
    
    const matchData = matchSnap.data();
    
    // Convert match date to a Date object
    const matchDate = matchData.date instanceof Timestamp 
      ? matchData.date.toDate() 
      : new Date(matchData.date);
    
    // Get current date/time
    const now = new Date();
    
    // IMPORTANT: Never allow resets for matches that have already started or ended
    if (matchDate <= now || matchData.status === 'live' || matchData.status === 'completed') {
      console.log(`Match ${matchId} has already started or ended. Reset not allowed.`);
      return false;
    }
    
    // Calculate time difference in milliseconds and convert to minutes
    const timeDifferenceMs = matchDate.getTime() - now.getTime();
    const timeDifferenceMinutes = timeDifferenceMs / (1000 * 60);
    
    // Allow resets until 5 minutes before match starts
    return timeDifferenceMinutes > 5;
  } catch (error) {
    console.error('Error checking if predictions can be reset:', error);
    return false;
  }
};

/**
 * Reset a user's predictions for a match
 * Only allowed until 5 minutes before the match starts
 */
export const resetPredictions = async (userId: string, matchId: string): Promise<boolean> => {
  try {
    // First, check if reset is allowed based on match time
    const resetAllowed = await canResetPredictions(matchId);
    if (!resetAllowed) {
      throw new Error('Predictions can only be reset until 5 minutes before the match starts');
    }
    
    // Get all prediction answers for this user and match
    const predictionAnswersRef = collection(db, 'predictionAnswers');
    const answersQuery = query(
      predictionAnswersRef,
      where('userId', '==', userId),
      where('matchId', '==', matchId)
    );
    const answersSnapshot = await getDocs(answersQuery);
    
    if (answersSnapshot.empty) {
      console.log(`No predictions found for user ${userId} on match ${matchId}`);
      return false;
    }
    
    // Delete all prediction answers
    const batch = writeBatch(db);
    answersSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Also find and delete the prediction game record if it exists
    const predictionGamesRef = collection(db, 'predictionGames');
    const gamesQuery = query(
      predictionGamesRef,
      where('userId', '==', userId),
      where('matchId', '==', matchId)
    );
    const gamesSnapshot = await getDocs(gamesQuery);
    
    if (!gamesSnapshot.empty) {
      gamesSnapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
    }
    
    await batch.commit();
    console.log(`Successfully reset predictions for user ${userId} on match ${matchId}`);
    return true;
  } catch (error) {
    console.error('Error resetting predictions:', error);
    throw error;
  }
};
