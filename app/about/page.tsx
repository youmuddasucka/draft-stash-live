// app/about/page.tsx

export default function AboutPage() {
  return (
    <section className="space-y-6 max-w-2xl">
      <h1 className="text-3xl font-bold tracking-wide">About Draft Stash</h1>

      <p className="text-sm opacity-80">
        Trading in the NBA is hard. Teams have to juggle player value, team fit, trade eligibility periods, and, of course, the NBA's complex financial restrictions. With all of these road blocks, finding mutually beneficial trades is arduous. Often, draft picks are used to make up for value mismatches in trades. 
      </p>

      <div className="space-y-2 text-sm opacity-70">
        <p>
          Draft picks are the NBA's closest thing to a liquid currency. One reason for this is that draft pick value is extremely divisible. The first overall pick in a draft is up there with the most valuable assets in the NBA, while the last pick of the first round may be worth multiple orders of magnitude less. Due to this, draft picks are often used to facilitate trades which otherwise would have a value mismatch. 
        </p>
      </div>

      <div className="space-y-2 text-sm opacity-70">
        <p>
          Despite the massive variance in value, even the most knowledgable NBA analysts still categorize draft picks as arbitrarily as "firsts" or "seconds". As a community, I know that we are able to acheive a more accurate description of draft capital and its value. 
        </p>
      </div>

      <div className="space-y-2 text-sm opacity-70">
        <p className="font-semibold">The idea</p>
        <p>
          Draft Stash seeks to provide an accurate predicted value for each of the 420 current NBA draft picks. 
        </p>
      </div>

      <div className="space-y-2 text-sm opacity-70">
        <p className="font-semibold">Methodology</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Simulates 10,000 future drafts using projected standings</li>
          <li>Resolves each pick to its final owner based on trade rules</li>
          <li>Applies a blended draft slot valuation curve</li>
          <li>Assigns expected value to the rightful owner of each pick</li>
        </ul>
      </div>

      <div className="space-y-2 text-sm opacity-70">
        <p className="font-semibold">What this provides</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Team-level draft stash valuations</li>
          <li>Expected value and distribution for every pick</li>
        </ul>
      </div>

      <div className="space-y-2 text-sm opacity-70">
        <p className="font-semibold">Future improvements (coming soon)</p>
        <ul className="list-disc list-inside space-y-1">
          <li>More robust future projections</li>
          <li>User-defined projections and confidence inputs</li>
        </ul>
      </div>
    </section>
  );
}

