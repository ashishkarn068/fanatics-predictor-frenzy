import { db } from '../lib/firebase';
import {
  collection,
  doc,
  setDoc,
  getDocs,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { collectionExists } from '../lib/firestore';

// Collection names
const COLLECTIONS = {
  TEAMS: 'teams',
  PLAYERS: 'players',
  MATCHES: 'matches',
  USERS: 'users',
  QUESTIONS: 'questions',
  PREDICTION_GAMES: 'predictionGames',
  PREDICTION_ANSWERS: 'predictionAnswers'
};

// Initialize Firestore with IPL 2025 data
export const initializeFirestore = async (): Promise<boolean> => {
  try {
    console.log('Starting Firestore initialization...');
    
    // Check if collections exist
    const teamsExist = await collectionExists(COLLECTIONS.TEAMS);
    const playersExist = await collectionExists(COLLECTIONS.PLAYERS);
    const matchesExist = await collectionExists(COLLECTIONS.MATCHES);
    const questionsExist = await collectionExists(COLLECTIONS.QUESTIONS);
    const predictionGamesExist = await collectionExists(COLLECTIONS.PREDICTION_GAMES);
    
    // Initialize Teams if they don't exist
    if (!teamsExist) {
      await initializeTeams();
    } else {
      console.log('Teams collection already exists, skipping initialization');
    }
    
    // Initialize Players if they don't exist
    if (!playersExist) {
      await initializePlayers();
    } else {
      console.log('Players collection already exists, skipping initialization');
    }
    
    // Initialize Matches if they don't exist
    if (!matchesExist) {
      await initializeMatches();
    } else {
      console.log('Matches collection already exists, skipping initialization');
    }
    
    // Initialize Questions if they don't exist
    if (!questionsExist) {
      await initializeQuestions();
    } else {
      console.log('Questions collection already exists, skipping initialization');
    }
    
    // Initialize Prediction Games if they don't exist
    if (!predictionGamesExist) {
      await initializePredictionGames();
    } else {
      console.log('Prediction Games collection already exists, skipping initialization');
    }
    
    console.log('Firestore initialization completed successfully!');
    return true;
  } catch (error) {
    console.error('Error initializing Firestore:', error);
    return false;
  }
};

// Initialize IPL Teams
export const initializeTeams = async () => {
  console.log('Initializing Teams collection...');
  
  const teams = [
    {
      id: 'mi',
      name: 'Mumbai Indians',
      shortName: 'MI',
      primaryColor: '#004BA0',
      secondaryColor: '#D1AB3E',
      logo: '/images/teams/mi.png'
    },
    {
      id: 'csk',
      name: 'Chennai Super Kings',
      shortName: 'CSK',
      primaryColor: '#FFFF3C',
      secondaryColor: '#0081E9',
      logo: '/images/teams/csk.png'
    },
    {
      id: 'rcb',
      name: 'Royal Challengers Bengaluru',
      shortName: 'RCB',
      primaryColor: '#EC1C24',
      secondaryColor: '#000000',
      logo: '/images/teams/rcb.png'
    },
    {
      id: 'kkr',
      name: 'Kolkata Knight Riders',
      shortName: 'KKR',
      primaryColor: '#3A225D',
      secondaryColor: '#B3A123',
      logo: '/images/teams/kkr.png'
    },
    {
      id: 'dc',
      name: 'Delhi Capitals',
      shortName: 'DC',
      primaryColor: '#0078BC',
      secondaryColor: '#EF1C25',
      logo: '/images/teams/dc.png'
    },
    {
      id: 'pbks',
      name: 'Punjab Kings',
      shortName: 'PBKS',
      primaryColor: '#ED1B24',
      secondaryColor: '#A7A9AC',
      logo: '/images/teams/pbks.png'
    },
    {
      id: 'rr',
      name: 'Rajasthan Royals',
      shortName: 'RR',
      primaryColor: '#254AA5',
      secondaryColor: '#FF69B4',
      logo: '/images/teams/rr.png'
    },
    {
      id: 'srh',
      name: 'Sunrisers Hyderabad',
      shortName: 'SRH',
      primaryColor: '#FF822A',
      secondaryColor: '#000000',
      logo: '/images/teams/srh.png'
    },
    {
      id: 'gt',
      name: 'Gujarat Titans',
      shortName: 'GT',
      primaryColor: '#1C1C1C',
      secondaryColor: '#0B4973',
      logo: '/images/teams/gt.png'
    },
    {
      id: 'lsg',
      name: 'Lucknow Super Giants',
      shortName: 'LSG',
      primaryColor: '#A72056',
      secondaryColor: '#FFCC00',
      logo: '/images/teams/lsg.png'
    }
  ];
  
  const batch = writeBatch(db);
  
  teams.forEach(team => {
    const teamRef = doc(db, COLLECTIONS.TEAMS, team.id);
    batch.set(teamRef, {
      ...team,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
  });
  
  await batch.commit();
  console.log(`Added ${teams.length} teams to Firestore`);
};

// Initialize Players
export const initializePlayers = async () => {
  console.log('Initializing Players collection...');
  
  // Sample players for each team
  const playersByTeam = {
    'mi': [
      { name: 'Rohit Sharma', role: 'Batsman', age: '38' },
      { name: 'Jasprit Bumrah', role: 'Bowler', age: '31' },
      { name: 'Hardik Pandya', role: 'All-rounder', age: '31' },
      { name: 'Ishan Kishan', role: 'Wicket-keeper', age: '27' },
      { name: 'Suryakumar Yadav', role: 'Batsman', age: '34' }
    ],
    'csk': [
      { name: 'MS Dhoni', role: 'Wicket-keeper', age: '43' },
      { name: 'Ravindra Jadeja', role: 'All-rounder', age: '36' },
      { name: 'Ruturaj Gaikwad', role: 'Batsman', age: '28' },
      { name: 'Deepak Chahar', role: 'Bowler', age: '32' },
      { name: 'Moeen Ali', role: 'All-rounder', age: '37' }
    ],
    'rcb': [
      { name: 'Virat Kohli', role: 'Batsman', age: '36' },
      { name: 'Glenn Maxwell', role: 'All-rounder', age: '36' },
      { name: 'Mohammed Siraj', role: 'Bowler', age: '31' },
      { name: 'Faf du Plessis', role: 'Batsman', age: '40' },
      { name: 'Dinesh Karthik', role: 'Wicket-keeper', age: '40' }
    ],
    'kkr': [
      { name: 'Shreyas Iyer', role: 'Batsman', age: '30' },
      { name: 'Andre Russell', role: 'All-rounder', age: '36' },
      { name: 'Sunil Narine', role: 'All-rounder', age: '36' },
      { name: 'Venkatesh Iyer', role: 'All-rounder', age: '30' },
      { name: 'Varun Chakravarthy', role: 'Bowler', age: '33' }
    ],
    'dc': [
      { name: 'Rishabh Pant', role: 'Wicket-keeper', age: '28' },
      { name: 'Axar Patel', role: 'All-rounder', age: '31' },
      { name: 'Kuldeep Yadav', role: 'Bowler', age: '30' },
      { name: 'David Warner', role: 'Batsman', age: '38' },
      { name: 'Anrich Nortje', role: 'Bowler', age: '31' }
    ],
    'pbks': [
      { name: 'Shikhar Dhawan', role: 'Batsman', age: '39' },
      { name: 'Liam Livingstone', role: 'All-rounder', age: '32' },
      { name: 'Arshdeep Singh', role: 'Bowler', age: '26' },
      { name: 'Jonny Bairstow', role: 'Wicket-keeper', age: '35' },
      { name: 'Kagiso Rabada', role: 'Bowler', age: '30' }
    ],
    'rr': [
      { name: 'Sanju Samson', role: 'Wicket-keeper', age: '30' },
      { name: 'Jos Buttler', role: 'Batsman', age: '34' },
      { name: 'Yuzvendra Chahal', role: 'Bowler', age: '34' },
      { name: 'Shimron Hetmyer', role: 'Batsman', age: '28' },
      { name: 'Trent Boult', role: 'Bowler', age: '35' }
    ],
    'srh': [
      { name: 'Pat Cummins', role: 'All-rounder', age: '32' },
      { name: 'Heinrich Klaasen', role: 'Wicket-keeper', age: '33' },
      { name: 'Abhishek Sharma', role: 'All-rounder', age: '24' },
      { name: 'Bhuvneshwar Kumar', role: 'Bowler', age: '34' },
      { name: 'Travis Head', role: 'Batsman', age: '31' }
    ],
    'gt': [
      { name: 'Hardik Pandya', role: 'All-rounder', age: '31' },
      { name: 'Rashid Khan', role: 'Bowler', age: '27' },
      { name: 'Shubman Gill', role: 'Batsman', age: '26' },
      { name: 'Mohammed Shami', role: 'Bowler', age: '35' },
      { name: 'Wriddhiman Saha', role: 'Wicket-keeper', age: '40' }
    ],
    'lsg': [
      { name: 'KL Rahul', role: 'Wicket-keeper', age: '33' },
      { name: 'Marcus Stoinis', role: 'All-rounder', age: '36' },
      { name: 'Nicholas Pooran', role: 'Batsman', age: '29' },
      { name: 'Ravi Bishnoi', role: 'Bowler', age: '24' },
      { name: 'Avesh Khan', role: 'Bowler', age: '28' }
    ]
  };
  
  const batch = writeBatch(db);
  let playerCount = 0;
  
  Object.entries(playersByTeam).forEach(([teamId, players]) => {
    players.forEach((player, index) => {
      const playerId = `${teamId}-player-${index + 1}`;
      const playerRef = doc(db, COLLECTIONS.PLAYERS, playerId);
      
      batch.set(playerRef, {
        id: playerId,
        name: player.name,
        teamId: teamId,
        role: player.role,
        age: player.age,
        image: '', // Would be populated with actual player images
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      playerCount++;
    });
  });
  
  await batch.commit();
  console.log(`Added ${playerCount} players to Firestore`);
};

// Initialize Matches
export const initializeMatches = async () => {
  console.log('Initializing Matches collection...');
  
  // IPL 2025 schedule (example dates)
  const matches = [
    {
      id: 'match-1',
      team1Id: 'mi',
      team2Id: 'csk',
      venue: 'Wankhede Stadium, Mumbai',
      date: new Date('2025-03-22T19:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-2',
      team1Id: 'rcb',
      team2Id: 'pbks',
      venue: 'M. Chinnaswamy Stadium, Bengaluru',
      date: new Date('2025-03-23T15:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-3',
      team1Id: 'kkr',
      team2Id: 'srh',
      venue: 'Eden Gardens, Kolkata',
      date: new Date('2025-03-23T19:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-4',
      team1Id: 'dc',
      team2Id: 'rr',
      venue: 'Arun Jaitley Stadium, Delhi',
      date: new Date('2025-03-24T19:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-5',
      team1Id: 'gt',
      team2Id: 'lsg',
      venue: 'Narendra Modi Stadium, Ahmedabad',
      date: new Date('2025-03-25T19:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-6',
      team1Id: 'csk',
      team2Id: 'rcb',
      venue: 'M. A. Chidambaram Stadium, Chennai',
      date: new Date('2025-03-26T19:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-7',
      team1Id: 'pbks',
      team2Id: 'mi',
      venue: 'IS Bindra Stadium, Mohali',
      date: new Date('2025-03-27T19:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-8',
      team1Id: 'srh',
      team2Id: 'dc',
      venue: 'Rajiv Gandhi International Stadium, Hyderabad',
      date: new Date('2025-03-28T19:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-9',
      team1Id: 'rr',
      team2Id: 'kkr',
      venue: 'Sawai Mansingh Stadium, Jaipur',
      date: new Date('2025-03-29T15:30:00+05:30'),
      status: 'upcoming'
    },
    {
      id: 'match-10',
      team1Id: 'lsg',
      team2Id: 'csk',
      venue: 'Ekana Cricket Stadium, Lucknow',
      date: new Date('2025-03-29T19:30:00+05:30'),
      status: 'upcoming'
    }
  ];
  
  const batch = writeBatch(db);
  
  matches.forEach(match => {
    const matchRef = doc(db, COLLECTIONS.MATCHES, match.id);
    batch.set(matchRef, {
      ...match,
      date: Timestamp.fromDate(match.date),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isPlayoff: false
    });
  });
  
  await batch.commit();
  console.log(`Added ${matches.length} matches to Firestore`);
};

// Initialize Standard Prediction Questions
export const initializeQuestions = async () => {
  console.log("Initializing questions collection...");
  
  try {
    // Check if collection exists and has data
    const questionsRef = collection(db, "questions");
    const questionsSnapshot = await getDocs(questionsRef);
    
    if (!questionsSnapshot.empty) {
      console.log("Questions collection already exists with data. Skipping initialization.");
      return true;
    }
    
    // Define standard questions
    const questions = [
      {
        id: "q1",
        text: "Which team will win the match?",
        type: "winner" as const,
        points: 10,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "q2",
        text: "Who will be the top batsman of the match?",
        type: "topBatsman" as const,
        points: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "q3",
        text: "Who will be the top bowler of the match?",
        type: "topBowler" as const,
        points: 15,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "q4",
        text: "Will there be a century in the match?",
        type: "custom" as const,
        points: 5,
        options: [
          { id: "yes", value: "yes", label: "Yes" },
          { id: "no", value: "no", label: "No" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "q5",
        text: "Will there be a hat-trick in the match?",
        type: "custom" as const,
        points: 5,
        options: [
          { id: "yes", value: "yes", label: "Yes" },
          { id: "no", value: "no", label: "No" },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
    
    // Add questions to Firestore
    for (const question of questions) {
      const docRef = doc(db, "questions", question.id);
      await setDoc(docRef, question);
    }
    
    console.log(`Added ${questions.length} questions to the questions collection.`);
    return true;
  } catch (error) {
    console.error("Error initializing questions collection:", error);
    return false;
  }
}

// Initialize Prediction Games for each match
export const initializePredictionGames = async () => {
  console.log("Initializing prediction games collection...");
  
  try {
    // Check if collection exists and has data
    const predictionGamesRef = collection(db, COLLECTIONS.PREDICTION_GAMES);
    const predictionGamesSnapshot = await getDocs(predictionGamesRef);
    
    if (!predictionGamesSnapshot.empty) {
      console.log("PredictionGames collection already exists with data. Skipping initialization.");
      return true;
    }
    
    // Get all matches
    const matchesRef = collection(db, COLLECTIONS.MATCHES);
    const matchesSnapshot = await getDocs(matchesRef);
    
    if (matchesSnapshot.empty) {
      console.log("No matches found. Skipping prediction games initialization.");
      return false;
    }
    
    // Get all questions
    const questionsRef = collection(db, COLLECTIONS.QUESTIONS);
    const questionsSnapshot = await getDocs(questionsRef);
    
    if (questionsSnapshot.empty) {
      console.log("No questions found. Skipping prediction games initialization.");
      return false;
    }
    
    const questionIds = questionsSnapshot.docs.map(doc => doc.id);
    
    // Sample user IDs (in a real app, these would be actual user IDs)
    const sampleUserIds = [
      "user1",
      "user2",
      "user3",
      "admin"
    ];
    
    // Create a batch
    const batch = writeBatch(db);
    let count = 0;
    
    // Create sample prediction games for each match and user
    matchesSnapshot.forEach(matchDoc => {
      const matchData = matchDoc.data();
      const match = { 
        id: matchDoc.id, 
        team1Id: matchData.team1Id as string,
        team2Id: matchData.team2Id as string
      };
      
      // Create one prediction game per user for this match
      sampleUserIds.forEach(userId => {
        const gameId = `game-${match.id}-${userId}`;
        const gameRef = doc(db, COLLECTIONS.PREDICTION_GAMES, gameId);
        
        batch.set(gameRef, {
          id: gameId,
          matchId: match.id,
          userId: userId,
          title: `Prediction for ${match.team1Id} vs ${match.team2Id}`,
          description: `Make your predictions for the match between ${match.team1Id} and ${match.team2Id}`,
          isActive: true,
          questionIds: questionIds,
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now()
        });
        
        count++;
      });
    });
    
    // Commit the batch
    await batch.commit();
    console.log(`Added ${count} prediction games to Firestore`);
    return true;
  } catch (error) {
    console.error("Error initializing prediction games collection:", error);
    return false;
  }
}

// Default export
export default initializeFirestore;
