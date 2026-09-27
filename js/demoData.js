/**
 * demoData.js: Demo/default data for first-run experience
 *
 * The demo crew and demo topic lists.
 * Separated from config.js to keep configuration constants small.
 */

// ─── Defaults ──────────────────────────────────────────────────────

export const DEFAULT_TOPICS = [
  "What's the best meal you've had recently?",
  "If you could live anywhere for a year, where would it be?",
  "What's something you learned this week?",
  "Describe your perfect weekend.",
  "What's a hobby you'd love to try?",
  "What's the last book, podcast, or show you really enjoyed?",
  "If you could have dinner with anyone (living or dead), who would it be?",
  "What's a skill you're proud of that most people don't know about?",
  "What's the most adventurous thing you've ever done?",
  "If you won the lottery tomorrow, what's the first thing you'd do?",
  "What's your go-to comfort food?",
  "What's a place you've visited that exceeded your expectations?",
  "If you could instantly master any musical instrument, which one?",
  "What's the best piece of advice you've ever received?",
  "What would your dream vacation look like?",
  "If you could switch jobs with anyone for a day, who would it be?",
  "What's a movie or show you could watch over and over?",
  "What's something on your bucket list?",
  "If you could have any superpower, what would it be and why?",
  "What's a small thing that always makes your day better?",
  "What's the most interesting thing you've read or heard lately?",
  "If you could time travel, would you go to the past or the future?",
  "What's a tradition you have that you really enjoy?",
  "What's the best gift you've ever given or received?",
  "If you could learn any language overnight, which one?"
];

// ─── Demo Teams & Topic Lists ──────────────────────────────────────

// The one demo crew: famous names make a first run fun (no need to type anyone in).
// Each legend with the one-liner the welcome screen rotates through (random order), per mode.
// Style: present tense, third person, full name, one short joke that fits the mode.
// Keep them kind: nothing about religion, looks, violence or prison, and no raffle cheating.
const LEGENDS = [
  {
    name: "Socrates",
    standup:    "Socrates answers your question with a question.",
    raffle:     "Socrates asks what a prize really is.",
    icebreaker: "Socrates answers the icebreaker with a question.",
    hotseat:    "Socrates is asking the questions now."
  },
  {
    name: "Alexander the Great",
    standup:    "Alexander the Great wants to conquer the backlog.",
    raffle:     "Alexander the Great is hoping for the grand prize.",
    icebreaker: "Alexander the Great has the greatest travel stories.",
    hotseat:    "Alexander the Great wants a harder question."
  },
  {
    name: "Cleopatra",
    standup:    "Cleopatra will now take your questions. Maybe.",
    raffle:     "Cleopatra has her crown ready. Just in case.",
    icebreaker: "Cleopatra's fun fact is top secret.",
    hotseat:    "Cleopatra has never been in the hot seat. Until now."
  },
  {
    name: "Genghis Khan",
    standup:    "Genghis Khan is expanding the scope.",
    raffle:     "Genghis Khan is surprisingly nervous.",
    icebreaker: "Genghis Khan has the best road-trip stories.",
    hotseat:    "Genghis Khan does not do follow-ups."
  },
  {
    name: "Leonardo da Vinci",
    standup:    "Leonardo da Vinci has new ideas. Again.",
    raffle:     "Leonardo da Vinci is sketching the prize.",
    icebreaker: "Leonardo da Vinci has twelve answers. All sketched.",
    hotseat:    "Leonardo da Vinci answers in mirror writing."
  },
  {
    name: "George Washington",
    standup:    "George Washington insists on going first.",
    raffle:     "George Washington hopes to be drawn first.",
    icebreaker: "George Washington's fun fact is 100% true.",
    hotseat:    "George Washington cannot tell a lie. Careful."
  },
  {
    name: "Swami Vivekananda",
    standup:    "Swami Vivekananda gets a standing ovation. For a standup.",
    raffle:     "Swami Vivekananda cheers for every winner.",
    icebreaker: "Swami Vivekananda opens with \"Sisters and brothers.\"",
    hotseat:    "Swami Vivekananda stays perfectly calm."
  },
  {
    name: "Rasputin",
    standup:    "Rasputin refuses to leave the call.",
    raffle:     "Rasputin has a mysterious feeling about this one.",
    icebreaker: "Rasputin's fun fact remains a mystery.",
    hotseat:    "Rasputin answers with a mysterious smile."
  },
  {
    name: "Albert Einstein",
    standup:    "Albert Einstein says the deadline is relative.",
    raffle:     "Albert Einstein says luck is relative.",
    icebreaker: "Albert Einstein says every answer is relative.",
    hotseat:    "Albert Einstein says 15 seconds is relative."
  },
  {
    name: "Coco Chanel",
    standup:    "Coco Chanel says your UI is so last season.",
    raffle:     "Coco Chanel will wear the prize with style.",
    icebreaker: "Coco Chanel's answer is always in style.",
    hotseat:    "Coco Chanel says the seat is so last season."
  },
  {
    name: "Frida Kahlo",
    standup:    "Frida Kahlo is painting her status update.",
    raffle:     "Frida Kahlo will paint the winner.",
    icebreaker: "Frida Kahlo answers with a self-portrait.",
    hotseat:    "Frida Kahlo answers boldly. As always."
  },
  {
    name: "Bruce Lee",
    standup:    "Bruce Lee has already finished his update.",
    raffle:     "Bruce Lee is ready to catch the prize.",
    icebreaker: "Bruce Lee answered before you asked.",
    hotseat:    "Bruce Lee answers faster than you can ask."
  },
  {
    name: "Muhammad Ali",
    standup:    "Muhammad Ali says when he stands up, he wins standup.",
    raffle:     "Muhammad Ali predicted his round.",
    icebreaker: "Muhammad Ali answers in rhyme.",
    hotseat:    "Muhammad Ali floats through every question."
  },
  {
    name: "Nelson Mandela",
    standup:    "Nelson Mandela gives everyone else a turn first.",
    raffle:     "Nelson Mandela is happy for whoever wins.",
    icebreaker: "Nelson Mandela tells the best stories.",
    hotseat:    "Nelson Mandela answers with grace. Every time."
  },
  {
    name: "Diego Maradona",
    standup:    "Diego Maradona says his code merge was the hand of God.",
    raffle:     "Diego Maradona is crossing his fingers. Both hands.",
    icebreaker: "Diego Maradona only talks about that one goal.",
    hotseat:    "Diego Maradona dribbles past every question."
  }
];

export const DEMO_TEAM = {
  name: "History's Legends",
  quips: {
    standup:    LEGENDS.map(l => l.standup),
    raffle:     LEGENDS.map(l => l.raffle),
    icebreaker: LEGENDS.map(l => l.icebreaker),
    hotseat:    LEGENDS.map(l => l.hotseat)
  },
  size: LEGENDS.length,
  timerSec: 30 // short turns so a demo standup moves along
};

export function demoParticipants() {
  return LEGENDS.map(({ name }) => ({ name, chances: 1, timerSec: null }));
}

export const DEMO_TOPIC_LISTS = [
  { name: "Icebreakers", topics: DEFAULT_TOPICS },
  { name: "Travel", topics: [
    "What's the most memorable trip you've ever taken?",
    "If you could visit any country tomorrow, where would you go?",
    "Beach vacation or mountain adventure?",
    "What's the best local food you've tried while traveling?",
    "Have you ever gotten lost in a foreign city?",
    "What's your favorite mode of travel: plane, train, or road trip?",
    "What destination exceeded all your expectations?",
    "Do you prefer solo travel or group trips?",
    "What's the longest journey you've ever taken?",
    "What's one place you'd love to revisit?",
    "Have you ever had a travel mishap that turned into a great story?",
    "What's on your travel bucket list?",
    "City break or countryside escape?",
    "What's the most unusual accommodation you've stayed in?",
    "Do you plan your trips in detail or go with the flow?",
    "What travel souvenir do you treasure the most?",
    "What's the most beautiful natural sight you've seen?",
    "Have you ever traveled somewhere because of a movie or book?",
    "What's your airport survival strategy?",
    "If you could live abroad for a year, where would you choose?"
  ]},
  { name: "Books & Movies", topics: [
    "What's the last book that kept you up at night reading?",
    "Which movie can you quote from start to finish?",
    "Do you prefer books or their movie adaptations?",
    "What genre do you gravitate toward most?",
    "Is there a book that changed your perspective on something?",
    "What's a movie everyone loves but you just don't get?",
    "Who's your favorite fictional character and why?",
    "What's the best series you've binge-watched recently?",
    "Have you ever read a book that made you cry?",
    "What movie soundtrack is always on your playlist?",
    "If your life were a movie, what genre would it be?",
    "What book would you recommend to everyone?",
    "What's a classic film you think still holds up today?",
    "Do you prefer physical books, e-readers, or audiobooks?",
    "What's a documentary that blew your mind?",
    "Which author would you love to have coffee with?",
    "What's a guilty pleasure movie you secretly enjoy?",
    "Have you ever watched a movie in a language you don't speak?",
    "What childhood book or movie shaped who you are today?",
    "What's the next thing on your reading or watch list?"
  ]},
  { name: "Food & Cooking", topics: [
    "What's your signature dish to cook at home?",
    "Sweet or savory: which do you reach for first?",
    "What's the most adventurous food you've ever tried?",
    "Do you follow recipes or wing it in the kitchen?",
    "What's a comfort food that reminds you of home?",
    "Coffee, tea, or something else to start your day?",
    "What cuisine could you eat every day and never get tired of?",
    "Have you ever had a cooking disaster?",
    "What's the best restaurant meal you've ever had?",
    "Do you enjoy cooking alone or with others?",
    "What food did you dislike as a kid but love now?",
    "What's your go-to weeknight dinner?",
    "Have you ever grown your own herbs or vegetables?",
    "What's a food trend you actually enjoy?",
    "If you could only eat one meal for the rest of your life, what would it be?",
    "What's the best street food you've ever had?",
    "Do you have any family recipes passed down through generations?",
    "What kitchen gadget can you not live without?",
    "What's the most impressive meal you've ever made?",
    "Breakfast for dinner: yes or no?"
  ]},
  { name: "Career & Growth", topics: [
    "What's the best career advice you've received?",
    "How did you end up in your current role?",
    "What skill are you currently trying to develop?",
    "What's a professional achievement you're proud of?",
    "How do you stay motivated during tough projects?",
    "What does your ideal workday look like?",
    "Have you ever had a mentor who made a big impact?",
    "What's something you wish you'd known earlier in your career?",
    "Remote, hybrid, or in-office: what's your preference?",
    "What's a side project or hobby that's taught you something useful at work?",
    "How do you handle disagreements with teammates?",
    "What's the most valuable thing you've learned from a failure?",
    "What industry trend excites you the most right now?",
    "How do you balance deep work with meetings and collaboration?",
    "What's a book or resource that's helped your professional growth?",
    "If you could switch careers for a month, what would you try?",
    "What's one thing you'd change about how teams typically work?",
    "How do you celebrate wins, big or small?",
    "What's the hardest feedback you've received and how did you grow from it?",
    "Where do you see yourself in five years?"
  ]}
];
