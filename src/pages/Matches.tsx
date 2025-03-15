
import Layout from "@/components/Layout";
import MatchList from "@/components/matches/MatchList";
import { matches } from "@/lib/mock-data";

const Matches = () => {
  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8">IPL Matches</h1>
        <MatchList matches={matches} />
      </div>
    </Layout>
  );
};

export default Matches;
