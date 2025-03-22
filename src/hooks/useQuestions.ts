import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, getDocs, where, onSnapshot, orderBy } from 'firebase/firestore';

export interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  negativePoints?: number; // Points deducted for wrong answers
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export function useQuestions(activeOnly = true) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    
    // Create query based on active flag
    const questionsCollection = collection(db, 'questions');
    const questionsQuery = activeOnly 
      ? query(questionsCollection, where('isActive', '==', true), orderBy('type'))
      : query(questionsCollection, orderBy('type'));
    
    // Set up real-time listener
    const unsubscribe = onSnapshot(
      questionsQuery,
      (snapshot) => {
        const questionsList: Question[] = [];
        snapshot.forEach(doc => {
          questionsList.push({
            id: doc.id,
            ...doc.data()
          } as Question);
        });
        
        setQuestions(questionsList);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error('Error fetching questions:', err);
        setError(err as Error);
        setLoading(false);
      }
    );
    
    // Cleanup listener on unmount
    return () => unsubscribe();
  }, [activeOnly]);

  // Get a specific question by ID
  const getQuestionById = (id: string): Question | undefined => {
    return questions.find(q => q.id === id);
  };

  // Get a specific question by type
  const getQuestionByType = (type: string): Question | undefined => {
    return questions.find(q => q.type === type);
  };

  // Get points for a question
  const getPointsForQuestion = (idOrType: string): number => {
    const question = getQuestionById(idOrType) || getQuestionByType(idOrType);
    return question?.points || 10; // Default to 10 points if not found
  };

  // Filter questions by type
  const getQuestionsByType = (type: string): Question[] => {
    return questions.filter(q => q.type === type);
  };

  return {
    questions,
    loading,
    error,
    getQuestionById,
    getQuestionByType,
    getPointsForQuestion,
    getQuestionsByType
  };
} 