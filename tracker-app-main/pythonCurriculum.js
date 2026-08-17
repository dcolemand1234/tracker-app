// The full 100-day structure, modelled on the well-known Udemy course.
// Each day is ONE topic paired with ONE project that uses it, climbing
// Beginner → Intermediate → Intermediate+ → Advanced → Professional.
//
// The whole list is visible from the start on purpose. Seeing that
// day 47 builds an Amazon price tracker is what makes day 3 worth doing.
//
// `built: true` marks days with full teaching content written. The rest
// show topic and project so the scope is honest and the sequence clear.

export const LEVELS = {
  beginner: { label: 'Beginner', color: '#4f9e5c' },
  intermediate: { label: 'Intermediate', color: '#d9a441' },
  intermediatePlus: { label: 'Intermediate+', color: '#e0803a' },
  advanced: { label: 'Advanced', color: '#ea5a5f' },
  professional: { label: 'Professional Portfolio', color: '#9b7ede' },
};

const d = (day, id, level, title, project, topics, built) => ({
  day, id, level, title, project, topics, built: !!built,
});

export const PYTHON_DAYS = [
  // ---------------- Beginner: 1-14 ----------------
  d(1, 'py1', 'beginner', 'Working with Variables', 'Band Name Generator', ['variables', 'print/input', 'f-strings', 'types'], true),
  d(2, 'py2', 'beginner', 'Understanding Data Types', 'Tip Calculator', ['int/float/str/bool', 'conversion', 'maths operators', 'round()'], true),
  d(3, 'py3', 'beginner', 'Control Flow and Logical Operators', 'Treasure Island', ['if/elif/else', 'comparisons', 'and/or/not', 'nesting'], true),
  d(4, 'py4', 'beginner', 'Randomisation and Python Lists', 'Rock Paper Scissors', ['random module', 'lists', 'indexing', 'IndexError']),
  d(5, 'py5', 'beginner', 'Python Loops', 'Password Generator', ['for loops', 'range()', 'while loops', 'accumulators']),
  d(6, 'py6', 'beginner', 'Functions and Code Blocks', 'Escaping the Maze', ['def', 'indentation', 'while + functions', 'Karel-style problems']),
  d(7, 'py7', 'beginner', 'Hangman', 'Hangman Game', ['program flow design', 'ASCII art', 'game state', 'combining concepts']),
  d(8, 'py8', 'beginner', 'Function Parameters', 'Caesar Cipher', ['parameters', 'positional vs keyword', 'defaults', 'modulo wrapping']),
  d(9, 'py9', 'beginner', 'Dictionaries and Nesting', 'Secret Auction', ['dicts', 'key/value', 'nesting', 'looping dicts']),
  d(10, 'py10', 'beginner', 'Functions with Outputs', 'Calculator', ['return', 'multiple returns', 'docstrings', 'recursion intro']),
  d(11, 'py11', 'beginner', 'Capstone: Blackjack', 'Blackjack Game', ['full program design', 'edge cases', 'consolidation']),
  d(12, 'py12', 'beginner', 'Scope', 'Number Guessing Game', ['local vs global', 'global keyword', 'constants', 'namespaces']),
  d(13, 'py13', 'beginner', 'Debugging', 'Debugging Exercises', ['reading tracebacks', 'print debugging', 'error types', 'off-by-one']),
  d(14, 'py14', 'beginner', 'Higher Lower Game', 'Higher Lower Game', ['consolidation', 'refactoring', 'clean structure']),

  // ---------------- Intermediate: 15-31 ----------------
  d(15, 'py15', 'intermediate', 'Local Development Environment', 'Coffee Machine', ['installing Python', 'VS Code', 'running .py files', 'the terminal']),
  d(16, 'py16', 'intermediate', 'Object Oriented Programming', 'OOP Coffee Machine', ['classes vs objects', 'attributes', 'methods', 'why OOP']),
  d(17, 'py17', 'intermediate', 'Building Your Own Classes', 'Quiz Game', ['__init__', 'self', 'class design', 'composition']),
  d(18, 'py18', 'intermediate', 'Turtle Graphics and GUI', 'Hirst Painting', ['turtle module', 'imports', 'aliasing', 'colour systems']),
  d(19, 'py19', 'intermediate', 'Instances, State and Events', 'Turtle Race', ['multiple instances', 'event listeners', 'higher order functions']),
  d(20, 'py20', 'intermediate', 'Build Snake Part 1', 'Snake Game', ['screen setup', 'segments', 'movement', 'animation loop']),
  d(21, 'py21', 'intermediate', 'Build Snake Part 2', 'Snake Complete', ['inheritance', 'slicing', 'collision detection', 'scoreboard']),
  d(22, 'py22', 'intermediate', 'Build Pong', 'Pong Arcade Game', ['two-player input', 'ball physics', 'bouncing', 'scoring']),
  d(23, 'py23', 'intermediate', 'Capstone: Turtle Crossing', 'Turtle Crossing', ['class design from scratch', 'difficulty scaling']),
  d(24, 'py24', 'intermediate', 'Files, Directories and Paths', 'Mail Merge', ['open()', 'read/write/append', 'with', 'relative vs absolute paths']),
  d(25, 'py25', 'intermediate', 'CSV Data and Pandas', 'Squirrel Census', ['csv module', 'DataFrames', 'filtering', 'aggregating']),
  d(26, 'py26', 'intermediate', 'List and Dict Comprehensions', 'NATO Alphabet', ['list comprehension', 'conditionals in comprehensions', 'dict comprehension']),
  d(27, 'py27', 'intermediate', 'Tkinter, *args and **kwargs', 'Miles to Km Converter', ['GUI basics', 'widgets', '*args', '**kwargs']),
  d(28, 'py28', 'intermediate', 'Tkinter and Dynamic Typing', 'Pomodoro Timer', ['canvas', 'after() timing', 'dynamic updates', 'app state']),
  d(29, 'py29', 'intermediate', 'Building a Password Manager GUI', 'Password Manager', ['grid layout', 'entry widgets', 'messagebox', 'file writing']),
  d(30, 'py30', 'intermediate', 'Errors, Exceptions and JSON', 'Password Manager v2', ['try/except/else/finally', 'raising', 'JSON read/write/update']),
  d(31, 'py31', 'intermediate', 'Capstone: Flash Card App', 'Flash Card App', ['pandas + tkinter', 'persistence', 'app architecture']),

  // ---------------- Intermediate+: 32-58 ----------------
  d(32, 'py32', 'intermediatePlus', 'Sending Email and Managing Dates', 'Birthday Wisher', ['smtplib', 'datetime', 'scheduling', 'templates']),
  d(33, 'py33', 'intermediatePlus', 'API Endpoints and Parameters', 'ISS Overhead Notifier', ['requests', 'status codes', 'JSON responses', 'query params']),
  d(34, 'py34', 'intermediatePlus', 'API Practice', 'GUI Quiz App', ['API + OOP + GUI', 'error handling', 'refactoring to classes']),
  d(35, 'py35', 'intermediatePlus', 'Keys, Authentication and Env Variables', 'Rain Alert SMS', ['API keys', 'authentication', 'env vars', 'never committing secrets']),
  d(36, 'py36', 'intermediatePlus', 'Stock Trading News Alert', 'Stock News Alert', ['multiple APIs', 'chaining requests', 'percentage change logic']),
  d(37, 'py37', 'intermediatePlus', 'Habit Tracking: POST, PUT, DELETE', 'Pixela Habit Tracker', ['HTTP verbs', 'headers', 'request bodies', 'REST basics']),
  d(38, 'py38', 'intermediatePlus', 'Workout Tracking with Google Sheets', 'Exercise Tracker', ['natural language APIs', 'Sheets API', 'auth flows']),
  d(39, 'py39', 'intermediatePlus', 'Capstone Part 1: Flight Deal Finder', 'Flight Deal Finder', ['multi-module projects', 'separation of concerns']),
  d(40, 'py40', 'intermediatePlus', 'Capstone Part 2: Flight Club', 'Flight Club', ['user management', 'notifications', 'scaling a project']),
  d(41, 'py41', 'intermediatePlus', 'Web Foundation: Introduction to HTML', 'Personal Site', ['tags', 'structure', 'headings', 'links']),
  d(42, 'py42', 'intermediatePlus', 'Web Foundation: Intermediate HTML', 'Birthday Invite', ['lists', 'images', 'tables', 'semantic HTML']),
  d(43, 'py43', 'intermediatePlus', 'Web Foundation: Introduction to CSS', 'Styled Page', ['selectors', 'colours', 'fonts', 'inline vs external']),
  d(44, 'py44', 'intermediatePlus', 'Web Foundation: Intermediate CSS', 'Motivational Poster', ['box model', 'display', 'positioning', 'floats']),
  d(45, 'py45', 'intermediatePlus', 'Web Scraping with BeautifulSoup', '100 Movies to Watch', ['HTML parsing', 'selectors', 'scraping etiquette', 'writing to file']),
  d(46, 'py46', 'intermediatePlus', 'Musical Time Machine', 'Spotify Playlist Creator', ['scraping + API', 'OAuth', 'creating playlists']),
  d(47, 'py47', 'intermediatePlus', 'Automated Amazon Price Tracker', 'Price Tracker', ['scraping prices', 'headers/user agents', 'email alerts']),
  d(48, 'py48', 'intermediatePlus', 'Selenium Webdriver', 'Cookie Clicker Bot', ['webdriver', 'finding elements', 'clicking/typing', 'waits']),
  d(49, 'py49', 'intermediatePlus', 'Automating Job Applications', 'LinkedIn Auto-Apply', ['form filling', 'login flows', 'handling popups']),
  d(50, 'py50', 'intermediatePlus', 'Auto Swiping Bot', 'Tinder Swiping Bot', ['repeated actions', 'exception handling in bots', 'rate limiting']),
  d(51, 'py51', 'intermediatePlus', 'Internet Speed Complaint Bot', 'Speed Complaint Bot', ['measuring speed', 'conditional posting', 'automation ethics']),
  d(52, 'py52', 'intermediatePlus', 'Instagram Follower Bot', 'Follower Bot', ['scrolling', 'element lists', 'stale element handling']),
  d(53, 'py53', 'intermediatePlus', 'Web Scraping Capstone', 'Data Entry Automation', ['scrape + form fill end to end', 'combining Selenium and BS4']),
  d(54, 'py54', 'intermediatePlus', 'Web Development with Flask', 'Hello Flask', ['routes', 'decorators', 'dev server', 'debug mode']),
  d(55, 'py55', 'intermediatePlus', 'HTML and URL Parsing in Flask', 'Higher Lower Web Game', ['URL parameters', 'dynamic routes', 'returning HTML']),
  d(56, 'py56', 'intermediatePlus', 'Rendering HTML and Static Files', 'Name Card Website', ['render_template', 'static folder', 'templates']),
  d(57, 'py57', 'intermediatePlus', 'Templating with Jinja', 'Blog Capstone Part 1', ['Jinja syntax', 'loops in templates', 'passing data']),
  d(58, 'py58', 'intermediatePlus', 'Web Design and Bootstrap', 'Styled Blog', ['Bootstrap grid', 'components', 'responsive design']),

  // ---------------- Advanced: 59-80 ----------------
  d(59, 'py59', 'advanced', 'Blog Capstone Part 2', 'Blog with Styling', ['multi-page site', 'template inheritance']),
  d(60, 'py60', 'advanced', 'POST Requests with Flask and Forms', 'Contact Form Blog', ['HTML forms', 'POST handling', 'request.form']),
  d(61, 'py61', 'advanced', 'Advanced Forms with Flask-WTF', 'Secrets Page', ['WTForms', 'validation', 'CSRF protection']),
  d(62, 'py62', 'advanced', 'Flask, WTForms, Bootstrap and CSV', 'Coffee & Wifi', ['form to CSV', 'reading and displaying data']),
  d(63, 'py63', 'advanced', 'Databases with SQLite and SQLAlchemy', 'Virtual Bookshelf', ['SQL basics', 'ORM', 'CRUD operations']),
  d(64, 'py64', 'advanced', 'My Top 10 Movies Website', 'Movie Ranking Site', ['database + API', 'editing and deleting records']),
  d(65, 'py65', 'advanced', 'Web Design School', 'Portfolio Redesign', ['colour theory', 'typography', 'UI spacing', 'layout']),
  d(66, 'py66', 'advanced', 'Building Your Own API', 'Cafe API', ['RESTful routing', 'JSON responses', 'API documentation']),
  d(67, 'py67', 'advanced', 'Blog Capstone Part 3', 'RESTful Blog', ['full CRUD', 'route design']),
  d(68, 'py68', 'advanced', 'Authentication with Flask', 'Secrets with Login', ['password hashing', 'sessions', 'flask-login']),
  d(69, 'py69', 'advanced', 'Blog Capstone Part 4', 'Blog with Users', ['relational data', 'comments', 'permissions']),
  d(70, 'py70', 'advanced', 'Deploying Your Web Application', 'Live Blog', ['git', 'production servers', 'environment config']),
  d(71, 'py71', 'advanced', 'Data Exploration with Pandas', 'Programming Languages Analysis', ['loading data', 'cleaning', 'grouping']),
  d(72, 'py72', 'advanced', 'Data Visualisation with Matplotlib', 'Language Popularity Charts', ['plots', 'axes', 'styling charts']),
  d(73, 'py73', 'advanced', 'Aggregate and Merge Data', 'LEGO Analysis', ['groupby', 'merge', 'pivot tables']),
  d(74, 'py74', 'advanced', 'Google Trends and Time Series', 'Trends Analysis', ['resampling', 'time series plots', 'missing data']),
  d(75, 'py75', 'advanced', 'Plotly Charts', 'Android App Store Analysis', ['interactive charts', 'bar/pie/box plots']),
  d(76, 'py76', 'advanced', 'Computation with NumPy', 'Image Manipulation', ['ndarray', 'broadcasting', 'vectorisation', 'linalg']),
  d(77, 'py77', 'advanced', 'Linear Regression with Seaborn', 'Movie Budget vs Revenue', ['regression', 'correlation', 'seaborn plots']),
  d(78, 'py78', 'advanced', 'Predicting Box Office Revenue', 'Revenue Predictor', ['train/test', 'model fitting', 'evaluating fit']),
  d(79, 'py79', 'advanced', 'T-Tests and Distributions', 'Handwashing Discovery', ['distributions', 't-tests', 'statistical significance']),
  d(80, 'py80', 'advanced', 'Capstone: Predict House Prices', 'House Price Model', ['multivariable regression', 'feature engineering']),

  // ---------------- Professional Portfolio: 81-100 ----------------
  d(81, 'py81', 'professional', 'Text to Morse Code Converter', 'Morse Converter', ['dict mapping', 'string processing']),
  d(82, 'py82', 'professional', 'Portfolio Website', 'Personal Portfolio', ['static site', 'design', 'deployment']),
  d(83, 'py83', 'professional', 'Tic Tac Toe', 'Tic Tac Toe Game', ['game loop', 'win detection', 'input validation']),
  d(84, 'py84', 'professional', 'Image Watermarking App', 'Watermark Tool', ['Pillow', 'image processing', 'GUI file dialogs']),
  d(85, 'py85', 'professional', 'Typing Speed Test', 'Typing Test App', ['timers', 'accuracy scoring', 'tkinter']),
  d(86, 'py86', 'professional', 'Breakout Game', 'Breakout', ['collision physics', 'levels', 'game design']),
  d(87, 'py87', 'professional', 'Cafe and Wifi Website', 'Cafe Finder', ['Flask + database', 'search and filter']),
  d(88, 'py88', 'professional', 'Todo List Application', 'Todo App', ['CRUD', 'persistence', 'UI state']),
  d(89, 'py89', 'professional', 'Disappearing Text Writing App', 'Focus Writer', ['event timing', 'text widgets']),
  d(90, 'py90', 'professional', 'PDF to Audiobook', 'Audiobook Converter', ['PyPDF', 'text to speech', 'file handling']),
  d(91, 'py91', 'professional', 'Custom Tkinter Widget', 'Custom Widget', ['subclassing widgets', 'reusable components']),
  d(92, 'py92', 'professional', 'Rain Alert Application', 'Rain Alert App', ['weather API', 'notifications', 'scheduling']),
  d(93, 'py93', 'professional', 'Web Scraping Quotes', 'Quote Scraper', ['pagination', 'structured extraction']),
  d(94, 'py94', 'professional', 'Space Invaders', 'Space Invaders', ['sprites', 'game state', 'difficulty curves']),
  d(95, 'py95', 'professional', 'Hotel Booking Data Analysis', 'Booking Analysis', ['pandas', 'visualisation', 'insight writing']),
  d(96, 'py96', 'professional', 'Google Dinosaur Game Bot', 'Dino Bot', ['Selenium', 'reaction automation']),
  d(97, 'py97', 'professional', 'Personal Blog with Flask', 'Personal Blog', ['full stack', 'auth', 'deployment']),
  d(98, 'py98', 'professional', 'Data Dashboard', 'Analytics Dashboard', ['Plotly Dash', 'interactive filtering']),
  d(99, 'py99', 'professional', 'Machine Learning Basics', 'ML Starter Project', ['scikit-learn', 'train/test split', 'evaluation']),
  d(100, 'py100', 'professional', 'Final Capstone', 'Your Own Project', ['scoping', 'building', 'documenting', 'shipping']),
];

export function builtDays() {
  return PYTHON_DAYS.filter((x) => x.built);
}

export function levelGroups() {
  const groups = [];
  let current = null;
  PYTHON_DAYS.forEach((x) => {
    if (!current || current.level !== x.level) {
      current = { level: x.level, days: [] };
      groups.push(current);
    }
    current.days.push(x);
  });
  return groups;
}

