import { db } from '@/lib/firebase';
import { collection, getDocs, deleteDoc, writeBatch, query, where, getDoc, doc, updateDoc } from 'firebase/firestore';
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
        isActive: true,
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
    
    // Verify the totalSixes question specifically
    const totalSixesQuery = query(
      questionsCollection,
      where('type', '==', 'totalSixes')
    );
    
    const totalSixesSnapshot = await getDocs(totalSixesQuery);
    
    if (totalSixesSnapshot.empty) {
      console.error('ERROR: totalSixes question was not created!');
      
      // Manually create it
      const totalSixesRef = doc(questionsCollection, 'total-sixes');
      const manualBatch = writeBatch(db);
      manualBatch.set(totalSixesRef, {
        text: 'How many sixes will be hit in this match?',
        type: 'totalSixes',
        options: [
          { id: 'range1', value: '12-17', label: '12-17 sixes' },
          { id: 'range2', value: '17-22', label: '17-22 sixes' },
          { id: 'range3', value: '22-37', label: '22-37 sixes' },
          { id: 'range4', value: '37-42', label: '37-42 sixes' }
        ],
        points: 15,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      await manualBatch.commit();
      console.log('Manually created totalSixes question with options');
    } else {
      console.log('totalSixes question found successfully:');
      totalSixesSnapshot.forEach(doc => {
        console.log('  - ID:', doc.id);
        console.log('  - Data:', JSON.stringify(doc.data()));
        
        // Check if it has options
        const data = doc.data();
        if (!data.options || !Array.isArray(data.options) || data.options.length === 0) {
          console.log('  - totalSixes question missing options, adding them now');
          
          // Add options to existing question
          const totalSixesRef = doc.ref;
          updateDoc(totalSixesRef, {
            options: [
              { id: 'range1', value: '12-17', label: '12-17 sixes' },
              { id: 'range2', value: '17-22', label: '17-22 sixes' },
              { id: 'range3', value: '22-37', label: '22-37 sixes' },
              { id: 'range4', value: '37-42', label: '37-42 sixes' }
            ],
            updatedAt: new Date().toISOString()
          });
        } else {
          console.log('  - totalSixes options:', JSON.stringify(data.options));
        }
      });
    }
    
    return true;
  } catch (error) {
    console.error('Error refreshing questions:', error);
    return false;
  }
}; 