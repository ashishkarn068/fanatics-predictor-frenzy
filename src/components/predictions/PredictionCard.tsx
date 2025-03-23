import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PredictionPoll } from "@/lib/types";
import { isPredictionDeadlinePassed, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PredictionCardProps {
  poll: PredictionPoll;
  onSubmit: (pollId: string, selectedValue: string) => void;
  userPrediction?: string;
}

const PredictionCard = ({ poll, onSubmit, userPrediction }: PredictionCardProps) => {
  const [selectedValue, setSelectedValue] = useState<string>(userPrediction || "");
  const [inputValue, setInputValue] = useState<string>(userPrediction || "");
  const deadlinePassed = isPredictionDeadlinePassed(poll.deadline);
  const { toast } = useToast();

  const handleSubmit = () => {
    let valueToSubmit = "";
    
    if (poll.type === 'single') {
      valueToSubmit = selectedValue;
    } else if (poll.type === 'number' || poll.type === 'text') {
      valueToSubmit = inputValue;
    }
    
    if (!valueToSubmit) {
      toast({
        title: "Input required",
        description: "Please provide a prediction before submitting",
        variant: "destructive",
      });
      return;
    }

    onSubmit(poll.id, valueToSubmit);
    toast({
      title: "Prediction submitted!",
      description: "Your prediction has been recorded.",
    });
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-lg">{poll.title}</CardTitle>
            <CardDescription>{poll.description}</CardDescription>
          </div>
          <div className="bg-blue-600 text-white text-xs font-semibold px-2 py-1 rounded">
            {poll.points} pts
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {deadlinePassed ? (
          <div className="text-sm text-gray-500 italic">
            Predictions closed at {formatDateTime(poll.deadline)}
            {userPrediction && (
              <div className="mt-2 p-2 bg-gray-100 rounded-md">
                <p className="font-medium">Your prediction:</p>
                <p>{userPrediction}</p>
              </div>
            )}
          </div>
        ) : (
          <>
            {poll.type === 'single' && poll.options.length > 0 && (
              <RadioGroup value={selectedValue} onValueChange={setSelectedValue} className="space-y-2">
                {poll.options.map((option) => (
                  <div key={option.id} className="flex items-center space-x-2">
                    <RadioGroupItem value={option.value} id={option.id} />
                    <Label htmlFor={option.id} className="cursor-pointer">{option.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}
            
            {(poll.type === 'number' || poll.type === 'text') && (
              <div className="space-y-2">
                <Input 
                  type={poll.type === 'number' ? 'number' : 'text'}
                  placeholder={`Enter your prediction...`}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                />
              </div>
            )}
            
            <Button 
              onClick={handleSubmit} 
              className="w-full mt-4"
              disabled={deadlinePassed}
            >
              Submit Prediction
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PredictionCard;
