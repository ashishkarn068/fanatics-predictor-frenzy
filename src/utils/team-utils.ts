/**
 * Utility functions for handling team-related operations
 */

/**
 * Maps team names to their respective logo filenames
 * All logos should be stored in public/images/teams directory
 */
export const teamLogoMap: Record<string, string> = {
  'Mumbai Indians': 'mi.png',
  'Chennai Super Kings': 'csk.png',
  'Royal Challengers Bangalore': 'rcb.png',
  'Royal Challengers Bengaluru': 'rcb.png',
  'Kolkata Knight Riders': 'kkr.png',
  'Delhi Capitals': 'dc.png',
  'Rajasthan Royals': 'rr.png',
  'Sunrisers Hyderabad': 'srh.png',
  'Punjab Kings': 'pbks.png',
  'Gujarat Titans': 'gt.png',
  'Lucknow Super Giants': 'lsg.png'
};

/**
 * Team abbreviations for display purposes
 */
export const teamAbbreviations: Record<string, string> = {
  'Mumbai Indians': 'MI',
  'Chennai Super Kings': 'CSK',
  'Royal Challengers Bangalore': 'RCB',
  'Royal Challengers Bengaluru': 'RCB',
  'Kolkata Knight Riders': 'KKR',
  'Delhi Capitals': 'DC',
  'Rajasthan Royals': 'RR',
  'Sunrisers Hyderabad': 'SRH',
  'Punjab Kings': 'PBKS',
  'Gujarat Titans': 'GT',
  'Lucknow Super Giants': 'LSG'
};

/**
 * Team colors for UI elements
 */
export const teamColors: Record<string, { primary: string; secondary: string }> = {
  'Mumbai Indians': { primary: '#004BA0', secondary: '#D1AB3E' },
  'Chennai Super Kings': { primary: '#FFFF3C', secondary: '#0081E9' },
  'Royal Challengers Bangalore': { primary: '#EC1C24', secondary: '#000000' },
  'Royal Challengers Bengaluru': { primary: '#EC1C24', secondary: '#000000' },
  'Kolkata Knight Riders': { primary: '#3A225D', secondary: '#D4AF37' },
  'Delhi Capitals': { primary: '#0078BC', secondary: '#EF1B23' },
  'Rajasthan Royals': { primary: '#254AA5', secondary: '#EB83B5' },
  'Sunrisers Hyderabad': { primary: '#FF822A', secondary: '#000000' },
  'Punjab Kings': { primary: '#ED1B24', secondary: '#A7A9AC' },
  'Gujarat Titans': { primary: '#1B2133', secondary: '#0B4973' },
  'Lucknow Super Giants': { primary: '#A72056', secondary: '#FFCC00' }
};

/**
 * Gets the logo URL for a given team name
 * @param teamName Full team name
 * @returns Path to the team logo
 */
export const getTeamLogoUrl = (teamName: string): string => {
  if (!teamName) {
    return '/images/teams/default.png';
  }
  
  // Handle TBD teams explicitly
  if (teamName === 'TBD') {
    return '/images/teams/default.png';
  }
  
  // Handle playoff qualifiers
  if (teamName.includes('Qualifier') || teamName.includes('Eliminator') || teamName.includes('Final')) {
    return '/images/teams/default.png';
  }
  
  // Handle known teams
  const logoFileName = teamLogoMap[teamName];
  if (logoFileName) {
    return `/images/teams/${logoFileName}`;
  }
  
  // Fallback for unknown teams
  return '/images/teams/default.png';
};

/**
 * Gets the abbreviation for a team name
 * @param teamName Full team name
 * @returns Team abbreviation or the original name if not found
 */
export const getTeamAbbreviation = (teamName: string): string => {
  if (!teamName) {
    return 'TBD';
  }
  
  // Handle TBD teams explicitly
  if (teamName === 'TBD') {
    return 'TBD';
  }
  
  // Special case for RCB (both Bangalore and Bengaluru versions)
  if (teamName.includes('Royal Challengers')) {
    return 'RCB';
  }
  
  // Handle known teams
  const abbreviation = teamAbbreviations[teamName];
  if (abbreviation) {
    return abbreviation;
  }
  
  // For unknown teams, return the first 3 characters or the full name if shorter
  return teamName.length > 3 ? teamName.substring(0, 3).toUpperCase() : teamName.toUpperCase();
};

/**
 * Gets the team colors for UI elements
 * @param teamName Full team name
 * @returns Object with primary and secondary colors
 */
export const getTeamColors = (teamName: string): { primary: string; secondary: string } => {
  if (!teamName) {
    return { primary: '#718096', secondary: '#CBD5E0' };
  }
  
  return teamColors[teamName] || { primary: '#718096', secondary: '#CBD5E0' };
};
