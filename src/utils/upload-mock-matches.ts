import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  Timestamp, 
  deleteDoc, 
  getDocs, 
  writeBatch,
  query
} from 'firebase/firestore';
import { matches as mockMatches } from '@/lib/mock-data';
import { teams as mockTeams } from '@/lib/mock-data';
import { COLLECTIONS, createTimestamps } from './firestore-collections';

// This script uploads mock match data to Firestore

// Convert mock match data to Firestore format
const convertMockMatchToFirestore = (mockMatch: any) => {
  // Find team names from team IDs
  const getTeamName = (teamId: string) => {
    if (teamId === 'tbd') return 'TBD'; // Ensure TBD is capitalized consistently
    const team = mockTeams.find(t => t.id === teamId);
    return team ? team.name : 'TBD';
  };

  const team1 = getTeamName(mockMatch.team1Id);
  const team2 = getTeamName(mockMatch.team2Id);

  // Convert date string to Timestamp
  const date = mockMatch.date ? Timestamp.fromDate(new Date(mockMatch.date)) : Timestamp.now();

  // Determine if this is a playoff match - safely check if name exists
  const isPlayoff = mockMatch.name ? 
    ['Qualifier 1', 'Eliminator', 'Qualifier 2', 'Final'].includes(mockMatch.name) : 
    false;
  
  // Create Firestore match object
  const firestoreMatch = {
    id: mockMatch.id,
    team1: team1,
    team2: team2,
    venue: mockMatch.venue,
    date: date,
    status: mockMatch.status || 'upcoming',
    ...(mockMatch.name && { name: mockMatch.name }),
    isPlayoff: isPlayoff,
    playoffRound: isPlayoff ? mockMatch.name : null,
    playoffOrder: isPlayoff ? getPlayoffOrder(mockMatch.name) : null,
    ...createTimestamps()
  };

  return firestoreMatch;
};

// Helper function to get the order of playoff matches for sorting
const getPlayoffOrder = (name: string): number => {
  switch (name) {
    case 'Qualifier 1': return 1;
    case 'Eliminator': return 2;
    case 'Qualifier 2': return 3;
    case 'Final': return 4;
    default: return 0;
  }
};

// Delete all existing matches from Firestore
const deleteAllMatches = async (): Promise<boolean> => {
  try {
    console.log('Deleting all existing matches...');
    
    const matchesCollection = collection(db, COLLECTIONS.MATCHES);
    const matchesSnapshot = await getDocs(query(matchesCollection));
    
    if (matchesSnapshot.empty) {
      console.log('No existing matches to delete');
      return true;
    }
    
    // Use batched writes for better performance
    const batch = writeBatch(db);
    matchesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    console.log(`Deleted ${matchesSnapshot.size} existing matches`);
    return true;
  } catch (error) {
    console.error('Error deleting matches:', error);
    return false;
  }
};

// Upload all mock matches to Firestore
export const uploadMockMatchesToFirestore = async () => {
  try {
    // Log the upload attempt
    console.log('Attempting to upload mock matches to Firestore...');
    
    // First delete all existing matches
    const deleteSuccess = await deleteAllMatches();
    if (!deleteSuccess) {
      console.warn('Failed to delete existing matches, but will continue with upload');
    }
    
    const matchesCollection = collection(db, COLLECTIONS.MATCHES);
    
    // Sort matches to ensure playoffs are at the end and in the correct order
    const sortedMatches = [...mockMatches].sort((a, b) => {
      // Check if either match is a playoff match
      const aIsPlayoff = a.name && ['Qualifier 1', 'Eliminator', 'Qualifier 2', 'Final'].includes(a.name);
      const bIsPlayoff = b.name && ['Qualifier 1', 'Eliminator', 'Qualifier 2', 'Final'].includes(b.name);
      
      // If both are playoff matches, sort by playoff order
      if (aIsPlayoff && bIsPlayoff) {
        return getPlayoffOrder(a.name) - getPlayoffOrder(b.name);
      }
      
      // If only one is a playoff match, put playoffs at the end
      if (aIsPlayoff) return 1;
      if (bIsPlayoff) return -1;
      
      // Otherwise sort by date
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    
    // Process each match
    let successCount = 0;
    let failureCount = 0;
    
    for (const mockMatch of sortedMatches) {
      const firestoreMatch = convertMockMatchToFirestore(mockMatch);
      const matchDocRef = doc(matchesCollection, firestoreMatch.id);
      
      try {
        await setDoc(matchDocRef, firestoreMatch);
        console.log(`Uploaded match ${firestoreMatch.id}: ${firestoreMatch.team1} vs ${firestoreMatch.team2}${firestoreMatch.isPlayoff ? ` (${firestoreMatch.playoffRound})` : ''}`);
        successCount++;
      } catch (error) {
        console.error(`Error uploading match ${firestoreMatch.id}:`, error);
        failureCount++;
        // Continue with the next match even if one fails
      }
    }
    
    console.log(`Upload complete: ${successCount} matches uploaded successfully, ${failureCount} failures`);
    return successCount > 0;
  } catch (error) {
    console.error('Error uploading mock matches to Firestore:', error);
    return false;
  }
};

// Export a function to upload a single match for testing
export const uploadSingleMockMatch = async (matchId: string) => {
  try {
    const mockMatch = mockMatches.find(m => m.id === matchId);
    if (!mockMatch) {
      console.error(`Match with ID ${matchId} not found in mock data`);
      return false;
    }
    
    const firestoreMatch = convertMockMatchToFirestore(mockMatch);
    const matchDocRef = doc(collection(db, COLLECTIONS.MATCHES), firestoreMatch.id);
    
    await setDoc(matchDocRef, firestoreMatch);
    console.log(`Uploaded match ${firestoreMatch.id}: ${firestoreMatch.team1} vs ${firestoreMatch.team2}${firestoreMatch.isPlayoff ? ` (${firestoreMatch.playoffRound})` : ''}`);
    return true;
  } catch (error) {
    console.error('Error uploading mock match to Firestore:', error);
    return false;
  }
};
