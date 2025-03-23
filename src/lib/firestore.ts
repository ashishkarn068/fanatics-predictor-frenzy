import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp, 
  Timestamp,
  setDoc,
  DocumentReference,
  DocumentData,
  QueryDocumentSnapshot,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Match, Team, Player, Prediction, User } from './types';

// Firestore Collection Names
export const COLLECTIONS = {
  MATCHES: 'matches',
  TEAMS: 'teams',
  PLAYERS: 'players',
  USERS: 'users',
  PREDICTIONS: 'predictions',
  QUESTIONS: 'questions',
  PREDICTION_GAMES: 'predictionGames',
  PREDICTION_ANSWERS: 'predictionAnswers',
  LEADERBOARDS: 'leaderboards',
  LEADERBOARD_ENTRIES: 'leaderboardEntries'
};

// Firestore Document Interfaces
export interface FirestoreMatch extends Omit<Match, 'date'> {
  date: string | Timestamp; // Firestore can store as Timestamp
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
  isPlayoff?: boolean;
  playoffOrder?: number | null;
  playoffRound?: string | null;
  venue: string;
}

export interface FirestoreTeam extends Team {
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
  squad?: {
    [key: string]: {
      name: string;
      role: string;
      age?: string;
    }
  };
}

export interface FirestorePlayer extends Player {
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
  age?: string;
  stats?: {
    matches?: number;
    runs?: number;
    wickets?: number;
    average?: number;
    strikeRate?: number;
    economyRate?: number;
  };
}

export interface FirestoreUser extends Omit<User, 'predictions'> {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role?: 'user' | 'admin';
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface FirestorePrediction extends Prediction {
  id?: string;
  createdAt: string | Timestamp;
  updatedAt: string | Timestamp;
  isCorrect?: boolean;
  pointsEarned?: number;
}

export interface Question {
  id: string;
  text: string;
  type: 'winner' | 'topBatsman' | 'topBowler' | 'custom';
  points: number;
  negativePoints?: number; // Points deducted for wrong answers
  options?: { id: string; value: string; label: string }[];
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface PredictionGame {
  id: string;
  matchId: string;
  userId: string; // The user who created this prediction game
  title?: string;
  description?: string;
  isActive: boolean;
  questionIds: string[];
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface PredictionAnswer {
  id: string;
  userId: string;
  matchId: string;
  predictionGameId: string;
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  pointsEarned?: number;
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface LeaderboardEntry {
  id: string;
  userId: string;
  displayName: string;
  photoURL?: string;
  points: number;
  correctPredictions: number;
  totalPredictions: number;
  rank?: number;
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

export interface Leaderboard {
  id: string;
  name: string;
  type: 'match' | 'weekly' | 'season';
  matchId?: string;
  weekStart?: string | Timestamp;
  weekEnd?: string | Timestamp;
  entries: LeaderboardEntry[];
  createdAt?: string | Timestamp;
  updatedAt?: string | Timestamp;
}

// Helper Functions for Match Collection
export const getMatches = async (): Promise<FirestoreMatch[]> => {
  const matchesCollection = collection(db, COLLECTIONS.MATCHES);
  const matchesQuery = query(matchesCollection, orderBy('date', 'asc'));
  const querySnapshot = await getDocs(matchesQuery);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreMatch;
    // Convert Firestore Timestamp to ISO string if needed
    const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date;
    return { ...data, id: doc.id, date: date as string };
  });
};

export const getUpcomingMatches = async (): Promise<FirestoreMatch[]> => {
  const matchesCollection = collection(db, COLLECTIONS.MATCHES);
  const now = new Date();
  const matchesQuery = query(
    matchesCollection, 
    where('date', '>=', now),
    orderBy('date', 'asc')
  );
  
  const querySnapshot = await getDocs(matchesQuery);
  
  return querySnapshot.docs.map(doc => {
    const data = doc.data() as FirestoreMatch;
    const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date;
    return { ...data, id: doc.id, date: date as string };
  });
};

export const getMatchById = async (matchId: string): Promise<FirestoreMatch | null> => {
  try {
    const matchDoc = doc(db, COLLECTIONS.MATCHES, matchId);
    const matchSnapshot = await getDoc(matchDoc);
    
    if (matchSnapshot.exists()) {
      const data = matchSnapshot.data() as FirestoreMatch;
      const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date;
      return { ...data, id: matchSnapshot.id, date: date as string };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching match:", error);
    return null;
  }
};

// Helper Functions for Team Collection
export const getTeams = async (): Promise<FirestoreTeam[]> => {
  const teamsCollection = collection(db, COLLECTIONS.TEAMS);
  const querySnapshot = await getDocs(teamsCollection);
  
  return querySnapshot.docs.map(doc => {
    return { ...doc.data() as FirestoreTeam, id: doc.id };
  });
};

export const getTeamById = async (teamId: string): Promise<FirestoreTeam | null> => {
  try {
    const teamDoc = doc(db, COLLECTIONS.TEAMS, teamId);
    const teamSnapshot = await getDoc(teamDoc);
    
    if (teamSnapshot.exists()) {
      return { ...teamSnapshot.data() as FirestoreTeam, id: teamSnapshot.id };
    }
    
    return null;
  } catch (error) {
    console.error("Error fetching team:", error);
    return null;
  }
};

// Helper Functions for Player Collection
export const getPlayersByTeamId = async (teamId: string): Promise<FirestorePlayer[]> => {
  const playersCollection = collection(db, COLLECTIONS.PLAYERS);
  const playersQuery = query(playersCollection, where('teamId', '==', teamId));
  const querySnapshot = await getDocs(playersQuery);
  
  return querySnapshot.docs.map(doc => {
    return { ...doc.data() as FirestorePlayer, id: doc.id };
  });
};

export const getPlayersByRole = async (role: string): Promise<FirestorePlayer[]> => {
  const playersCollection = collection(db, COLLECTIONS.PLAYERS);
  const playersQuery = query(playersCollection, where('role', '==', role));
  const querySnapshot = await getDocs(playersQuery);
  
  return querySnapshot.docs.map(doc => {
    return { ...doc.data() as FirestorePlayer, id: doc.id };
  });
};

// Helper Functions for Prediction Collection
export const getUserPredictions = async (userId: string): Promise<FirestorePrediction[]> => {
  const predictionsCollection = collection(db, COLLECTIONS.PREDICTIONS);
  const predictionsQuery = query(predictionsCollection, where('userId', '==', userId));
  const querySnapshot = await getDocs(predictionsQuery);
  
  return querySnapshot.docs.map(doc => {
    return { ...doc.data() as FirestorePrediction, id: doc.id };
  });
};

export const getUserPredictionForMatch = async (userId: string, matchId: string): Promise<FirestorePrediction | null> => {
  const predictionsCollection = collection(db, COLLECTIONS.PREDICTIONS);
  const predictionsQuery = query(
    predictionsCollection, 
    where('userId', '==', userId),
    where('matchId', '==', matchId)
  );
  
  const querySnapshot = await getDocs(predictionsQuery);
  
  if (!querySnapshot.empty) {
    const doc = querySnapshot.docs[0];
    return { ...doc.data() as FirestorePrediction, id: doc.id };
  }
  
  return null;
};

export const savePrediction = async (prediction: Omit<FirestorePrediction, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Create a unique ID for the prediction
    const predictionId = `${user.uid}_${prediction.matchId}`;
    const predictionRef = doc(db, COLLECTIONS.PREDICTIONS, predictionId);
    
    const now = new Date().toISOString();
    
    const predictionData: FirestorePrediction = {
      ...prediction,
      createdAt: now,
      updatedAt: now
    };
    
    await setDoc(predictionRef, predictionData);
    
    return predictionId;
  } catch (error) {
    console.error("Error saving prediction:", error);
    throw error;
  }
};

// Helper Functions for Questions
export const getQuestions = async (): Promise<Question[]> => {
  try {
    const questionsRef = collection(db, COLLECTIONS.QUESTIONS);
    const questionsSnapshot = await getDocs(questionsRef);
    const questions: Question[] = [];
    
    questionsSnapshot.forEach((doc) => {
      questions.push({ id: doc.id, ...doc.data() } as Question);
    });
    
    return questions;
  } catch (error) {
    console.error('Error fetching questions:', error);
    return [];
  }
};

export const getQuestionById = async (questionId: string): Promise<Question | null> => {
  try {
    const questionRef = doc(db, COLLECTIONS.QUESTIONS, questionId);
    const questionSnapshot = await getDoc(questionRef);
    
    if (questionSnapshot.exists()) {
      return { id: questionSnapshot.id, ...questionSnapshot.data() } as Question;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching question with ID ${questionId}:`, error);
    return null;
  }
};

// Helper Functions for PredictionGames
export const getPredictionGamesByMatchId = async (matchId: string): Promise<PredictionGame[]> => {
  try {
    const predictionGamesRef = collection(db, COLLECTIONS.PREDICTION_GAMES);
    const q = query(predictionGamesRef, where('matchId', '==', matchId));
    const predictionGamesSnapshot = await getDocs(q);
    const predictionGames: PredictionGame[] = [];
    
    predictionGamesSnapshot.forEach((doc) => {
      predictionGames.push({ id: doc.id, ...doc.data() } as PredictionGame);
    });
    
    return predictionGames;
  } catch (error) {
    console.error(`Error fetching prediction games for match ${matchId}:`, error);
    return [];
  }
};

export const getUserPredictionGameForMatch = async (userId: string, matchId: string): Promise<PredictionGame | null> => {
  try {
    const predictionGamesRef = collection(db, COLLECTIONS.PREDICTION_GAMES);
    const q = query(
      predictionGamesRef, 
      where('matchId', '==', matchId),
      where('userId', '==', userId)
    );
    const predictionGamesSnapshot = await getDocs(q);
    
    if (!predictionGamesSnapshot.empty) {
      const doc = predictionGamesSnapshot.docs[0];
      return { id: doc.id, ...doc.data() } as PredictionGame;
    }
    
    return null;
  } catch (error) {
    console.error(`Error fetching user prediction game for match ${matchId}:`, error);
    return null;
  }
};

export const createPredictionGame = async (predictionGame: Omit<PredictionGame, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const predictionGamesRef = collection(db, COLLECTIONS.PREDICTION_GAMES);
    const newPredictionGame = {
      ...predictionGame,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const docRef = await addDoc(predictionGamesRef, newPredictionGame);
    return docRef.id;
  } catch (error) {
    console.error('Error creating prediction game:', error);
    throw error;
  }
};

// Helper Functions for PredictionAnswers
export const getUserPredictionAnswers = async (userId: string, matchId: string): Promise<PredictionAnswer[]> => {
  try {
    const predictionAnswersRef = collection(db, COLLECTIONS.PREDICTION_ANSWERS);
    const q = query(
      predictionAnswersRef, 
      where('userId', '==', userId),
      where('matchId', '==', matchId)
    );
    const predictionAnswersSnapshot = await getDocs(q);
    const predictionAnswers: PredictionAnswer[] = [];
    
    predictionAnswersSnapshot.forEach((doc) => {
      predictionAnswers.push({ id: doc.id, ...doc.data() } as PredictionAnswer);
    });
    
    return predictionAnswers;
  } catch (error) {
    console.error(`Error fetching user prediction answers for match ${matchId}:`, error);
    return [];
  }
};

export const savePredictionAnswer = async (answer: Omit<PredictionAnswer, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    // Check if an answer for this question already exists
    const predictionAnswersRef = collection(db, COLLECTIONS.PREDICTION_ANSWERS);
    const q = query(
      predictionAnswersRef, 
      where('userId', '==', answer.userId),
      where('matchId', '==', answer.matchId),
      where('questionId', '==', answer.questionId)
    );
    const existingAnswersSnapshot = await getDocs(q);
    
    if (!existingAnswersSnapshot.empty) {
      // Update existing answer
      const existingAnswerDoc = existingAnswersSnapshot.docs[0];
      const existingAnswerId = existingAnswerDoc.id;
      const existingAnswerRef = doc(db, COLLECTIONS.PREDICTION_ANSWERS, existingAnswerId);
      
      await updateDoc(existingAnswerRef, {
        ...answer,
        updatedAt: serverTimestamp()
      });
      
      return existingAnswerId;
    } else {
      // Create new answer
      const newAnswer = {
        ...answer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      const docRef = await addDoc(predictionAnswersRef, newAnswer);
      return docRef.id;
    }
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
    const batch = writeBatch(db);
    const answerIds: string[] = [];
    const predictionAnswersRef = collection(db, COLLECTIONS.PREDICTION_ANSWERS);
    
    // First, check for existing answers
    const existingAnswersQuery = query(
      predictionAnswersRef,
      where('userId', '==', userId),
      where('matchId', '==', matchId)
    );
    const existingAnswersSnapshot = await getDocs(existingAnswersQuery);
    const existingAnswersMap = new Map<string, string>(); // questionId -> answerId
    
    existingAnswersSnapshot.forEach(doc => {
      const data = doc.data();
      existingAnswersMap.set(data.questionId, doc.id);
    });
    
    // Now create or update answers
    for (const [questionId, answer] of Object.entries(answers)) {
      if (existingAnswersMap.has(questionId)) {
        // Update existing answer
        const answerId = existingAnswersMap.get(questionId)!;
        const answerRef = doc(db, COLLECTIONS.PREDICTION_ANSWERS, answerId);
        
        batch.update(answerRef, {
          answer,
          updatedAt: serverTimestamp()
        });
        
        answerIds.push(answerId);
      } else {
        // Create new answer
        const newAnswerRef = doc(predictionAnswersRef);
        
        batch.set(newAnswerRef, {
          userId,
          matchId,
          predictionGameId,
          questionId,
          answer,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        answerIds.push(newAnswerRef.id);
      }
    }
    
    await batch.commit();
    return answerIds;
  } catch (error) {
    console.error('Error saving prediction answers:', error);
    throw error;
  }
};

// Function to evaluate prediction answers and update points
export const evaluatePredictionAnswers = async (matchId: string, results: Record<string, string>): Promise<void> => {
  try {
    // Get all prediction answers for this match
    const predictionAnswersCollection = collection(db, COLLECTIONS.PREDICTION_ANSWERS);
    const q = query(
      predictionAnswersCollection,
      where('matchId', '==', matchId)
    );
    const snapshot = await getDocs(q);
    
    // Get all questions to determine point values
    const questions = await getQuestions();
    const questionPoints = questions.reduce((acc, question) => {
      acc[question.id] = question.points;
      return acc;
    }, {} as Record<string, number>);
    
    const questionTypes = questions.reduce((acc, question) => {
      acc[question.id] = question.type;
      return acc;
    }, {} as Record<string, string>);
    
    const batch = writeBatch(db);
    
    // Evaluate each answer
    snapshot.docs.forEach(doc => {
      const answer = doc.data() as PredictionAnswer;
      const questionId = answer.questionId;
      const userAnswer = answer.answer;
      const correctAnswer = results[questionId];
      const questionType = questionTypes[questionId];
      
      let isCorrect = false;
      let pointsEarned = 0;
      
      // Handle special scoring logic based on question type
      if (questionType === 'highestTotal' && userAnswer && correctAnswer) {
        // For highest total, we check if the user's guess is within 15 runs
        const userTotal = parseInt(userAnswer);
        const actualTotal = parseInt(correctAnswer);
        
        if (!isNaN(userTotal) && !isNaN(actualTotal)) {
          const difference = Math.abs(userTotal - actualTotal);
          if (difference <= 15) {
            isCorrect = true;
            pointsEarned = questionPoints[questionId] || 0;
          }
        }
        
        console.log(`Evaluating highestTotal: User guess: ${userTotal}, Actual: ${actualTotal}, Difference: ${Math.abs(userTotal - actualTotal)}, isCorrect: ${isCorrect}`);
      } else {
        // Default exact match for other question types
        isCorrect = userAnswer === correctAnswer;
        pointsEarned = isCorrect ? questionPoints[questionId] || 0 : 0;
      }
      
      // Update the answer document
      batch.update(doc.ref, {
        isCorrect,
        pointsEarned,
        updatedAt: serverTimestamp()
      });
    });
    
    await batch.commit();
    
    // Update leaderboard after evaluating answers
    await updateLeaderboardForMatch(matchId);
  } catch (error) {
    console.error(`Error evaluating prediction answers for match ${matchId}:`, error);
    throw error;
  }
};

// Helper Functions for Leaderboard
export const getLeaderboard = async (type: 'match' | 'weekly' | 'season', matchId?: string): Promise<LeaderboardEntry[]> => {
  const leaderboardsCollection = collection(db, COLLECTIONS.LEADERBOARDS);
  let leaderboardQuery;
  
  if (type === 'match' && matchId) {
    leaderboardQuery = query(
      leaderboardsCollection, 
      where('type', '==', type),
      where('matchId', '==', matchId)
    );
  } else {
    leaderboardQuery = query(
      leaderboardsCollection, 
      where('type', '==', type),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }
  
  const querySnapshot = await getDocs(leaderboardQuery);
  
  if (!querySnapshot.empty) {
    const leaderboardDoc = querySnapshot.docs[0];
    
    // Get leaderboard entries
    const entriesCollection = collection(db, COLLECTIONS.LEADERBOARDS, leaderboardDoc.id, COLLECTIONS.LEADERBOARD_ENTRIES);
    const entriesQuery = query(entriesCollection, orderBy('points', 'desc'));
    const entriesSnapshot = await getDocs(entriesQuery);
    
    return entriesSnapshot.docs.map((doc, index) => {
      const entry = doc.data() as LeaderboardEntry;
      return { ...entry, id: doc.id, rank: index + 1 };
    });
  }
  
  return [];
};

// Function to update leaderboard after prediction results
export const updateLeaderboardForMatch = async (matchId: string): Promise<void> => {
  try {
    // Get all predictions for this match
    const predictionsCollection = collection(db, COLLECTIONS.PREDICTIONS);
    const predictionsQuery = query(predictionsCollection, where('matchId', '==', matchId));
    const predictionsSnapshot = await getDocs(predictionsQuery);
    
    // Get the match to check results
    const match = await getMatchById(matchId);
    if (!match || match.status !== 'completed') {
      throw new Error('Match not completed yet');
    }
    
    // Create or get the leaderboard document
    const leaderboardsCollection = collection(db, COLLECTIONS.LEADERBOARDS);
    const leaderboardQuery = query(
      leaderboardsCollection, 
      where('type', '==', 'match'),
      where('matchId', '==', matchId)
    );
    
    const leaderboardSnapshot = await getDocs(leaderboardQuery);
    let leaderboardId: string;
    
    if (leaderboardSnapshot.empty) {
      // Create new leaderboard
      const newLeaderboard: Omit<Leaderboard, 'id' | 'entries'> = {
        name: `Match ${matchId} Leaderboard`,
        type: 'match',
        matchId: matchId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const leaderboardRef = await addDoc(leaderboardsCollection, newLeaderboard);
      leaderboardId = leaderboardRef.id;
    } else {
      leaderboardId = leaderboardSnapshot.docs[0].id;
    }
    
    // Process each prediction and update leaderboard entries
    const batch = writeBatch(db);
    
    for (const predictionDoc of predictionsSnapshot.docs) {
      const prediction = predictionDoc.data() as FirestorePrediction;
      const userId = prediction.userId;
      
      // Check if prediction is correct
      let isCorrect = false;
      let pointsEarned = 0;
      
      if (prediction.winnerTeamId === match.result) {
        isCorrect = true;
        pointsEarned += 10; // Example points for correct winner prediction
      }
      
      // Update the prediction document
      const predictionRef = doc(db, COLLECTIONS.PREDICTIONS, predictionDoc.id);
      batch.update(predictionRef, { 
        isCorrect, 
        pointsEarned, 
        updatedAt: new Date().toISOString() 
      });
      
      // Get user data
      const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, userId));
      if (userDoc.exists()) {
        const userData = userDoc.data() as FirestoreUser;
        
        // Update or create leaderboard entry
        const entryRef = doc(db, COLLECTIONS.LEADERBOARDS, leaderboardId, COLLECTIONS.LEADERBOARD_ENTRIES, userId);
        const entrySnapshot = await getDoc(entryRef);
        
        if (entrySnapshot.exists()) {
          const entry = entrySnapshot.data() as LeaderboardEntry;
          batch.update(entryRef, {
            points: entry.points + pointsEarned,
            correctPredictions: isCorrect ? entry.correctPredictions + 1 : entry.correctPredictions,
            totalPredictions: entry.totalPredictions + 1,
            updatedAt: new Date().toISOString()
          });
        } else {
          batch.set(entryRef, {
            userId,
            displayName: userData.displayName || 'Anonymous',
            photoURL: userData.photoURL,
            points: pointsEarned,
            correctPredictions: isCorrect ? 1 : 0,
            totalPredictions: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
        
        // Update user's total points
        const userRef = doc(db, COLLECTIONS.USERS, userId);
        batch.update(userRef, {
          totalPoints: (userData.totalPoints || 0) + pointsEarned,
          updatedAt: new Date().toISOString()
        });
      }
    }
    
    // Commit all the batch operations
    await batch.commit();
    
  } catch (error) {
    console.error("Error updating leaderboard:", error);
    throw error;
  }
};

// Function to check if a collection exists and has documents
export const collectionExists = async (collectionName: string): Promise<boolean> => {
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(query(collectionRef, limit(1)));
    return !snapshot.empty;
  } catch (error) {
    console.error(`Error checking if collection ${collectionName} exists:`, error);
    return false;
  }
};

// Function to initialize database with required collections and indexes
export const initializeDatabase = async (): Promise<void> => {
  // This function would be used to set up initial database structure
  // For now, it's a placeholder for future implementation
  console.log('Database initialization placeholder');
};

// Real-time listeners
export const subscribeToMatches = (callback: (matches: FirestoreMatch[]) => void) => {
  const matchesCollection = collection(db, COLLECTIONS.MATCHES);
  const matchesQuery = query(matchesCollection, orderBy('date', 'asc'));
  
  return onSnapshot(matchesQuery, (snapshot) => {
    const matches = snapshot.docs.map(doc => {
      const data = doc.data() as FirestoreMatch;
      const date = data.date instanceof Timestamp ? data.date.toDate().toISOString() : data.date;
      return { ...data, id: doc.id, date: date as string };
    });
    
    callback(matches);
  });
};

export const subscribeToLeaderboard = (type: 'match' | 'weekly' | 'season', matchId: string | undefined, callback: (entries: LeaderboardEntry[]) => void) => {
  const leaderboardsCollection = collection(db, COLLECTIONS.LEADERBOARDS);
  let leaderboardQuery;
  
  if (type === 'match' && matchId) {
    leaderboardQuery = query(
      leaderboardsCollection, 
      where('type', '==', type),
      where('matchId', '==', matchId)
    );
  } else {
    leaderboardQuery = query(
      leaderboardsCollection, 
      where('type', '==', type),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
  }
  
  return onSnapshot(leaderboardQuery, async (snapshot) => {
    if (!snapshot.empty) {
      const leaderboardDoc = snapshot.docs[0];
      
      // Get leaderboard entries
      const entriesCollection = collection(db, COLLECTIONS.LEADERBOARDS, leaderboardDoc.id, COLLECTIONS.LEADERBOARD_ENTRIES);
      const entriesQuery = query(entriesCollection, orderBy('points', 'desc'));
      
      // Subscribe to entries changes
      return onSnapshot(entriesQuery, (entriesSnapshot) => {
        const entries = entriesSnapshot.docs.map((doc, index) => {
          const entry = doc.data() as LeaderboardEntry;
          return { ...entry, id: doc.id, rank: index + 1 };
        });
        
        callback(entries);
      });
    } else {
      callback([]);
    }
  });
};
