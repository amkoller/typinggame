import { Application, Graphics, Text, TextStyle, Container } from "pixi.js";
import substrings from "./words.json";

const app = new Application();

await app.init({
  resizeTo: window,
  backgroundColor: 0x1a1a2e,
  antialias: true,
  roundPixels: true,
  resolution: window.devicePixelRatio || 1,
  autoDensity: true,
});

document.body.appendChild(app.canvas);

// ── Constants ──────────────────────────────────────────────
const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const LETTER_SETS = [
  { name: "Beginner", letters: "ASDFJKLERUIGH" },
  { name: "Apprentice", letters: "ASDFJKLERUIGHCVBN" },
  { name: "Journeyman", letters: "ASDFJKLERUIGHCVBNMOPW" },
  { name: "Master", letters: LETTERS },
];
const MONSTER_SPEED = 1.2;
const SPAWN_INTERVAL = 1000; // ms
const BASE_BULLET_SPEED = 28;
const PLAYER_X = 100;
const MAX_LEVEL = 60;
const BOSS_LEVELS = {
  10: { type: "skeleton", name: "SKELETON", wordCount: 7, wordLen: 3, speed: 1.8 },
  20: { type: "ghost", name: "GHOST", wordCount: 8, wordLen: 4, speed: 1.5 },
  30: { type: "shark", name: "LASER SHARK", wordCount: 12, wordLen: 4, speed: 1.2 },
  40: { type: "demon", name: "FIRE DEMON", wordCount: 15, wordLen: 5, speed: 0.9 },
  50: { type: "skull", name: "ZOMBIE SKULL", wordCount: 20, wordLen: 5, speed: 0.6 },
};

// Real English words for boss encounters
const BOSS_WORDS = {
  3: [
    "THE","AND","FOR","ARE","BUT","NOT","YOU","ALL","CAN","HER","WAS","ONE","OUR",
    "OUT","DAY","HAD","HAS","HIS","HOW","ITS","MAY","NEW","NOW","OLD","SEE","WAY",
    "WHO","BOY","DID","GET","HIM","LET","SAY","SHE","TOO","USE","DAD","MOM","RUN",
    "SET","TRY","ASK","MEN","RAN","BIG","END","FAR","GOT","MAN","OWN","RED","SIT",
    "TOP","ACE","AGE","AGO","AIR","ARM","ART","BAD","BAG","BAT","BED","BIT","BOX",
    "BUS","CAR","CAT","CUP","CUT","DOG","EAR","EAT","EGG","EYE","FAN","FIT","FLY",
    "FOX","FUN","GAP","GUN","GUY","HAT","HIT","HOT","ICE","JOB","KEY","LAW","LAY",
    "LEG","LIP","LOG","LOT","MAP","MIX","MUD","NET","NUT","ODD","OIL","PAN","PAY",
    "PEN","PET","PIN","PIT","POT","PUT","RAW","RIB","RIP","ROW","RUG","SAD","SKI",
    "SKY","SUN","TAP","TAX","TEN","TIE","TIN","TIP","TOE","TON","TOY","VAN","WAR",
    "WEB","WET","WIN","WON","ZAP","ZEN","ZIP","ZOO",
  ],
  4: [
    "ABLE","ALSO","AREA","ARMY","AWAY","BACK","BALL","BAND","BANK","BASE","BATH",
    "BEAR","BEAT","BEEN","BELL","BELT","BEST","BIRD","BITE","BLOW","BLUE","BOAT",
    "BODY","BOLT","BOMB","BONE","BOOK","BORN","BOSS","BOTH","BURN","BUSY","CAGE",
    "CAKE","CALL","CALM","CAME","CAMP","CARD","CARE","CASE","CASH","CAST","CAVE",
    "CHIP","CITY","CLAP","CLAY","CLIP","CLUB","COAL","COAT","CODE","COIN","COLD",
    "COME","COOK","COOL","COPY","CORE","CORN","COST","CROP","CROW","CURE","DARK",
    "DATA","DATE","DAWN","DEAD","DEAL","DEAR","DEEP","DEER","DESK","DIRT","DISH",
    "DOCK","DOES","DONE","DOOR","DOWN","DRAW","DROP","DRUM","DUAL","DUCK","DUMP",
    "DUST","DUTY","EACH","EARN","EASE","EAST","EDGE","ELSE","EVEN","EVIL","EXAM",
    "FACE","FACT","FAIL","FAIR","FALL","FAME","FARM","FAST","FATE","FEAR","FEED",
    "FEEL","FELL","FELT","FILE","FILL","FILM","FIND","FINE","FIRE","FIRM","FISH",
    "FIST","FLAG","FLAT","FLEW","FLIP","FLOW","FOAM","FOLD","FOLK","FOOD","FOOL",
    "FOOT","FORK","FORM","FORT","FOUR","FREE","FROM","FUEL","FULL","FUND","FURY",
    "FUSE","GAIN","GAME","GANG","GATE","GAVE","GAZE","GEAR","GIFT","GIRL","GIVE",
    "GLAD","GLOW","GLUE","GOAL","GOAT","GOES","GOLD","GOLF","GONE","GOOD","GRAB",
    "GRAY","GREW","GRID","GRIP","GROW","GULF","GUST","HAIR","HALF","HALL","HALT",
    "HAND","HANG","HARD","HARM","HATE","HAVE","HEAD","HEAP","HEAR","HEAT","HELD",
    "HELP","HERE","HERO","HIGH","HIKE","HILL","HINT","HIRE","HOLD","HOLE","HOME",
    "HOOK","HOPE","HORN","HOST","HOUR","HUGE","HUNG","HUNT","HURT","IDEA","INCH",
    "INTO","IRON","ISLE","ITEM","JACK","JAIL","JAZZ","JEAN","JEEP","JOIN","JOKE",
    "JUMP","JURY","JUST","KEEN","KEEP","KEPT","KICK","KILL","KIND","KING","KISS",
    "KNEE","KNEW","KNIT","KNOB","KNOT","KNOW","LACK","LAID","LAKE","LAMP","LAND",
    "LANE","LAST","LATE","LAWN","LEAD","LEAF","LEAN","LEFT","LEND","LESS","LIFE",
    "LIFT","LIKE","LIMB","LIME","LINE","LINK","LION","LIST","LIVE","LOAD","LOAN",
    "LOCK","LOGO","LONG","LOOK","LORD","LOSE","LOSS","LOST","LOVE","LUCK","MADE",
    "MAIL","MAIN","MAKE","MALE","MALL","MANY","MARK","MASK","MASS","MATE","MAZE",
    "MEAL","MEAN","MEAT","MEET","MELT","MENU","MESS","MILD","MILE","MILK","MILL",
    "MIND","MINE","MINT","MISS","MODE","MOLD","MOOD","MOON","MORE","MOST","MOVE",
    "MUCH","MUST","MYTH","NAIL","NAME","NAVY","NEAR","NEAT","NECK","NEED","NEWS",
    "NEXT","NICE","NINE","NODE","NONE","NORM","NOSE","NOTE","NOUN","ODDS","ONCE",
    "ONLY","ONTO","OPEN","ORAL","OVEN","OVER","PACE","PACK","PAGE","PAID","PAIN",
    "PAIR","PALE","PALM","PARK","PART","PASS","PAST","PATH","PEAK","PEEL","PICK",
    "PILE","PINE","PINK","PIPE","PLAN","PLAY","PLOT","PLUG","PLUS","POEM","POET",
    "POLE","POLL","POND","POOL","POOR","PORT","POSE","POST","POUR","PRAY","PULL",
    "PUMP","PURE","PUSH","QUIT","RACE","RAGE","RAID","RAIL","RAIN","RANK","RARE",
    "RATE","READ","REAL","REAR","RELY","RENT","REST","RICE","RICH","RIDE","RING",
    "RIOT","RISE","RISK","ROAD","ROCK","RODE","ROLE","ROLL","ROOF","ROOM","ROOT",
    "ROPE","ROSE","RUIN","RULE","RUSH","SAFE","SAGE","SAID","SAIL","SAKE","SALE",
    "SALT","SAME","SAND","SANG","SAVE","SEAL","SEAT","SEED","SEEK","SEEM","SEEN",
    "SELF","SELL","SEND","SENT","SEPT","SHED","SHIP","SHOP","SHOT","SHOW","SHUT",
    "SICK","SIDE","SIGN","SILK","SING","SINK","SIZE","SKIN","SLAM","SLID","SLIM",
    "SLIP","SLOT","SLOW","SNAP","SNOW","SOAR","SOCK","SOFT","SOIL","SOLD","SOLE",
    "SOME","SONG","SOON","SORT","SOUL","SOUR","SPIN","SPOT","STAR","STAY","STEM",
    "STEP","STIR","STOP","SUCH","SUIT","SURE","SWIM","TAIL","TAKE","TALE","TALK",
    "TALL","TANK","TAPE","TASK","TEAM","TEAR","TELL","TEND","TENT","TERM","TEST",
    "TEXT","THAN","THAT","THEM","THEN","THEY","THIN","THIS","THUS","TIDE","TIDY",
    "TIER","TILE","TILL","TIME","TINY","TIRE","TOAD","TOLD","TOLL","TONE","TOOK",
    "TOOL","TOPS","TORE","TORN","TOUR","TOWN","TRAP","TRAY","TREE","TRIM","TRIO",
    "TRIP","TRUE","TUBE","TUCK","TUNE","TURN","TWIN","TYPE","UGLY","UNIT","UPON",
    "URGE","USED","USER","VALE","VARY","VAST","VERB","VERY","VICE","VIEW","VINE",
    "VOID","VOLT","VOTE","WADE","WAGE","WAIT","WAKE","WALK","WALL","WANT","WARD",
    "WARM","WARN","WASH","WAVE","WEAK","WEAR","WEED","WEEK","WEIGH","WELL","WENT",
    "WERE","WEST","WHAT","WHEN","WHOM","WIDE","WIFE","WILD","WILL","WIND","WINE",
    "WING","WIRE","WISE","WISH","WITH","WOKE","WOLF","WOOD","WOOL","WORD","WORE",
    "WORK","WORM","WORN","WRAP","YARD","YEAR","YOUR","ZERO","ZONE","ZOOM",
  ],
  5: [
    "ABOUT","ABOVE","ADMIT","AFTER","AGAIN","AGREE","ALARM","ALIVE","ALLOW","ALONE",
    "ALONG","ANGER","ANGLE","APART","APPLE","ARENA","ARMOR","ASIDE","AVOID","AWAKE",
    "AWARD","BACON","BADGE","BASIC","BATCH","BEGIN","BEING","BELOW","BENCH","BLACK",
    "BLADE","BLAME","BLANK","BLAST","BLAZE","BLEED","BLEND","BLIND","BLOCK","BLOOM",
    "BLOWN","BOARD","BONUS","BOOTH","BOUND","BRAIN","BRAND","BRAVE","BREAD","BREAK",
    "BREED","BRICK","BRIEF","BRING","BROAD","BROKE","BRUSH","BUILD","BUNCH","BURST",
    "CABIN","CARRY","CATCH","CAUSE","CHAIN","CHAIR","CHALK","CHARM","CHASE","CHEAP",
    "CHECK","CHESS","CHEST","CHIEF","CHILD","CHINA","CLAIM","CLASH","CLASS","CLEAN",
    "CLEAR","CLERK","CLIMB","CLING","CLOCK","CLONE","CLOSE","CLOTH","CLOUD","COACH",
    "COAST","COLOR","COULD","COUNT","COURT","COVER","CRACK","CRAFT","CRASH","CRAZY",
    "CREAM","CRIME","CROSS","CROWD","CRUSH","CURVE","CYCLE","DAILY","DANCE","DEATH",
    "DEBUT","DEPTH","DEVIL","DIRTY","DODGE","DOUBT","DRAFT","DRAIN","DRAMA","DRANK",
    "DRAWN","DREAM","DRESS","DRIED","DRIFT","DRILL","DRINK","DRIVE","DROVE","DYING",
    "EAGER","EARLY","EARTH","EIGHT","ELDER","ELECT","ELITE","EMPTY","ENEMY","ENJOY",
    "ENTER","EQUAL","ERROR","EVENT","EVERY","EXACT","EXIST","EXTRA","FAITH","FALSE",
    "FAULT","FEAST","FENCE","FIBER","FIELD","FIFTH","FIFTY","FIGHT","FINAL","FIRST",
    "FIXED","FLAME","FLASH","FLEET","FLESH","FLOAT","FLOOD","FLOOR","FLOUR","FLUID",
    "FLUSH","FOCUS","FORCE","FORGE","FORTH","FORUM","FOUND","FRAME","FRANK","FRAUD",
    "FRESH","FRONT","FROST","FRUIT","FULLY","GIANT","GIVEN","GLASS","GLOBE","GLOOM",
    "GLORY","GLOVE","GOING","GRACE","GRADE","GRAIN","GRAND","GRANT","GRAPH","GRASP",
    "GRASS","GRAVE","GREAT","GREEN","GRIND","GROSS","GROUP","GROVE","GROWN","GUARD",
    "GUESS","GUEST","GUIDE","GUILT","HAPPY","HARSH","HEART","HEAVY","HEDGE","HENCE",
    "HONOR","HORSE","HOTEL","HOUSE","HUMAN","HUMOR","HURRY","IDEAL","IMAGE","IMPLY",
    "INDEX","INNER","INPUT","IRONY","ISSUE","IVORY","JEWEL","JOINT","JUDGE","JUICE",
    "KNIFE","KNOCK","KNOWN","LABEL","LABOR","LARGE","LASER","LATER","LAUGH","LAYER",
    "LEARN","LEASE","LEAST","LEAVE","LEGAL","LEVEL","LIGHT","LIMIT","LINEN","LIVER",
    "LOCAL","LODGE","LOGIC","LOOSE","LOVER","LOWER","LUCKY","LUNCH","MAGIC","MAJOR",
    "MAKER","MARCH","MATCH","MAYOR","MEDAL","MEDIA","MERCY","METAL","METER","MINOR",
    "MINUS","MIXED","MODEL","MONEY","MONTH","MORAL","MOTOR","MOUNT","MOUSE","MOUTH",
    "MOVIE","MUSIC","NERVE","NIGHT","NOBLE","NOISE","NORTH","NOTED","NOVEL","NURSE",
    "OCCUR","OCEAN","OFFER","ORDER","OTHER","OUTER","OWNER","OXIDE","PAINT","PANEL",
    "PANIC","PARTY","PATCH","PAUSE","PEACE","PEARL","PENNY","PHASE","PHONE","PHOTO",
    "PIANO","PIECE","PILOT","PITCH","PIXEL","PLACE","PLAIN","PLANE","PLANT","PLATE",
    "PLAZA","PLEAD","PLAZA","PLUMB","POINT","POUND","POWER","PRESS","PRICE","PRIDE",
    "PRIME","PRINT","PRIOR","PRIZE","PROOF","PROUD","PROVE","PSALM","PURSE","QUEEN",
    "QUEST","QUEUE","QUICK","QUIET","QUOTE","RADAR","RADIO","RAISE","RALLY","RANCH",
    "RANGE","RAPID","RATIO","REACH","REACT","REALM","REIGN","RELAX","REPLY","RIDER",
    "RIFLE","RIGHT","RISKY","RIVAL","RIVER","ROBOT","ROCKY","ROGER","ROUGH","ROUND",
    "ROUTE","ROYAL","RUGBY","RURAL","SADLY","SAINT","SALAD","SAUCE","SCALE","SCARE",
    "SCENE","SCOPE","SCORE","SCOUT","SCRAP","SENSE","SERVE","SEVEN","SHADE","SHALL",
    "SHAME","SHAPE","SHARE","SHARK","SHARP","SHEER","SHEET","SHELF","SHELL","SHIFT",
    "SHINE","SHIRT","SHOCK","SHOOT","SHORT","SIGHT","SINCE","SIXTH","SIXTY","SIZED",
    "SKILL","SKULL","SLASH","SLATE","SLEEP","SLICE","SLIDE","SLOPE","SMALL","SMART",
    "SMELL","SMILE","SMITH","SMOKE","SNAKE","SOLAR","SOLID","SOLVE","SORRY","SOUTH",
    "SPACE","SPARE","SPARK","SPEAK","SPEED","SPEND","SPICE","SPLIT","SPOKE","SPOON",
    "SPORT","SPRAY","SQUAD","STAFF","STAGE","STAIN","STAKE","STALE","STALL","STAMP",
    "STAND","STARE","START","STATE","STEAK","STEAL","STEAM","STEEL","STEEP","STEER",
    "STERN","STICK","STIFF","STILL","STOCK","STOLE","STONE","STOOD","STORE","STORM",
    "STORY","STOVE","STRAP","STRAW","STRIP","STUCK","STUDY","STUFF","STYLE","SUGAR",
    "SUITE","SUNNY","SUPER","SURGE","SWAMP","SWEAR","SWEEP","SWEET","SWEPT","SWIFT",
    "SWING","SWORD","TABLE","TAKEN","TASTE","TEACH","THEIR","THEME","THERE","THICK",
    "THIEF","THING","THINK","THIRD","THOSE","THREE","THREW","THROW","TIGHT","TIMER",
    "TITLE","TODAY","TOPIC","TORCH","TOTAL","TOUCH","TOUGH","TOWEL","TOWER","TOXIC",
    "TRACE","TRACK","TRADE","TRAIL","TRAIN","TRAIT","TRASH","TREAT","TREND","TRIAL",
    "TRIBE","TRICK","TRIED","TROOP","TRUCK","TRULY","TRUMP","TRUNK","TRUST","TRUTH",
    "TUMOR","TWIST","ULTRA","UNCLE","UNDER","UNION","UNITE","UNITY","UNTIL","UPPER",
    "UPSET","URBAN","USAGE","USUAL","UTTER","VALID","VALUE","VIDEO","VIGOR","VIRUS",
    "VISIT","VITAL","VIVID","VOCAL","VOICE","VOTER","WASTE","WATCH","WATER","WEAVE",
    "WEIGH","WEIRD","WHEEL","WHERE","WHICH","WHILE","WHITE","WHOLE","WHOSE","WIDOW",
    "WIDTH","WOMAN","WORLD","WORRY","WORSE","WORST","WORTH","WOULD","WOUND","WRATH",
    "WRITE","WRONG","WROTE","YACHT","YIELD","YOUNG","YOUTH",
  ],
};

let monsters = [];
let score = 0;
let levelKills = 0;
let lives = 3;
let level = 1;
let gameOver = false;
let gameWon = false;
let paused = false;
let stunUntil = 0; // timestamp when stun ends (miss penalty)
let bossActive = false;
let letterSetIndex = 0;

function getSpawnInterval() {
  // 2000ms at level 1, decreasing by 25ms per level, min 550ms
  return Math.max(700, SPAWN_INTERVAL - (level - 1) * 5);
}

function getAvgLettersPerMonster() {
  // Tier 0 (levels 1-10): always 1 letter
  // Tier T≥1: base length T, chance of T+1 scales 10%→100% within the tier
  // Capped at 5 to match max word length from word list
  const tier = Math.floor((level - 1) / 10);
  if (tier === 0) return 1;
  const tierProgress = ((level - 1) % 10) / 9;
  const upgradeChance = 0.1 + tierProgress * 0.9;
  const avg = tier + upgradeChance;
  return Math.min(avg, 5);
}

function getAvgSpeed() {
  const speedLevel = Math.min(level, 10);
  const minSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.06;
  const maxSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.5;
  return (minSpeed + maxSpeed) / 2;
}

function getLPS() {
  const monstersPerSec = 1000 / getSpawnInterval();
  const speedFactor = getAvgSpeed() / MONSTER_SPEED;
  return (getAvgLettersPerMonster() * monstersPerSec * speedFactor).toFixed(1);
}

// ── Sound effects (Web Audio API) ──────────────────────────
let soundEnabled = true;
let bloodEnabled = false;
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playShoot() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(1760, audioCtx.currentTime + 0.05);
  gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.08);
}

function playHit() {
  if (!soundEnabled) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "sine";
  osc.frequency.setValueAtTime(600, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.06);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
  osc.start(audioCtx.currentTime);
  osc.stop(audioCtx.currentTime + 0.06);
}

function playKill() {
  if (!soundEnabled) return;
  const t = audioCtx.currentTime;
  // Two-tone descending burst
  for (let i = 0; i < 2; i++) {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = i === 0 ? "square" : "sawtooth";
    osc.frequency.setValueAtTime(500 - i * 100, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.2);
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.2);
  }
}

function playLoseLife() {
  if (!soundEnabled) return;
  const t = audioCtx.currentTime;
  // Descending minor third — alarming two-tone drop
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = "square";
  osc.frequency.setValueAtTime(180, t);
  osc.frequency.setValueAtTime(130, t + 0.12);
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.setValueAtTime(0.12, t + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.start(t);
  osc.stop(t + 0.35);
  // Low rumble underneath
  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.type = "sawtooth";
  osc2.frequency.setValueAtTime(55, t);
  osc2.frequency.exponentialRampToValueAtTime(25, t + 0.3);
  gain2.gain.setValueAtTime(0.1, t);
  gain2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  osc2.start(t);
  osc2.stop(t + 0.3);
}

// ── Music (8-bit chiptune) ────────────────────────────────
let musicPlaying = false;
let musicStep = 0;
let nextNoteTime = 0;
let musicTimerId = null;

// ── Section A (C minor) ──
// C5=523, D5=587, Eb5=622, F5=698, G5=784, Bb4=466, Ab4=415
const melodyA = [
  523, 0, 622, 0, 784, 0, 622, 698,
  784, 0, 622, 0, 523, 0, 466, 0,
  415, 0, 523, 0, 622, 0, 698, 622,
  587, 0, 523, 0, 466, 0, 523, 0,
];
const bassA = [
  131, 0, 131, 0, 98, 0, 98, 0,
  104, 0, 104, 0, 156, 0, 156, 0,
  175, 0, 175, 0, 131, 0, 131, 0,
  98, 0, 98, 0, 131, 0, 131, 0,
];
const drumsA = [
  1, 0, 2, 0, 1, 0, 2, 0,
  1, 0, 2, 0, 1, 0, 2, 2,
  1, 0, 2, 0, 1, 0, 2, 0,
  1, 0, 2, 2, 1, 2, 1, 2,
];

// ── Section B (Eb major — brighter contrast) ──
// Eb5=622, F5=698, G5=784, Ab5=831, Bb5=932, C6=1047
const melodyB = [
  784, 0, 932, 0, 1047, 0, 932, 831,
  784, 0, 698, 0, 622, 0, 698, 0,
  831, 0, 932, 0, 1047, 932, 831, 0,
  784, 0, 698, 622, 587, 0, 523, 0,
];
const bassB = [
  156, 0, 156, 0, 117, 0, 117, 0,
  104, 0, 104, 0, 175, 0, 175, 0,
  156, 0, 156, 0, 117, 0, 117, 0,
  104, 0, 175, 0, 98, 0, 131, 0,
];
const drumsB = [
  1, 0, 2, 2, 1, 0, 2, 0,
  1, 2, 1, 0, 2, 0, 1, 2,
  1, 0, 2, 2, 1, 0, 2, 0,
  1, 2, 2, 0, 1, 0, 1, 2,
];

// AABA form: 4 sections × 32 steps = 128 steps per cycle
const formSections = [
  { melody: melodyA, bass: bassA, drums: drumsA },
  { melody: melodyA, bass: bassA, drums: drumsA },
  { melody: melodyB, bass: bassB, drums: drumsB },
  { melody: melodyA, bass: bassA, drums: drumsA },
];

// ── Boss music (C# minor / diminished — dark and aggressive) ──
// C#4=277, D#4=311, E4=330, F#4=370, G#4=415, A4=440, B4=494
// C#5=554, D#5=622, E5=659, F#5=740, G#5=831
// Steady driving rhythm — bass pumps every eighth note, kick on every beat
const bossMelodyA = [
  554, 554, 622, 622, 554, 554, 494, 494,
  440, 440, 494, 494, 554, 554, 622, 622,
  554, 554, 494, 494, 440, 440, 370, 370,
  440, 440, 494, 494, 554, 554, 494, 494,
];
const bossBassA = [
  139, 139, 139, 139, 139, 139, 139, 139,
  117, 117, 117, 117, 117, 117, 117, 117,
  110, 110, 110, 110, 110, 110, 110, 110,
  117, 117, 117, 117, 139, 139, 139, 139,
];
const bossDrumsA = [
  1, 2, 1, 2, 1, 2, 1, 2,
  1, 2, 1, 2, 1, 2, 1, 2,
  1, 2, 1, 2, 1, 2, 1, 2,
  1, 2, 1, 2, 1, 2, 1, 2,
];

// Boss section B — climbing diminished tension, same steady pulse
const bossMelodyB = [
  554, 554, 659, 659, 784, 784, 659, 659,
  554, 554, 494, 494, 440, 440, 494, 494,
  554, 554, 659, 659, 784, 784, 932, 932,
  784, 784, 659, 659, 554, 554, 494, 494,
];
const bossBassB = [
  139, 139, 139, 139, 104, 104, 104, 104,
  117, 117, 117, 117, 139, 139, 139, 139,
  110, 110, 110, 110, 104, 104, 104, 104,
  117, 117, 117, 117, 139, 139, 139, 139,
];
const bossDrumsB = [
  1, 2, 1, 2, 1, 2, 1, 2,
  1, 2, 1, 2, 1, 2, 1, 2,
  1, 2, 1, 2, 1, 2, 1, 2,
  1, 2, 1, 2, 1, 2, 1, 2,
];

const bossFormSections = [
  { melody: bossMelodyA, bass: bossBassA, drums: bossDrumsA },
  { melody: bossMelodyA, bass: bossBassA, drums: bossDrumsA },
  { melody: bossMelodyB, bass: bossBassB, drums: bossDrumsB },
  { melody: bossMelodyA, bass: bossBassA, drums: bossDrumsA },
];

function getMusicTempo() {
  // Eighth-note duration: BPM 140 at level 1 → BPM 220 at level 60
  const bpm = 140 + (Math.min(level, 60) - 1) * (80 / 59);
  const baseTempo = 60 / bpm / 2;
  // Boss music plays 1.5x faster
  return bossActive ? baseTempo / 1.5 : baseTempo;
}

function playMusicNote(freq, time, duration, type, vol) {
  if (!freq) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.setValueAtTime(freq, time);
  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.9);
  osc.start(time);
  osc.stop(time + duration);
}

function playDrumHit(type, time) {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  if (type === 1) {
    // Kick
    osc.type = "sine";
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
    gain.gain.setValueAtTime(0.07, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);
    osc.start(time);
    osc.stop(time + 0.08);
  } else {
    // Hi-hat
    osc.type = "square";
    osc.frequency.setValueAtTime(800 + Math.random() * 600, time);
    gain.gain.setValueAtTime(0.02, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);
    osc.start(time);
    osc.stop(time + 0.03);
  }
}

function scheduleMusicNotes() {
  if (nextNoteTime < audioCtx.currentTime) {
    nextNoteTime = audioCtx.currentTime;
  }
  while (nextNoteTime < audioCtx.currentTime + 0.1) {
    const dur = getMusicTempo();
    const sections = bossActive ? bossFormSections : formSections;
    const section = sections[Math.floor((musicStep % 128) / 32)];
    const idx = musicStep % 32;
    playMusicNote(section.melody[idx], nextNoteTime, dur * 0.8, "square", 0.05);
    playMusicNote(section.bass[idx], nextNoteTime, dur * 0.9, "triangle", 0.045);
    if (section.drums[idx]) playDrumHit(section.drums[idx], nextNoteTime);
    nextNoteTime += dur;
    musicStep++;
  }
}

function startMusic() {
  if (musicPlaying || !soundEnabled) return;
  musicPlaying = true;
  nextNoteTime = audioCtx.currentTime;
  musicTimerId = setInterval(scheduleMusicNotes, 50);
}

function stopMusic() {
  if (!musicPlaying) return;
  musicPlaying = false;
  clearInterval(musicTimerId);
  musicTimerId = null;
}

// ── Draw helpers ───────────────────────────────────────────

function drawOctopus(container) {
  const g = new Graphics();
  const px = 3;

  // 20-wide × 20-tall pixel grid — retro octopus
  const data = [
    "      GGGGGGGG      ",
    "    GGGGGGGGGGGG    ",
    "   GGGGGGGGGGGGGG   ",
    "  GGGWWGGGGGWWGGGG  ",
    "  GGWPPWGGGGWPPWGG  ",
    "  GGGWWGGGGGWWGGGG  ",
    "  GGGGGGGGGGGGGGGG  ",
    "  GGGGGGGGGGGGGGGG  ",
    "  GGGGGMMMMMGGGGG   ",
    "   GGGGGGGGGGGGGG   ",
    "    GGGGGGGGGGGG    ",
    "   GG GG GG GG GG  ",
    "  GG  GG GG GG  GG ",
    "  G   GG GG GG   G ",
    "      GG GG GG      ",
    "      G   G   G     ",
  ];

  const colors = {
    G: 0x00aa00, W: 0xffffff, P: 0x000000, M: 0x005500,
  };
  const halfW = (data[0].length * px) / 2;
  const top = -24;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  container.addChild(g);

  // Compact jetpack — pixel art, tight against back
  const jp = new Graphics();
  const jpx = -halfW - 6;
  const jpy = top + 6 * px;
  // Main body (3×5 pixels)
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 3; c++) {
      jp.rect(jpx + c * px, jpy + r * px, px, px);
      jp.fill(r === 0 || r === 4 ? 0x555555 : 0x888888);
    }
  }
  // Nozzle (1×2 pixels)
  jp.rect(jpx + px, jpy + 5 * px, px, px * 2);
  jp.fill(0x555555);
  container.addChild(jp);

  // Ninja sword — handle at bottom-left (on back), blade pointing up-right toward monsters
  const sw = new Graphics();
  const bladeColors = [0xcccccc, 0xdddddd, 0xeeeeee, 0xffffff, 0xeeeeee, 0xdddddd, 0xcccccc, 0xbbbbbb];
  const swordStartX = -halfW + 2;
  const swordStartY = top + 12 * px;
  for (let i = 0; i < bladeColors.length; i++) {
    sw.rect(swordStartX + i * px, swordStartY - i * px, px, px);
    sw.fill(bladeColors[i]);
  }
  // Handle wrap (brown/red pixels at bottom of blade)
  sw.rect(swordStartX - px, swordStartY + px, px, px);
  sw.fill(0x884400);
  sw.rect(swordStartX - 2 * px, swordStartY + 2 * px, px, px);
  sw.fill(0xaa0000);
  // Guard (cross piece)
  sw.rect(swordStartX + px, swordStartY + px, px, px);
  sw.fill(0xaaaa00);
  sw.rect(swordStartX - px, swordStartY - px, px, px);
  sw.fill(0xaaaa00);
  container.addChild(sw);

  // Jetpack flame (will be animated)
  const flame = new Graphics();
  container.addChild(flame);
  return flame;
}

function drawFlame(flame, tick) {
  flame.clear();
  const px = 3;
  const halfW = (20 * px) / 2;
  const jpx = -halfW - 6 + px;
  const baseY = -24 + 6 * px + 5 * px + px * 2;
  const flicker = Math.sin(tick * 0.3) * px;
  // Outer flame
  flame.rect(jpx - px * 0.5, baseY, px * 2, px + flicker);
  flame.fill(0xff0000);
  // Mid flame
  flame.rect(jpx, baseY + px, px, px + flicker * 0.5);
  flame.fill(0xff6600);
  // Inner flame
  flame.rect(jpx, baseY, px, px * 0.6 + flicker * 0.3);
  flame.fill(0xffaa00);
}

function createMonster(word) {
  const container = new Container();
  const letterCount = word.length;
  const px = 3;

  const body = new Graphics();

  // Pixel art monster — tier based on letter count, scarier with more letters
  // Colors: B=body, D=dark body, H=horn, R=red eye, T=teeth, C=claw, M=mouth, S=shadow
  if (letterCount <= 1) {
    // Tier 1: Small imp — stubby horns, red eyes, small claws
    const data = [
      "    HH    HH    ",
      "    HH    HH    ",
      "   BBBBBBBBBB   ",
      "  BBBBBBBBBBBB  ",
      "  BBRRBBBBRBB  ",
      "  BBRRBBBBRBB  ",
      "  BBBBBBBBBBBB  ",
      "  BBBTTTTTTBBB  ",
      "  BBBTBBBBTBBB  ",
      "   BBBBBBBBBB   ",
      " CC BBBBBBBB CC ",
      " CC BBBBBBBB CC ",
      "    BBBBBBBB    ",
      "    BB    BB    ",
      "    BB    BB    ",
      "   CC      CC   ",
    ];
    const colors = { B: 0x888888, D: 0x666666, H: 0xaaaaaa, R: 0xff0000, T: 0xdddddd, C: 0xaa3333, M: 0x222222, S: 0x555555 };
    const halfW = (data[0].length * px) / 2;
    const top = -28;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const ch = data[r][c];
        if (ch === " ") continue;
        body.rect(c * px - halfW, top + r * px, px, px);
        body.fill(colors[ch]);
      }
    }
  } else if (letterCount <= 2) {
    // Tier 2: Demon — taller horns, wider jaw, bigger claws
    const data = [
      "   HH        HH   ",
      "   HHH      HHH   ",
      "    HBBBBBBBBH     ",
      "   BBBBBBBBBBBB    ",
      "  BBBRRBBBBRRBBBB  ",
      "  BBBRRBBBBRRBBBB  ",
      "  BBBBBBBBBBBBBBBB ",
      "  BBBBBBDDBBBBBBBB ",
      "  BBBTTTTTTTTBBBB  ",
      "  BBBTBBBBBBBTBBB  ",
      "  BBBTTBBBBTTBBB   ",
      "   BBBBBBBBBBBB    ",
      "CC BBBBBBBBBBBB CC ",
      "CCC BBBBBBBBBB CCC ",
      "CC  BBBBBBBBBB  CC ",
      "     BBB  BBB      ",
      "     BBB  BBB      ",
      "    CCC    CCC     ",
    ];
    const colors = { B: 0x777777, D: 0x555555, H: 0x999999, R: 0xff0000, T: 0xcccccc, C: 0x993333, M: 0x222222 };
    const halfW = (data[0].length * px) / 2;
    const top = -32;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const ch = data[r][c];
        if (ch === " ") continue;
        body.rect(c * px - halfW, top + r * px, px, px);
        body.fill(colors[ch]);
      }
    }
  } else if (letterCount <= 3) {
    // Tier 3: Fiend — curved horns, triple eyes, fangs, arm claws
    const data = [
      "  HH            HH  ",
      "  HHH          HHH  ",
      "   HHH        HHH   ",
      "    HBBBBBBBBBBH     ",
      "   BBBBBBBBBBBBBB    ",
      "  BBRRBBRRBBRRBBB   ",
      "  BBRRBBRRBBRRBBB   ",
      "  BBBBBBBBBBBBBBBB   ",
      "  BBBBBBBBBBBBBBBB   ",
      "  BBTTTTTTTTTTTBB    ",
      "  BBTBBTBBBTBBTBB    ",
      "  BBTTBBBBBBTTBBB    ",
      "   BBBBBBBBBBBBBB    ",
      "CCCBBBBBBBBBBBBBBCCC ",
      "CCCCBBBBBBBBBBBBCCCC ",
      "CCC BBBBBBBBBBBB CCC",
      "     BBBBBBBBBB      ",
      "     BBB  BBBB       ",
      "     BBB  BBBB       ",
      "    CCCC  CCCC       ",
    ];
    const colors = { B: 0x666666, D: 0x444444, H: 0x888888, R: 0xff0000, T: 0xbbbbbb, C: 0x883333, M: 0x111111 };
    const halfW = (data[0].length * px) / 2;
    const top = -36;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const ch = data[r][c];
        if (ch === " ") continue;
        body.rect(c * px - halfW, top + r * px, px, px);
        body.fill(colors[ch]);
      }
    }
  } else if (letterCount <= 4) {
    // Tier 4: Brute — massive horns, quad eyes, heavy jaw, spiked arms
    const data = [
      " HH                HH ",
      " HHH              HHH ",
      "  HHH            HHH  ",
      "  HHBBBBBBBBBBBBBBHH   ",
      "  BBBBBBBBBBBBBBBBBB   ",
      " BBRRBBRRBBRRBBRRBBB  ",
      " BBRRBBRRBBRRBBRRBBB  ",
      " BBBBBBBBBBBBBBBBBBB  ",
      " BBBBBBBDDDDBBBBBBBB  ",
      " BBTTTTTTTTTTTTTTBBB  ",
      " BBTBBTBBBBBBTBBTBBB  ",
      " BBTTBBBBBBBBBTTBBBB  ",
      " BBBTTBBBBBBBBTTBBBB  ",
      "  BBBBBBBBBBBBBBBBBB   ",
      "CCCCBBBBBBBBBBBBBBCCCC ",
      "CCCCCBBBBBBBBBBBBCCCCC ",
      "CCCC BBBBBBBBBBBB CCCC",
      "      BBBBBBBBBB       ",
      "      BBBB  BBBB       ",
      "      BBBB  BBBB       ",
      "     CCCCC  CCCCC      ",
    ];
    const colors = { B: 0x555555, D: 0x333333, H: 0x777777, R: 0xff0000, T: 0xaaaaaa, C: 0x773333 };
    const halfW = (data[0].length * px) / 2;
    const top = -38;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const ch = data[r][c];
        if (ch === " ") continue;
        body.rect(c * px - halfW, top + r * px, px, px);
        body.fill(colors[ch]);
      }
    }
  } else {
    // Tier 5: Abomination — crown of horns, six eyes, huge fangs, wing-claws
    const data = [
      "  HH  HH    HH  HH   ",
      "  HHH HHH  HHH HHH   ",
      "   HHHHHHHHHHHHHHHH    ",
      "   HHBBBBBBBBBBBBHH    ",
      "  BBBBBBBBBBBBBBBBBB   ",
      " BBRRBBRRBBRRBBRRBBB  ",
      " BBRRBBRRBBRRBBRRBBB  ",
      " BBBBBBBBBBBBBBBBBBB  ",
      " BBBBBBBDDDDDDBBBBBB  ",
      " BBTTTTTTTTTTTTTTTBB  ",
      " BBTBBTBBBBBBBTBBTBB  ",
      " BBTTBBBBBBBBBBTTBBB  ",
      " BBBTTBBBBBBBBTTBBBB  ",
      " BBBBTTTBBBBBTTTBBBB  ",
      "  BBBBBBBBBBBBBBBBB   ",
      "CCCCCBBBBBBBBBBBBCCCCC",
      "CCCCCCBBBBBBBBBBCCCCCC",
      "CCCCC BBBBBBBBBB CCCCC",
      "CCC   BBBBBBBBBB   CCC",
      "       BBBB  BBBB      ",
      "       BBBB  BBBB      ",
      "      CCCCC  CCCCC     ",
    ];
    const colors = { B: 0x441100, D: 0x220800, H: 0x662200, R: 0xff0000, T: 0x999999, C: 0x660800 };
    const halfW = (data[0].length * px) / 2;
    const top = -40;
    for (let r = 0; r < data.length; r++) {
      for (let c = 0; c < data[r].length; c++) {
        const ch = data[r][c];
        if (ch === " ") continue;
        body.rect(c * px - halfW, top + r * px, px, px);
        body.fill(colors[ch]);
      }
    }
  }

  container.addChild(body);

  // Blood layer – sits above body but below bubbles so blood never covers letters
  const bloodContainer = new Container();
  container.addChild(bloodContainer);

  // Letter bubbles on shirt – spaced horizontally
  const bubbleY = 14;
  const spacing = 22;
  const totalW = (letterCount - 1) * spacing;
  const letterTexts = [];

  for (let i = 0; i < letterCount; i++) {
    const bx = -totalW / 2 + i * spacing;
    const bubble = new Graphics();
    bubble.circle(bx, bubbleY, 11);
    bubble.fill(0xffffff);
    bubble.circle(bx, bubbleY, 11);
    bubble.stroke({ width: 1.5, color: 0xbdc3c7 });
    container.addChild(bubble);

    const lt = new Text({
      text: word[i],
      style: new TextStyle({
        fontFamily: "Arial",
        fontSize: 14,
        fontWeight: "bold",
        fill: 0x2c3e50,
      }),
      resolution: 4,
    });
    lt.anchor.set(0.5);
    lt.x = bx;
    lt.y = bubbleY;
    lt._bubble = bubble;
    container.addChild(lt);
    letterTexts.push(lt);
  }

  return { container, propeller: null, bloodContainer, word, letterTexts, hitIndex: 0 };
}


function addMonsterBlood(m) {
  const letterCount = m.word.length;
  const px = 3;
  // Match pixel art grid widths per tier
  const gridWidths = { 1: 17, 2: 19, 3: 21, 4: 23, 5: 23 };
  const gridHeights = { 1: 16, 2: 18, 3: 20, 4: 21, 5: 22 };
  const tops = { 1: -28, 2: -32, 3: -36, 4: -38, 5: -40 };
  const w = gridWidths[letterCount] || 17;
  const h = gridHeights[letterCount] || 16;
  const bodyHalfW = (w * px) / 2;
  const bodyH = h * px;
  const bodyTop = tops[letterCount] || -28;
  const bubbleY = 14;
  const bubbleR = 13; // bubble radius + margin
  const spacing = 22;
  const totalW = (letterCount - 1) * spacing;

  for (let i = 0; i < 8; i++) {
    let sx, sy, valid;
    for (let attempt = 0; attempt < 20; attempt++) {
      sx = (Math.random() - 0.5) * bodyHalfW * 1.6;
      sy = bodyTop + 4 + Math.random() * (bodyH - 8);
      valid = true;
      for (let j = 0; j < letterCount; j++) {
        const bx = -totalW / 2 + j * spacing;
        const dx = sx - bx;
        const dy = sy - bubbleY;
        if (dx * dx + dy * dy < bubbleR * bubbleR) {
          valid = false;
          break;
        }
      }
      if (valid) break;
    }
    if (!valid) continue;

    const g = new Graphics();
    const r = 2 + Math.random() * 3;
    g.circle(0, 0, r);
    g.fill(Math.random() < 0.4 ? 0x8b0000 : 0xcc0000);
    // Add small drip streaks
    if (Math.random() < 0.3) {
      const dripLen = 3 + Math.random() * 6;
      g.moveTo(0, r);
      g.lineTo(0, r + dripLen);
      g.stroke({ width: 1.5, color: 0x8b0000 });
    }
    g.x = sx;
    g.y = sy;
    m.bloodContainer.addChild(g);
  }
}

// ── Boss drawing ──────────────────────────────────────────

function drawSkeleton(container) {
  const g = new Graphics();
  const px = 3; // pixel size for retro look

  // Skull (12x10 pixel grid, centered at 0, top at -90)
  const skullTop = -90;
  const skullData = [
    "  XXXXXXXX  ",
    " XXXXXXXXXX ",
    "XXXXXXXXXXXX",
    "XXX..XX..XXX",
    "XXX..XX..XXX",
    "XXXXXXXXXXXX",
    " XXXX..XXXX ",
    " X.X.XX.X.X ",
    "  X..XX..X  ",
    "   XXXXXX   ",
  ];
  for (let r = 0; r < skullData.length; r++) {
    for (let c = 0; c < skullData[r].length; c++) {
      const ch = skullData[r][c];
      if (ch === " ") continue;
      const color = ch === "X" ? 0xdddddd : 0x222222;
      g.rect(c * px - 18, skullTop + r * px, px, px);
      g.fill(color);
    }
  }

  // Spine (centered, below skull)
  const spineTop = skullTop + 30;
  for (let i = 0; i < 8; i++) {
    g.rect(-px, spineTop + i * px * 2, px * 2, px);
    g.fill(0xcccccc);
  }

  // Ribcage (3 pairs of ribs)
  const ribTop = spineTop + 4;
  for (let i = 0; i < 3; i++) {
    const ry = ribTop + i * px * 4;
    // Left ribs
    g.rect(-px * 5, ry, px * 4, px);
    g.fill(0xbbbbbb);
    g.rect(-px * 6, ry + px, px, px * 2);
    g.fill(0xbbbbbb);
    // Right ribs
    g.rect(px, ry, px * 4, px);
    g.fill(0xbbbbbb);
    g.rect(px * 5, ry + px, px, px * 2);
    g.fill(0xbbbbbb);
  }

  // Pelvis
  const pelvisY = spineTop + px * 16;
  g.rect(-px * 3, pelvisY, px * 6, px * 2);
  g.fill(0xcccccc);
  g.rect(-px * 4, pelvisY + px * 2, px * 2, px);
  g.fill(0xcccccc);
  g.rect(px * 2, pelvisY + px * 2, px * 2, px);
  g.fill(0xcccccc);

  // Arms (stick out from ribs, angled down)
  // Left arm
  for (let i = 0; i < 6; i++) {
    g.rect(-px * 6 - i * px, ribTop + i * px * 2, px, px * 2);
    g.fill(0xaaaaaa);
  }
  // Left hand (3 finger bones)
  const lhx = -px * 12, lhy = ribTop + px * 12;
  g.rect(lhx - px, lhy, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(lhx, lhy - px, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(lhx + px, lhy, px, px * 3);
  g.fill(0xbbbbbb);

  // Right arm
  for (let i = 0; i < 6; i++) {
    g.rect(px * 5 + i * px, ribTop + i * px * 2, px, px * 2);
    g.fill(0xaaaaaa);
  }
  // Right hand
  const rhx = px * 11, rhy = ribTop + px * 12;
  g.rect(rhx - px, rhy, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(rhx, rhy - px, px, px * 3);
  g.fill(0xbbbbbb);
  g.rect(rhx + px, rhy, px, px * 3);
  g.fill(0xbbbbbb);

  // Legs
  const legTop = pelvisY + px * 3;
  for (let i = 0; i < 7; i++) {
    // Left leg
    g.rect(-px * 3, legTop + i * px * 2, px * 2, px * 2);
    g.fill(0xaaaaaa);
    // Right leg
    g.rect(px, legTop + i * px * 2, px * 2, px * 2);
    g.fill(0xaaaaaa);
  }
  // Feet
  const footY = legTop + px * 14;
  g.rect(-px * 5, footY, px * 4, px);
  g.fill(0xbbbbbb);
  g.rect(-px, footY, px * 4, px);
  g.fill(0xbbbbbb);

  // Red glowing eyes
  g.circle(-6, skullTop + 12, 3);
  g.circle(6, skullTop + 12, 3);
  g.fill(0xff2222);

  container.addChild(g);
  return g;
}

function drawGhost(container) {
  const g = new Graphics();
  const px = 4;
  const top = -70;

  // 16-wide × 23-tall pixel grid
  const data = [
    "    GGGGGGGG    ",
    "  GGGGGGGGGGGG  ",
    " GGGGGGGGGGGGGG ",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGEEGGGGGGEEGGG",
    "GGGEPGGGGGGEPGGG",
    "GGGEEGGGGGGEEGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGMMMMMMGGGGG",
    "GGGGMMMMMMMMGGGG",
    "GGGGGMMMMMMGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GGGGGGGGGGGGGGGG",
    "GG GGGG  GGGG GG",
    "G   GG    GG   G",
    "    GG    GG    ",
    "     G     G    ",
  ];

  const colors = { G: 0xddeeff, E: 0x222244, P: 0x8888ff, M: 0x333355 };
  const halfW = (data[0].length * px) / 2;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  g.alpha = 0.85;
  container.addChild(g);
  return g;
}

function drawShark(container) {
  const g = new Graphics();
  const px = 4;
  const top = -30;

  // 24-wide × 14-tall pixel grid — shark facing left
  const data = [
    "          FF            ",
    "         FFFF           ",
    "    BBBBBBBBBBBBB       ",
    "   BBBBBBBBBBBBBBBBB    ",
    "  RRBBEBBBBBBBBBBBBBBF  ",
    "  RRBBBBBBBBBBBBBBBBBFF ",
    "   BBBBBBBBBBBBBBBBBFFFF",
    "   LLLLLLLLLLLLLLLLBFFFF",
    "   LLLLLLLLLLLLLLLLBBFF ",
    "  TTLLLLLLLLLLLLLLLLBB  ",
    "  MTTLLLLLLLLLLLLLLLB   ",
    "   TTLLLLLLLLLLLLLLB    ",
    "     LLLLLLLLLLLLL      ",
    "       FFFFFFFF         ",
  ];

  const colors = {
    B: 0x556677, L: 0x8899aa, F: 0x3a4a5a,
    T: 0xffffff, E: 0xff2222, R: 0xcc0000, M: 0x111111,
  };
  const halfW = (data[0].length * px) / 2;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  // Laser beam from snout — red line extending left
  g.moveTo(-halfW + 2 * px, top + 4 * px + px / 2);
  g.lineTo(-halfW - 40, top + 4 * px + px / 2);
  g.stroke({ width: 2, color: 0xff0000 });
  g.moveTo(-halfW + 2 * px, top + 5 * px + px / 2);
  g.lineTo(-halfW - 40, top + 5 * px + px / 2);
  g.stroke({ width: 2, color: 0xff0000 });

  container.addChild(g);
  return g;
}

function drawDemon(container) {
  const g = new Graphics();
  const px = 4;
  const top = -90;

  // 18-wide × 26-tall pixel grid
  const data = [
    "H             H   ",
    "HH    RRR   HH    ",
    " HH RRRRRRRHH     ",
    "  HHRRRRRRRRHH    ",
    "   RRRRRRRRRR     ",
    "   RRRRRRRRRR     ",
    "   RRERRRRRERR    ",
    "   RRPRRRRRRPRR   ",
    "   RRERRRRRERR    ",
    "   RRRRRRRRRR     ",
    "   RRRRMMMRRRR    ",
    "   RRRMMMMMRRR    ",
    "   RRRRMMMRRRR    ",
    "  WRRRRRRRRRRRW   ",
    " WWRRRRRRRRRRRWW  ",
    " W RRRRRRRRRRRR W ",
    "W  RRRRRRRRRRRR  W",
    "   DDDDDDDDDDDD   ",
    "   DDDDDDDDDDDD   ",
    "   DDDDDDDDDDDD   ",
    "    DDDDDDDDDDD   ",
    "    DDDD   DDDD   ",
    "    DDD     DDD   ",
    "   FDD       DDF  ",
    "   FF         FF  ",
    "  FF           FF ",
  ];

  const colors = {
    R: 0xcc2222, D: 0x881111, H: 0x550000,
    E: 0x111111, P: 0xffaa00, M: 0x111111,
    W: 0x771111, F: 0x993300,
  };
  const halfW = (data[0].length * px) / 2;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  // Fire aura — flickering flame particles around the body
  const flames = [
    { x: -30, y: -60, h: 18 }, { x: 30, y: -60, h: 18 },
    { x: -38, y: -30, h: 14 }, { x: 38, y: -30, h: 14 },
    { x: -34, y: 0, h: 12 }, { x: 34, y: 0, h: 12 },
    { x: -20, y: -80, h: 10 }, { x: 20, y: -80, h: 10 },
  ];
  for (const f of flames) {
    g.moveTo(f.x - 4, f.y);
    g.lineTo(f.x + 4, f.y);
    g.lineTo(f.x, f.y - f.h);
    g.closePath();
    g.fill(0xff6600);
    g.moveTo(f.x - 2, f.y);
    g.lineTo(f.x + 2, f.y);
    g.lineTo(f.x, f.y - f.h * 0.6);
    g.closePath();
    g.fill(0xffcc00);
  }

  container.addChild(g);
  return g;
}

function drawSkull(container) {
  const g = new Graphics();
  const px = 6; // extra large pixels for final boss
  const top = -105;

  // 22-wide × 24-tall pixel grid — massive zombie skull
  const data = [
    "      BBBBBBBBBB      ",
    "    BBBBBBBBBBBBBB    ",
    "   BBRBBBBBBBBBRBB   ",
    "  BBBBBCBBBBBBCBBBBB  ",
    "  BBBBBBBBBBBBBBBBBB  ",
    "  BBBBBBBBBBBBBBBBBB  ",
    " BBEEEEBBBBBBBBEEEEBB ",
    " BBEGGEBBBBBBBBEGGEBB ",
    " BBEEEEBBBBBBBBEEEEBB ",
    "  BBBBBBBBBBBBBBBBBB  ",
    "  BBBBBBBBBBBBBBBBBB  ",
    "  BBBBBBBBNNBBBBBBBB  ",
    "  BBBBBBBNNNNBBBBBBB  ",
    "  BBBBBBBBNNBBBBBBBB  ",
    " DDBBBBBBBBBBBBBBBBDD ",
    " TTTTTTTTTTTTTTTTTTTT ",
    " TMTMTMTMTMTMTMTMTMTM",
    "  TMTMTMTMTMTMTMTMTM  ",
    "   TTTTTTTTTTTTTTTT   ",
    "    DDDDDDDDDDDDDD    ",
    "     FFFFFFFFFFFF     ",
    "      FFWFFFFFFWFF    ",
    "       FFFFFFFF       ",
    "         FFFF         ",
  ];

  const colors = {
    B: 0xbbbb99, R: 0x994444, C: 0x444433,
    E: 0x111100, G: 0x33ff33, N: 0x222211,
    D: 0x777755, T: 0xccbb88, M: 0x111100,
    F: 0x667744, W: 0x88aa44,
  };
  const halfW = (data[0].length * px) / 2;

  for (let r = 0; r < data.length; r++) {
    for (let c = 0; c < data[r].length; c++) {
      const ch = data[r][c];
      if (ch === " ") continue;
      g.rect(c * px - halfW, top + r * px, px, px);
      g.fill(colors[ch]);
    }
  }

  // Green ooze dripping from eye sockets
  const eyeY = top + 8 * px;
  for (const ex of [-halfW + 4 * px, halfW - 6 * px]) {
    for (let i = 0; i < 4; i++) {
      const dripX = ex + (Math.random() - 0.5) * px * 2;
      g.rect(dripX, eyeY + i * px * 2, px, px * 2);
      g.fill(i < 2 ? 0x33ff33 : 0x228822);
    }
  }

  // Crack lines across the skull
  g.moveTo(-halfW + 6 * px, top + 2 * px);
  g.lineTo(-halfW + 8 * px, top + 5 * px);
  g.stroke({ width: 2, color: 0x444433 });
  g.moveTo(halfW - 6 * px, top + 2 * px);
  g.lineTo(halfW - 8 * px, top + 5 * px);
  g.stroke({ width: 2, color: 0x444433 });

  container.addChild(g);
  return g;
}

function createBoss(bossConfig) {
  const container = new Container();
  const { type, name, wordCount, wordLen, speed } = bossConfig;

  // Draw the boss body
  if (type === "skeleton") drawSkeleton(container);
  else if (type === "ghost") drawGhost(container);
  else if (type === "shark") drawShark(container);
  else if (type === "demon") drawDemon(container);
  else if (type === "skull") drawSkull(container);

  // Blood layer
  const bloodContainer = new Container();
  container.addChild(bloodContainer);

  // Generate real English words for the boss, filtered by active letter set
  const allowed = new Set(LETTER_SETS[letterSetIndex].letters.split(""));
  const words = [];
  const rawPool = BOSS_WORDS[wordLen] || [];
  const pool = rawPool.filter((w) => [...w].every((ch) => allowed.has(ch)));
  const used = new Set();
  for (let i = 0; i < wordCount; i++) {
    let word;
    const src = pool.length > 0 ? pool : rawPool;
    for (let a = 0; a < 60; a++) {
      const candidate = src[Math.floor(Math.random() * src.length)];
      if (!used.has(candidate)) { word = candidate; break; }
    }
    if (!word) word = src[Math.floor(Math.random() * src.length)];
    used.add(word);
    words.push(word);
  }

  // Build the full string: "CAT DOG BAT FLY ..." (spaces between words)
  const fullWord = words.join(" ");

  // Layout letter bubbles in rows below the boss body
  const bubbleSpacing = 20;
  const maxPerRow = 14;
  const bubbleStartY = 55;
  const letterTexts = [];
  const bubblePositions = []; // for blood avoidance

  for (let i = 0; i < fullWord.length; i++) {
    // Determine row and column
    const row = Math.floor(i / maxPerRow);
    const rowStart = row * maxPerRow;
    const rowEnd = Math.min(rowStart + maxPerRow, fullWord.length);
    const rowLen = rowEnd - rowStart;
    const col = i - rowStart;

    const totalRowW = (rowLen - 1) * bubbleSpacing;
    const bx = -totalRowW / 2 + col * bubbleSpacing;
    const by = bubbleStartY + row * 24;

    if (fullWord[i] === " ") {
      // Space separator — bright yellow dot indicator (turns gray on hit)
      const dot = new Graphics();
      dot.circle(bx, by, 4);
      dot.fill(0xffffff);
      dot.tint = 0xffdd00;
      container.addChild(dot);

      const spaceLbl = new Text({
        text: "·",
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: "bold",
          fill: 0xffdd00,
        }),
        resolution: 4,
      });
      spaceLbl.anchor.set(0.5);
      spaceLbl.x = bx;
      spaceLbl.y = by;
      spaceLbl._dot = dot;
      container.addChild(spaceLbl);
      letterTexts.push(spaceLbl);
      bubblePositions.push({ x: bx, y: by });
    } else {
      const bubble = new Graphics();
      bubble.circle(bx, by, 10);
      bubble.fill(0xffffff);
      bubble.circle(bx, by, 10);
      bubble.stroke({ width: 1.5, color: 0xbdc3c7 });
      container.addChild(bubble);

      const lt = new Text({
        text: fullWord[i],
        style: new TextStyle({
          fontFamily: "Arial",
          fontSize: 13,
          fontWeight: "bold",
          fill: 0x2c3e50,
        }),
        resolution: 4,
      });
      lt.anchor.set(0.5);
      lt.x = bx;
      lt.y = by;
      lt._bubble = bubble;
      container.addChild(lt);
      letterTexts.push(lt);
      bubblePositions.push({ x: bx, y: by });
    }
  }

  // Boss name label above
  const nameLabel = new Text({
    text: name,
    style: new TextStyle({
      fontFamily: "monospace",
      fontSize: 16,
      fontWeight: "bold",
      fill: 0xff4444,
    }),
    resolution: 4,
  });
  nameLabel.anchor.set(0.5);
  nameLabel.y = -110;
  container.addChild(nameLabel);

  // Health bar background (just below name, above skeleton)
  const hpBarY = -100;
  const hpBarBg = new Graphics();
  hpBarBg.roundRect(-60, hpBarY, 120, 8, 3);
  hpBarBg.fill(0x333333);
  container.addChild(hpBarBg);

  // Health bar fill
  const hpBar = new Graphics();
  hpBarBg.addChild(hpBar);

  function updateHpBar(hitIndex, total) {
    hpBar.clear();
    const pct = 1 - hitIndex / total;
    if (pct > 0) {
      hpBar.roundRect(-60, hpBarY, 120 * pct, 8, 3);
      hpBar.fill(pct > 0.5 ? 0x2ecc71 : pct > 0.25 ? 0xf39c12 : 0xe74c3c);
    }
  }
  updateHpBar(0, fullWord.length);

  return {
    container,
    propeller: null, // bosses don't have propellers
    bloodContainer,
    word: fullWord,
    letterTexts,
    hitIndex: 0,
    isBoss: true,
    bossConfig,
    bubblePositions,
    updateHpBar,
    speed,
  };
}

// ── Projectile (laser bolt) ───────────────────────────────
function createBullet(x, y, targetX, targetY) {
  const bullet = new Graphics();
  bullet.circle(0, 0, 4);
  bullet.fill(0x2ecc71);
  bullet.circle(0, 0, 2);
  bullet.fill(0xffffff);
  bullet.x = x;
  bullet.y = y;
  app.stage.addChild(bullet);

  const dx = targetX - x;
  const dy = targetY - y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  return {
    gfx: bullet,
    vx: (dx / dist) * 28,
    vy: (dy / dist) * 28,
    targetX,
    targetY,
    alive: true,
  };
}

// ── Player setup ───────────────────────────────────────────
const player = new Container();
const flame = drawOctopus(player);
player.x = PLAYER_X;
player.y = app.screen.height / 2;
app.stage.addChild(player);

// ── Score / Lives UI ───────────────────────────────────────
const uiStyle = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fill: 0xecf0f1,
});
const scoreText = new Text({ text: "Score: 0", style: uiStyle });
scoreText.x = 14;
scoreText.y = 14;
app.stage.addChild(scoreText);

const livesText = new Text({ text: "Lives: 3", style: uiStyle });
livesText.x = 14;
livesText.y = 42;
app.stage.addChild(livesText);

const levelText = new Text({ text: "Level: 1", style: uiStyle });
levelText.x = 14;
levelText.y = 70;
app.stage.addChild(levelText);

const lpsText = new Text({ text: `LPS: ${getLPS()}`, style: uiStyle });
lpsText.x = 14;
lpsText.y = 98;
app.stage.addChild(lpsText);

const letterSetText = new Text({ text: `Letters: ${LETTER_SETS[letterSetIndex].name}`, style: uiStyle });
letterSetText.x = 14;
letterSetText.y = 126;
app.stage.addChild(letterSetText);

const soundText = new Text({ text: "Sound: ON", style: uiStyle });
soundText.anchor.set(1, 0);
soundText.x = app.screen.width - 14;
soundText.y = 14;
app.stage.addChild(soundText);

const gameOverText = new Text({
  text: "GAME OVER\nPress Enter to restart",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 42,
    fill: 0xe74c3c,
    align: "center",
  }),
});
gameOverText.anchor.set(0.5);
gameOverText.x = app.screen.width / 2;
gameOverText.y = app.screen.height / 2;
gameOverText.visible = false;
app.stage.addChild(gameOverText);

const winText = new Text({
  text: "YOU WIN!\nPress Enter to restart",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 42,
    fill: 0x2ecc71,
    align: "center",
  }),
});
winText.anchor.set(0.5);
winText.x = app.screen.width / 2;
winText.y = app.screen.height / 2;
winText.visible = false;
app.stage.addChild(winText);

const pauseText = new Text({
  text: "PAUSED\nPress Enter to resume",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 42,
    fill: 0xecf0f1,
    align: "center",
  }),
});
pauseText.anchor.set(0.5);
pauseText.x = app.screen.width / 2;
pauseText.y = app.screen.height / 2;
pauseText.visible = false;
app.stage.addChild(pauseText);

// ── Spawning ───────────────────────────────────────────────
function getWordLength() {
  // Tier 0 (levels 1-10): always 1 letter
  // Tier T≥1: base length T, chance of T+1 scales 10%→100%
  // Capped at 5 (max substring length from 5-letter word list)
  const tier = Math.floor((level - 1) / 10);
  if (tier === 0) return 1;
  const tierProgress = ((level - 1) % 10) / 9;
  const upgradeChance = 0.1 + tierProgress * 0.9;
  const len = Math.random() < upgradeChance ? tier + 1 : tier;
  return Math.min(len, 5);
}

function pickWord(wordLen) {
  const allowed = new Set(LETTER_SETS[letterSetIndex].letters.split(""));

  // Collect first letters already in use by active monsters
  const activeFirstLetters = new Set(
    monsters.filter((m) => !m.dying).map((m) => m.word[m.hitIndex])
  );

  if (wordLen === 1) {
    const available = LETTER_SETS[letterSetIndex].letters.split("").filter(
      (l) => !activeFirstLetters.has(l)
    );
    if (available.length === 0) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  // For multi-letter, pick from words that only use allowed letters
  const pool = substrings[String(wordLen)];
  if (!pool || pool.length === 0) return null;

  // Pre-filter pool by allowed letters (cached per set to avoid re-filtering)
  const cacheKey = `_filtered_${letterSetIndex}`;
  if (!pool[cacheKey]) {
    pool[cacheKey] = pool.filter((w) => [...w].every((ch) => allowed.has(ch)));
  }
  const filtered = pool[cacheKey];
  if (filtered.length === 0) return null;

  // Pick from filtered pool, avoiding duplicate first letters
  for (let attempts = 0; attempts < 60; attempts++) {
    const candidate = filtered[Math.floor(Math.random() * filtered.length)];
    if (!activeFirstLetters.has(candidate[0])) return candidate;
  }
  return null;
}

function spawnBoss() {
  const config = BOSS_LEVELS[level];
  if (!config || bossActive) return;

  const m = createBoss(config);
  m.container.x = app.screen.width + 80;
  m.container.y = app.screen.height / 2;
  m.dying = false;
  m.dyingVy = 0;

  bossActive = true;
  app.stage.addChild(m.container);
  monsters.push(m);
}

function spawnMonster() {
  if (gameOver || gameWon) return;

  // Boss level: spawn boss instead of regular monsters
  if (BOSS_LEVELS[level]) {
    if (!bossActive) spawnBoss();
    return;
  }

  const wordLen = getWordLength();
  const word = pickWord(wordLen);
  if (!word) return;

  const m = createMonster(word);

  m.container.x = app.screen.width + 40;
  m.container.y = 60 + Math.random() * (app.screen.height - 140);
  m.dying = false;
  m.dyingVy = 0;

  // Speed: both bounds grow with level, capped at level 10 values
  const speedLevel = Math.min(level, 10);
  const minSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.06;
  const maxSpeed = MONSTER_SPEED + (speedLevel - 1) * 0.5;
  m.speed = minSpeed + Math.random() * (maxSpeed - minSpeed);

  app.stage.addChild(m.container);
  monsters.push(m);
}

let spawnTimer = 0;

// ── Bullets ────────────────────────────────────────────────
let bullets = [];

// ── Blood particles ───────────────────────────────────────
let bloodParticles = [];

function spawnBlood(x, y, count) {
  for (let i = 0; i < count; i++) {
    const g = new Graphics();
    const r = 1.5 + Math.random() * 2.5;
    g.circle(0, 0, r);
    g.fill(Math.random() < 0.4 ? 0x8b0000 : 0xcc0000);
    g.x = x;
    g.y = y;
    app.stage.addChild(g);
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 5;
    bloodParticles.push({
      gfx: g,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 2,
      life: 1,
      decay: 0.015 + Math.random() * 0.02,
    });
  }
}

// ── Stun UI ───────────────────────────────────────────────
const stunText = new Text({
  text: "STUNNED!",
  style: new TextStyle({
    fontFamily: "monospace",
    fontSize: 24,
    fill: 0xe74c3c,
    fontWeight: "bold",
  }),
});
stunText.anchor.set(0.5);
stunText.x = PLAYER_X;
stunText.y = app.screen.height / 2 - 60;
stunText.visible = false;
app.stage.addChild(stunText);

// ── Input ──────────────────────────────────────────────────
window.addEventListener("keydown", (e) => {
  // Resume audio context on first user interaction
  if (audioCtx.state === "suspended") audioCtx.resume();

  // Auto-start music if conditions are right
  if (soundEnabled && !musicPlaying && !gameOver && !gameWon && !paused) {
    startMusic();
  }

  if (gameOver || gameWon) {
    if (e.code === "Enter") restartGame();
    return;
  }

  if (e.code === "Tab") {
    e.preventDefault();
    letterSetIndex = (letterSetIndex + 1) % LETTER_SETS.length;
    letterSetText.text = `Letters: ${LETTER_SETS[letterSetIndex].name}`;
    return;
  }

  if (e.code === "Backquote") {
    soundEnabled = !soundEnabled;
    soundText.text = soundEnabled ? "Sound: ON" : "Sound: OFF";
    if (soundEnabled && !paused && !gameOver && !gameWon) startMusic();
    else stopMusic();
    return;
  }

  if (e.code === "Backslash") {
    bloodEnabled = !bloodEnabled;
    if (!bloodEnabled) {
      for (const p of bloodParticles) app.stage.removeChild(p.gfx);
      bloodParticles = [];
      for (const m of monsters) m.bloodContainer.removeChildren();
    }
    return;
  }

  if (e.code === "Escape") {
    const wasPaused = paused;
    paused = true;
    pauseText.visible = true;
    stopMusic();
    const input = prompt("Enter a starting level (1-60):");
    if (input !== null) {
      const n = parseInt(input, 10);
      if (n >= 1 && n <= MAX_LEVEL) {
        restartGame();
        level = n;
        score = 0;
        levelKills = 0;
        scoreText.text = `Score: ${score}`;
        levelText.text = `Level: ${level}`;
        lpsText.text = `LPS: ${getLPS()}`;
        return;
      }
    }
    // Restore previous pause state if cancelled or invalid
    paused = wasPaused;
    pauseText.visible = wasPaused;
    if (!wasPaused && soundEnabled) startMusic();
    return;
  }

  if (e.code === "Enter") {
    paused = !paused;
    pauseText.visible = paused;
    if (paused) stopMusic();
    else if (soundEnabled) startMusic();
    return;
  }

  if (paused) return;

  // Space bar handling for boss word gaps
  if (e.code === "Space") {
    e.preventDefault();
    if (Date.now() < stunUntil) return;

    // Find a boss monster whose next character is a space
    const boss = monsters.find((m) => {
      if (m.dying || !m.isBoss) return false;
      const pending = bullets.filter((b) => b.target === m).length;
      const nextIdx = m.hitIndex + pending;
      return nextIdx < m.word.length && m.word[nextIdx] === " ";
    });

    if (boss) {
      // Immediately advance past the space (no bullet needed)
      // Note: hitIndex may point to a letter if bullets are still in-flight,
      // so apply visuals based on actual character type at hitIndex
      playHit();
      const idx = boss.hitIndex;
      if (boss.word[idx] === " ") {
        boss.letterTexts[idx].style.fill = 0x555555;
        if (boss.letterTexts[idx]._dot) boss.letterTexts[idx]._dot.visible = false;
      } else {
        boss.letterTexts[idx].style.fill = 0xaaaaaa;
        if (boss.letterTexts[idx]._bubble) boss.letterTexts[idx]._bubble.tint = 0x888888;
      }
      boss.hitIndex++;
      if (boss.updateHpBar) boss.updateHpBar(boss.hitIndex, boss.word.length);
    }
    // No stun on space misses
    return;
  }

  const key = e.key.toUpperCase();
  if (key.length !== 1 || !LETTERS.includes(key)) return;

  // Can't shoot while stunned
  if (Date.now() < stunUntil) return;

  // Count in-flight bullets per monster
  const bulletsPerTarget = new Map();
  for (const b of bullets) {
    bulletsPerTarget.set(b.target, (bulletsPerTarget.get(b.target) || 0) + 1);
  }

  // Find the closest monster whose next needed letter matches,
  // accounting for bullets already in flight
  const target = monsters
    .filter((m) => {
      if (m.dying) return false;
      const pending = bulletsPerTarget.get(m) || 0;
      const nextIdx = m.hitIndex + pending;
      return nextIdx < m.word.length && m.word[nextIdx] === key;
    })
    .sort((a, b) => a.container.x - b.container.x)[0];

  if (!target) {
    // Don't stun if the letter was already cleared on some active monster
    const isGrayedLetter = monsters.some(
      (m) => !m.dying && m.hitIndex > 0 && m.word.slice(0, m.hitIndex).includes(key)
    );
    if (!isGrayedLetter) {
      stunUntil = Date.now() + 300;
    }
    return;
  }

  // Shoot!
  playShoot();
  const bullet = createBullet(
    player.x + 20,
    player.y - 5,
    target.container.x,
    target.container.y
  );
  bullet.target = target;
  bullets.push(bullet);
});

// ── Restart ────────────────────────────────────────────────
function restartGame() {
  for (const m of monsters) app.stage.removeChild(m.container);
  for (const b of bullets) app.stage.removeChild(b.gfx);
  for (const p of bloodParticles) app.stage.removeChild(p.gfx);
  monsters = [];
  bullets = [];
  bloodParticles = [];
  score = 0;
  levelKills = 0;
  lives = 3;
  level = 1;
  gameOver = false;
  gameWon = false;
  paused = false;
  stunUntil = 0;
  bossActive = false;
  scoreText.text = "Score: 0";
  pauseText.visible = false;
  livesText.text = "Lives: 3";
  levelText.text = "Level: 1";
  lpsText.text = `LPS: ${getLPS()}`;
  gameOverText.visible = false;
  winText.visible = false;
  spawnTimer = 0;
  stopMusic();
  if (soundEnabled) startMusic();
}

// ── Game loop ──────────────────────────────────────────────
let tick = 0;

app.ticker.add((ticker) => {
  tick++;
  const dt = ticker.deltaTime;

  // Player hover animation
  player.y = app.screen.height / 2 + Math.sin(tick * 0.04) * 12;
  drawFlame(flame, tick);

  // Stun indicator
  const stunned = !paused && Date.now() < stunUntil;
  stunText.visible = stunned;
  stunText.y = player.y - 60;
  if (stunned) {
    stunText.alpha = 0.6 + Math.sin(tick * 0.2) * 0.4;
  }

  if (gameOver || gameWon || paused) return;

  // Spawn timer
  const interval = getSpawnInterval();
  spawnTimer += ticker.deltaMS;
  if (spawnTimer >= interval) {
    spawnTimer -= interval;
    spawnMonster();
  }

  // Update monsters
  for (let i = monsters.length - 1; i >= 0; i--) {
    const m = monsters[i];


    if (m.dying) {
      // Fall down
      m.dyingVy += 0.4 * dt;
      m.container.y += m.dyingVy * dt;
      m.container.rotation += 0.05 * dt;
      m.container.alpha -= 0.015 * dt;

      if (m.container.y > app.screen.height + 60 || m.container.alpha <= 0) {
        app.stage.removeChild(m.container);
        monsters.splice(i, 1);
      }
    } else {
      // Float left
      m.container.x -= m.speed * dt;
      // Gentle bob
      m.container.y += Math.sin(tick * 0.05 + i) * 0.3;

      // Reached player side?
      if (m.container.x < PLAYER_X - 30) {
        if (m.isBoss) {
          // Boss reaching player = instant game over
          lives = 0;
          bossActive = false;
        } else {
          lives--;
        }
        playLoseLife();
        livesText.text = `Lives: ${lives}`;
        app.stage.removeChild(m.container);
        monsters.splice(i, 1);

        if (lives <= 0) {
          gameOver = true;
          gameOverText.visible = true;
          stopMusic();
        }
      }
    }
  }

  // Update bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];

    // Re-aim toward current target position every frame
    const dx = b.target.container.x - b.gfx.x;
    const dy = b.target.container.y - b.gfx.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const speed = BASE_BULLET_SPEED * (1 + level * 0.05);
    b.vx = (dx / dist) * speed;
    b.vy = (dy / dist) * speed;

    b.gfx.x += b.vx * dt;
    b.gfx.y += b.vy * dt;

    // Check if bullet reached target area
    if (dist < 20) {
      const t = b.target;

      // If this monster is already dying or fully hit, discard the stale bullet
      if (t.dying || t.hitIndex >= t.word.length) {
        app.stage.removeChild(b.gfx);
        bullets.splice(i, 1);
        continue;
      }

      // Grey out the hit character — detect letter vs space for correct visuals
      if (t.word[t.hitIndex] === " ") {
        t.letterTexts[t.hitIndex].style.fill = 0x555555;
        if (t.letterTexts[t.hitIndex]._dot) t.letterTexts[t.hitIndex]._dot.visible = false;
      } else {
        t.letterTexts[t.hitIndex].style.fill = 0xaaaaaa;
        if (t.letterTexts[t.hitIndex]._bubble) t.letterTexts[t.hitIndex]._bubble.tint = 0x888888;
      }
      t.hitIndex++;
      playHit();
      if (bloodEnabled) spawnBlood(t.container.x, t.container.y, 8);

      // Update boss HP bar
      if (t.updateHpBar) t.updateHpBar(t.hitIndex, t.word.length);

      // Skip spaces that immediately follow a letter hit (auto-advance)
      // (spaces are handled by Space key, but if hitIndex lands on space after bullet, don't block)

      if (t.hitIndex >= t.word.length) {
        // All letters hit — kill it
        playKill();
        if (bloodEnabled) spawnBlood(t.container.x, t.container.y, t.isBoss ? 60 : 25);

        const wordLen = t.word.replace(/ /g, "").length;
        const pointTable = { 1: 10, 2: 20, 3: 30, 4: 50, 5: 80 };
        const killPoints = t.isBoss ? level * 20 : (pointTable[wordLen] || wordLen * 10);
        score += killPoints;
        scoreText.text = `Score: ${score}`;

        if (t.isBoss) bossActive = false;

        // Level advancement: 10 regular kills or 1 boss kill
        if (t.isBoss) {
          levelKills = 0;
          level = Math.min(level + 1, MAX_LEVEL + 1);
          levelText.text = `Level: ${Math.min(level, MAX_LEVEL)}`;
          lpsText.text = `LPS: ${getLPS()}`;
        } else {
          levelKills++;
          if (levelKills >= 10) {
            levelKills = 0;
            level = Math.min(level + 1, MAX_LEVEL + 1);
            levelText.text = `Level: ${Math.min(level, MAX_LEVEL)}`;
            lpsText.text = `LPS: ${getLPS()}`;
          }
        }
        t.dying = true;
        t.dyingVy = -2;

        // Win condition: beat level 60
        if (level > MAX_LEVEL) {
          gameWon = true;
          winText.visible = true;
          stopMusic();
        }
      } else {
        // Non-kill hit — add persistent blood on monster body
        if (bloodEnabled && !t.isBoss) addMonsterBlood(t);
      }

      app.stage.removeChild(b.gfx);
      bullets.splice(i, 1);
      continue;
    }

    // Off-screen cleanup
    if (
      b.gfx.x > app.screen.width + 50 ||
      b.gfx.x < -50 ||
      b.gfx.y > app.screen.height + 50 ||
      b.gfx.y < -50
    ) {
      app.stage.removeChild(b.gfx);
      bullets.splice(i, 1);
    }
  }

  // Update blood particles
  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    const p = bloodParticles[i];
    p.vy += 0.15 * dt; // gravity
    p.gfx.x += p.vx * dt;
    p.gfx.y += p.vy * dt;
    p.life -= p.decay * dt;
    p.gfx.alpha = p.life;
    if (p.life <= 0) {
      app.stage.removeChild(p.gfx);
      bloodParticles.splice(i, 1);
    }
  }
});
