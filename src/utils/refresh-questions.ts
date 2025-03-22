import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, writeBatch, query, where, getDoc, doc } from 'firebase/firestore';
import { seedQuestionsIfNeeded } from './firestore-collections';

/**
 * Force refresh the questions collection by deleting all existing questions
 * and then re-seeding them with the latest question types.
 */
export const forceRefreshQuestions = async (): Promise<boolean> => {
  try {
    console.log('Starting to refresh questions collection...');
    
    // Get all questions
    const questionsCollection = collection(db, 'questions');
    const questionsSnapshot = await getDocs(questionsCollection);
    
    if (!questionsSnapshot.empty) {
      console.log(`Found ${questionsSnapshot.size} questions to delete`);
      
      // Delete all existing questions
      const batch = writeBatch(db);
      questionsSnapshot.forEach((doc) => {
        batch.delete(doc.ref);
      });
      
      await batch.commit();
      console.log('All existing questions deleted successfully');
    } else {
      console.log('Questions collection is already empty');
    }
    
    // Re-seed questions with latest definitions
    const result = await seedQuestionsIfNeeded();
    console.log('Questions re-seeded successfully');
    
    // Verify the moreSixes question specifically
    const moreSixesQuery = query(
      questionsCollection,
      where('type', '==', 'moreSixes')
    );
    
    const moreSixesSnapshot = await getDocs(moreSixesQuery);
    
    if (moreSixesSnapshot.empty) {
      console.error('ERROR: moreSixes question was not created!');
      
      // Manually create it
      const moreSixesRef = doc(questionsCollection, 'more-sixes');
      const manualBatch = writeBatch(db);
      manualBatch.set(moreSixesRef, {
        text: 'Which team will hit more sixes?',
        type: 'moreSixes',
        points: 5,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      await manualBatch.commit();
      console.log('Manually created moreSixes question');
    } else {
      console.log('moreSixes question found successfully:');
      moreSixesSnapshot.forEach(doc => {
        console.log('  - ID:', doc.id);
        console.log('  - Data:', JSON.stringify(doc.data()));
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error refreshing questions:', error);
    return false;
  }
}; 