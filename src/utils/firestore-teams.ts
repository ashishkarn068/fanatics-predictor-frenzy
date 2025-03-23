import { db } from '@/lib/firebase';
import { collection, doc, setDoc, getDocs, deleteDoc } from 'firebase/firestore';

// Interface for player data
interface PlayerData {
  name: string;
  role: string;
  age: string;
}

// Interface for team data
interface TeamData {
  team: string;
  squad: PlayerData[];
}

/**
 * Uploads a team and its squad to Firestore
 * @param teamData The team data to upload
 * @returns Promise that resolves when the upload is complete
 */
export const uploadTeamData = async (teamData: TeamData): Promise<void> => {
  try {
    // Create a reference to the teams collection
    const teamsCollection = collection(db, 'teams');
    
    // Create a document with the team name as ID (with spaces removed and lowercase)
    const teamId = teamData.team.replace(/\s+/g, '').toLowerCase();
    const teamDocRef = doc(teamsCollection, teamId);
    
    // Upload the team data
    await setDoc(teamDocRef, {
      name: teamData.team,
      id: teamId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      squad: teamData.squad
    });
    
    console.log(`Team ${teamData.team} uploaded successfully!`);
  } catch (error) {
    console.error('Error uploading team data:', error);
    throw error;
  }
};

/**
 * Uploads multiple teams to Firestore
 * @param teamsData Array of team data to upload
 * @returns Promise that resolves when all uploads are complete
 */
export const uploadMultipleTeams = async (teamsData: TeamData[]): Promise<void> => {
  try {
    // Process each team sequentially
    for (const teamData of teamsData) {
      await uploadTeamData(teamData);
    }
    console.log(`All ${teamsData.length} teams uploaded successfully!`);
  } catch (error) {
    console.error('Error uploading multiple teams:', error);
    throw error;
  }
};

/**
 * Gets all teams from Firestore
 * @returns Promise that resolves with an array of team data
 */
export const getAllTeams = async (): Promise<any[]> => {
  try {
    const teamsCollection = collection(db, 'teams');
    const teamsSnapshot = await getDocs(teamsCollection);
    
    const teams = teamsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return teams;
  } catch (error) {
    console.error('Error getting teams:', error);
    throw error;
  }
};

/**
 * Deletes a team from Firestore
 * @param teamId The ID of the team to delete
 * @returns Promise that resolves when the deletion is complete
 */
export const deleteTeam = async (teamId: string): Promise<void> => {
  try {
    const teamDocRef = doc(db, 'teams', teamId);
    await deleteDoc(teamDocRef);
    console.log(`Team ${teamId} deleted successfully!`);
  } catch (error) {
    console.error('Error deleting team:', error);
    throw error;
  }
};
