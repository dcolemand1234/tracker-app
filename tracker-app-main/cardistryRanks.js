// Rebuilt against the actual Card College Vol. 1 table of contents
// (verified from photos of the book, not guessed). Each rank is now one
// real chapter, in the book's real order, with the book's real page
// numbers — not an invented grouping.
//
// Chapter 1 is fully written with practice steps, as the template.
// Chapters 2-16 carry the real technique names and page numbers as a
// checklist — accurate, but the steps are empty until each gets its own
// pass, the same way the Python days and Maths lessons are being filled
// in one at a time. Note: "Tricks with X" sections in the book are
// effects built from the sleights, not sleights themselves, so they are
// left out of the technique checklist on purpose.
//
// `volume` doubles as the chapter label shown in the UI. `page` is the
// real starting page in Card College Vol. 1, kept so a later pass can
// link this to reading progress on the Bookshelf.

export const CARDISTRY_RANKS = [
  {
    id: 'ch1',
    name: 'Fundamental Techniques',
    volume: 'Card College Vol. 1 — Chapter 1',
    page: 13,
    blurb: 'Grip, squaring, cutting, dealing, and the break — everything else assumes these are automatic.',
    techniques: [
      {
        id: 'c1_1',
        name: 'Dealing Position',
        page: 15,
        note: 'The resting position the deck lives in between everything else. Get this automatic first.',
        video: {
          title: "Learn the Dealer's Grip (Mechanic's Grip)",
          source: '52Kards',
          videoId: 'Zf4Dpcam5as',
          start: 0,
          end: 240,
          note: 'Real, verified video. End timestamp is a safe overestimate — playback ends naturally if the video is shorter.',
        },
        steps: [
          'Deck rests flat in the left hand, roughly centered over the palm — not pinched at the fingertips, not braced against the heel of the hand.',
          'The thumb lies naturally along the left long edge, unbent, resting rather than gripping.',
          'The first (index) finger curls underneath the deck at the outer end, out of sight from above — this is what gives the deck a slight forward tilt and keeps it from sliding off the fingers.',
          'The remaining three fingers rest along the right long edge, lightly curled, more for support than for holding — the deck should not feel clamped.',
          'The inner end of the deck sits against the base of the thumb, roughly in the crease where the thumb joins the palm.',
          'Common error: gripping too hard. Set the deck down, relax the hand completely, then pick the deck back up without adding tension — that relaxed shape is dealing position.',
        ],
      },
      {
        id: 'c1_2',
        name: 'The End Grip',
        page: 17,
        note: 'What the right hand does when it takes control of the deck from above.',
        video: {
          title: 'Learn The End Grip (or Biddle Grip)',
          source: '52Kards',
          videoId: 'pVFOjPOwA9c',
          start: 0,
          end: 200,
          note: 'Real, verified video. End timestamp is a safe overestimate.',
        },
        steps: [
          'The right hand approaches the deck from above, thumb at the inner (near) end, fingers at the outer (far) end.',
          'The thumb contacts the inner end roughly at its center; the fingers spread slightly along the outer end, with the first finger often resting on top rather than curled under.',
          'The grip should be firm enough to lift and control the deck, but the deck should still look untouched from the front — the hand covers the ends, not the faces of the cards.',
          'Elevated dealing position: from ordinary dealing position, tilt the outer end of the deck upward a few degrees toward the spectators. Same left-hand grip, just a friendlier viewing angle — used whenever you want the group to see a spread or a dealt card clearly without changing your hold.',
        ],
      },
      {
        id: 'c1_3',
        name: 'Squaring the Deck',
        page: 19,
        note: 'The reset between almost every other move — it has to look like nothing, every time.',
        video: {
          title: 'How to Square a deck of cards. (Card Magic Tutorial)',
          source: 'Jeremy Tan',
          videoId: 'i8B8oizd2mc',
          start: 0,
          end: 58,
          note: 'Real, verified video — 58 second runtime confirmed.',
        },
        steps: [
          'With the deck in dealing position, bring the right hand over the top in end grip.',
          'Press gently inward from both ends and both sides in one continuous motion — inner/outer with the right thumb and fingers, left/right with the left thumb and fingers — so every card lines up at once rather than one edge at a time.',
          'The all-around square-up extends this into a full pass around all four edges: after the initial press, the right hand travels lightly around the perimeter of the deck as if smoothing it, catching any card that is still slightly proud of the rest.',
          'Keep the motion small and low — a large, obvious squaring action reads as suspicious once a spectator has seen you do it forty times in a row without needing to.',
          'Practice cue: square the deck after every single cut and shuffle in daily life, even outside of sessions, until your hands do it without being told to.',
        ],
      },
      {
        id: 'c1_4',
        name: 'Giving the Deck a Complete Cut',
        page: 20,
        note: 'The plain, honest cut — needed before any false version of it means anything.',
        steps: [
          'From dealing position, the right hand lifts roughly the top half of the deck in end grip and sets it down on the table (or beside the lower portion, if working in the hands).',
          'The left hand then places its remaining lower portion on top of the packet just set down, completing the cut.',
          'The split does not need to be exact — a natural, slightly uneven cut looks far more honest than a perfectly bisected one.',
          'This is the fair action every false cut in Chapter 3 is built to imitate — spend real time on the genuine version so you have an accurate target.',
        ],
      },
      {
        id: 'c1_5',
        name: 'Spreading the Cards in the Hands',
        page: 21,
        note: 'The basic display move for showing the deck is a full, ordinary mix.',
        steps: [
          'Deck in dealing position in the left hand. The right hand takes the deck in end grip and begins to draw away to the right.',
          'As the right hand moves, the left thumb holds back cards one at a time (or in small, controlled groups), letting them fan out into the right hand\'s grip.',
          'The result should be an even ribbon of cards, each overlapping the last by a similar amount, readable from left to right.',
          'Speed and evenness matter more than fully separating every card — a smooth, unhurried spread looks more natural than a fast one.',
        ],
      },
      {
        id: 'c1_6',
        name: 'Outjogging Cards as They are Spread',
        page: 23,
        note: 'A visible mark hidden inside an action that looks purely decorative.',
        steps: [
          'Begin an ordinary spread as above.',
          'As the target card would normally fall into place flush with its neighbors, use the right fingers to nudge it slightly toward you (outjog) instead, so it protrudes from the lower edge of the spread.',
          'Continue spreading the remaining cards normally on either side of the outjogged card.',
          'From the front, this reads as an ordinary if slightly uneven spread — the audience has no reason to notice one card sitting a little differently.',
        ],
      },
      {
        id: 'c1_7',
        name: 'Dribbling Cards',
        page: 24,
        note: 'A looser, more visual way to move cards from hand to hand — cover and display, not a control.',
        video: {
          title: 'How To Do The Card Dribble',
          source: 'Shark Magic',
          videoId: 'yxkSkjjlmMA',
          start: 0,
          end: 200,
          note: 'Real, verified video. End timestamp is a safe overestimate.',
        },
        steps: [
          'Hold the deck above the receiving hand, roughly six inches up, in a loose end grip.',
          'Release cards in small irregular clumps from the bottom of the packet, letting them fall freely rather than sliding them across.',
          'Let the falling cards land in a naturally uneven, slightly spread pile rather than trying to force them square.',
          'Used mostly for byplay and to visually break up a sequence of more precise moves — it should look relaxed, almost careless.',
        ],
      },
      {
        id: 'c1_8',
        name: 'Dealing Cards Face Down — The Draw Method',
        page: 24,
        note: 'The default way cards are handed out or placed on the table.',
        steps: [
          'Deck in dealing position, left thumb resting on the back of the top card.',
          'The thumb draws (pulls) the top card partway off toward the left fingers, which then take over and push it the rest of the way off the deck.',
          'The card is placed or handed out face down, in one continuous motion — thumb-draw, finger-push, release.',
          'Keep every repetition the same speed and the same amount of thumb travel — the method itself becomes invisible once the rhythm is consistent.',
        ],
      },
      {
        id: 'c1_9',
        name: 'Dealing Cards Face Up — The Stud Method',
        page: 26,
        note: 'The face-up counterpart to the draw method, with its own distinct wrist action.',
        steps: [
          'Deck in dealing position. As the top card is drawn off, the wrist flicks slightly so the card turns face up as it leaves the deck.',
          'The turning action comes from the wrist and the receiving hand meeting the card partway, not from flipping it separately after it has already left the deck.',
          'Aim for the card to land face up and reasonably square, not spinning or fluttering — a controlled flip, not a toss.',
          'Practice this at the same rhythm as the draw method so you can move between face-down and face-up dealing without a visible change in tempo.',
        ],
      },
      {
        id: 'c1_10',
        name: 'The Swing Cut',
        page: 27,
        note: 'A one-handed-feeling cut that shows up as cover in a great many later sequences.',
        video: {
          title: 'Swing Cut Tutorial',
          source: '52Kards',
          videoId: '87wlYE-LAJg',
          start: 0,
          end: 220,
          note: 'Real, verified video. End timestamp is a safe overestimate.',
        },
        steps: [
          'Right hand holds the deck from above in end grip.',
          'The left thumb contacts the top of the upper portion at the inner left corner and pulls that packet directly over into the left hand, like a door swinging open on a hinge at the outer end.',
          'The left hand receives the packet in ordinary dealing position.',
          'The right hand, still holding its remaining lower packet, drops it on top of the packet now in the left hand, completing the cut.',
          'The whole action should read as one continuous, almost casual gesture — practise until it needs no visual attention, since it is meant to look incidental rather than deliberate.',
        ],
      },
      {
        id: 'c1_11',
        name: 'The Break — Little-finger and Thumb',
        page: 28,
        note: 'Invisible to everyone but you, and underneath most of what comes later in the book. Worth disproportionate practice time.',
        video: {
          title: 'Tutorial: All things BREAKS (Pinky Break, Thumb Break, Pinky Count)',
          source: 'YouTube',
          videoId: 's1xYXOPPWNI',
          start: 0,
          end: 480,
          note: 'Real, verified video, covers both break types in this technique. End timestamp is a safe overestimate.',
        },
        steps: [
          'Little-finger break: as the deck is squared, the tip of the left little finger slides just inside the inner right corner, stopping at the desired point and holding a small, controlled gap open beneath the cards above it.',
          'Two-handed method: the right hand, in the course of an ordinary squaring action, lifts slightly at the point where the break is wanted, giving the little finger room to slip in.',
          'One-handed method: the left little finger alone levers a small gap open at the corner without help from the right hand — slower to learn, but necessary any time the right hand is occupied elsewhere.',
          'Holding a break under multiple cards uses the same mechanics as a single-card break, just with a slightly thicker gap — the little finger does not need to "count" the cards, only maintain the space.',
          'Thumb break: the same concept held instead by the right thumb at the inner end, used when the left little finger is unavailable or when the right hand is already the one controlling the deck.',
          'Verification: check the break in a mirror at eye level, not by tilting the deck toward your own eyes — the audience never sees the deck from above, so that is not the angle that matters.',
        ],
      },
      {
        id: 'c1_12',
        name: 'The Step',
        page: 32,
        note: 'A visible-only-to-you offset, distinct from a break — a marker you can find by feel or by sight from above.',
        steps: [
          'As a card or small packet is placed onto the deck, let it sit very slightly offset — protruding a hair\'s width from one edge — rather than pushing it fully square.',
          'The offset should be small enough to be invisible from the front but findable at a glance from your own vantage point, or by feel with a fingertip run along that edge.',
          'Used most often to relocate a break later, or to keep track of a packet through an action that would otherwise lose the little-finger break.',
        ],
      },
      {
        id: 'c1_13',
        name: 'The Riffle',
        page: 34,
        note: 'The corner-riffle sound and look, most often used to let a spectator call a stopping point.',
        steps: [
          'Hold the deck in dealing position, angled so one corner is accessible to the thumb.',
          'Run the left thumb down that corner with light, even pressure so the cards spring off the thumb one at a time, producing the characteristic riffling sound.',
          'For a spectator "call stop": begin riffling slowly and evenly from the start, so wherever they call out, the stopping point looks like a fair, unbiased result of an ongoing action rather than a moment you steered toward.',
          'Practice keeping the riffle speed constant — a riffle that visibly slows down as it nears a particular point gives away that you were aiming for it.',
        ],
      },
      {
        id: 'c1_14',
        name: 'The Ribbon Spread',
        page: 35,
        note: 'The clean, full-width display of the entire deck across a table.',
        video: {
          title: 'Beginner Card Flourish Tutorial: Ribbon Spread and Flip',
          source: '52Kards',
          videoId: 'rugccAqYw3w',
          start: 0,
          end: 260,
          note: 'Real, verified video. End timestamp is a safe overestimate.',
        },
        steps: [
          'Place the deck on the table in dealing position, then draw it smoothly to one side using the fingers of one hand along the top of the deck.',
          'As the hand moves, the cards should peel off the bottom of the packet at an even rate, laying down in a continuous overlapping line.',
          'Aim for consistent spacing between cards along the whole spread — an uneven ribbon spread (bunched in places, gappy in others) looks unpractised even though nothing about it is secretly deceptive.',
          'To re-gather: draw the cards back into a squared packet from one end of the spread to the other in a single sweeping motion.',
        ],
      },
    ],
  },
  {
    id: 'ch2',
    name: 'Overhand Shuffle Techniques, Part 1',
    volume: 'Card College Vol. 1 — Chapter 2',
    page: 39,
    blurb: 'The overhand shuffle, and controlling a card through one that looks completely fair.',
    techniques: [
      { id: 'c8', name: 'The Overhand Shuffle', page: 42, note: '', steps: [] },
      { id: 'c9', name: 'Running Single Cards', page: 43, note: '', steps: [] },
      { id: 'c10', name: 'Control of the Top Card', page: 43, note: '', steps: [] },
      { id: 'c11', name: 'Control of the Bottom Card', page: 43, note: '', steps: [] },
      { id: 'c12', name: 'Controlling the Top Stock — The Injog Shuffle', page: 44, note: '', steps: [] },
      { id: 'c13', name: 'Controlling the Bottom Stock', page: 47, note: '', steps: [] },
    ],
  },
  {
    id: 'ch3',
    name: 'False Cut Techniques, Part 1',
    volume: 'Card College Vol. 1 — Chapter 3',
    page: 55,
    blurb: 'Cuts that look genuine but leave the deck exactly as it started.',
    techniques: [
      { id: 'c14', name: 'An Optical False Cut from the Hand', page: 57, note: '', steps: [] },
      { id: 'c15', name: 'The False Swing Cut', page: 58, note: '', steps: [] },
      { id: 'c16', name: 'A Simple False Cut', page: 59, note: '', steps: [] },
      { id: 'c17', name: 'A Triple False Cut', page: 60, note: '', steps: [] },
      { id: 'c18', name: 'The Slip Cut from Dealing Position', page: 61, note: '', steps: [] },
    ],
  },
  {
    id: 'ch4',
    name: 'Card Controls',
    volume: 'Card College Vol. 1 — Chapter 4',
    page: 63,
    blurb: 'Bringing a chosen card back to a known position, several different ways.',
    techniques: [
      { id: 'c19', name: 'The Overhand Shuffle Control', page: 65, note: '', steps: [] },
      { id: 'c20', name: 'The "Whoops!" Control', page: 67, note: '', steps: [] },
      { id: 'c21', name: 'The Diagonal Insertion', page: 68, note: '', steps: [] },
      { id: 'c22', name: 'The Peek Control', page: 69, note: '', steps: [] },
      { id: 'c23', name: 'The Post-peek Overhand Shuffle Control', page: 72, note: '', steps: [] },
      { id: 'c24', name: 'A Peek Control for Two Cards', page: 74, note: '', steps: [] },
      { id: 'c25', name: 'The Multiple Peek Control', page: 75, note: '', steps: [] },
      { id: 'c26', name: 'The One-card Middle Pass', page: 76, note: '', steps: [] },
    ],
  },
  {
    id: 'ch5',
    name: 'Force Techniques, Part 1',
    volume: 'Card College Vol. 1 — Chapter 5',
    page: 81,
    blurb: 'Making a spectator freely choose the card you already decided on.',
    techniques: [
      { id: 'c27', name: 'The Crisscross Force', page: 83, note: '', steps: [] },
      { id: 'c28', name: 'The Balducci Force', page: 85, note: '', steps: [] },
      { id: 'c29', name: 'The Goldin Force', page: 86, note: '', steps: [] },
      { id: 'c30', name: 'The Ten-to-twenty Force', page: 88, note: '', steps: [] },
    ],
  },
  {
    id: 'ch6',
    name: 'Transfer Cuts',
    volume: 'Card College Vol. 1 — Chapter 6',
    page: 93,
    blurb: 'Cuts used to secretly transfer a packet from one position to another.',
    techniques: [
      { id: 'c31', name: 'The Double Cut', page: 93, note: '', steps: [] },
      { id: 'c32', name: 'The Triple Cut, Top to Bottom', page: 95, note: '', steps: [] },
      { id: 'c33', name: 'The Triple Cut, Bottom to Top', page: 97, note: '', steps: [] },
    ],
  },
  {
    id: 'ch7',
    name: 'Riffle Shuffle Techniques',
    volume: 'Card College Vol. 1 — Chapter 7',
    page: 99,
    blurb: 'A more visually convincing shuffle, made false without losing that look.',
    techniques: [
      { id: 'c34', name: 'The Closed Riffle Shuffle', page: 99, note: '', steps: [] },
      { id: 'c35', name: 'Squaring After the Shuffle', page: 101, note: '', steps: [] },
      { id: 'c36', name: 'The Open Riffle Shuffle', page: 103, note: '', steps: [] },
      { id: 'c37', name: 'Control of the Top Stock (Riffle)', page: 105, note: '', steps: [] },
      { id: 'c38', name: 'Control of the Bottom Stock (Riffle)', page: 107, note: '', steps: [] },
      { id: 'c39', name: 'The Waterfall Riffle Shuffle', page: 108, note: '', steps: [] },
    ],
  },
  {
    id: 'ch8',
    name: 'The Glide',
    volume: 'Card College Vol. 1 — Chapter 8',
    page: 119,
    blurb: 'One sleight, one chapter — the fair-looking substitution of the bottom card.',
    techniques: [
      {
        id: 'c40',
        name: 'The Glide',
        page: 121,
        note: 'A short chapter with one real technique — worth the focus that gets it.',
        steps: [
          'Deck in the left hand, dealing position, tilted slightly downward so the face stays hidden from the spectator.',
          'The left fingers contact the face card and draw it back about half an inch.',
          'The right hand approaches as if taking the bottom card, but actually takes the card second from the bottom.',
          'The whole action should look identical to fairly removing the bottom card — practise both side by side until they match.',
        ],
      },
    ],
  },
  {
    id: 'ch9',
    name: 'The Double Lift, Part 1',
    volume: 'Card College Vol. 1 — Chapter 9',
    page: 127,
    blurb: 'Showing two cards as one — arguably the single most useful move in the book.',
    techniques: [
      { id: 'c41', name: 'A Double Lift', page: 129, note: '', steps: [] },
      { id: 'c42', name: 'A Double Turnover', page: 130, note: '', steps: [] },
    ],
  },
  {
    id: 'ch10',
    name: 'The Key Card',
    volume: 'Card College Vol. 1 — Chapter 10',
    page: 135,
    blurb: 'Using one known card to locate an unknown one — the basis of a huge number of effects.',
    techniques: [
      { id: 'c43', name: 'Key-card Placement', page: 137, note: '', steps: [] },
      { id: 'c44', name: 'The Key Card in a Hand-to-hand Spread', page: 138, note: '', steps: [] },
      { id: 'c45', name: 'Key Card in a Ribbon Spread', page: 140, note: '', steps: [] },
      { id: 'c46', name: 'Glimpse and Placement', page: 142, note: '', steps: [] },
      { id: 'c47', name: 'Control in a Hand-to-hand Spread (Key Card)', page: 143, note: '', steps: [] },
      { id: 'c48', name: 'Tabled Ribbon Spread Control', page: 144, note: '', steps: [] },
      { id: 'c49', name: 'Shuffling with a Key Card', page: 144, note: '', steps: [] },
      { id: 'c50', name: 'Letting the Spectator Shuffle with a Key Card', page: 145, note: '', steps: [] },
    ],
  },
  {
    id: 'ch11',
    name: 'Hindu Shuffle Technique',
    volume: 'Card College Vol. 1 — Chapter 11',
    page: 153,
    blurb: 'A different shuffle rhythm entirely — useful precisely because it looks unfamiliar.',
    techniques: [
      { id: 'c51', name: 'The Hindu Shuffle', page: 155, note: '', steps: [] },
      { id: 'c52', name: 'Placing a Key Card with a Hindu Shuffle', page: 157, note: '', steps: [] },
      { id: 'c53', name: 'Glimpsing the Bottom Card with a Hindu Shuffle', page: 157, note: '', steps: [] },
      { id: 'c54', name: 'The Hindu Shuffle Force', page: 158, note: '', steps: [] },
      { id: 'c55', name: 'Hindu Shuffle Control — Single Card', page: 160, note: '', steps: [] },
      { id: 'c56', name: 'Hindu Shuffle Control — Multiple Cards', page: 161, note: '', steps: [] },
    ],
  },
  {
    id: 'ch12',
    name: 'Flourishes, Part 1',
    volume: 'Card College Vol. 1 — Chapter 12',
    page: 167,
    blurb: 'Display moves — less about deception, more about handling that looks good.',
    techniques: [
      { id: 'c57', name: 'Turning Over the Top Card I', page: 169, note: '', steps: [] },
      { id: 'c58', name: 'Turning Over the Top Card II', page: 170, note: '', steps: [] },
      { id: 'c59', name: 'Turning Over the Top Card III', page: 171, note: '', steps: [] },
      { id: 'c60', name: 'The Charlier Cut', page: 172, note: '', steps: [] },
      { id: 'c61', name: 'The Swivel Cut', page: 173, note: '', steps: [] },
      { id: 'c62', name: 'The Boomerang Card', page: 175, note: '', steps: [] },
      { id: 'c63', name: 'The Spring Riffle Shuffle', page: 176, note: '', steps: [] },
      { id: 'c64', name: "Jack Merlin's Riffle Shuffle", page: 177, note: '', steps: [] },
      { id: 'c65', name: 'The Pop-up Card', page: 178, note: '', steps: [] },
      { id: 'c66', name: 'The Wind-up Gag', page: 179, note: '', steps: [] },
      { id: 'c67', name: 'The Two-handed Fan', page: 179, note: '', steps: [] },
      { id: 'c68', name: 'The Broad One-handed Fan', page: 181, note: '', steps: [] },
      { id: 'c69', name: 'The Reverse One-handed Fan', page: 182, note: '', steps: [] },
      { id: 'c70', name: 'The Ribbon Spread Turnover', page: 183, note: '', steps: [] },
    ],
  },
  {
    id: 'ch13',
    name: 'Spread Cull Techniques',
    volume: 'Card College Vol. 1 — Chapter 13',
    page: 185,
    blurb: 'Secretly gathering specific cards to a known position while spreading the deck.',
    techniques: [
      { id: 'c71', name: 'The Spread Cull', page: 187, note: '', steps: [] },
      { id: 'c72', name: 'The Under-the-spread Force', page: 189, note: '', steps: [] },
    ],
  },
  {
    id: 'ch14',
    name: 'Useful Auxiliary Sleights',
    volume: 'Card College Vol. 1 — Chapter 14',
    page: 195,
    blurb: 'Small supporting moves — counting, adding, and buckling cards — that back up bigger sleights.',
    techniques: [
      { id: 'c73', name: 'Thumb Counting', page: 197, note: '', steps: [] },
      { id: 'c74', name: 'The Little-finger Count', page: 201, note: '', steps: [] },
      { id: 'c75', name: 'The Secret Addition of Cards', page: 203, note: '', steps: [] },
      { id: 'c76', name: 'The Braue Addition', page: 204, note: '', steps: [] },
      { id: 'c77', name: 'The Tip-over Addition', page: 206, note: '', steps: [] },
      { id: 'c78', name: 'ATFUS', page: 208, note: '', steps: [] },
      { id: 'c79', name: 'The Single, Double and Multiple Push-over', page: 211, note: '', steps: [] },
      { id: 'c80', name: 'Buckling One or More Cards', page: 212, note: '', steps: [] },
    ],
  },
  {
    id: 'ch15',
    name: 'Force Techniques, Part 2',
    volume: 'Card College Vol. 1 — Chapter 15',
    page: 211,
    blurb: 'The classic force, treated in real depth, plus the riffle force as a reliable fallback.',
    techniques: [
      { id: 'c81', name: 'The Classic Force', page: 217, note: '', steps: [] },
      { id: 'c82', name: 'The Riffle Force', page: 227, note: '', steps: [] },
    ],
  },
  {
    id: 'ch16',
    name: 'The Top Change',
    volume: 'Card College Vol. 1 — Chapter 16',
    page: 233,
    blurb: 'Secretly exchanging one card for another, in full view — the volume\'s closing sleight.',
    techniques: [
      { id: 'c83', name: 'The Top Change', page: 236, note: '', steps: [] },
      { id: 'c84', name: 'Top Change Covers', page: 238, note: '', steps: [] },
      { id: 'c85', name: 'The Top Change as an Out for the Classic Force', page: 239, note: '', steps: [] },
    ],
  },
];

export function rankProgress(rank, mastered) {
  const done = rank.techniques.filter((t) => mastered[t.id]).length;
  return { done, total: rank.techniques.length, complete: done === rank.techniques.length };
}

export function currentRankIndex(mastered) {
  for (let i = 0; i < CARDISTRY_RANKS.length; i++) {
    if (!rankProgress(CARDISTRY_RANKS[i], mastered).complete) return i;
  }
  return CARDISTRY_RANKS.length - 1;
}

export function isRankUnlocked(index, mastered) {
  if (index === 0) return true;
  return rankProgress(CARDISTRY_RANKS[index - 1], mastered).complete;
}

// Given a page number from the Bookshelf's Card College Vol. 1 entry,
// finds which real chapter that page falls in. Purely informational —
// it does not gate technique unlocking, which stays based on mastering
// the previous chapter's techniques.
export function chapterForPage(page) {
  if (!page) return null;
  let match = CARDISTRY_RANKS[0];
  for (const rank of CARDISTRY_RANKS) {
    if (rank.page <= page) match = rank;
    else break;
  }
  return match;
}
