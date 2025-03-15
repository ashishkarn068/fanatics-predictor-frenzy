
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PredictionPoll } from "@/lib/types";
import { isPredictionDeadlinePassed, formatDateTime } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface PredictionCardProps {
  poll: PredictionPoll;
  onSubmit: (pollId: string, selectedOptionId: string) => void;
  userPredictionId?: string;
}

const PredictionCard = ({ poll, onSubmit, userPredictionId }: PredictionCardProps) => {
  const [selectedOptionId, setSelectedOptionId] = useState<string>(userPredictionId || "");
  const deadlinePassed = isPredictionDeadlinePassed(poll.deadline);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!selectedOptionId) {
      toast({
        title: "Selection required",
        description: "Please select an option before submitting",
        variant: "destructive",
      });
      return;
    }

    onSubmit(poll.id, selectedOptionId);
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
          <div className="bg-ipl-blue text-white text-xs font-semibold px-2 py-1 rounded">
            {poll.points} pts
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <RadioGroup
            value={selectedOptionId}
            onValueChange={setSelectedOptionId}
            className="space-y-2"
            disabled={deadlinePassed}
          >
            {poll.options.map((option) => (
              <div key={option.id} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option.id}
                  id={option.id}
                  disabled={deadlinePassed}
                />
                <Label
                  htmlFor={option.id}
                  className={`cursor-pointer ${
                    deadlinePassed ? "text-gray-400" : ""
                  }`}
                >
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>

          <div className="pt-2">
            {deadlinePassed ? (
              <div className="text-xs text-red-500">
                Deadline passed: {formatDateTime(poll.deadline)}
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Deadline: {formatDateTime(poll.deadline)}
              </div>
            )}
          </div>

          <Button
            onClick={handleSubmit}
            className="w-full bg-ipl-blue hover:bg-ipl-blue/90"
            disabled={deadlinePassed || !selectedOptionId}
          >
            {userPredictionId ? "Update Prediction" : "Submit Prediction"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PredictionCard;
