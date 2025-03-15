import { Team, Player, Match, PredictionPoll, User, Notification, Leaderboard } from './types';

// Teams
export const teams: Team[] = [
  {
    id: '1',
    name: 'Mumbai Indians',
    shortName: 'MI',
    primaryColor: '#004BA0',
    secondaryColor: '#D1AB3E',
    logo: '/images/teams/mi.png',
  },
  {
    id: '2',
    name: 'Chennai Super Kings',
    shortName: 'CSK',
    primaryColor: '#FFFF3C',
    secondaryColor: '#0081E9',
    logo: '/images/teams/csk.png',
  },
  {
    id: '3',
    name: 'Royal Challengers Bengaluru',
    shortName: 'RCB',
    primaryColor: '#EC1C24',
    secondaryColor: '#000000',
    logo: '/images/teams/rcb.png',
  },
  {
    id: '4',
    name: 'Kolkata Knight Riders',
    shortName: 'KKR',
    primaryColor: '#3A225D',
    secondaryColor: '#F2C000',
    logo: '/images/teams/kkr.png',
  },
  {
    id: '5',
    name: 'Delhi Capitals',
    shortName: 'DC',
    primaryColor: '#00008B',
    secondaryColor: '#EF1B23',
    logo: '/images/teams/dc.png',
  },
  {
    id: '6',
    name: 'Punjab Kings',
    shortName: 'PBKS',
    primaryColor: '#ED1B24',
    secondaryColor: '#A7A9AC',
    logo: '/images/teams/pbks.png',
  },
  {
    id: '7',
    name: 'Rajasthan Royals',
    shortName: 'RR',
    primaryColor: '#254AA5',
    secondaryColor: '#EA1A85',
    logo: '/images/teams/rr.png',
  },
  {
    id: '8',
    name: 'Sunrisers Hyderabad',
    shortName: 'SRH',
    primaryColor: '#F7A721',
    secondaryColor: '#E95E0B',
    logo: '/images/teams/srh.png',
  },
  {
    id: '9',
    name: 'Gujarat Titans',
    shortName: 'GT',
    primaryColor: '#1C1C1C',
    secondaryColor: '#09DBFF',
    logo: '/images/teams/gt.png',
  },
  {
    id: '10',
    name: 'Lucknow Super Giants',
    shortName: 'LSG',
    primaryColor: '#A72056',
    secondaryColor: '#FFDB00',
    logo: '/images/teams/lsg.png',
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

// IPL 2025 match schedule based on the official fixtures
export const matches: Match[] = [
  {
    id: '1',
    team1Id: '4', // KKR
    team2Id: '3', // RCB
    venue: 'Eden Gardens, Kolkata',
    date: '2025-03-22T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '2',
    team1Id: '8', // SRH
    team2Id: '7', // RR
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-03-23T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '3',
    team1Id: '2', // CSK
    team2Id: '1', // MI
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-03-23T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '4',
    team1Id: '5', // DC
    team2Id: '10', // LSG
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-03-24T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '5',
    team1Id: '9', // GT
    team2Id: '6', // PBKS
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-03-25T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '6',
    team1Id: '7', // RR
    team2Id: '4', // KKR
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2025-03-26T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '7',
    team1Id: '8', // SRH
    team2Id: '10', // LSG
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-03-27T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '8',
    team1Id: '2', // CSK
    team2Id: '3', // RCB
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-03-28T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '9',
    team1Id: '9', // GT
    team2Id: '1', // MI
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-03-29T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '10',
    team1Id: '5', // DC
    team2Id: '8', // SRH
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-03-29T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '11',
    team1Id: '7', // RR
    team2Id: '2', // CSK
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2025-03-30T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '12',
    team1Id: '1', // MI
    team2Id: '4', // KKR
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-03-30T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '13',
    team1Id: '10', // LSG
    team2Id: '6', // PBKS
    venue: 'Ekana Cricket Stadium, Lucknow',
    date: '2025-03-31T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '14',
    team1Id: '3', // RCB
    team2Id: '9', // GT
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-04-01T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '15',
    team1Id: '4', // KKR
    team2Id: '8', // SRH
    venue: 'Eden Gardens, Kolkata',
    date: '2025-04-02T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '16',
    team1Id: '10', // LSG
    team2Id: '1', // MI
    venue: 'Ekana Cricket Stadium, Lucknow',
    date: '2025-04-03T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '17',
    team1Id: '2', // CSK
    team2Id: '5', // DC
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-04-04T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '18',
    team1Id: '6', // PBKS
    team2Id: '7', // RR
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-04-05T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '19',
    team1Id: '4', // KKR
    team2Id: '10', // LSG
    venue: 'Eden Gardens, Kolkata',
    date: '2025-04-05T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '20',
    team1Id: '8', // SRH
    team2Id: '9', // GT
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-04-06T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '21',
    team1Id: '1', // MI
    team2Id: '3', // RCB
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-04-06T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '22',
    team1Id: '6', // PBKS
    team2Id: '2', // CSK
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-04-07T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '23',
    team1Id: '9', // GT
    team2Id: '7', // RR
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-04-08T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '24',
    team1Id: '3', // RCB
    team2Id: '5', // DC
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-04-09T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '25',
    team1Id: '2', // CSK
    team2Id: '4', // KKR
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-04-10T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '26',
    team1Id: '10', // LSG
    team2Id: '9', // GT
    venue: 'Ekana Cricket Stadium, Lucknow',
    date: '2025-04-11T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '27',
    team1Id: '8', // SRH
    team2Id: '6', // PBKS
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-04-12T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '28',
    team1Id: '7', // RR
    team2Id: '3', // RCB
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2025-04-12T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '29',
    team1Id: '5', // DC
    team2Id: '1', // MI
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-04-13T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '30',
    team1Id: '10', // LSG
    team2Id: '2', // CSK
    venue: 'Ekana Cricket Stadium, Lucknow',
    date: '2025-04-13T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '31',
    team1Id: '6', // PBKS
    team2Id: '4', // KKR
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-04-14T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '32',
    team1Id: '5', // DC
    team2Id: '7', // RR
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-04-15T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '33',
    team1Id: '1', // MI
    team2Id: '8', // SRH
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-04-16T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '34',
    team1Id: '3', // RCB
    team2Id: '6', // PBKS
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-04-17T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '35',
    team1Id: '9', // GT
    team2Id: '5', // DC
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-04-18T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '36',
    team1Id: '7', // RR
    team2Id: '10', // LSG
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2025-04-19T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '37',
    team1Id: '6', // PBKS
    team2Id: '3', // RCB
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-04-19T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '38',
    team1Id: '1', // MI
    team2Id: '2', // CSK
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-04-20T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '39',
    team1Id: '4', // KKR
    team2Id: '9', // GT
    venue: 'Eden Gardens, Kolkata',
    date: '2025-04-20T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '40',
    team1Id: '10', // LSG
    team2Id: '5', // DC
    venue: 'Ekana Cricket Stadium, Lucknow',
    date: '2025-04-21T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '41',
    team1Id: '8', // SRH
    team2Id: '1', // MI
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-04-22T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '42',
    team1Id: '3', // RCB
    team2Id: '7', // RR
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-04-23T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '43',
    team1Id: '2', // CSK
    team2Id: '8', // SRH
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-04-24T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '44',
    team1Id: '4', // KKR
    team2Id: '6', // PBKS
    venue: 'Eden Gardens, Kolkata',
    date: '2025-04-25T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '45',
    team1Id: '1', // MI
    team2Id: '10', // LSG
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-04-26T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '46',
    team1Id: '5', // DC
    team2Id: '3', // RCB
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-04-26T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '47',
    team1Id: '7', // RR
    team2Id: '9', // GT
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2025-04-27T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '48',
    team1Id: '5', // DC
    team2Id: '4', // KKR
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-04-27T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '49',
    team1Id: '2', // CSK
    team2Id: '6', // PBKS
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-04-28T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '50',
    team1Id: '7', // RR
    team2Id: '1', // MI
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2025-04-29T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '51',
    team1Id: '9', // GT
    team2Id: '8', // SRH
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-04-30T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '52',
    team1Id: '3', // RCB
    team2Id: '2', // CSK
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-05-01T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '53',
    team1Id: '4', // KKR
    team2Id: '7', // RR
    venue: 'Eden Gardens, Kolkata',
    date: '2025-05-02T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '54',
    team1Id: '6', // PBKS
    team2Id: '10', // LSG
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-05-03T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '55',
    team1Id: '8', // SRH
    team2Id: '5', // DC
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-05-03T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '56',
    team1Id: '1', // MI
    team2Id: '9', // GT
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-05-04T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '57',
    team1Id: '3', // RCB
    team2Id: '10', // LSG
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-05-04T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '58',
    team1Id: '2', // CSK
    team2Id: '9', // GT
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-05-05T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '59',
    team1Id: '6', // PBKS
    team2Id: '5', // DC
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-05-06T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '60',
    team1Id: '4', // KKR
    team2Id: '1', // MI
    venue: 'Eden Gardens, Kolkata',
    date: '2025-05-07T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '61',
    team1Id: '8', // SRH
    team2Id: '3', // RCB
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-05-08T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '62',
    team1Id: '7', // RR
    team2Id: '6', // PBKS
    venue: 'Sawai Mansingh Stadium, Jaipur',
    date: '2025-05-09T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '63',
    team1Id: '10', // LSG
    team2Id: '8', // SRH
    venue: 'Ekana Cricket Stadium, Lucknow',
    date: '2025-05-10T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '64',
    team1Id: '1', // MI
    team2Id: '5', // DC
    venue: 'Wankhede Stadium, Mumbai',
    date: '2025-05-10T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '65',
    team1Id: '9', // GT
    team2Id: '4', // KKR
    venue: 'Narendra Modi Stadium, Ahmedabad',
    date: '2025-05-11T15:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '66',
    team1Id: '2', // CSK
    team2Id: '7', // RR
    venue: 'M.A. Chidambaram Stadium, Chennai',
    date: '2025-05-11T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '67',
    team1Id: '3', // RCB
    team2Id: '1', // MI
    venue: 'M. Chinnaswamy Stadium, Bengaluru',
    date: '2025-05-12T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '68',
    team1Id: '10', // LSG
    team2Id: '4', // KKR
    venue: 'Ekana Cricket Stadium, Lucknow',
    date: '2025-05-13T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '69',
    team1Id: '6', // PBKS
    team2Id: '9', // GT
    venue: 'Punjab Cricket Association Stadium, Mohali',
    date: '2025-05-14T19:30:00+05:30',
    status: 'upcoming'
  },
  {
    id: '70',
    team1Id: '5', // DC
    team2Id: '2', // CSK
    venue: 'Arun Jaitley Stadium, Delhi',
    date: '2025-05-15T19:30:00+05:30',
    status: 'upcoming'
  },
  // Playoffs
  {
    id: '71',
    team1Id: 'tbd', // Placeholder for Qualifier 1 (1st vs 2nd)
    team2Id: 'tbd',
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-05-20T19:30:00+05:30',
    status: 'upcoming',
    name: 'Qualifier 1'
  },
  {
    id: '72',
    team1Id: 'tbd', // Placeholder for Eliminator (3rd vs 4th)
    team2Id: 'tbd',
    venue: 'Rajiv Gandhi International Stadium, Hyderabad',
    date: '2025-05-21T19:30:00+05:30',
    status: 'upcoming',
    name: 'Eliminator'
  },
  {
    id: '73',
    team1Id: 'tbd', // Placeholder for Qualifier 2 (Loser of Q1 vs Winner of Eliminator)
    team2Id: 'tbd',
    venue: 'Eden Gardens, Kolkata',
    date: '2025-05-23T19:30:00+05:30',
    status: 'upcoming',
    name: 'Qualifier 2'
  },
  {
    id: '74',
    team1Id: 'tbd', // Placeholder for Final
    team2Id: 'tbd',
    venue: 'Eden Gardens, Kolkata',
    date: '2025-05-25T19:30:00+05:30',
    status: 'upcoming',
    name: 'Final'
  }
];

// Generate prediction polls for each match
export const predictionPolls: PredictionPoll[] = matches
  .filter(match => match.team1Id !== 'tbd' && match.team2Id !== 'tbd') // Skip TBD playoff matches
  .flatMap(match => {
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
