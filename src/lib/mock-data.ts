import { Team, Player, Match, PredictionPoll, User, Notification, Leaderboard } from './types';

// Teams
export const teams: Team[] = [
  {
    id: '1',
    name: 'Mumbai Indians',
    shortName: 'MI',
    primaryColor: '#004BA0',
    secondaryColor: '#D1AB3E',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/milogo.png',
  },
  {
    id: '2',
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    primaryColor: '#FFFF3C',
    secondaryColor: '#0081E9',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/csklogo.png',
  },
  {
    id: '3',
    name: 'Royal Challengers Bengaluru',
    shortName: 'RCB',
    primaryColor: '#EC1C24',
    secondaryColor: '#000000',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/rcblogo.png',
  },
  {
    id: '4',
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    primaryColor: '#3A225D',
    secondaryColor: '#F2C000',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/kkrlogo.png',
  },
  {
    id: '5',
    name: 'Delhi Capitals',
    shortName: 'DC',
    primaryColor: '#00008B',
    secondaryColor: '#EF1B23',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/dclogo.png',
  },
  {
    id: '6',
    name: 'Punjab Kings',
    shortName: 'PBKS',
    primaryColor: '#ED1B24',
    secondaryColor: '#A7A9AC',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/pbkslogo.png',
  },
  {
    id: '7',
    name: 'Rajasthan Royals',
    shortName: 'RR',
    primaryColor: '#254AA5',
    secondaryColor: '#EA1A85',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/rrlogo.png',
  },
  {
    id: '8',
    name: 'Sunrisers Hyderabad',
    shortName: 'SRH',
    primaryColor: '#F7A721',
    secondaryColor: '#E95E0B',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/srhlogo.png',
  },
  {
    id: '9',
    name: 'Gujarat Titans',
    shortName: 'GT',
    primaryColor: '#1C1C1C',
    secondaryColor: '#09DBFF',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/gtlogo.png',
  },
  {
    id: '10',
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    primaryColor: '#A72056',
    secondaryColor: '#FFDB00',
    logo: 'https://www.iplt20.com/assets/images/franchises/squadlogos/lsglogo.png',
  }
];

// Players (simplified list)
export const players: Player[] = [
  { id: '1', name: 'Rohit Sharma', teamId: '1', role: 'Batsman' },
  { id: '2', name: 'Jasprit Bumrah', teamId: '1', role: 'Bowler' },
  { id: '3', name: 'MS Dhoni', teamId: '2', role: 'Wicket-keeper' },
  { id: '4', name: 'Ravindra Jadeja', teamId: '2', role: 'All-rounder' },
  { id: '5', name: 'Virat Kohli', teamId: '3', role: 'Batsman' },
  { id: '6', name: 'Faf du Plessis', teamId: '3', role: 'Batsman' },
  { id: '7', name: 'Andre Russell', teamId: '4', role: 'All-rounder' },
  { id: '8', name: 'Sunil Narine', teamId: '4', role: 'All-rounder' },
  { id: '9', name: 'Rishabh Pant', teamId: '5', role: 'Wicket-keeper' },
  { id: '10', name: 'Axar Patel', teamId: '5', role: 'All-rounder' },
  { id: '11', name: 'KL Rahul', teamId: '6', role: 'Batsman' },
  { id: '12', name: 'Arshdeep Singh', teamId: '6', role: 'Bowler' },
  { id: '13', name: 'Jos Buttler', teamId: '7', role: 'Batsman' },
  { id: '14', name: 'Yuzvendra Chahal', teamId: '7', role: 'Bowler' },
  { id: '15', name: 'Bhuvneshwar Kumar', teamId: '8', role: 'Bowler' },
  { id: '16', name: 'Heinrich Klaasen', teamId: '8', role: 'Wicket-keeper' },
  { id: '17', name: 'Hardik Pandya', teamId: '9', role: 'All-rounder' },
  { id: '18', name: 'Rashid Khan', teamId: '9', role: 'Bowler' },
  { id: '19', name: 'Nicholas Pooran', teamId: '10', role: 'Wicket-keeper' },
  { id: '20', name: 'Krunal Pandya', teamId: '10', role: 'All-rounder' },
];

// Generate actual IPL 2025 schedule based on ESPNCricinfo
export const matches: Match[] = [
  {
    id: '1',
    team1Id: '2', // CSK
    team2Id: '3', // RCB
    venue: 'M. A. Chidambaram Stadium, Chennai',
    date: '2025-03-22T19:30:00+05:30', // March 22, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '2',
    team1Id: '6', // PBKS
    team2Id: '5', // DC
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-03-23T15:30:00+05:30', // March 23, 2025, 3:30 PM IST
    status: 'upcoming'
  },
  {
    id: '3',
    team1Id: '4', // KKR
    team2Id: '8', // SRH
    venue: 'Eden Gardens, Kolkata',
    date: '2025-03-23T19:30:00+05:30', // March 23, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '4',
    team1Id: '7', // RR
    team2Id: '10', // LSG
    venue: 'Barsapara Cricket Stadium, Guwahati',
    date: '2025-03-24T19:30:00+05:30', // March 24, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '5',
    team1Id: '9', // GT
    team2Id: '1', // MI
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-03-25T19:30:00+05:30', // March 25, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '6',
    team1Id: '3', // RCB
    team2Id: '6', // PBKS
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-03-26T19:30:00+05:30', // March 26, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '7',
    team1Id: '2', // CSK
    team2Id: '9', // GT
    venue: 'M. A. Chidambaram Stadium, Chennai',
    date: '2025-03-27T19:30:00+05:30', // March 27, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '8',
    team1Id: '8', // SRH
    team2Id: '1', // MI
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-03-28T19:30:00+05:30', // March 28, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '9',
    team1Id: '5', // DC
    team2Id: '7', // RR
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-03-29T15:30:00+05:30', // March 29, 2025, 3:30 PM IST
    status: 'upcoming'
  },
  {
    id: '10',
    team1Id: '4', // KKR
    team2Id: '10', // LSG
    venue: 'Eden Gardens, Kolkata',
    date: '2025-03-29T19:30:00+05:30', // March 29, 2025, 7:30 PM IST
    status: 'upcoming'
  },
  {
    id: '11',
    team1Id: '9', // GT
    team2Id: '8', // SRH
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-03-30T15:30:00+05:30', // March 30, 2025, 3:30 PM IST
    status: 'upcoming'
  },
  {
    id: '12',
    team1Id: '1', // MI
    team2Id: '7', // RR
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-03-30T19:30:00+05:30', // March 30, 2025, 7:30 PM IST
    status: 'upcoming'
  }
];

// Generate prediction polls for each match
export const predictionPolls: PredictionPoll[] = matches.flatMap(match => {
  const team1 = teams.find(t => t.id === match.team1Id)!;
  const team2 = teams.find(t => t.id === match.team2Id)!;
  
  const matchPlayers = players.filter(p => 
    p.teamId === match.team1Id || p.teamId === match.team2Id
  );
  
  const batsmen = matchPlayers.filter(p => 
    p.role === 'Batsman' || p.role === 'All-rounder' || p.role === 'Wicket-keeper'
  );
  
  const bowlers = matchPlayers.filter(p => 
    p.role === 'Bowler' || p.role === 'All-rounder'
  );
  
  const matchDate = new Date(match.date);
  const deadline = new Date(matchDate);
  deadline.setMinutes(matchDate.getMinutes() - 30); // Deadline 30 mins before match
  
  return [
    // Match Winner Poll
    {
      id: `${match.id}-winner`,
      matchId: match.id,
      type: 'match-winner',
      title: 'Match Winner',
      description: 'Which team will win this match?',
      options: [
        { id: `${match.id}-winner-1`, value: team1.id, label: team1.name },
        { id: `${match.id}-winner-2`, value: team2.id, label: team2.name }
      ],
      points: 10,
      deadline: deadline.toISOString()
    },
    
    // Top Batsman Poll
    {
      id: `${match.id}-batsman`,
      matchId: match.id,
      type: 'top-batsman',
      title: 'Top Batsman',
      description: 'Who will score the most runs in this match?',
      options: batsmen.map((player, index) => ({
        id: `${match.id}-batsman-${index}`,
        value: player.id,
        label: player.name
      })),
      points: 15,
      deadline: deadline.toISOString()
    },
    
    // Top Bowler Poll
    {
      id: `${match.id}-bowler`,
      matchId: match.id,
      type: 'top-bowler',
      title: 'Top Bowler',
      description: 'Who will take the most wickets in this match?',
      options: bowlers.map((player, index) => ({
        id: `${match.id}-bowler-${index}`,
        value: player.id,
        label: player.name
      })),
      points: 15,
      deadline: deadline.toISOString()
    },
    
    // Powerplay Score Poll
    {
      id: `${match.id}-powerplay`,
      matchId: match.id,
      type: 'powerplay-score',
      title: 'Powerplay Score',
      description: `How many runs will ${team1.name} score in the powerplay (first 6 overs)?`,
      options: [
        { id: `${match.id}-powerplay-1`, value: '0-40', label: '0-40 runs' },
        { id: `${match.id}-powerplay-2`, value: '41-50', label: '41-50 runs' },
        { id: `${match.id}-powerplay-3`, value: '51-60', label: '51-60 runs' },
        { id: `${match.id}-powerplay-4`, value: '61-70', label: '61-70 runs' },
        { id: `${match.id}-powerplay-5`, value: '71+', label: '71+ runs' }
      ],
      points: 15,
      deadline: deadline.toISOString()
    },
    
    // Total Runs Poll
    {
      id: `${match.id}-total-runs`,
      matchId: match.id,
      type: 'total-runs',
      title: 'Total Match Runs',
      description: 'What will be the total runs scored in the match by both teams combined?',
      options: [
        { id: `${match.id}-total-1`, value: '0-250', label: '0-250 runs' },
        { id: `${match.id}-total-2`, value: '251-300', label: '251-300 runs' },
        { id: `${match.id}-total-3`, value: '301-350', label: '301-350 runs' },
        { id: `${match.id}-total-4`, value: '351-400', label: '351-400 runs' },
        { id: `${match.id}-total-5`, value: '401+', label: '401+ runs' }
      ],
      points: 20,
      deadline: deadline.toISOString()
    },
    
    // Winning Margin Poll
    {
      id: `${match.id}-margin`,
      matchId: match.id,
      type: 'winning-margin',
      title: 'Winning Margin',
      description: 'What will be the margin of victory in this match?',
      options: [
        { id: `${match.id}-margin-1`, value: 'runs-0-20', label: 'Victory by 0-20 runs' },
        { id: `${match.id}-margin-2`, value: 'runs-21-40', label: 'Victory by 21-40 runs' },
        { id: `${match.id}-margin-3`, value: 'runs-41+', label: 'Victory by 41+ runs' },
        { id: `${match.id}-margin-4`, value: 'wickets-0-3', label: 'Victory by 0-3 wickets' },
        { id: `${match.id}-margin-5`, value: 'wickets-4-7', label: 'Victory by 4-7 wickets' },
        { id: `${match.id}-margin-6`, value: 'wickets-8-10', label: 'Victory by 8-10 wickets' }
      ],
      points: 10,
      deadline: deadline.toISOString()
    },
    
    // Number of Sixes Poll
    {
      id: `${match.id}-sixes`,
      matchId: match.id,
      type: 'number-of-sixes',
      title: 'Number of Sixes',
      description: 'How many sixes will be hit in total during the match?',
      options: [
        { id: `${match.id}-sixes-1`, value: '0-8', label: '0-8 sixes' },
        { id: `${match.id}-sixes-2`, value: '9-16', label: '9-16 sixes' },
        { id: `${match.id}-sixes-3`, value: '17-24', label: '17-24 sixes' },
        { id: `${match.id}-sixes-4`, value: '25+', label: '25+ sixes' }
      ],
      points: 15,
      deadline: deadline.toISOString()
    },
    
    // Century Scored Poll
    {
      id: `${match.id}-century`,
      matchId: match.id,
      type: 'century-scored',
      title: 'Century Scored',
      description: 'Will any player score a century (100+ runs) in this match?',
      options: [
        { id: `${match.id}-century-1`, value: 'yes', label: 'Yes' },
        { id: `${match.id}-century-2`, value: 'no', label: 'No' }
      ],
      points: 10,
      deadline: deadline.toISOString()
    }
  ];
});

// Mock current user
export const currentUser: User = {
  id: 'current-user',
  name: 'Cricket Fan',
  email: 'cricket.fan@example.com',
  avatar: undefined,
  bio: 'Cricket enthusiast and IPL fan since 2008.',
  totalPoints: 185,
  predictions: [] // We'll populate this as needed
};

// Mock notifications
export const notifications: Notification[] = [
  {
    id: '1',
    userId: 'current-user',
    title: 'Match Reminder',
    message: `${teams[0].name} vs ${teams[1].name} starts in 1 hour. Make your predictions now!`,
    type: 'match-reminder',
    read: false,
    createdAt: new Date().toISOString(),
    linkTo: `/matches/${matches[3].id}`
  },
  {
    id: '2',
    userId: 'current-user',
    title: 'Prediction Results',
    message: 'You scored 20 points from your predictions in the last match!',
    type: 'prediction-result',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    linkTo: `/matches/${matches[2].id}/results`
  },
  {
    id: '3',
    userId: 'current-user',
    title: 'Achievement Unlocked',
    message: 'Streak Master: You correctly predicted 3 match winners in a row!',
    type: 'achievement',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    linkTo: '/profile/achievements'
  }
];

// Mock leaderboard
export const leaderboard: Leaderboard = {
  timeframe: 'season',
  entries: [
    {
      position: 1,
      userId: 'user-1',
      userName: 'CricketMaster',
      userAvatar: undefined,
      points: 456,
      correctPredictions: 38,
      totalPredictions: 64
    },
    {
      position: 2,
      userId: 'user-2',
      userName: 'IPLExpert',
      userAvatar: undefined,
      points: 422,
      correctPredictions: 36,
      totalPredictions: 64
    },
    {
      position: 3,
      userId: 'current-user',
      userName: 'Cricket Fan',
      userAvatar: undefined,
      points: 370,
      correctPredictions: 32,
      totalPredictions: 64
    },
    {
      position: 4,
      userId: 'user-3',
      userName: 'Crickaholic',
      userAvatar: undefined,
      points: 352,
      correctPredictions: 30,
      totalPredictions: 62
    },
    {
      position: 5,
      userId: 'user-4',
      userName: 'BoundaryHitter',
      userAvatar: undefined,
      points: 347,
      correctPredictions: 29,
      totalPredictions: 60
    },
    {
      position: 6,
      userId: 'user-5',
      userName: 'WicketTaker',
      userAvatar: undefined,
      points: 341,
      correctPredictions: 28,
      totalPredictions: 64
    },
    {
      position: 7,
      userId: 'user-6',
      userName: 'SixMachine',
      userAvatar: undefined,
      points: 335,
      correctPredictions: 27,
      totalPredictions: 60
    },
    {
      position: 8,
      userId: 'user-7',
      userName: 'GooglySpin',
      userAvatar: undefined,
      points: 328,
      correctPredictions: 26,
      totalPredictions: 56
    },
    {
      position: 9,
      userId: 'user-8',
      userName: 'YorkerKing',
      userAvatar: undefined,
      points: 310,
      correctPredictions: 24,
      totalPredictions: 64
    },
    {
      position: 10,
      userId: 'user-9',
      userName: 'CoverDrive',
      userAvatar: undefined,
      points: 302,
      correctPredictions: 23,
      totalPredictions: 60
    }
  ]
};
