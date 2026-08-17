// Roadmap guides are authored here in code rather than added from the
// UI. That is deliberate: each step carries detail, concrete actions, a
// warning, and a completion marker, which is far more than a quick "add
// item" form would ever capture. Progress and notes are the only things
// stored per user, keyed by step id, so guides can be expanded or
// reordered later without losing anything already ticked off.

const FARMING_PHASES = [
  {
    id: 'foundation',
    name: 'Foundations',
    icon: '🌱',
    blurb: 'Decide what you are building before spending anything.',
    steps: [
      {
        id: 'f1',
        title: 'Pick one primary enterprise',
        detail:
          'Not "farming" — one specific product. Beef cattle, pastured broilers, laying hens, meat goats, market vegetables, hay. Each is a genuinely different business: different startup cost, different daily labour, and very different speed of getting money back. Broilers can be sold in about 8 weeks. Beef cattle can take two years from purchase to a sale. That gap decides how much cash you need to survive on in the meantime.',
        actions: [
          'Write down 3 enterprises you are considering.',
          'For each, find out: startup cost, time until first sale, hours per week, and whether it needs daily attention 365 days a year.',
          'Cross off any that need more hours than you honestly have.',
          'Of the ones left, pick the one with the fastest time to first sale — that is usually the right first enterprise even if it is not your favourite.',
        ],
        watchOut:
          'Starting two enterprises at once. Nearly everyone underestimates the first one, and the second guarantees both get done badly.',
        doneWhen: 'You can say in one sentence what you produce and who pays for it.',
      },
      {
        id: 'f2',
        title: 'Work out your real time budget',
        detail:
          'Livestock is a no-days-off commitment — animals eat on Christmas morning and during your holiday. Produce is seasonal but savage during planting and harvest. Be honest about hours now, because the enterprise you pick is nearly impossible to change once fencing is in the ground and animals are on site.',
        actions: [
          'Count the hours per week you can commit, including early mornings and weekends.',
          'Subtract 25% for things going wrong — sick animals, broken water lines, weather.',
          'Decide who covers chores when you are ill or away, and confirm they agree.',
          'Decide now: side income alongside a job, or a full replacement? Write it down.',
        ],
        watchOut:
          'Planning around your best week. Plan around a bad week — a bad week is when animals die.',
        doneWhen: 'You have a weekly hours number and a named backup person.',
      },
      {
        id: 'f3',
        title: 'Research your local market before anything else',
        detail:
          'This comes before land and before animals. The question is simple: who near you buys this, and what do they pay? A farm producing something nobody nearby wants is a hobby with extra steps. This step costs almost nothing and prevents the most expensive mistake possible.',
        actions: [
          'Visit 2-3 local farmers markets. Note prices, what sells out early, and what nobody is selling.',
          'Call or visit 5 restaurants, butchers, or grocers. Ask what they buy locally, at what volume and price, and what they cannot get.',
          'Check the nearest livestock auction or produce terminal for current going rates.',
          'Find 2-3 farms near you doing something similar. Ask what sells and what does not — most will talk if you are respectful of their time.',
          'Write down a realistic price per unit you could actually get.',
        ],
        watchOut:
          'Assuming premium prices you read about online. Direct-to-consumer prices from a different region or country may not exist in your area at all.',
        doneWhen: 'You have a written price per unit backed by a real local conversation.',
      },
      {
        id: 'f4',
        title: 'Build a starting budget with 12 months of runway',
        detail:
          'Most first-year failures are cash-flow timing, not bad farming. Money leaves immediately — land, fencing, water, stock, feed — and arrives much later. You need enough to cover everything until the first real sale, plus a margin.',
        actions: [
          'List one-off costs: land or lease deposit, fencing, water infrastructure, shelter, handling setup, equipment, initial stock.',
          'List monthly costs: feed, bedding, fuel, insurance, vet, utilities, loan payments.',
          'Multiply monthly costs by the months until your first sale, from step f1.',
          'Add 20-30% contingency. Something always breaks.',
          'Write down the total, and where that money is coming from.',
        ],
        watchOut:
          'Budgeting to the first sale but not past it. You often need to buy the next batch of stock or seed before the first payment clears.',
        doneWhen: 'You have a total number and a funded source for it.',
      },
      {
        id: 'f5',
        title: 'Visit working farms before you commit',
        detail:
          'A day of real work on someone else\'s farm teaches more than months of reading, and it is free to be wrong there. Many people discover at this stage that the daily reality does not suit them — which is a cheap discovery to make now and an expensive one to make after buying land.',
        actions: [
          'Arrange to spend a full day — ideally several — on a farm running your chosen enterprise.',
          'Go in winter or during the hardest season, not on a pleasant spring morning.',
          'Do the actual chores. Note what is physically hard and what takes longer than expected.',
          'Ask the owner directly: what would you do differently if you started again?',
        ],
        watchOut:
          'Only visiting showcase farms on good days. You want to see the mud, the early start, and the boring repetitive work.',
        doneWhen: 'You have done a full working day and still want to do this.',
      },
    ],
  },
  {
    id: 'land',
    name: 'Land',
    icon: '🏞️',
    blurb: 'The most expensive decision. Nothing later fixes getting it wrong.',
    steps: [
      {
        id: 'l1',
        title: 'Decide: lease first or buy',
        detail:
          'Leasing is usually the smarter first move. It lets you test the enterprise without a mortgage, and by the end you will know exactly what you need in land — which is knowledge you cannot get from viewings. A great many established farms started on leased ground.',
        actions: [
          'Price both: monthly lease in your area vs mortgage payment plus taxes and insurance on a purchase.',
          'If leasing, insist on a written lease of at least 3 years — you should not build fencing on a 1-year handshake.',
          'Check the lease permits your specific use, allows the structures you need, and states who owns improvements you build.',
          'Confirm in writing what happens to your fencing and infrastructure at the end of the lease.',
        ],
        watchOut:
          'Building permanent infrastructure on a short or informal lease. You may be handing the landowner thousands in improvements.',
        doneWhen: 'You have a signed lease or an accepted offer with the use confirmed in writing.',
      },
      {
        id: 'l2',
        title: 'Confirm zoning and permitted use in writing',
        detail:
          'Rules vary enormously by country, state, and county, and they often treat livestock numbers, buildings, on-site sales, and processing as separate permissions. Verbal reassurance from a seller or agent is worth nothing. Get the answer from the authority itself, in writing.',
        actions: [
          'Identify the correct authority: usually county planning, zoning, or the local council.',
          'Ask specifically about: your species and number of animals, any structures you plan, selling from the property, and any processing on site.',
          'Ask what permits are needed and how long they take to obtain.',
          'Get the answer by email or letter, not over the phone. Save it.',
          'Check for restrictive covenants or easements on the deed separately — zoning and covenants are different things.',
        ],
        watchOut:
          'Assuming agricultural zoning permits everything agricultural. On-site sales and processing are frequently restricted even on farmland.',
        doneWhen: 'You hold written confirmation covering your exact intended use.',
      },
      {
        id: 'l3',
        drill: 'farm_land',
        title: 'Verify water — quantity, reliability, and rights',
        detail:
          'Land without reliable water is not usable farmland at any price. Livestock drink far more than people expect: a lactating cow can need 30+ gallons a day in heat. And in many regions having water on your land does not automatically mean you are permitted to use it for stock or irrigation — that is a separate legal question.',
        actions: [
          'Identify every water source: well, spring, creek, pond, municipal connection.',
          'For a well: ask for the well log, depth, and flow rate in gallons per minute. Get it flow-tested if buying.',
          'Get the water quality tested — livestock have tolerances for nitrates, minerals, and bacteria.',
          'Ask the local authority whether your intended use is permitted, especially for surface water and irrigation.',
          'Calculate peak daily demand: animals at maximum headcount, in the hottest month, and check the source covers it.',
        ],
        watchOut:
          'Judging a creek or pond in spring. Ask neighbours whether it runs dry in a bad August — many seasonal sources do.',
        doneWhen: 'You know gallons available per day and have confirmed you may legally use it.',
      },
      {
        id: 'l4',
        title: 'Test the soil and learn the land history',
        detail:
          'Soil determines what will grow and how much feed you must buy in. Past use matters too — former industrial sites, orchards, or dump areas can carry contamination that is slow and expensive to remediate. Knowing before you buy is also leverage on the price.',
        actions: [
          'Take samples from several areas and send them to a lab: pH, nutrients, and organic matter as a minimum.',
          'Ask the seller and the neighbours what the land was used for over the last few decades.',
          'If there is any industrial or dumping history, test for heavy metals and contaminants specifically.',
          'Ask your local agricultural extension office to interpret the results — this service is often free.',
          'Get a quote for correcting anything the test flags, and use it in price negotiation.',
        ],
        watchOut:
          'Taking one sample from the best-looking spot. Sample across the whole property — fields vary enormously.',
        doneWhen: 'You have lab results and know what correcting them costs.',
      },
      {
        id: 'l5',
        title: 'Walk it in the worst weather you can find',
        detail:
          'Sellers show land on nice days for a reason. Rain reveals the drainage failures, the access road that becomes impassable, and the low ground that floods — all things that will shape your daily life and are nearly impossible to fix cheaply.',
        actions: [
          'Visit after heavy rain. Walk the whole boundary, not just the good fields.',
          'Check the access road and gateways — can a feed lorry or livestock trailer get in when it is wet?',
          'Look for standing water, boggy ground, and erosion channels.',
          'Check flood maps for the property, and ask neighbours about past flooding.',
          'Note where you would put animals in the wettest month, and whether that ground works.',
        ],
        watchOut:
          'Falling for a view. The productive question is whether a truck can reach the barn in February.',
        doneWhen: 'You have seen the land wet and know where the problem ground is.',
      },
      {
        id: 'l6',
        title: 'Map the property before you build anything',
        detail:
          'An hour with a map now prevents years of walking further than necessary. Where the water, feed, and handling area sit relative to each other is the single biggest factor in how long daily chores take, every day, forever.',
        actions: [
          'Sketch the property: boundaries, water sources, existing structures, gates, and access.',
          'Mark where you want animals, feed storage, water points, and handling.',
          'Trace your daily chore route on the sketch. Shorten it.',
          'Keep feed storage close to where feeding happens — carrying feed is a daily tax.',
          'Plan gate positions so you can move animals between areas alone.',
        ],
        watchOut:
          'Placing infrastructure where it is convenient to build rather than where it is convenient to use daily.',
        doneWhen: 'You have a sketch with the chore route drawn on it.',
      },
    ],
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    icon: '🚜',
    blurb: 'All of this goes in before animals arrive. Not after.',
    steps: [
      {
        id: 'i1',
        title: 'Perimeter fencing',
        detail:
          'Fencing is routinely the largest early infrastructure cost, and the spec depends entirely on the species — what holds cattle will not hold goats, and neither will contain poultry. Cutting corners here means years of chasing escaped animals, damaged relationships with neighbours, and potential liability if stock reach a road.',
        actions: [
          'Confirm the fencing standard for your specific species — ask two local farmers running the same animals.',
          'Measure the perimeter and get 3 quotes, both for materials only and for installed.',
          'Check who legally owns and maintains each boundary fence — this is often shared with neighbours.',
          'Fence the perimeter first, then subdivide internally later as budget allows.',
          'Budget for a gate wide enough for a trailer or tractor at every area you will need to access.',
        ],
        watchOut:
          'Buying fencing rated for the animal you have now rather than the one you might add. Goats in particular escape almost anything built for cattle.',
        doneWhen: 'The perimeter is stock-proof and you have walked it checking for gaps.',
      },
      {
        id: 'i2',
        title: 'Water distribution to every area',
        detail:
          'Having water on the property is not the same as having it where the animals are, in winter, without hauling buckets. This is the single biggest difference between a manageable daily routine and a miserable one — and it is far cheaper to install before fencing than to retrofit after.',
        actions: [
          'Run supply to every area animals will occupy, not just the main one.',
          'If your climate freezes, install frost-free hydrants or buried lines below the frost line.',
          'Size troughs for peak demand plus a full day of buffer, in case of a pump or supply failure.',
          'Add a shutoff valve at each trough so one leak does not drain the system.',
          'Test the whole system before animals arrive, and again in the first freeze.',
        ],
        watchOut:
          'Planning to haul water "just for now". It becomes permanent, it takes an hour a day, and it is punishing in winter.',
        doneWhen: 'Every area has automatic water that works in your coldest weather.',
      },
      {
        id: 'i3',
        title: 'Shelter and housing',
        detail:
          'Requirements vary by species and climate, and ventilation matters more than warmth for most livestock — poorly ventilated warm housing causes respiratory disease. Some regions also set minimum space or welfare standards, so check before building rather than after.',
        actions: [
          'Confirm any legal minimum space or welfare requirements with your local agricultural authority.',
          'Ask two local farmers what shelter actually works in your climate — wind direction and rain matter more than temperature.',
          'Prioritise ventilation and dryness over insulation for most livestock.',
          'Site shelter on high ground with good drainage, facing away from prevailing wind.',
          'Include a way to confine or separate a sick animal.',
        ],
        watchOut:
          'Building sealed, warm housing. It traps moisture and ammonia and causes more illness than cold does.',
        doneWhen: 'Shelter is built, dry, ventilated, and has a sick pen.',
      },
      {
        id: 'i4',
        title: 'Feed and equipment storage',
        detail:
          'Spoiled feed and rusting equipment are silent recurring losses that never show up as a single painful bill. Rodents in feed are both a cost and a disease risk.',
        actions: [
          'Build or buy dry, rodent-proof feed storage — sealed metal or hard plastic containers at minimum.',
          'Size storage for buying feed in bulk; bulk pricing is materially cheaper than bag-by-bag.',
          'Keep feed close to where feeding happens.',
          'Create a dry, secure place for tools and equipment.',
          'Set a rodent control routine and actually follow it.',
        ],
        watchOut:
          'Storing feed in bags on the floor. Rodents and damp will take a meaningful percentage before you notice.',
        doneWhen: 'Feed is dry, sealed, rodent-proof, and near the feeding point.',
      },
      {
        id: 'i5',
        title: 'Handling setup — build this before stock arrive',
        detail:
          'You need to safely catch, sort, load, and treat animals on your own. Without it, every vet visit, weigh-in, medication, and sale day becomes dangerous and exhausting — and the day you need it most is an emergency when there is no time to improvise.',
        actions: [
          'Build a catch pen, a narrow race or chute, and a loading point at trailer height.',
          'Design it so one person can operate it alone.',
          'Position it where a trailer can reach in bad weather.',
          'Practise moving animals through it calmly before you ever need it urgently.',
          'Ask your vet to look at it — they will spot problems immediately.',
        ],
        watchOut:
          'Planning to "sort it out when needed". The first time you need it will be an emergency, in the dark, in the rain.',
        doneWhen: 'You can catch and load an animal by yourself, calmly.',
      },
      {
        id: 'i6',
        title: 'Manure and waste plan',
        detail:
          'Animals produce a lot of manure, and how you handle it is both an asset and a potential legal issue. Runoff into watercourses is regulated in most places and can bring serious penalties. Handled well, manure replaces fertiliser you would otherwise buy.',
        actions: [
          'Ask your local authority about storage and runoff rules before building anything.',
          'Site storage away from wells, watercourses, and property boundaries.',
          'Plan whether you will compost, spread on your own land, or have it removed.',
          'If spreading, check any rules on timing and quantity in your area.',
          'Size the storage for your wettest season, when spreading is impossible.',
        ],
        watchOut:
          'Siting a manure pile uphill of a well or creek. This is both a health risk and a regulatory problem.',
        doneWhen: 'You have a legal, sited storage area and a plan for where it goes.',
      },
    ],
  },
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐄',
    blurb: 'Start with far fewer than you think you can handle.',
    steps: [
      {
        id: 'a1',
        title: 'Choose species and breed for your conditions',
        detail:
          'Match the animal to your climate, your forage, and your market — not to what looks appealing in photographs. Breeds differ substantially in hardiness, growth rate, temperament, and what buyers will pay. A breed that thrives in one climate can struggle badly in another.',
        actions: [
          'List the breeds that local farmers actually run successfully, and ask them why.',
          'Check each against your climate, your forage type, and your fencing.',
          'For a first enterprise, weight temperament heavily — calm animals are dramatically easier and safer to learn on.',
          'Confirm there is a buyer for that breed and product at the price from step f3.',
          'Choose one breed to start. Mixing breeds early makes it harder to learn what is working.',
        ],
        watchOut:
          'Choosing a rare or heritage breed first. They are often harder to manage and harder to sell without an established market.',
        doneWhen: 'You have one breed chosen, with a local reason and a buyer for it.',
      },
      {
        id: 'a2',
        title: 'Start deliberately small',
        detail:
          'A small first group teaches you the daily rhythm, your true feed costs, and where your setup fails — while mistakes are still cheap. Scaling a system that works is straightforward. Scaling one you have not tested multiplies every problem at once.',
        actions: [
          'Take the number you think you can handle and halve it for year one.',
          'Make sure that smaller number still justifies your infrastructure — do not build for 100 and buy 2.',
          'Run one full production cycle start to finish before increasing numbers.',
          'Write down what broke or was harder than expected during that cycle.',
          'Only scale once you have fixed those things.',
        ],
        watchOut:
          'Buying to fill the space you built. Space is not the limit early on — your time and experience are.',
        doneWhen: 'You have a first-year headcount that is smaller than your instinct.',
      },
      {
        id: 'a3',
        title: 'Source from a reputable breeder',
        detail:
          'Cheap animals from an unknown source routinely arrive with problems that cost far more than the money saved — and can introduce disease to everything you buy afterwards. A good breeder is also an ongoing source of advice, which has real value in year one.',
        actions: [
          'Visit the farm in person. See the whole herd or flock and the conditions, not just the animals for sale.',
          'Ask for health history: vaccinations, treatments, testing, and any herd health status relevant in your area.',
          'Ask what they feed, so you can transition gradually rather than abruptly.',
          'Ask whether they will answer questions after the sale. Good breeders say yes.',
          'Walk away from anyone who will not let you see the herd or refuses to discuss health history.',
        ],
        watchOut:
          'Buying at auction as a beginner. Auctions can be where problem animals are sold, and you have little recourse afterwards.',
        doneWhen: 'You have seen the source herd and hold written health history.',
      },
      {
        id: 'a4',
        title: 'Line up a large-animal vet before you need one',
        detail:
          'Many large-animal vets have limited capacity and will not attend emergencies for people who are not existing clients. Establishing the relationship in advance is the difference between help arriving and not.',
        actions: [
          'Find large-animal vets serving your area — your breeder and neighbouring farms will know who is good.',
          'Call and ask whether they are accepting new clients, and what their emergency policy is.',
          'Register as a client before animals arrive.',
          'Ask what routine preventative care they recommend locally — this varies by region and disease pressure.',
          'Save the emergency number somewhere you can find it at 3am.',
        ],
        watchOut:
          'Assuming any vet will attend. Small-animal practices generally will not treat livestock at all.',
        doneWhen: 'You are a registered client with the emergency number saved.',
      },
      {
        id: 'a5',
        title: 'Plan feed for the whole year, including the lean months',
        detail:
          'Running out of forage in late winter with no plan is a classic and expensive first-year crisis — prices are highest exactly when everyone needs it. Feed is usually the largest ongoing cost, so getting this right also protects your margin.',
        actions: [
          'Estimate consumption per animal per day, then multiply out for the full year.',
          'Work out how many months your own land can feed them, and how many it cannot.',
          'Source the shortfall in advance — buy hay in season, when it is cheapest.',
          'Store enough buffer for a bad season; droughts and hard winters both extend the lean period.',
          'Track actual consumption against your estimate in year one and correct it.',
        ],
        watchOut:
          'Buying feed month to month. You end up paying peak prices in the exact month everyone else is short too.',
        doneWhen: 'You have a written year-round feed plan with the shortfall already sourced.',
      },
      {
        id: 'a6',
        title: 'Set up recordkeeping from day one',
        detail:
          'Without records you cannot tell which animals make money and which quietly lose it — and you may need the records for compliance, movement, or sale regardless. Starting on day one is easy; reconstructing a year later is impossible.',
        actions: [
          'Identify every animal individually — tags, bands, or whatever your area requires.',
          'Check whether your region mandates specific identification or movement records.',
          'Record for each animal: purchase or birth date, cost, weights, treatments, and eventual sale price.',
          'Record herd-level costs too: feed, vet, bedding, fuel.',
          'Review the records at the end of each cycle and calculate cost and profit per head.',
        ],
        watchOut:
          'Keeping it all in your head. It works with three animals and collapses completely by thirty.',
        doneWhen: 'Every animal is identified and you have a running cost record.',
      },
      {
        id: 'a7',
        title: 'Quarantine new arrivals',
        detail:
          'Introducing new animals straight into an established group is one of the most reliable ways to bring disease onto a farm. A quarantine period is cheap insurance, and matters just as much for the second batch as the first.',
        actions: [
          'Set up a separate area, ideally out of nose-to-nose contact with your existing stock.',
          'Ask your vet how long to quarantine and what to watch for with your species.',
          'Use separate equipment and boots, or do quarantine chores last.',
          'Observe daily for signs of illness before mixing.',
          'Do any treatment or testing your vet recommends during this window.',
        ],
        watchOut:
          'Skipping quarantine because the animals look healthy. Many diseases show nothing for the first days or weeks.',
        doneWhen: 'You have a quarantine area ready before the first animals arrive.',
      },
    ],
  },
  {
    id: 'business',
    name: 'Business Setup',
    icon: '📋',
    blurb: 'The unglamorous part that decides whether it survives.',
    steps: [
      {
        id: 'b1',
        title: 'Choose a business structure',
        detail:
          'This affects your liability, your tax treatment, and how you can grow. Livestock and visitors both carry genuine liability exposure — an escaped animal causing a road accident is the scenario people underestimate. The right structure depends on your jurisdiction, so this is worth an hour of professional time.',
        actions: [
          'Find an accountant or attorney who works with farms specifically, not just general small business.',
          'Ask which structure suits your scale, your liability exposure, and your tax position.',
          'Ask about any agricultural tax treatment you may qualify for.',
          'Register the structure and keep the paperwork somewhere safe.',
          'Ask what records you must keep to satisfy it.',
        ],
        watchOut:
          'Copying what a farmer in a different country or state did. Structures and their tax treatment differ substantially by jurisdiction.',
        doneWhen: 'The structure is registered and you know your record obligations.',
      },
      {
        id: 'b2',
        title: 'Licences, registrations, and inspections',
        detail:
          'Requirements depend heavily on what you sell and where. Selling meat, dairy, or eggs typically carries far more oversight than selling live animals or raw produce, and processing usually has its own separate rules. Selling without the right permissions can mean fines and being shut down.',
        actions: [
          'List every product you intend to sell and how it reaches the buyer.',
          'Contact your local agricultural authority and ask what is required for each one specifically.',
          'Ask whether your farm needs registration, a holding number, or movement licences for livestock.',
          'If selling meat, confirm which facilities you are legally required to use for processing.',
          'Find out lead times — some registrations and inspections take months.',
        ],
        watchOut:
          'Assuming selling from your own gate is unregulated. On-farm sales of animal products are frequently controlled.',
        doneWhen: 'You have written confirmation of what is required for each product.',
      },
      {
        id: 'b3',
        title: 'Insurance',
        detail:
          'Standard home or property insurance generally excludes commercial farming activity entirely — verify this rather than assume you are covered. Farm liability is the essential piece; the rest depends on the value of what you are protecting.',
        actions: [
          'Call your existing insurer and ask directly whether farming activity is covered. Get the answer in writing.',
          'Get quotes for farm liability from insurers who specialise in agriculture.',
          'Consider cover for structures, equipment, and stock loss based on their value.',
          'If anyone will visit the property, discuss public liability specifically.',
          'Re-check cover each time you expand or add an enterprise.',
        ],
        watchOut:
          'Assuming your home policy stretches to cover it. Discovering it does not after a claim is the worst possible time.',
        doneWhen: 'You hold a farm policy and have read what it excludes.',
      },
      {
        id: 'b4',
        title: 'Separate the books from day one',
        detail:
          'Untangling mixed personal and farm finances a year later is painful and can cost you legitimate tax treatment. A separate account from the very first purchase makes this effortless instead.',
        actions: [
          'Open a dedicated bank account for the farm before the first purchase.',
          'Put every farm expense and every sale through it, without exception.',
          'Keep receipts — photograph them immediately if paper gets lost.',
          'Set up simple bookkeeping, even a spreadsheet, and update it weekly.',
          'Ask your accountant which categories to track for your tax situation.',
        ],
        watchOut:
          'Paying for feed on a personal card "just this once". It is never just once, and reconstructing it later is miserable.',
        doneWhen: 'A farm account exists and every transaction runs through it.',
      },
      {
        id: 'b5',
        title: 'Investigate agricultural programs and grants',
        detail:
          'Many regions offer cost-share for infrastructure like fencing and water, reduced-rate loans, beginning-farmer programs, or favourable property tax treatment for working farmland. This is frequently unclaimed simply because people do not know it exists.',
        actions: [
          'Contact your local agricultural extension office or equivalent and ask what programs you may qualify for.',
          'Ask specifically about cost-share for fencing, water infrastructure, and soil improvement.',
          'Ask about beginning or new-farmer programs, which often have better terms.',
          'Check whether your land qualifies for agricultural property tax treatment, and what you must do to claim it.',
          'Note application deadlines — many run annually and are easy to miss by a month.',
        ],
        watchOut:
          'Applying after buying. Many cost-share programs will not fund work already completed.',
        doneWhen: 'You have asked the extension office and noted every deadline.',
      },
    ],
  },
  {
    id: 'selling',
    name: 'Selling',
    icon: '💰',
    blurb: 'Production is only half the business.',
    steps: [
      {
        id: 's1',
        title: 'Pick your sales channels',
        detail:
          'Direct-to-consumer pays the most per unit but consumes the most time. Wholesale and auction pay less but absorb volume with far less effort. Most established farms run a mix — direct sales for margin, wholesale for the surplus.',
        actions: [
          'List the channels realistically available to you from your step f3 research.',
          'For each, work out price per unit and hours required per sale.',
          'Calculate what you actually earn per hour through each channel.',
          'Pick a primary channel and one backup for surplus or when the primary is slow.',
          'Confirm any legal requirements for that channel from step b2.',
        ],
        watchOut:
          'Going all-in on direct sales without accounting for the hours. Market days are long, and they are on top of the farming.',
        doneWhen: 'You have a primary channel, a backup, and earnings per hour for both.',
      },
      {
        id: 's2',
        drill: 'farm_money',
        title: 'Price from your real costs',
        detail:
          'Pricing off what neighbours charge without knowing your own numbers is exactly how farms work extremely hard and still lose money. Your costs are not their costs — different land, feed prices, and scale.',
        actions: [
          'Total your cost per unit: feed, vet, bedding, transport, processing, and a share of fixed costs.',
          'Add a realistic value for your own labour. If you do not pay yourself, you are subsidising the buyer.',
          'Add your target margin on top of that total.',
          'Compare the result to local prices from step f3. If your cost exceeds the market price, fix costs or change the plan now.',
          'Recalculate every season, since feed prices move.',
        ],
        watchOut:
          'Leaving your own labour out of the calculation. It makes an unprofitable enterprise look profitable for years.',
        doneWhen: 'You have a price per unit built up from your own real costs.',
      },
      {
        id: 's3',
        title: 'Build the customer list before you have product',
        detail:
          'A waiting list at harvest is worth more than any marketing spend afterwards. Interest costs nothing to collect months in advance, and it tells you whether your pricing is realistic before you are committed.',
        actions: [
          'Start collecting names and contact details as soon as you know what you will produce.',
          'Tell people your expected timing and price, and ask whether they would buy.',
          'Talk to the restaurants and shops from step f3 again once you have a firm date.',
          'Set up one simple way to be found — a page, a listing, or a local group.',
          'Contact the list before harvest, not after.',
        ],
        watchOut:
          'Waiting until product is ready to start selling. Perishable product plus no buyers is how margin disappears.',
        doneWhen: 'You have a contact list and have told them your timing and price.',
      },
      {
        id: 's4',
        title: 'Make repeat business the default',
        detail:
          'Repeat buyers cost nothing to acquire and turn one good season into a stable business. Reliability and communication keep customers more than product quality alone does — being easy to deal with is undervalued.',
        actions: [
          'Deliver consistently: same quality, same quantity, same timing.',
          'Tell customers early when something changes rather than letting them find out.',
          'Ask buyers what they want more of, and what they would change.',
          'Keep a record of who bought what and when, and contact them first next cycle.',
          'Track what proportion of sales are repeat buyers — aim for that share to grow every cycle.',
        ],
        watchOut:
          'Chasing new customers while neglecting existing ones. The existing ones are far cheaper and more predictable.',
        doneWhen: 'You know your repeat-buyer percentage and it is rising.',
      },
    ],
  },
  {
    id: 'growth',
    name: 'Growth',
    icon: '📈',
    blurb: 'Only once the core is genuinely profitable.',
    steps: [
      {
        id: 'g1',
        title: 'Review the numbers honestly every season',
        detail:
          'The records from step a6 only have value if you actually read them. The purpose is to find what quietly loses money — which is often the part you enjoy most, since enjoyable losses are the easiest to keep subsidising without noticing.',
        actions: [
          'At the end of each cycle, calculate cost and profit per head or per unit.',
          'Calculate profit per sales channel separately.',
          'Estimate hours spent and work out your effective hourly rate.',
          'Identify the single worst-performing part of the operation.',
          'Decide explicitly: fix it, or cut it. Write the decision down.',
        ],
        watchOut:
          'Judging by total revenue. Revenue can rise while profit per unit falls, and you only see it in the per-unit numbers.',
        doneWhen: 'You have per-unit profit written down and a decision on the weakest part.',
      },
      {
        id: 'g2',
        title: 'Reinvest into bottlenecks, not more animals',
        detail:
          'Profit should go into whatever currently limits you — usually water, handling, or storage — rather than into more stock. Removing a bottleneck raises the ceiling on everything else; adding animals to a constrained system just makes the constraint hurt more.',
        actions: [
          'Identify what most limits you: time, infrastructure, feed, or market access.',
          'Cost the fix for that specific bottleneck.',
          'Fix it before increasing headcount.',
          'Re-check after fixing — the bottleneck usually moves to something else.',
          'Repeat this each season rather than expanding on instinct.',
        ],
        watchOut:
          'Buying more animals because it is the visible sign of growth. It usually reduces profit per head.',
        doneWhen: 'This season\'s profit went into the bottleneck and it is measurably better.',
      },
      {
        id: 'g3',
        title: 'Add a second enterprise only when the first is stable',
        detail:
          'A complementary enterprise can share the same land and spread risk across seasons — but only once the first runs without constant attention. Adding one while the first still needs firefighting reliably makes both underperform.',
        actions: [
          'Confirm the first enterprise has been profitable for at least a full cycle.',
          'Confirm it runs on routine rather than daily problem-solving.',
          'Choose a second that uses existing land, infrastructure, or your existing customers.',
          'Prefer one whose busy season falls opposite the first, so labour is spread out.',
          'Run the whole foundation phase again for it, starting from market research.',
        ],
        watchOut:
          'Adding a second enterprise to fix a first that is not working. It splits your attention and rarely rescues either.',
        doneWhen: 'The first enterprise is profitable and routine before the second starts.',
      },
    ],
  },
];

import { ROBOTICS_GUIDE } from './roboticsRoadmap';

export const ROADMAP_GUIDES = [
  ROBOTICS_GUIDE,
  {
    id: 'farming',
    name: 'Farming Business',
    icon: '🌾',
    tagline: 'Land, animals, and everything before the first sale',
    phases: FARMING_PHASES,
  },
];

export function guideStepCount(guide) {
  // Course-based guides have no per-phase steps; count phases instead.
  return guide.phases.reduce((n, p) => n + (p.steps ? p.steps.length : 1), 0);
}

export function guideDoneCount(guide, progress) {
  const p = progress || {};
  return guide.phases.reduce((n, ph) => {
    if (ph.steps) return n + ph.steps.filter((st) => p[st.id] && p[st.id].done).length;
    return n + ((p[ph.id] || {}).buildDone ? 1 : 0);
  }, 0);
}

