import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, deleteDoc, query, orderBy } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash, Edit, Plus, Save, X } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface Question {
  id: string;
  text: string;
  type: string;
  points: number;
  negativePoints?: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function QuestionManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    type: 'custom',
    points: 10,
    negativePoints: 0,
    isActive: true
  });
  const { toast } = useToast();

  // Question types available
  const questionTypes = [
    { value: 'winner', label: 'Match Winner' },
    { value: 'topBatsman', label: 'Top Batsman' },
    { value: 'topBowler', label: 'Top Bowler' },
    { value: 'highestTotal', label: 'Highest Total' },
    { value: 'moreSixes', label: 'More Sixes' },
    { value: 'custom', label: 'Custom Question' }
  ];

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const questionsCollection = collection(db, 'questions');
      const questionsQuery = query(questionsCollection, orderBy('type'));
      const snapshot = await getDocs(questionsQuery);
      
      const questionsList: Question[] = [];
      snapshot.forEach(doc => {
        questionsList.push({
          id: doc.id,
          ...doc.data()
        } as Question);
      });
      
      setQuestions(questionsList);
    } catch (error) {
      console.error('Error fetching questions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load questions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      if (!newQuestion.text || !newQuestion.type) {
        toast({
          title: 'Validation Error',
          description: 'Question text and type are required',
          variant: 'destructive'
        });
        return;
      }

      const questionsCollection = collection(db, 'questions');
      const newQuestionRef = doc(questionsCollection);
      
      // Create standardized ID based on type
      const questionId = newQuestion.type === 'custom' 
        ? `custom-${Date.now()}`
        : `${newQuestion.type}-${Date.now()}`;
      
      const questionData = {
        text: newQuestion.text,
        type: newQuestion.type,
        points: newQuestion.points || 10,
        negativePoints: Math.abs(newQuestion.negativePoints || 0),
        isActive: newQuestion.isActive !== false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'questions', questionId), questionData);
      
      toast({
        title: 'Success',
        description: 'Question created successfully'
      });
      
      setNewQuestion({
        text: '',
        type: 'custom',
        points: 10,
        negativePoints: 0,
        isActive: true
      });
      
      fetchQuestions();
    } catch (error) {
      console.error('Error creating question:', error);
      toast({
        title: 'Error',
        description: 'Failed to create question',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion || !editingQuestion.id) return;
    
    try {
      const questionRef = doc(db, 'questions', editingQuestion.id);
      
      await updateDoc(questionRef, {
        text: editingQuestion.text,
        points: editingQuestion.points,
        negativePoints: Math.abs(editingQuestion.negativePoints || 0),
        isActive: editingQuestion.isActive,
        updatedAt: new Date().toISOString()
      });
      
      toast({
        title: 'Success',
        description: 'Question updated successfully'
      });
      
      setEditingQuestion(null);
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      toast({
        title: 'Error',
        description: 'Failed to update question',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question? This action cannot be undone.')) {
      return;
    }
    
    try {
      await deleteDoc(doc(db, 'questions', questionId));
      
      toast({
        title: 'Success',
        description: 'Question deleted successfully'
      });
      
      fetchQuestions();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete question',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Management</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="view">
          <TabsList className="mb-4">
            <TabsTrigger value="view">View Questions</TabsTrigger>
            <TabsTrigger value="add">Add Question</TabsTrigger>
          </TabsList>
          
          <TabsContent value="view">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                <span className="ml-3">Loading questions...</span>
              </div>
            ) : questions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No questions found. Add some questions to get started.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Question Text</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Points Deduction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {questions.map(question => (
                      <TableRow key={question.id}>
                        <TableCell className="font-medium">
                          {editingQuestion?.id === question.id ? (
                            <div className="text-sm font-semibold">{question.type}</div>
                          ) : (
                            <div className="text-sm font-semibold">{question.type}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingQuestion?.id === question.id ? (
                            <Input 
                              value={editingQuestion.text} 
                              onChange={e => setEditingQuestion({...editingQuestion, text: e.target.value})} 
                            />
                          ) : (
                            question.text
                          )}
                        </TableCell>
                        <TableCell>
                          {editingQuestion?.id === question.id ? (
                            <Input 
                              type="number" 
                              value={editingQuestion.points} 
                              onChange={e => setEditingQuestion({...editingQuestion, points: parseInt(e.target.value)})} 
                              className="w-20"
                            />
                          ) : (
                            question.points
                          )}
                        </TableCell>
                        <TableCell>
                          {editingQuestion?.id === question.id ? (
                            <Input 
                              type="number" 
                              value={-(editingQuestion.negativePoints ?? 0)}
                              onChange={e => setEditingQuestion({...editingQuestion, negativePoints: Math.abs(parseInt(e.target.value))})} 
                              className="w-20"
                              min="-100"
                              max="0"
                            />
                          ) : (
                            -(question.negativePoints ?? 0)
                          )}
                        </TableCell>
                        <TableCell>
                          {editingQuestion?.id === question.id ? (
                            <Select 
                              value={editingQuestion.isActive ? "active" : "inactive"}
                              onValueChange={value => setEditingQuestion({...editingQuestion, isActive: value === "active"})}
                            >
                              <SelectTrigger className="w-28">
                                <SelectValue placeholder="Status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">Inactive</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${question.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                              {question.isActive ? 'Active' : 'Inactive'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingQuestion?.id === question.id ? (
                            <div className="flex space-x-2">
                              <Button size="sm" onClick={handleUpdateQuestion} className="p-1 h-8 w-8">
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingQuestion(null)} className="p-1 h-8 w-8">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex space-x-2">
                              <Button size="sm" variant="outline" onClick={() => setEditingQuestion(question)} className="p-1 h-8 w-8">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="destructive" onClick={() => handleDeleteQuestion(question.id)} className="p-1 h-8 w-8">
                                <Trash className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="add">
            <div className="grid gap-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Question Type</label>
                  <Select 
                    value={newQuestion.type} 
                    onValueChange={value => setNewQuestion({...newQuestion, type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Points for Correct</label>
                  <Input 
                    type="number" 
                    value={newQuestion.points} 
                    onChange={e => setNewQuestion({...newQuestion, points: parseInt(e.target.value)})} 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Points Deducted if Wrong 
                    <span className="text-gray-500 ml-1 text-xs">(enter a negative value, e.g. -5)</span>
                  </label>
                  <Input 
                    type="number" 
                    value={-(newQuestion.negativePoints || 0)}
                    onChange={e => setNewQuestion({...newQuestion, negativePoints: Math.abs(parseInt(e.target.value))})} 
                    min="-100"
                    max="0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Question Text</label>
                <Input 
                  value={newQuestion.text} 
                  onChange={e => setNewQuestion({...newQuestion, text: e.target.value})} 
                  placeholder="Enter question text"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-blue-600"
                    checked={newQuestion.isActive}
                    onChange={e => setNewQuestion({...newQuestion, isActive: e.target.checked})}
                  />
                  <span className="ml-2 text-sm font-medium">Active (available for predictions)</span>
                </label>
              </div>
              <Button onClick={handleCreateQuestion} className="w-full md:w-auto" disabled={!newQuestion.text || !newQuestion.type}>
                <Plus className="mr-2 h-4 w-4" />
                Create Question
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 