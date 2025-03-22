import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export default function ScoringSystem() {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Prediction Scoring System</CardTitle>
        <CardDescription>
          Learn how points are awarded for your predictions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold text-lg mb-2">Base Points</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Match Winner</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">10 points</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Top Batsman</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">15 points</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Top Bowler</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">15 points</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Powerplay Score</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">15 points</Badge>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span>Highest Total</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">20 points</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Winning Margin</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">10 points</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Number of Sixes</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">15 points</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span>Century Scored</span>
                <Badge variant="outline" className="bg-blue-50 text-blue-700">10 points</Badge>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-2">Accuracy Rules</h3>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="bg-gray-50 text-gray-700 mt-0.5">Exact</Badge>
              <div>
                <p className="font-medium">Match Winner, Century Scored</p>
                <p className="text-sm text-gray-500">Must be exactly correct</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="bg-gray-50 text-gray-700 mt-0.5">Range</Badge>
              <div>
                <p className="font-medium">Powerplay Score</p>
                <p className="text-sm text-gray-500">Within ±5 runs of actual score</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="bg-gray-50 text-gray-700 mt-0.5">Range</Badge>
              <div>
                <p className="font-medium">Highest Total</p>
                <p className="text-sm text-gray-500">Within ±15 runs of actual highest total</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="bg-gray-50 text-gray-700 mt-0.5">Range</Badge>
              <div>
                <p className="font-medium">Winning Margin</p>
                <p className="text-sm text-gray-500">Within ±5 runs or ±1 wicket of actual margin</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="bg-gray-50 text-gray-700 mt-0.5">Range</Badge>
              <div>
                <p className="font-medium">Number of Sixes</p>
                <p className="text-sm text-gray-500">Within ±2 sixes of actual count</p>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-lg mb-2">Bonus Points</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Perfect Match</p>
                <p className="text-sm text-gray-500">Correctly predict all polls in a match</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">+30 points</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Prediction Streak</p>
                <p className="text-sm text-gray-500">Three consecutive correct Match Winner predictions</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">+10 points</Badge>
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">High Accuracy</p>
                <p className="text-sm text-gray-500">At least 6 correct predictions in a match</p>
              </div>
              <Badge variant="outline" className="bg-green-50 text-green-700">+10 points</Badge>
            </div>
          </div>
        </div>

        <Separator />

        <div className="bg-blue-50 p-4 rounded-md">
          <h3 className="font-semibold text-blue-800 mb-2">Total Possible Points</h3>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between">
              <span>Base Points per Match</span>
              <span className="font-medium">110 points</span>
            </div>
            <div className="flex justify-between">
              <span>Maximum Bonus Points</span>
              <span className="font-medium">50 points</span>
            </div>
            <Separator className="my-2" />
            <div className="flex justify-between font-bold">
              <span>Maximum per Match</span>
              <span>160 points</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
