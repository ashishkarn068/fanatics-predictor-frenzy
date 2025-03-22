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

// Matches Collection
export const getMatches = async (): Promise<Match[]> => {
  try {
    const matchesQuery = query(
      collection(db, COLLECTIONS.MATCHES),
      orderBy('date', 'asc')
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    return matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Match[];
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
      where('date', '>=', now),
      orderBy('date', 'asc')
    );
    
    const matchesSnapshot = await getDocs(matchesQuery);
    return matchesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Match[];
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

export const createPrediction = async (predictionData: Omit<PredictionGame, 'id'>): Promise<string> => {
  try {
    const predictionsCollectionRef = collection(db, COLLECTIONS.PREDICTION_GAME);
    const newPredictionRef = doc(predictionsCollectionRef);
    
    await setDoc(newPredictionRef, {
      ...predictionData,
      ...createTimestamps()
    });
    
    return newPredictionRef.id;
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
          id: 'winner-question',
          text: 'Which team will win this match?',
          type: 'winner',
          points: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'top-batsman',
          text: 'Who will be the top batsman in this match?',
          type: 'topBatsman',
          points: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'top-bowler',
          text: 'Who will be the top bowler in this match?',
          type: 'topBowler',
          points: 15,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'highest-total',
          text: 'What will be the highest total of this match?',
          type: 'highestTotal',
          points: 10,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'more-sixes',
          text: 'Which team will hit more sixes?',
          type: 'moreSixes',
          points: 5,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
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
    
    console.log(`Match result retrieved:`, result);
    console.log(`Prediction results:`, result.predictionResults);
    
    // Check if predictionResults exist
    if (!result.predictionResults || Object.keys(result.predictionResults).length === 0) {
      console.error(`No prediction results defined for match ${matchId}`);
      throw new Error(`No prediction results found for match ${matchId}`);
    }
    
    // First, load all questions to get their point values
    const questionsCollection = collection(db, COLLECTIONS.QUESTIONS);
    const questionsSnapshot = await getDocs(questionsCollection);
    const questionsMap = new Map();
    
    questionsSnapshot.forEach(doc => {
      const question = doc.data();
      questionsMap.set(doc.id, {
        id: doc.id,
        text: question.text,
        type: question.type,
        points: question.points || 10 // Default to 10 points if not specified
      });
      
      // Also map by question type for easier lookup
      if (question.type) {
        questionsMap.set(question.type, {
          id: doc.id,
          text: question.text,
          type: question.type,
          points: question.points || 10
        });
      }
    });
    
    console.log(`Loaded ${questionsMap.size} questions for evaluation`);
    
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
    predictionSnapshot.forEach((docSnapshot) => {
      const predictionAnswer = docSnapshot.data();
      const questionId = predictionAnswer.questionId;
      const userAnswer = predictionAnswer.answer;
      const userId = predictionAnswer.userId;
      console.log(`Evaluating prediction for user: ${userId}, question: ${questionId}, answer: ${userAnswer}`);
      
      // Initialize user stats if not already tracked
      if (userId && !userPointsMap[userId]) {
        userPointsMap[userId] = {
          totalPoints: 0,
          correctPredictions: 0,
          totalPredictions: 1
        };
      } else if (userId) {
        userPointsMap[userId].totalPredictions++;
      }
      
      // Standardize question ID to handle different formats
      let standardQuestionId = questionId.toLowerCase();
      
      // Remove any prefix containing the match ID
      if (standardQuestionId.startsWith(`${matchId}-`)) {
        standardQuestionId = standardQuestionId.substring(matchId.length + 1);
      }
      
      // Remove common suffixes
      if (standardQuestionId.includes('-question')) {
        standardQuestionId = standardQuestionId.replace('-question', '');
      }
      
      // Normalize common question types
      if (standardQuestionId.includes('batsman') || standardQuestionId === 'top-batsman') {
        standardQuestionId = 'top-batsman';
      } else if (standardQuestionId.includes('bowler') || standardQuestionId === 'top-bowler') {
        standardQuestionId = 'top-bowler';
      } else if (standardQuestionId.includes('highest-total') || standardQuestionId === 'highest-total') {
        standardQuestionId = 'highest-total';
      } else if (standardQuestionId.includes('more-sixes') || standardQuestionId === 'more-sixes' || standardQuestionId === 'moresixes') {
        standardQuestionId = 'more-sixes';
      } else if (standardQuestionId === 'winner' || standardQuestionId.includes('match-winner')) {
        standardQuestionId = 'winner';
      }
      
      console.log(`Standardized question ID: ${standardQuestionId} from original: ${questionId}`);
      
      // Look for a corresponding result
      // Try different keys since the format might vary
      const possibleKeys = [
        `${matchId}-${standardQuestionId}`,  // matchId-questionId 
        standardQuestionId,                  // standardized questionId
        questionId,                          // original questionId
        questionId.toLowerCase(),            // lowercase original
        // Common variations
        'winner', 
        'top-batsman', 
        'top-bowler', 
        'highest-total',
        'more-sixes',
        // Without hyphens
        standardQuestionId.replace(/-/g, '')
      ];
      
      let correctAnswer = null;
      let keyUsed = '';
      
      for (const key of possibleKeys) {
        if (result.predictionResults && result.predictionResults[key] !== undefined) {
          correctAnswer = result.predictionResults[key];
          keyUsed = key;
          console.log(`Found correct answer using key: ${key}, value: ${correctAnswer}`);
          break;
        }
      }
      
      // If still not found, try to infer from the result fields directly
      if (correctAnswer === null) {
        if (standardQuestionId === 'winner') {
          correctAnswer = result.winner;
          keyUsed = 'winner field';
          console.log(`Using match winner as correct answer: ${correctAnswer}`);
        } else if (standardQuestionId === 'top-batsman') {
          correctAnswer = result.topBatsmanId;
          keyUsed = 'topBatsmanId field';
          console.log(`Using top batsman as correct answer: ${correctAnswer}`);
        } else if (standardQuestionId === 'top-bowler') {
          correctAnswer = result.topBowlerId;
          keyUsed = 'topBowlerId field';
          console.log(`Using top bowler as correct answer: ${correctAnswer}`);
        } else if (standardQuestionId === 'highest-total') {
          correctAnswer = result.highestTotal?.toString();
          keyUsed = 'highestTotal field';
          console.log(`Using highest total as correct answer: ${correctAnswer}`);
        } else if (standardQuestionId === 'more-sixes') {
          correctAnswer = result.moreSixes;
          keyUsed = 'moreSixes field';
          console.log(`Using more sixes as correct answer: ${correctAnswer}`);
        }
      }
      
      // If we found a correct answer, evaluate the prediction
      if (correctAnswer !== null) {
        let isCorrect = false;
        let pointsEarned = 0;
        
        // Get question points from our loaded questions map
        const question = questionsMap.get(standardQuestionId) || 
                         questionsMap.get(questionId) || 
                         { points: 10, type: 'unknown' }; // Default if not found
        
        let questionPoints = question.points;
        const questionType = question.type || standardQuestionId;
        
        console.log(`Question details: ID: ${standardQuestionId}, Type: ${questionType}, Points: ${questionPoints}`);
        console.log(`Comparing user answer: ${userAnswer} with correct answer: ${correctAnswer} (from ${keyUsed})`);
        
        // Evaluate based on question type
        if (questionType === 'winner' || standardQuestionId === 'winner') {
          // Exact match for winner
          isCorrect = userAnswer === correctAnswer;
        } else if (questionType === 'highestTotal' || standardQuestionId === 'highest-total') {
          // Within 15 runs for highest total
          const userTotal = parseInt(userAnswer);
          const correctTotal = parseInt(correctAnswer);
          
          if (!isNaN(userTotal) && !isNaN(correctTotal)) {
            isCorrect = Math.abs(userTotal - correctTotal) <= 15;
            console.log(`Highest total evaluation: User: ${userTotal}, Correct: ${correctTotal}, Difference: ${Math.abs(userTotal - correctTotal)}, IsCorrect: ${isCorrect}`);
          }
        } else if (questionType === 'topBatsman' || standardQuestionId === 'top-batsman') {
          // Use standardized names for top batsman comparison
          const standardizedUserAnswer = standardizePlayerName(userAnswer);
          const standardizedCorrectAnswer = standardizePlayerName(correctAnswer);
          
          console.log(`Comparing standardized batsman names: "${standardizedUserAnswer}" with "${standardizedCorrectAnswer}"`);
          isCorrect = standardizedUserAnswer === standardizedCorrectAnswer;
        } else if (questionType === 'topBowler' || standardQuestionId === 'top-bowler') {
          // Use standardized names for top bowler comparison
          const standardizedUserAnswer = standardizePlayerName(userAnswer);
          const standardizedCorrectAnswer = standardizePlayerName(correctAnswer);
          
          console.log(`Comparing standardized bowler names: "${standardizedUserAnswer}" with "${standardizedCorrectAnswer}"`);
          isCorrect = standardizedUserAnswer === standardizedCorrectAnswer;
        } else if (questionType === 'moreSixes' || standardQuestionId === 'more-sixes') {
          // Exact match for team with more sixes
          isCorrect = userAnswer === correctAnswer;
        } else {
          // Default evaluation for any other question types
          isCorrect = userAnswer === correctAnswer;
        }
        
        pointsEarned = isCorrect ? questionPoints : 0;
        
        // Update the prediction answer
        batch.update(docSnapshot.ref, {
          isCorrect,
          pointsEarned,
          evaluatedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        updateCount++;
        
        // Aggregate points by user for leaderboard updates
        if (userId) {
          if (isCorrect) {
            userPointsMap[userId].totalPoints += pointsEarned;
            userPointsMap[userId].correctPredictions++;
          }
        }
        
        console.log(`Evaluated prediction: Question: ${questionId}, User answer: ${userAnswer}, Correct answer: ${correctAnswer}, Is correct: ${isCorrect}, Points earned: ${pointsEarned}`);
      } else {
        console.log(`Could not find correct answer for question: ${questionId}`);
      }
    });
    
    // Update user profiles with earned points
    for (const [userId, stats] of Object.entries(userPointsMap)) {
      console.log(`Updating points for user: ${userId}, Total points: ${stats.totalPoints}, Correct predictions: ${stats.correctPredictions}`);
      
      const userRef = doc(db, 'users', userId);
      
      // Get current user data
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // Update user document with new points
        batch.update(userRef, {
          // Update total season points
          totalPoints: (userData.totalPoints || 0) + stats.totalPoints,
          // Update weekly points
          weeklyPoints: (userData.weeklyPoints || 0) + stats.totalPoints,
          // Update accuracy stats
          totalPredictions: (userData.totalPredictions || 0) + stats.totalPredictions,
          correctPredictions: (userData.correctPredictions || 0) + stats.correctPredictions,
          // Calculate overall accuracy
          overallAccuracy: Math.round(
            ((userData.correctPredictions || 0) + stats.correctPredictions) /
            ((userData.totalPredictions || 0) + stats.totalPredictions) * 100
          ),
          // Update timestamp
          updatedAt: serverTimestamp()
        });
      }
    }
    
    // Commit all updates
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Evaluated ${updateCount} predictions for match ${matchId}`);
    }
    
    // Mark the result as evaluated
    const resultRef = doc(db, COLLECTIONS.MATCH_RESULTS, result.id);
    await updateDoc(resultRef, {
      isEvaluated: true,
      evaluatedAt: serverTimestamp()
    });
    
    // Create or update match leaderboard document
    await createMatchLeaderboard(matchId, userPointsMap);
  } catch (error) {
    console.error(`Error evaluating predictions for match ${matchId}:`, error);
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
      if (stats.totalPoints > 0) {
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
    // First update the match
    const matchDocRef = doc(db, COLLECTIONS.MATCHES, matchId);
    await updateDoc(matchDocRef, {
      ...matchData,
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
        
        // Add points to deduct if answer was correct
        if (answer.isCorrect) {
          userPointsMap[userId].pointsToDeduct += answer.pointsEarned || 0;
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
    let totalPredictions = 0;
    const matchesSet = new Set<string>();
    
    answersSnapshot.forEach((doc) => {
      const answer = doc.data();
      totalPoints += answer.pointsEarned || 0;
      if (answer.isCorrect) correctPredictions++;
      totalPredictions++;
      if (answer.matchId) matchesSet.add(answer.matchId);
    });
    
    // Calculate accuracy
    const accuracy = totalPredictions > 0 ? (correctPredictions / totalPredictions) * 100 : 0;
    
    // Update or create global leaderboard entry
    const globalLeaderboardRef = doc(db, COLLECTIONS.GLOBAL_LEADERBOARD, userId);
    await setDoc(globalLeaderboardRef, {
      userId,
      displayName: userData.data()?.displayName || "Anonymous User",
      photoURL: userData.data()?.photoURL,
      totalPoints,
      correctPredictions,
      totalPredictions,
      accuracy,
      lastUpdated: serverTimestamp(),
      matchesPlayed: matchesSet.size
    }, { merge: true });
    
  } catch (error) {
    console.error("Error updating global leaderboard:", error);
    throw error;
  }
};
