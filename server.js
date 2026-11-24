'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const { DatabaseSync } = require('node:sqlite');
require('dotenv').config({ quiet: true });

const scrypt = promisify(crypto.scrypt);
const ROOT = __dirname;
const SESSION_COOKIE = 'learnbuild_session';
const CSRF_COOKIE = 'learnbuild_csrf';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const BODY_LIMIT = 64 * 1024;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};

const CATALOG = [
  {
    slug: 'html-css-foundations',
    title: 'HTML & CSS Foundations',
    category: 'web',
    level: 'Beginner',
    estimatedMinutes: 210,
    description: 'Create a responsive, accessible website from the ground up.',
    outcomes: ['Structure pages with semantic HTML', 'Style layouts with CSS', 'Make a page work on small screens'],
    lessons: [
      {
        title: 'Give your page structure',
        summary: 'Build a clear document with meaningful HTML elements.',
        content: [
          ['heading', 'A page has a shape'],
          ['paragraph', 'HTML describes the meaning and structure of content. Elements such as header, main, section, and footer help people and assistive technology understand how a page is organized.'],
          ['code', '<main>\n  <h1>My first website</h1>\n  <p>A little corner of the web.</p>\n</main>'],
          ['paragraph', 'Use one clear page heading, keep heading levels in order, and choose elements for their meaning rather than their appearance.'],
        ],
        exercise: {
          prompt: 'Which element should contain the unique, central content of a page?',
          options: ['<main>', '<aside>', '<footer>'],
          answer: 0,
          explanation: 'The main element identifies the primary content of the document.',
        },
      },
      {
        title: 'Style with CSS',
        summary: 'Use selectors, spacing, color, and readable type.',
        content: [
          ['heading', 'Describe how things look'],
          ['paragraph', 'CSS rules pair a selector with declarations. Start with readable type and enough spacing, then add color to create hierarchy.'],
          ['code', 'h1 {\n  color: #234136;\n  margin-bottom: 0.5rem;\n}'],
          ['paragraph', 'Prefer reusable classes for repeated patterns. Keep contrast strong and do not rely on color alone to communicate meaning.'],
        ],
        exercise: {
          prompt: 'In a CSS rule, what does the selector identify?',
          options: ['The element or elements to style', 'The browser window size', 'The file name'],
          answer: 0,
          explanation: 'A selector matches the elements to which the declarations apply.',
        },
      },
      {
        title: 'Make a layout responsive',
        summary: 'Use flexible sizing and media queries for different screens.',
        content: [
          ['heading', 'Design for the screen in front of you'],
          ['paragraph', 'Responsive layouts adapt to available space. Flexible grids, max-widths, and wrapping usually work better than fixed page widths.'],
          ['code', '.cards {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));\n  gap: 1rem;\n}'],
          ['paragraph', 'Test with a narrow viewport and keyboard navigation. Content should remain readable without horizontal scrolling or hidden controls.'],
        ],
        exercise: {
          prompt: 'Which choice is most likely to prevent a layout from overflowing on a phone?',
          options: ['Use flexible columns that can wrap', 'Set every section to 1200px wide', 'Hide all text below 600px'],
          answer: 0,
          explanation: 'Flexible columns can shrink or wrap to the available viewport.',
        },
      },
    ],
    project: {
      title: 'Your personal portfolio',
      brief: 'Create a small, responsive portfolio page that introduces you and highlights one piece of work.',
      milestones: ['Sketch the page structure', 'Build the semantic HTML', 'Style and test mobile layout'],
    },
  },
  {
    slug: 'javascript-for-beginners',
    title: 'JavaScript for Beginners',
    category: 'programming',
    level: 'Beginner',
    estimatedMinutes: 300,
    description: 'Learn core programming ideas and add useful interactions to a page.',
    outcomes: ['Store and transform values', 'Write conditions and functions', 'Respond to page events'],
    lessons: [
      {
        title: 'Values and variables',
        summary: 'Give useful names to values your program needs.',
        content: [
          ['heading', 'Programs work with values'],
          ['paragraph', 'A variable gives a name to a value. Use const when the binding will not be reassigned and let when it will. Choose names that explain what the value represents.'],
          ['code', 'const learnerName = "Alex";\nlet lessonsCompleted = 0;\nlessonsCompleted += 1;'],
          ['paragraph', 'Strings describe text, numbers describe quantities, and booleans represent true or false.'],
        ],
        exercise: {
          prompt: 'Which declaration is the best fit for a value that will not be reassigned?',
          options: ['const', 'let', 'var for every value'],
          answer: 0,
          explanation: 'const communicates that the variable binding will not be reassigned.',
        },
      },
      {
        title: 'Make decisions',
        summary: 'Choose different actions with conditional logic.',
        content: [
          ['heading', 'A condition selects a path'],
          ['paragraph', 'An if statement runs a block when its condition is true. Add else when another action makes sense.'],
          ['code', 'if (score >= 3) {\n  message = "You passed";\n} else {\n  message = "Try once more";\n}'],
          ['paragraph', 'Use comparisons deliberately and make each branch easy to understand.'],
        ],
        exercise: {
          prompt: 'What happens when an if condition evaluates to false and there is no else branch?',
          options: ['The if block is skipped', 'The program always stops', 'The condition changes to true'],
          answer: 0,
          explanation: 'The block is skipped; execution continues after the if statement.',
        },
      },
      {
        title: 'Functions and events',
        summary: 'Reuse logic and respond to a learner action.',
        content: [
          ['heading', 'Give a task a name'],
          ['paragraph', 'Functions group steps into a reusable operation. In a web page, event listeners let your code respond to actions such as a button click.'],
          ['code', 'function greet(name) {\n  return `Hello, ${name}!`;\n}\n\nbutton.addEventListener("click", () => {\n  message.textContent = greet("Alex");\n});'],
          ['paragraph', 'Update the page using textContent for plain text. Avoid inserting untrusted input as HTML.'],
        ],
        exercise: {
          prompt: 'Which API safely assigns plain text to an element?',
          options: ['textContent', 'innerHTML with user input', 'document.write'],
          answer: 0,
          explanation: 'textContent treats its value as text rather than parsing it as markup.',
        },
      },
    ],
    project: {
      title: 'Mini interactive planner',
      brief: 'Plan a small interactive page that lets a visitor add and complete a few tasks.',
      milestones: ['Sketch the interaction', 'Represent tasks as data', 'Test empty and completed states'],
    },
  },
  {
    slug: 'python-problem-solving',
    title: 'Python Problem Solving',
    category: 'programming',
    level: 'Beginner',
    estimatedMinutes: 360,
    description: 'Break problems into steps, then express your solution clearly in Python.',
    outcomes: ['Work with Python values', 'Repeat work with loops', 'Organize solutions with functions'],
    lessons: [
      {
        title: 'Names and data types',
        summary: 'Use variables to represent information in a problem.',
        content: [
          ['heading', 'Start with the information'],
          ['paragraph', 'Python variables refer to values. Strings hold text, integers hold whole numbers, and lists group ordered items.'],
          ['code', 'learner = "Alex"\ncompleted = 2\nnext_steps = ["read", "practice"]'],
          ['paragraph', 'Before coding, write down the inputs you have and the result you need.'],
        ],
        exercise: {
          prompt: 'Which Python value is a list?',
          options: ['["read", "practice"]', '"read, practice"', '2'],
          answer: 0,
          explanation: 'Square brackets create a list in Python.',
        },
      },
      {
        title: 'Repeat with loops',
        summary: 'Process each item in a collection.',
        content: [
          ['heading', 'Let the computer repeat'],
          ['paragraph', 'A for loop runs its body once for each item in an iterable. It helps avoid copy-pasting the same operation.'],
          ['code', 'for topic in topics:\n    print(topic)'],
          ['paragraph', 'Check the collection and the loop body carefully. A loop with no progress toward its stopping condition may never finish.'],
        ],
        exercise: {
          prompt: 'How many times does a for loop run when its list has four items?',
          options: ['Four times', 'Once', 'Forever'],
          answer: 0,
          explanation: 'The loop body runs once for each item in the list.',
        },
      },
      {
        title: 'Write a small function',
        summary: 'Name a reusable operation and return its result.',
        content: [
          ['heading', 'Turn steps into a function'],
          ['paragraph', 'Functions make solutions easier to reuse and test. Parameters represent inputs; return sends a result back to the caller.'],
          ['code', 'def minutes_to_hours(minutes):\n    return minutes / 60'],
          ['paragraph', 'Keep a function focused on one task, and choose names that describe what it returns or does.'],
        ],
        exercise: {
          prompt: 'What does return do inside a Python function?',
          options: ['Sends a result back to the caller', 'Repeats the function forever', 'Renames the function'],
          answer: 0,
          explanation: 'return ends the current function call and provides a result.',
        },
      },
    ],
    project: {
      title: 'Study session planner',
      brief: 'Plan a small command-line program that organizes study tasks and estimates time.',
      milestones: ['List the inputs and outputs', 'Represent tasks clearly', 'Test normal and empty plans'],
    },
  },
  {
    slug: 'data-thinking-python',
    title: 'Data Thinking with Python',
    category: 'data',
    level: 'Beginner',
    estimatedMinutes: 240,
    description: 'Ask a useful question, explore a dataset, and explain what you find.',
    outcomes: ['Ask answerable data questions', 'Summarize and compare values', 'Explain limits and uncertainty'],
    lessons: [
      {
        title: 'Ask a data question',
        summary: 'Define what you hope to learn before collecting data.',
        content: [
          ['heading', 'Start with curiosity'],
          ['paragraph', 'A focused question helps determine what data you need. Define the population, time range, and outcome so your question can be answered.'],
          ['code', 'Question: How did the weekly temperature range change?\nScope: One city, this month\nMeasure: Daily high minus daily low'],
          ['paragraph', 'Avoid collecting personal information unless it is necessary and you have a clear, appropriate reason.'],
        ],
        exercise: {
          prompt: 'What is the best first step before analyzing data?',
          options: ['Define a focused question', 'Make the most colorful chart', 'Remove inconvenient values'],
          answer: 0,
          explanation: 'A focused question guides the data and analysis choices.',
        },
      },
      {
        title: 'Summarize what you see',
        summary: 'Use simple summaries to understand the shape of your data.',
        content: [
          ['heading', 'Look before you conclude'],
          ['paragraph', 'Counts, minimums, maximums, and averages can reveal patterns. Averages can be affected by extreme values, so consider the full distribution.'],
          ['code', 'temperatures = [18, 20, 21, 28]\naverage = sum(temperatures) / len(temperatures)'],
          ['paragraph', 'Check missing values and units before comparing results.'],
        ],
        exercise: {
          prompt: 'Why might an average fail to describe a dataset well?',
          options: ['An extreme value can pull it away from most observations', 'It always removes every value', 'It can only be used for words'],
          answer: 0,
          explanation: 'A mean is sensitive to unusually high or low values.',
        },
      },
      {
        title: 'Share an honest finding',
        summary: 'Choose a clear chart and explain what it cannot prove.',
        content: [
          ['heading', 'Make the finding understandable'],
          ['paragraph', 'Choose a chart that fits the comparison. Label axes, show units, and include enough context to understand the source and time period.'],
          ['code', 'Finding: The median daily high was higher in week four.\nLimit: The sample covers one city and one month.'],
          ['paragraph', 'A pattern or correlation does not by itself prove that one factor caused another. State uncertainty and limitations plainly.'],
        ],
        exercise: {
          prompt: 'What should accompany a data claim?',
          options: ['Context and limitations', 'A guarantee that the pattern is universal', 'An unlabeled chart'],
          answer: 0,
          explanation: 'Context and limitations help readers interpret a finding responsibly.',
        },
      },
    ],
    project: {
      title: 'A week in data',
      brief: 'Explore a small public dataset and write a short, careful summary of one pattern.',
      milestones: ['Choose a question and dataset', 'Summarize a useful measure', 'Share a chart with limitations'],
    },
  },
  {
    slug: 'designing-for-the-web',
    title: 'Designing for the Web',
    category: 'web',
    level: 'Intermediate',
    estimatedMinutes: 270,
    description: 'Design clear interfaces with hierarchy, layout, and accessible interactions.',
    outcomes: ['Create a visual hierarchy', 'Choose layout patterns', 'Check common accessibility basics'],
    lessons: [
      {
        title: 'Create visual hierarchy',
        summary: 'Help people notice the most important information first.',
        content: [
          ['heading', 'Make the next step visible'],
          ['paragraph', 'Hierarchy comes from size, spacing, contrast, and placement. Use these cues consistently so people can scan a page and understand where to begin.'],
          ['code', 'Page title → short explanation → primary action → supporting details'],
          ['paragraph', 'More emphasis is not always more clarity. Reserve the strongest treatment for the most important action.'],
        ],
        exercise: {
          prompt: 'What is a useful way to make one primary action clear?',
          options: ['Give it consistent visual emphasis', 'Make every button equally bright', 'Hide its label'],
          answer: 0,
          explanation: 'Consistent emphasis helps people identify the primary action.',
        },
      },
      {
        title: 'Choose a flexible layout',
        summary: 'Use spacing and grids to group related information.',
        content: [
          ['heading', 'Let the content guide the layout'],
          ['paragraph', 'A grid can make relationships between cards clear. Use consistent spacing and let columns adapt to the available width.'],
          ['code', '.layout {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));\n  gap: 1.25rem;\n}'],
          ['paragraph', 'Avoid fixed widths that force users to scroll sideways. Check zoom and narrow screens, not just your design canvas.'],
        ],
        exercise: {
          prompt: 'What is a good reason to use a grid?',
          options: ['To align related content and manage space', 'To replace meaningful headings', 'To force a fixed width on every screen'],
          answer: 0,
          explanation: 'A grid organizes related content and adapts to available space.',
        },
      },
      {
        title: 'Design an accessible interaction',
        summary: 'Support keyboard, focus, contrast, and clear labels.',
        content: [
          ['heading', 'Accessibility is part of the design'],
          ['paragraph', 'Use native buttons and links, provide visible keyboard focus, label form fields, and keep text readable at zoom. Never use color as the only signal.'],
          ['code', '<button type="button" aria-pressed="false">Save for later</button>'],
          ['paragraph', 'Test the flow without a mouse. Clear labels and predictable focus help many people, not only people using assistive technology.'],
        ],
        exercise: {
          prompt: 'Which choice supports keyboard users?',
          options: ['A visible focus indicator', 'Removing focus outlines everywhere', 'Click-only controls'],
          answer: 0,
          explanation: 'A visible focus indicator shows which control is active on the keyboard.',
        },
      },
    ],
    project: {
      title: 'Accessible course card',
      brief: 'Design a course card that communicates level, effort, and a clear next action.',
      milestones: ['Sketch hierarchy and content', 'Build responsive layout', 'Check focus and contrast'],
    },
  },
  {
    slug: 'ai-concepts-clearly',
    title: 'AI Concepts, Clearly',
    category: 'data',
    level: 'Intermediate',
    estimatedMinutes: 180,
    description: 'Understand what machine learning can do, where it fails, and how to use it thoughtfully.',
    outcomes: ['Explain training data and models', 'Recognize evaluation limits', 'Consider privacy and impact'],
    lessons: [
      {
        title: 'How a model learns patterns',
        summary: 'Connect examples, training, and a model’s predictions.',
        content: [
          ['heading', 'A model learns from examples'],
          ['paragraph', 'In machine learning, a training process adjusts a model using examples. The resulting model can make predictions on new inputs, but it does not understand the world like a person.'],
          ['code', 'examples + learning method → model\nnew input + model → prediction'],
          ['paragraph', 'The quality and coverage of the examples matter. A model can reproduce patterns and gaps found in its data.'],
        ],
        exercise: {
          prompt: 'What does a trained model generally produce for a new input?',
          options: ['A prediction based on learned patterns', 'A guaranteed true fact', 'A complete explanation of its reasoning'],
          answer: 0,
          explanation: 'A model produces a prediction; it is not automatically a guarantee or explanation.',
        },
      },
      {
        title: 'Evaluate beyond accuracy',
        summary: 'Check the evaluation set and the cost of different errors.',
        content: [
          ['heading', 'Measure what matters'],
          ['paragraph', 'Accuracy can hide uneven performance across groups or types of cases. Evaluation should reflect the intended use and consider false positives, false negatives, and uncertainty.'],
          ['code', 'Before using a result:\n- Check the test examples\n- Compare relevant error types\n- Ask who is missing from the data'],
          ['paragraph', 'A benchmark score does not guarantee safe or useful behavior in a different setting.'],
        ],
        exercise: {
          prompt: 'Why might overall accuracy be insufficient?',
          options: ['It can hide different error rates or harms', 'It always shows the source of every error', 'It guarantees the system is fair'],
          answer: 0,
          explanation: 'A single aggregate score can hide important differences in error and impact.',
        },
      },
      {
        title: 'Use AI responsibly',
        summary: 'Protect private data and keep people accountable for decisions.',
        content: [
          ['heading', 'Tools do not replace responsibility'],
          ['paragraph', 'Consider what data a tool receives, how its output will be used, and who could be harmed by an error. Do not enter sensitive personal or confidential information into tools without approval.'],
          ['code', 'Helpful review:\n1. Is this use appropriate?\n2. Can a person verify the output?\n3. Is there a safe fallback?'],
          ['paragraph', 'Keep people involved in consequential decisions and make it possible to question or correct an outcome.'],
        ],
        exercise: {
          prompt: 'What is a responsible way to use an AI-generated answer?',
          options: ['Review it and verify important claims', 'Assume it is always correct', 'Share private data to improve the answer'],
          answer: 0,
          explanation: 'Generated output can be wrong, so important claims need human verification.',
        },
      },
    ],
    project: {
      title: 'Explain an AI system',
      brief: 'Choose an everyday AI use case and document its inputs, limits, and possible impacts.',
      milestones: ['Describe the use case', 'Identify an evaluation question', 'Explain safeguards and limitations'],
    },
  },
];

function now() {
  return new Date().toISOString();
}

function newId() {
  return crypto.randomUUID();
}

function json(res, status, value, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(value));
}

function fail(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function cookieMap(req) {
  return Object.fromEntries((req.headers.cookie || '').split(';').map((part) => {
    const separator = part.indexOf('=');
    if (separator < 0) return ['', ''];
    return [part.slice(0, separator).trim(), part.slice(separator + 1).trim()];
  }).filter(([key]) => key));
}

function appendCookie(res, name, value, options = {}) {
  const isProduction = process.env.NODE_ENV === 'production';
  const values = res.getHeader('Set-Cookie') || [];
  const headers = Array.isArray(values) ? values : [values];
  const pieces = [`${name}=${value}`, 'Path=/', 'SameSite=Strict'];
  if (options.maxAge !== undefined) pieces.push(`Max-Age=${options.maxAge}`);
  if (options.httpOnly) pieces.push('HttpOnly');
  if (isProduction) pieces.push('Secure');
  headers.push(pieces.join('; '));
  res.setHeader('Set-Cookie', headers);
}

function setCsrfCookie(res, token) {
  appendCookie(res, CSRF_COOKIE, token, { maxAge: Math.floor(SESSION_TTL_MS / 1000) });
}

function sessionCookie(res, token) {
  appendCookie(res, SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

function clearCookie(res, name, httpOnly = false) {
  appendCookie(res, name, '', { maxAge: 0, httpOnly });
}

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  if (process.env.NODE_ENV === 'production') res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
}

function createDatabase(dbPath) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      handle TEXT NOT NULL UNIQUE,
      password_salt TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      user_role TEXT NOT NULL DEFAULT 'student' CHECK (user_role IN ('student', 'author', 'reviewer', 'publisher')),
      created_at TEXT NOT NULL,
      deleted_at TEXT
    );
    CREATE TABLE IF NOT EXISTS learner_profiles (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      skill_level TEXT NOT NULL DEFAULT 'beginner',
      learning_goal TEXT NOT NULL DEFAULT '',
      timezone TEXT NOT NULL DEFAULT 'UTC',
      visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public'))
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token_hash TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      csrf_token TEXT NOT NULL,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS learning_paths (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      level TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      level TEXT NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      outcomes_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'review', 'published', 'archived')),
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS path_courses (
      path_id TEXT NOT NULL REFERENCES learning_paths(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      PRIMARY KEY (path_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      UNIQUE (course_id, position)
    );
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      content_json TEXT NOT NULL,
      position INTEGER NOT NULL,
      estimated_minutes INTEGER NOT NULL,
      UNIQUE (module_id, position)
    );
    CREATE TABLE IF NOT EXISTS exercises (
      id TEXT PRIMARY KEY,
      lesson_id TEXT NOT NULL UNIQUE REFERENCES lessons(id) ON DELETE CASCADE,
      prompt TEXT NOT NULL,
      options_json TEXT NOT NULL,
      correct_option_index INTEGER NOT NULL,
      explanation TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'paused')),
      UNIQUE (user_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS progress (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
      completed_at TEXT,
      last_position INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (user_id, lesson_id)
    );
    CREATE TABLE IF NOT EXISTS exercise_attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      exercise_id TEXT NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
      selected_option_index INTEGER NOT NULL,
      passed INTEGER NOT NULL CHECK (passed IN (0, 1)),
      submitted_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, course_id)
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      brief TEXT NOT NULL,
      milestones_json TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      description TEXT NOT NULL,
      repository_url TEXT,
      visibility TEXT NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'public')),
      milestones_completed INTEGER NOT NULL DEFAULT 0,
      submitted_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS audit_events (
      id TEXT PRIMARY KEY,
      actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_courses_category_level ON courses(category, level, status);
    CREATE INDEX IF NOT EXISTS idx_modules_course_position ON modules(course_id, position);
    CREATE INDEX IF NOT EXISTS idx_lessons_module_position ON lessons(module_id, position);
    CREATE INDEX IF NOT EXISTS idx_progress_user_updated ON progress(user_id, updated_at);
    CREATE INDEX IF NOT EXISTS idx_attempts_user_exercise_date ON exercise_attempts(user_id, exercise_id, submitted_at);
    CREATE INDEX IF NOT EXISTS idx_submissions_user_date ON project_submissions(user_id, submitted_at);
  `);

  const pathInsert = db.prepare('INSERT OR IGNORE INTO learning_paths (id, slug, title, description, level) VALUES (?, ?, ?, ?, ?)');
  pathInsert.run('path-build-web', 'build-for-the-web', 'Build for the web', 'Learn the foundations of the web and publish projects that are yours.', 'Beginner');
  pathInsert.run('path-code-thinking', 'code-and-data-thinking', 'Code and data thinking', 'Practice programming, data literacy, and thoughtful technology use.', 'Beginner');
  const courseInsert = db.prepare(`INSERT OR IGNORE INTO courses
    (id, slug, title, description, category, level, estimated_minutes, outcomes_json, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`);
  const moduleInsert = db.prepare('INSERT OR IGNORE INTO modules (id, course_id, title, position) VALUES (?, ?, ?, ?)');
  const lessonInsert = db.prepare(`INSERT OR IGNORE INTO lessons
    (id, module_id, title, summary, content_json, position, estimated_minutes)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const exerciseInsert = db.prepare(`INSERT OR IGNORE INTO exercises
    (id, lesson_id, prompt, options_json, correct_option_index, explanation)
    VALUES (?, ?, ?, ?, ?, ?)`);
  const projectInsert = db.prepare(`INSERT OR IGNORE INTO projects
    (id, course_id, title, brief, milestones_json) VALUES (?, ?, ?, ?, ?)`);
  const webPathInsert = db.prepare('INSERT OR IGNORE INTO path_courses (path_id, course_id, position) VALUES (?, ?, ?)');
  const codePathInsert = db.prepare('INSERT OR IGNORE INTO path_courses (path_id, course_id, position) VALUES (?, ?, ?)');

  CATALOG.forEach((course, courseIndex) => {
    const courseId = `course-${course.slug}`;
    courseInsert.run(courseId, course.slug, course.title, course.description, course.category, course.level, course.estimatedMinutes, JSON.stringify(course.outcomes), now());
    const moduleId = `${course.slug}-module-1`;
    moduleInsert.run(moduleId, courseId, 'Core concepts', 1);
    course.lessons.forEach((lesson, lessonIndex) => {
      const lessonId = `${course.slug}-lesson-${lessonIndex + 1}`;
      lessonInsert.run(lessonId, moduleId, lesson.title, lesson.summary, JSON.stringify(lesson.content), lessonIndex + 1, Math.max(10, Math.round(course.estimatedMinutes / course.lessons.length)));
      exerciseInsert.run(`${lessonId}-check`, lessonId, lesson.exercise.prompt, JSON.stringify(lesson.exercise.options), lesson.exercise.answer, lesson.exercise.explanation);
    });
    projectInsert.run(`project-${course.slug}`, courseId, course.project.title, course.project.brief, JSON.stringify(course.project.milestones));
    if (course.category === 'web') webPathInsert.run('path-build-web', courseId, courseIndex + 1);
    else codePathInsert.run('path-code-thinking', courseId, courseIndex + 1);
  });

  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
  db.transaction = async (operation) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = await operation(db);
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  return db;
}

async function createMysqlDatabase(config = {}) {
  const mysql = require('mysql2/promise');
  const host = config.host || process.env.LEARNBUILD_DB_HOST || process.env.MYSQLHOST || 'localhost';
  const port = Number(config.port || process.env.LEARNBUILD_DB_PORT || process.env.MYSQLPORT || 3306);
  const user = config.user || process.env.LEARNBUILD_DB_USER || process.env.MYSQLUSER || 'LearnBuild';
  const password = config.password || process.env.LEARNBUILD_DB_PASSWORD || process.env.MYSQLPASSWORD;
  const database = config.database || process.env.LEARNBUILD_DB_NAME || process.env.MYSQLDATABASE || 'learnbuild';
  if (!password) throw new Error('Set LEARNBUILD_DB_PASSWORD before starting LearnBuild.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('LEARNBUILD_DB_PORT must be a valid TCP port.');
  if (!/^[A-Za-z0-9_]+$/.test(database)) throw new Error('LEARNBUILD_DB_NAME may contain only letters, numbers, and underscores.');

  const bootstrap = await mysql.createConnection({ host, port, user, password });
  try {
    const [schemas] = await bootstrap.query(
      'SELECT SCHEMA_NAME FROM information_schema.schemata WHERE SCHEMA_NAME = ?',
      [database],
    );
    if (!schemas.length) {
      await bootstrap.query(`CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    }
  } finally {
    await bootstrap.end();
  }

  const pool = mysql.createPool({
    host, port, user, password, database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4',
  });
  const schema = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(191) PRIMARY KEY,
      email VARCHAR(254) NOT NULL UNIQUE,
      handle VARCHAR(80) NOT NULL UNIQUE,
      password_salt CHAR(32) NOT NULL,
      password_hash CHAR(128) NOT NULL,
      display_name VARCHAR(60) NOT NULL,
      user_role VARCHAR(24) NOT NULL DEFAULT 'student',
      created_at VARCHAR(30) NOT NULL,
      deleted_at VARCHAR(30)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS learner_profiles (
      user_id VARCHAR(191) PRIMARY KEY,
      skill_level VARCHAR(24) NOT NULL DEFAULT 'beginner',
      learning_goal VARCHAR(160) NOT NULL DEFAULT '',
      timezone VARCHAR(80) NOT NULL DEFAULT 'UTC',
      visibility VARCHAR(16) NOT NULL DEFAULT 'private',
      CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS sessions (
      token_hash CHAR(64) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      csrf_token CHAR(43) NOT NULL,
      created_at VARCHAR(30) NOT NULL,
      expires_at VARCHAR(30) NOT NULL,
      CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS learning_paths (
      id VARCHAR(191) PRIMARY KEY,
      slug VARCHAR(120) NOT NULL UNIQUE,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      level VARCHAR(24) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(191) PRIMARY KEY,
      slug VARCHAR(120) NOT NULL UNIQUE,
      title VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      category VARCHAR(32) NOT NULL,
      level VARCHAR(24) NOT NULL,
      estimated_minutes INT NOT NULL,
      outcomes_json LONGTEXT NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'published',
      created_at VARCHAR(30) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS path_courses (
      path_id VARCHAR(191) NOT NULL,
      course_id VARCHAR(191) NOT NULL,
      position INT NOT NULL,
      PRIMARY KEY (path_id, course_id),
      CONSTRAINT fk_path_courses_path FOREIGN KEY (path_id) REFERENCES learning_paths(id) ON DELETE CASCADE,
      CONSTRAINT fk_path_courses_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS modules (
      id VARCHAR(191) PRIMARY KEY,
      course_id VARCHAR(191) NOT NULL,
      title VARCHAR(200) NOT NULL,
      position INT NOT NULL,
      UNIQUE KEY uq_modules_course_position (course_id, position),
      CONSTRAINT fk_modules_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS lessons (
      id VARCHAR(191) PRIMARY KEY,
      module_id VARCHAR(191) NOT NULL,
      title VARCHAR(200) NOT NULL,
      summary TEXT NOT NULL,
      content_json LONGTEXT NOT NULL,
      position INT NOT NULL,
      estimated_minutes INT NOT NULL,
      UNIQUE KEY uq_lessons_module_position (module_id, position),
      CONSTRAINT fk_lessons_module FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS exercises (
      id VARCHAR(191) PRIMARY KEY,
      lesson_id VARCHAR(191) NOT NULL UNIQUE,
      prompt TEXT NOT NULL,
      options_json LONGTEXT NOT NULL,
      correct_option_index INT NOT NULL,
      explanation TEXT NOT NULL,
      CONSTRAINT fk_exercises_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS enrollments (
      id VARCHAR(191) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      course_id VARCHAR(191) NOT NULL,
      started_at VARCHAR(30) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'in_progress',
      UNIQUE KEY uq_enrollments_user_course (user_id, course_id),
      CONSTRAINT fk_enrollments_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_enrollments_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS progress (
      user_id VARCHAR(191) NOT NULL,
      lesson_id VARCHAR(191) NOT NULL,
      status VARCHAR(24) NOT NULL DEFAULT 'in_progress',
      completed_at VARCHAR(30),
      last_position INT NOT NULL DEFAULT 0,
      updated_at VARCHAR(30) NOT NULL,
      PRIMARY KEY (user_id, lesson_id),
      CONSTRAINT fk_progress_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_progress_lesson FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS exercise_attempts (
      id VARCHAR(191) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      exercise_id VARCHAR(191) NOT NULL,
      selected_option_index INT NOT NULL,
      passed TINYINT NOT NULL,
      submitted_at VARCHAR(30) NOT NULL,
      CONSTRAINT fk_attempts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_attempts_exercise FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS bookmarks (
      user_id VARCHAR(191) NOT NULL,
      course_id VARCHAR(191) NOT NULL,
      created_at VARCHAR(30) NOT NULL,
      PRIMARY KEY (user_id, course_id),
      CONSTRAINT fk_bookmarks_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_bookmarks_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS projects (
      id VARCHAR(191) PRIMARY KEY,
      course_id VARCHAR(191) NOT NULL,
      title VARCHAR(200) NOT NULL,
      brief TEXT NOT NULL,
      milestones_json LONGTEXT NOT NULL,
      CONSTRAINT fk_projects_course FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS project_submissions (
      id VARCHAR(191) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      project_id VARCHAR(191) NOT NULL,
      description TEXT NOT NULL,
      repository_url VARCHAR(500),
      visibility VARCHAR(16) NOT NULL DEFAULT 'private',
      milestones_completed INT NOT NULL DEFAULT 0,
      submitted_at VARCHAR(30) NOT NULL,
      CONSTRAINT fk_submissions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_submissions_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
    `CREATE TABLE IF NOT EXISTS audit_events (
      id VARCHAR(191) PRIMARY KEY,
      actor_user_id VARCHAR(191),
      action VARCHAR(120) NOT NULL,
      entity_type VARCHAR(80) NOT NULL,
      entity_id VARCHAR(191) NOT NULL,
      created_at VARCHAR(30) NOT NULL,
      CONSTRAINT fk_audit_actor FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ];

  async function execute(connection, sql, params = []) {
    const [result] = await connection.execute(sql, params);
    return result;
  }
  function adapter(connection) {
    return {
      prepare(sql) {
        let statement = sql.replace(/\bINSERT\s+OR\s+IGNORE\s+INTO\b/i, 'INSERT IGNORE INTO');
        statement = statement.replace(
          /ON CONFLICT\(user_id, lesson_id\) DO UPDATE SET\s+status = CASE WHEN excluded\.status = 'completed' THEN 'completed' ELSE progress\.status END,\s+completed_at = CASE WHEN excluded\.status = 'completed' THEN COALESCE\(progress\.completed_at, excluded\.completed_at\) ELSE progress\.completed_at END,\s+last_position = excluded\.last_position,\s+updated_at = excluded\.updated_at/i,
          `ON DUPLICATE KEY UPDATE
            status = IF(VALUES(status) = 'completed', 'completed', status),
            completed_at = IF(VALUES(status) = 'completed', COALESCE(completed_at, VALUES(completed_at)), completed_at),
            last_position = VALUES(last_position),
            updated_at = VALUES(updated_at)`,
        );
        statement = statement.replace(
          /ON CONFLICT\(user_id, lesson_id\) DO UPDATE SET\s+status = 'completed', completed_at = COALESCE\(progress\.completed_at, excluded\.completed_at\),\s+updated_at = excluded\.updated_at/i,
          `ON DUPLICATE KEY UPDATE
            status = 'completed', completed_at = COALESCE(completed_at, VALUES(completed_at)),
            updated_at = VALUES(updated_at)`,
        );
        return {
          async get(...params) {
            const [rows] = await connection.execute(statement, params);
            return rows[0];
          },
          async all(...params) {
            const [rows] = await connection.execute(statement, params);
            return rows;
          },
          async run(...params) {
            return execute(connection, statement, params);
          },
        };
      },
    };
  }

  const db = adapter(pool);
  db.transaction = async (operation) => {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await operation(adapter(connection));
      await connection.commit();
      return result;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  };
  db.close = () => pool.end();

  try {
    for (const statement of schema) await pool.query(statement);
    const indexes = [
      ['idx_courses_category_level', 'courses', 'category, level, status'],
      ['idx_modules_course_position', 'modules', 'course_id, position'],
      ['idx_lessons_module_position', 'lessons', 'module_id, position'],
      ['idx_progress_user_updated', 'progress', 'user_id, updated_at'],
      ['idx_attempts_user_exercise_date', 'exercise_attempts', 'user_id, exercise_id, submitted_at'],
      ['idx_submissions_user_date', 'project_submissions', 'user_id, submitted_at'],
    ];
    for (const [index, table, columns] of indexes) {
      const [existing] = await pool.execute(
        'SELECT 1 FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?',
        [table, index],
      );
      if (!existing.length) await pool.query(`CREATE INDEX \`${index}\` ON \`${table}\` (${columns})`);
    }

    const pathInsert = db.prepare('INSERT IGNORE INTO learning_paths (id, slug, title, description, level) VALUES (?, ?, ?, ?, ?)');
    await pathInsert.run('path-build-web', 'build-for-the-web', 'Build for the web', 'Learn the foundations of the web and publish projects that are yours.', 'Beginner');
    await pathInsert.run('path-code-thinking', 'code-and-data-thinking', 'Code and data thinking', 'Practice programming, data literacy, and thoughtful technology use.', 'Beginner');
    const courseInsert = db.prepare(`INSERT IGNORE INTO courses
      (id, slug, title, description, category, level, estimated_minutes, outcomes_json, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)`);
    const moduleInsert = db.prepare('INSERT IGNORE INTO modules (id, course_id, title, position) VALUES (?, ?, ?, ?)');
    const lessonInsert = db.prepare(`INSERT IGNORE INTO lessons
      (id, module_id, title, summary, content_json, position, estimated_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const exerciseInsert = db.prepare(`INSERT IGNORE INTO exercises
      (id, lesson_id, prompt, options_json, correct_option_index, explanation)
      VALUES (?, ?, ?, ?, ?, ?)`);
    const projectInsert = db.prepare('INSERT IGNORE INTO projects (id, course_id, title, brief, milestones_json) VALUES (?, ?, ?, ?, ?)');
    const pathCourseInsert = db.prepare('INSERT IGNORE INTO path_courses (path_id, course_id, position) VALUES (?, ?, ?)');

    for (const [courseIndex, course] of CATALOG.entries()) {
      const courseId = `course-${course.slug}`;
      await courseInsert.run(courseId, course.slug, course.title, course.description, course.category, course.level, course.estimatedMinutes, JSON.stringify(course.outcomes), now());
      const moduleId = `${course.slug}-module-1`;
      await moduleInsert.run(moduleId, courseId, 'Core concepts', 1);
      for (const [lessonIndex, lesson] of course.lessons.entries()) {
        const lessonId = `${course.slug}-lesson-${lessonIndex + 1}`;
        await lessonInsert.run(lessonId, moduleId, lesson.title, lesson.summary, JSON.stringify(lesson.content), lessonIndex + 1, Math.max(10, Math.round(course.estimatedMinutes / course.lessons.length)));
        await exerciseInsert.run(`${lessonId}-check`, lessonId, lesson.exercise.prompt, JSON.stringify(lesson.exercise.options), lesson.exercise.answer, lesson.exercise.explanation);
      }
      await projectInsert.run(`project-${course.slug}`, courseId, course.project.title, course.project.brief, JSON.stringify(course.project.milestones));
      await pathCourseInsert.run(course.category === 'web' ? 'path-build-web' : 'path-code-thinking', courseId, courseIndex + 1);
    }
    await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
  } catch (error) {
    await pool.end();
    throw error;
  }
  return db;
}

function rateLimiter() {
  const buckets = new Map();
  return (req, key, limit, windowMs) => {
    const ip = req.socket.remoteAddress || 'unknown';
    const bucketKey = `${key}:${ip}`;
    const timestamp = Date.now();
    if (buckets.size > 20000) {
      for (const [name, bucket] of buckets) {
        if (bucket.expiresAt <= timestamp) buckets.delete(name);
      }
    }
    const current = buckets.get(bucketKey);
    if (!current || timestamp >= current.expiresAt) {
      buckets.set(bucketKey, { count: 1, expiresAt: timestamp + windowMs });
      return null;
    }
    current.count += 1;
    if (current.count <= limit) return null;
    return Math.max(1, Math.ceil((current.expiresAt - timestamp) / 1000));
  };
}

async function createApplication(options = {}) {
  const db = options.dbPath
    ? createDatabase(options.dbPath)
    : await createMysqlDatabase(options.mysqlConfig);
  const limitRequest = rateLimiter();
  const userBySession = db.prepare(`SELECT u.id, u.email, u.handle, u.display_name, u.user_role AS role,
    p.skill_level, p.learning_goal, p.timezone, p.visibility
    FROM sessions s JOIN users u ON u.id = s.user_id
    LEFT JOIN learner_profiles p ON p.user_id = u.id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.deleted_at IS NULL`);
  const userById = db.prepare(`SELECT u.id, u.email, u.handle, u.display_name, u.user_role AS role,
    p.skill_level, p.learning_goal, p.timezone, p.visibility
    FROM users u LEFT JOIN learner_profiles p ON p.user_id = u.id
    WHERE u.id = ? AND u.deleted_at IS NULL`);

  async function getCurrentUser(req) {
    const token = cookieMap(req)[SESSION_COOKIE];
    if (!token || token.length > 200) return null;
    return await userBySession.get(tokenHash(token), now()) || null;
  }

  async function requireUser(req) {
    const user = await getCurrentUser(req);
    if (!user) throw fail(401, 'AUTH_REQUIRED', 'Sign in to continue.');
    return user;
  }

  async function checkCsrf(req) {
    const cookies = cookieMap(req);
    const csrf = cookies[CSRF_COOKIE];
    const header = req.headers['x-csrf-token'];
    if (!csrf || !/^[A-Za-z0-9_-]{43}$/.test(csrf) || typeof header !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(header) ||
      !crypto.timingSafeEqual(Buffer.from(csrf), Buffer.from(header))) {
      throw fail(403, 'CSRF_INVALID', 'Refresh the page and try again.');
    }
    const sessionToken = cookies[SESSION_COOKIE];
    if (sessionToken) {
      const session = await db.prepare('SELECT csrf_token FROM sessions WHERE token_hash = ? AND expires_at > ?')
        .get(tokenHash(sessionToken), now());
      if (session && session.csrf_token !== csrf) throw fail(403, 'CSRF_INVALID', 'Refresh the page and try again.');
    }
    const origin = req.headers.origin;
    if (origin) {
      let parsed;
      try {
        parsed = new URL(origin);
      } catch {
        throw fail(403, 'ORIGIN_INVALID', 'The request origin is not allowed.');
      }
      if (parsed.host !== req.headers.host || (process.env.NODE_ENV === 'production' && parsed.protocol !== 'https:')) {
        throw fail(403, 'ORIGIN_INVALID', 'The request origin is not allowed.');
      }
    }
  }

  async function readJson(req) {
    const contentType = req.headers['content-type'] || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      throw fail(415, 'JSON_REQUIRED', 'Send the request as JSON.');
    }
    let body = '';
    for await (const chunk of req) {
      body += chunk;
      if (Buffer.byteLength(body) > BODY_LIMIT) throw fail(413, 'BODY_TOO_LARGE', 'The request is too large.');
    }
    if (!body) return {};
    try {
      const parsed = JSON.parse(body);
      if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') throw new Error('Expected object');
      return parsed;
    } catch {
      throw fail(400, 'INVALID_JSON', 'The request body is not valid JSON.');
    }
  }

  async function audit(actorId, action, entityType, entityId) {
    await db.prepare(`INSERT INTO audit_events (id, actor_user_id, action, entity_type, entity_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?)`).run(newId(), actorId, action, entityType, entityId, now());
  }

  async function getCourse(slug, userId = null) {
    const course = await db.prepare(`SELECT id, slug, title, description, category, level, estimated_minutes AS estimatedMinutes,
      outcomes_json AS outcomesJson FROM courses WHERE slug = ? AND status = 'published'`).get(slug);
    if (!course) return null;
    const modules = await db.prepare(`SELECT m.id, m.title, m.position FROM modules m
      WHERE m.course_id = ? ORDER BY m.position`).all(course.id);
    const lessons = await db.prepare(`SELECT l.id, l.module_id AS moduleId, l.title, l.summary, l.position,
      l.estimated_minutes AS estimatedMinutes,
      CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END AS completed
      FROM lessons l JOIN modules m ON m.id = l.module_id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?
      WHERE m.course_id = ? ORDER BY m.position, l.position`).all(userId, course.id);
    const project = await db.prepare(`SELECT id, title, brief, milestones_json AS milestonesJson
      FROM projects WHERE course_id = ?`).get(course.id);
    const enrolled = userId ? !!await db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, course.id) : false;
    const completedLessons = lessons.filter((lesson) => lesson.completed).length;
    return {
      ...course,
      outcomes: JSON.parse(course.outcomesJson),
      modules: modules.map((module) => ({
        id: module.id,
        title: module.title,
        lessons: lessons.filter((lesson) => lesson.moduleId === module.id).map(({ moduleId, ...lesson }) => lesson),
      })),
      project: project ? {
        id: project.id,
        title: project.title,
        brief: project.brief,
        milestones: JSON.parse(project.milestonesJson),
      } : null,
      enrolled,
      lessonCount: lessons.length,
      completedLessons,
    };
  }

  async function listCourses(query, userId = null) {
    const clauses = ["c.status = 'published'"];
    const params = [];
    if (query.search) {
      clauses.push('(lower(c.title) LIKE ? OR lower(c.description) LIKE ? OR lower(c.category) LIKE ?)');
      const search = `%${query.search.slice(0, 80).toLowerCase()}%`;
      params.push(search, search, search);
    }
    if (['web', 'programming', 'data'].includes(query.category)) {
      clauses.push('c.category = ?');
      params.push(query.category);
    }
    if (['Beginner', 'Intermediate'].includes(query.level)) {
      clauses.push('c.level = ?');
      params.push(query.level);
    }
    const rows = await db.prepare(`SELECT c.id, c.slug, c.title, c.description, c.category, c.level,
        c.estimated_minutes AS estimatedMinutes, c.outcomes_json AS outcomesJson,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id WHERE m.course_id = c.id) AS lessonCount,
        (SELECT COUNT(*) FROM lessons l JOIN modules m ON m.id = l.module_id JOIN progress p ON p.lesson_id = l.id
          WHERE m.course_id = c.id AND p.user_id = ? AND p.status = 'completed') AS completedLessons,
        (SELECT COUNT(*) FROM enrollments e WHERE e.course_id = c.id AND e.user_id = ?) AS enrolled,
        (SELECT COUNT(*) FROM bookmarks b WHERE b.course_id = c.id AND b.user_id = ?) AS bookmarked
      FROM courses c WHERE ${clauses.join(' AND ')} ORDER BY c.title`).all(userId, userId, userId, ...params);
    return rows.map(({ outcomesJson, enrolled, bookmarked, ...course }) => ({
      ...course,
      outcomes: JSON.parse(outcomesJson),
      enrolled: enrolled > 0,
      bookmarked: bookmarked > 0,
      progress: course.lessonCount ? Math.round((course.completedLessons / course.lessonCount) * 100) : 0,
    }));
  }

  async function getLearningPath(slug, userId = null) {
    const pathRecord = await db.prepare('SELECT id, slug, title, description, level FROM learning_paths WHERE slug = ?').get(slug);
    if (!pathRecord) return null;
    const courses = await db.prepare(`SELECT c.id, c.slug, c.title, c.description, c.category, c.level,
        c.estimated_minutes AS estimatedMinutes,
        COUNT(l.id) AS lessonCount,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completedLessons,
        EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id = ? AND e.course_id = c.id) AS enrolled
      FROM path_courses pc JOIN courses c ON c.id = pc.course_id
      JOIN modules m ON m.course_id = c.id JOIN lessons l ON l.module_id = m.id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?
      WHERE pc.path_id = ? AND c.status = 'published'
      GROUP BY c.id ORDER BY MIN(pc.position), c.title`).all(userId, userId, pathRecord.id);
    return {
      ...pathRecord,
      courses: courses.map((course) => ({
        ...course,
        progress: course.lessonCount ? Math.round((course.completedLessons / course.lessonCount) * 100) : 0,
        enrolled: course.enrolled > 0,
      })),
      lessonCount: courses.reduce((total, course) => total + course.lessonCount, 0),
      estimatedMinutes: courses.reduce((total, course) => total + course.estimatedMinutes, 0),
    };
  }

  async function getDashboard(user) {
    const enrolledCourses = await db.prepare(`SELECT c.slug, c.title, c.description, c.category, c.level,
        c.estimated_minutes AS estimatedMinutes,
        COUNT(l.id) AS lesson_count,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed_lessons,
        SUM(CASE WHEN p.status = 'completed' THEN l.estimated_minutes ELSE 0 END) AS minutes_completed,
        MAX(p.updated_at) AS last_activity
      FROM enrollments e JOIN courses c ON c.id = e.course_id
      JOIN modules m ON m.course_id = c.id JOIN lessons l ON l.module_id = m.id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = e.user_id
      WHERE e.user_id = ? GROUP BY c.id ORDER BY COALESCE(last_activity, MAX(e.started_at)) DESC`).all(user.id);
    const savedCount = (await db.prepare('SELECT COUNT(*) AS count FROM bookmarks WHERE user_id = ?').get(user.id)).count;
    const projectCount = (await db.prepare('SELECT COUNT(*) AS count FROM project_submissions WHERE user_id = ?').get(user.id)).count;
    const completedCount = (await db.prepare("SELECT COUNT(*) AS count FROM progress WHERE user_id = ? AND status = 'completed'").get(user.id)).count;
    const recentLessons = await db.prepare(`SELECT l.id, l.title, l.summary, c.slug AS courseSlug, c.title AS courseTitle
      FROM progress p JOIN lessons l ON l.id = p.lesson_id
      JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
      WHERE p.user_id = ? AND p.status != 'completed'
      ORDER BY p.updated_at DESC LIMIT 1`).get(user.id);
    const activityByDate = new Map((await db.prepare(`SELECT substr(updated_at, 1, 10) AS day, COUNT(*) AS count
      FROM progress WHERE user_id = ? AND updated_at >= ? GROUP BY substr(updated_at, 1, 10)`).all(
      user.id, new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    )).map((row) => [row.day, row.count]));
    const activityDays = Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setUTCHours(0, 0, 0, 0);
      date.setUTCDate(date.getUTCDate() - (6 - index));
      const day = date.toISOString().slice(0, 10);
      return { day, count: activityByDate.get(day) || 0 };
    });
    return {
      user: {
        id: user.id,
        handle: user.handle,
        displayName: user.display_name,
        email: user.email,
        role: user.role,
        skillLevel: user.skill_level,
        learningGoal: user.learning_goal,
        visibility: user.visibility,
      },
      stats: {
        coursesInProgress: enrolledCourses.filter((course) => course.completed_lessons < course.lesson_count).length,
        lessonsCompleted: completedCount,
        savedCount,
        projectCount,
        minutesLearned: enrolledCourses.reduce((total, course) => total + (course.minutes_completed || 0), 0),
        activeDays: activityDays.filter((day) => day.count > 0).length,
      },
      courses: enrolledCourses.map((course) => ({
        ...course,
        progress: course.lesson_count ? Math.round((course.completed_lessons / course.lesson_count) * 100) : 0,
      })),
      activityDays,
      nextLesson: recentLessons || null,
    };
  }

  async function courseForLesson(lessonId) {
    return db.prepare(`SELECT c.id AS courseId, c.slug, l.id AS lessonId
      FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
      WHERE l.id = ? AND c.status = 'published'`).get(lessonId);
  }

  async function requireEnrollment(userId, courseId) {
    if (!await db.prepare('SELECT 1 FROM enrollments WHERE user_id = ? AND course_id = ?').get(userId, courseId)) {
      throw fail(403, 'ENROLLMENT_REQUIRED', 'Enroll in this course to access its lessons.');
    }
  }

  async function getLesson(lessonId, user) {
    const lesson = await db.prepare(`SELECT l.id, l.title, l.summary, l.content_json AS contentJson,
        l.position, l.estimated_minutes AS estimatedMinutes,
        m.title AS moduleTitle, c.id AS courseId, c.slug AS courseSlug, c.title AS courseTitle,
        p.status AS progressStatus, p.last_position AS lastPosition
      FROM lessons l JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?
      WHERE l.id = ? AND c.status = 'published'`).get(user.id, lessonId);
    if (!lesson) throw fail(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
    await requireEnrollment(user.id, lesson.courseId);
    const exercise = await db.prepare(`SELECT id, prompt, options_json AS optionsJson
      FROM exercises WHERE lesson_id = ?`).get(lessonId);
    const navigation = await db.prepare(`SELECT l.id, l.title, l.position, p.status
      FROM lessons l JOIN modules m ON m.id = l.module_id
      LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?
      WHERE m.course_id = ? ORDER BY m.position, l.position`).all(user.id, lesson.courseId);
    return {
      id: lesson.id,
      title: lesson.title,
      summary: lesson.summary,
      content: JSON.parse(lesson.contentJson),
      position: lesson.position,
      estimatedMinutes: lesson.estimatedMinutes,
      moduleTitle: lesson.moduleTitle,
      courseSlug: lesson.courseSlug,
      courseTitle: lesson.courseTitle,
      progressStatus: lesson.progressStatus || 'in_progress',
      lastPosition: lesson.lastPosition || 0,
      exercise: exercise ? {
        id: exercise.id,
        prompt: exercise.prompt,
        options: JSON.parse(exercise.optionsJson),
      } : null,
      navigation: navigation.map((item) => ({
        id: item.id,
        title: item.title,
        position: item.position,
        completed: item.status === 'completed',
      })),
    };
  }

  async function createAccount(body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw fail(400, 'EMAIL_INVALID', 'Enter a valid email address.');
    }
    if (displayName.length < 2 || displayName.length > 60 || /[\u0000-\u001f]/.test(displayName)) {
      throw fail(400, 'NAME_INVALID', 'Name must be between 2 and 60 characters.');
    }
    if (password.length < 12 || password.length > 128) {
      throw fail(400, 'PASSWORD_INVALID', 'Use a password between 12 and 128 characters.');
    }
    const salt = crypto.randomBytes(16);
    const passwordHash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    const userId = newId();
    const handle = `learner-${crypto.randomBytes(6).toString('hex')}`;
    try {
      await db.transaction(async (transaction) => {
        await transaction.prepare('INSERT INTO users (id, email, handle, password_salt, password_hash, display_name, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
          .run(userId, email, handle, salt.toString('hex'), Buffer.from(passwordHash).toString('hex'), displayName, now());
        await transaction.prepare('INSERT INTO learner_profiles (user_id) VALUES (?)').run(userId);
      });
    } catch (error) {
      if (error.code === 'ER_DUP_ENTRY' && String(error.message).includes('email')) {
        throw fail(409, 'EMAIL_EXISTS', 'An account already uses this email.');
      }
      if (String(error.message).includes('users.email')) throw fail(409, 'EMAIL_EXISTS', 'An account already uses this email.');
      throw error;
    }
    await audit(userId, 'account.created', 'user', userId);
    return userById.get(userId);
  }

  async function authenticate(body) {
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const user = await db.prepare('SELECT id, password_salt, password_hash FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
    if (password.length > 128) throw fail(401, 'CREDENTIALS_INVALID', 'Email or password is incorrect.');
    const salt = user ? Buffer.from(user.password_salt, 'hex') : Buffer.alloc(16, 0x5a);
    const calculated = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
    if (!user) throw fail(401, 'CREDENTIALS_INVALID', 'Email or password is incorrect.');
    if (!crypto.timingSafeEqual(Buffer.from(user.password_hash, 'hex'), Buffer.from(calculated))) {
      throw fail(401, 'CREDENTIALS_INVALID', 'Email or password is incorrect.');
    }
    return userById.get(user.id);
  }

  async function createSession(user, res) {
    await db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now());
    const token = crypto.randomBytes(32).toString('base64url');
    const csrfToken = crypto.randomBytes(32).toString('base64url');
    const created = new Date();
    const expires = new Date(created.getTime() + SESSION_TTL_MS);
    await db.prepare('INSERT INTO sessions (token_hash, user_id, csrf_token, created_at, expires_at) VALUES (?, ?, ?, ?, ?)')
      .run(tokenHash(token), user.id, csrfToken, created.toISOString(), expires.toISOString());
    sessionCookie(res, token);
    setCsrfCookie(res, csrfToken);
    return csrfToken;
  }

  async function revokeCurrentSession(req) {
    const token = cookieMap(req)[SESSION_COOKIE];
    if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
  }

  async function handleApi(req, res, url) {
    const method = req.method;
    const pathname = url.pathname;
    const cookies = cookieMap(req);

    if (method === 'GET' && pathname === '/api/session') {
      const sessionToken = cookies[SESSION_COOKIE];
      const session = sessionToken
        ? await db.prepare('SELECT csrf_token FROM sessions WHERE token_hash = ? AND expires_at > ?').get(tokenHash(sessionToken), now())
        : null;
      const csrfToken = session?.csrf_token || (cookies[CSRF_COOKIE] && /^[A-Za-z0-9_-]{43}$/.test(cookies[CSRF_COOKIE])
        ? cookies[CSRF_COOKIE]
        : crypto.randomBytes(32).toString('base64url'));
      setCsrfCookie(res, csrfToken);
      return json(res, 200, { user: await getCurrentUser(req), csrfToken });
    }

    if (method === 'GET' && pathname === '/api/health') {
      return json(res, 200, { status: 'ok', database: 'connected' });
    }

    if (method === 'POST' && pathname.startsWith('/api/auth/')) {
      await checkCsrf(req);
      const route = pathname.slice('/api/auth/'.length);
      const retryAfter = limitRequest(req, `auth:${route}`, route === 'login' ? 8 : 5, 15 * 60 * 1000);
      if (retryAfter) return json(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }, { 'Retry-After': String(retryAfter) });
      const body = await readJson(req);
      if (route === 'signup') {
        const user = await createAccount(body);
        await revokeCurrentSession(req);
        const csrfToken = await createSession(user, res);
        return json(res, 201, { user, csrfToken });
      }
      if (route === 'login') {
        const user = await authenticate(body);
        await revokeCurrentSession(req);
        const csrfToken = await createSession(user, res);
        return json(res, 200, { user, csrfToken });
      }
      if (route === 'logout') {
        const token = cookies[SESSION_COOKIE];
        if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash(token));
        clearCookie(res, SESSION_COOKIE, true);
        const csrfToken = crypto.randomBytes(32).toString('base64url');
        setCsrfCookie(res, csrfToken);
        return json(res, 200, { ok: true, csrfToken });
      }
      throw fail(404, 'ROUTE_NOT_FOUND', 'API route not found.');
    }

    if (method === 'GET' && pathname === '/api/courses') {
      const retryAfter = limitRequest(req, 'course-search', 120, 60 * 1000);
      if (retryAfter) return json(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many course searches. Try again shortly.' } }, { 'Retry-After': String(retryAfter) });
      const user = await getCurrentUser(req);
      const search = url.searchParams.get('search') || '';
      return json(res, 200, { courses: await listCourses({
        search,
        category: url.searchParams.get('category'),
        level: url.searchParams.get('level'),
      }, user?.id || null) });
    }

    if (method === 'GET' && pathname === '/api/learning-paths') {
      const user = await getCurrentUser(req);
      const pathRecords = await db.prepare('SELECT slug FROM learning_paths ORDER BY title').all();
      const paths = await Promise.all(pathRecords.map((pathRecord) => getLearningPath(pathRecord.slug, user?.id || null)));
      return json(res, 200, { paths });
    }

    if (method === 'GET' && pathname.startsWith('/api/learning-paths/')) {
      const slug = decodeURIComponent(pathname.slice('/api/learning-paths/'.length));
      const user = await getCurrentUser(req);
      const learningPath = await getLearningPath(slug, user?.id || null);
      if (!learningPath) throw fail(404, 'PATH_NOT_FOUND', 'Learning path not found.');
      return json(res, 200, { path: learningPath });
    }

    if (method === 'GET' && pathname.startsWith('/api/courses/')) {
      const slug = decodeURIComponent(pathname.slice('/api/courses/'.length));
      const user = await getCurrentUser(req);
      const course = await getCourse(slug, user?.id || null);
      if (!course) throw fail(404, 'COURSE_NOT_FOUND', 'Course not found.');
      return json(res, 200, { course });
    }

    if (method === 'GET' && pathname.startsWith('/api/portfolio/')) {
      const handle = decodeURIComponent(pathname.slice('/api/portfolio/'.length));
      if (handle === 'me') {
        const user = await requireUser(req);
        const submissions = await db.prepare(`SELECT s.id, s.description, s.repository_url AS repositoryUrl, s.visibility,
          s.milestones_completed AS milestonesCompleted, s.submitted_at AS submittedAt,
          p.id AS projectId, p.title AS projectTitle, p.brief AS projectBrief,
          c.title AS courseTitle, c.slug AS courseSlug
          FROM project_submissions s JOIN projects p ON p.id = s.project_id
          JOIN courses c ON c.id = p.course_id
          WHERE s.user_id = ? ORDER BY s.submitted_at DESC`).all(user.id);
        return json(res, 200, { user: {
          handle: user.handle, displayName: user.display_name, skillLevel: user.skill_level,
          learningGoal: user.learning_goal, visibility: user.visibility,
        }, projects: submissions });
      }
      const user = await db.prepare(`SELECT u.id, u.handle, u.display_name AS displayName,
        p.skill_level AS skillLevel, p.learning_goal AS learningGoal, p.visibility
        FROM users u JOIN learner_profiles p ON p.user_id = u.id
        WHERE u.handle = ? AND u.deleted_at IS NULL AND p.visibility = 'public'`).get(handle);
      if (!user) throw fail(404, 'PORTFOLIO_NOT_FOUND', 'This portfolio is not public or does not exist.');
      const submissions = await db.prepare(`SELECT s.id, s.description, s.repository_url AS repositoryUrl,
        s.milestones_completed AS milestonesCompleted, s.submitted_at AS submittedAt,
        p.title AS projectTitle, p.brief AS projectBrief, c.title AS courseTitle, c.slug AS courseSlug
        FROM project_submissions s JOIN projects p ON p.id = s.project_id
        JOIN courses c ON c.id = p.course_id
        WHERE s.user_id = ? AND s.visibility = 'public' ORDER BY s.submitted_at DESC`).all(user.id);
      return json(res, 200, { user, projects: submissions });
    }

    const user = await requireUser(req);

    if (method === 'GET' && pathname === '/api/me/dashboard') {
      return json(res, 200, await getDashboard(user));
    }

    if (method === 'GET' && pathname === '/api/me/bookmarks') {
      const courses = await db.prepare(`SELECT c.slug, c.title, c.description, c.category, c.level
        FROM bookmarks b JOIN courses c ON c.id = b.course_id
        WHERE b.user_id = ? ORDER BY b.created_at DESC`).all(user.id);
      return json(res, 200, { courses });
    }

    if (method === 'GET' && pathname === '/api/me/progress') {
      const lessons = await db.prepare(`SELECT l.id, l.title, l.summary, p.status, p.completed_at AS completedAt,
        p.last_position AS lastPosition, p.updated_at AS updatedAt, c.slug AS courseSlug, c.title AS courseTitle
        FROM progress p JOIN lessons l ON l.id = p.lesson_id
        JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
        WHERE p.user_id = ? ORDER BY p.updated_at DESC`).all(user.id);
      return json(res, 200, { lessons });
    }

    if (method === 'GET' && pathname === '/api/me/projects') {
      const projects = await db.prepare(`SELECT p.id, p.title, p.brief, p.milestones_json AS milestonesJson,
        c.title AS courseTitle, c.slug AS courseSlug,
        EXISTS(SELECT 1 FROM enrollments e WHERE e.user_id = ? AND e.course_id = c.id) AS enrolled,
        s.id AS submissionId, s.description, s.repository_url AS repositoryUrl, s.visibility,
        s.milestones_completed AS milestonesCompleted, s.submitted_at AS submittedAt
        FROM projects p JOIN courses c ON c.id = p.course_id
        LEFT JOIN project_submissions s ON s.id = (
          SELECT s2.id FROM project_submissions s2
          WHERE s2.project_id = p.id AND s2.user_id = ? ORDER BY s2.submitted_at DESC LIMIT 1
        )
        ORDER BY c.title`).all(user.id, user.id);
      return json(res, 200, { projects: projects.map(({ milestonesJson, ...project }) => ({
        ...project,
        milestones: JSON.parse(milestonesJson),
      })) });
    }

    if (method === 'GET' && pathname === '/api/me/export') {
      const safeUser = await userById.get(user.id);
      const dashboard = await getDashboard(user);
      const progress = await db.prepare(`SELECT p.status, p.completed_at AS completedAt, p.last_position AS lastPosition,
        l.id AS lessonId, l.title AS lessonTitle, c.slug AS courseSlug
        FROM progress p JOIN lessons l ON l.id = p.lesson_id
        JOIN modules m ON m.id = l.module_id JOIN courses c ON c.id = m.course_id
        WHERE p.user_id = ?`).all(user.id);
      const bookmarks = await db.prepare(`SELECT c.slug, c.title FROM bookmarks b JOIN courses c ON c.id = b.course_id WHERE b.user_id = ?`).all(user.id);
      const submissions = await db.prepare(`SELECT p.title, s.description, s.repository_url AS repositoryUrl, s.visibility, s.submitted_at AS submittedAt
        FROM project_submissions s JOIN projects p ON p.id = s.project_id WHERE s.user_id = ?`).all(user.id);
      return json(res, 200, { exportedAt: now(), user: safeUser, progress, bookmarks, submissions, dashboard });
    }

    if (method === 'POST' && pathname === '/api/enrollments') {
      await checkCsrf(req);
      const body = await readJson(req);
      if (typeof body.courseId !== 'string' || body.courseId.length > 100) throw fail(400, 'COURSE_ID_INVALID', 'Choose a valid course.');
      const course = await db.prepare("SELECT id FROM courses WHERE id = ? AND status = 'published'").get(body.courseId);
      if (!course) throw fail(404, 'COURSE_NOT_FOUND', 'Course not found.');
      await db.prepare(`INSERT OR IGNORE INTO enrollments (id, user_id, course_id, started_at) VALUES (?, ?, ?, ?)`)
        .run(newId(), user.id, course.id, now());
      await audit(user.id, 'course.enrolled', 'course', course.id);
      return json(res, 201, { ok: true });
    }

    if (method === 'POST' && pathname === '/api/me/bookmarks') {
      await checkCsrf(req);
      const body = await readJson(req);
      if (typeof body.courseId !== 'string') throw fail(400, 'COURSE_ID_INVALID', 'Choose a valid course.');
      if (!await db.prepare('SELECT 1 FROM courses WHERE id = ? AND status = ?').get(body.courseId, 'published')) {
        throw fail(404, 'COURSE_NOT_FOUND', 'Course not found.');
      }
      await db.prepare('INSERT OR IGNORE INTO bookmarks (user_id, course_id, created_at) VALUES (?, ?, ?)').run(user.id, body.courseId, now());
      return json(res, 200, { ok: true, bookmarked: true });
    }

    if (method === 'DELETE' && pathname.startsWith('/api/me/bookmarks/')) {
      await checkCsrf(req);
      const courseId = decodeURIComponent(pathname.slice('/api/me/bookmarks/'.length));
      await db.prepare('DELETE FROM bookmarks WHERE user_id = ? AND course_id = ?').run(user.id, courseId);
      return json(res, 200, { ok: true, bookmarked: false });
    }

    if (method === 'PATCH' && pathname === '/api/me/profile') {
      await checkCsrf(req);
      const body = await readJson(req);
      const displayName = typeof body.displayName === 'string' ? body.displayName.trim() : '';
      const learningGoal = typeof body.learningGoal === 'string' ? body.learningGoal.trim() : '';
      const skillLevel = typeof body.skillLevel === 'string' ? body.skillLevel : '';
      const visibility = typeof body.visibility === 'string' ? body.visibility : '';
      if (displayName.length < 2 || displayName.length > 60) throw fail(400, 'NAME_INVALID', 'Name must be between 2 and 60 characters.');
      if (learningGoal.length > 160) throw fail(400, 'GOAL_INVALID', 'Learning goal must be 160 characters or fewer.');
      if (!['beginner', 'intermediate', 'advanced'].includes(skillLevel)) throw fail(400, 'SKILL_LEVEL_INVALID', 'Choose a valid skill level.');
      if (!['private', 'public'].includes(visibility)) throw fail(400, 'VISIBILITY_INVALID', 'Choose a valid profile visibility.');
      await db.prepare('UPDATE users SET display_name = ? WHERE id = ?').run(displayName, user.id);
      await db.prepare('UPDATE learner_profiles SET skill_level = ?, learning_goal = ?, visibility = ? WHERE user_id = ?')
        .run(skillLevel, learningGoal, visibility, user.id);
      await audit(user.id, 'profile.updated', 'user', user.id);
      return json(res, 200, { user: await userById.get(user.id) });
    }

    if (method === 'DELETE' && pathname === '/api/me') {
      await checkCsrf(req);
      const retryAfter = limitRequest(req, `account-delete:${user.id}`, 5, 60 * 60 * 1000);
      if (retryAfter) return json(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many account deletion attempts. Try again later.' } }, { 'Retry-After': String(retryAfter) });
      const body = await readJson(req);
      const current = await db.prepare('SELECT password_salt, password_hash FROM users WHERE id = ?').get(user.id);
      const password = typeof body.password === 'string' ? body.password : '';
      if (!current || password.length > 128) throw fail(401, 'PASSWORD_CONFIRMATION_REQUIRED', 'Enter your current password to delete this account.');
      const calculated = await scrypt(password, Buffer.from(current.password_salt, 'hex'), 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
      if (!crypto.timingSafeEqual(Buffer.from(current.password_hash, 'hex'), Buffer.from(calculated))) {
        throw fail(401, 'PASSWORD_CONFIRMATION_REQUIRED', 'The password is incorrect.');
      }
      await audit(user.id, 'account.deleted', 'user', user.id);
      await db.prepare('DELETE FROM users WHERE id = ?').run(user.id);
      clearCookie(res, SESSION_COOKIE, true);
      return json(res, 200, { ok: true });
    }

    const lessonMatch = pathname.match(/^\/api\/lessons\/([^/]+)(?:\/(progress|check))?$/);
    if (lessonMatch && method === 'GET' && !lessonMatch[2]) {
      return json(res, 200, { lesson: await getLesson(decodeURIComponent(lessonMatch[1]), user) });
    }
    if (lessonMatch && method === 'PUT' && lessonMatch[2] === 'progress') {
      await checkCsrf(req);
      const lessonId = decodeURIComponent(lessonMatch[1]);
      const body = await readJson(req);
      const lesson = await courseForLesson(lessonId);
      if (!lesson) throw fail(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
      await requireEnrollment(user.id, lesson.courseId);
      if (!['in_progress', 'completed'].includes(body.status)) {
        throw fail(400, 'PROGRESS_STATUS_INVALID', 'Choose a valid lesson status.');
      }
      if (!Number.isInteger(body.lastPosition) || body.lastPosition < 0 || body.lastPosition > 10000000) {
        throw fail(400, 'POSITION_INVALID', 'Lesson position is invalid.');
      }
      const completed = body.status === 'completed';
      await db.prepare(`INSERT INTO progress (user_id, lesson_id, status, completed_at, last_position, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(user_id, lesson_id) DO UPDATE SET
          status = CASE WHEN excluded.status = 'completed' THEN 'completed' ELSE progress.status END,
          completed_at = CASE WHEN excluded.status = 'completed' THEN COALESCE(progress.completed_at, excluded.completed_at) ELSE progress.completed_at END,
          last_position = excluded.last_position,
          updated_at = excluded.updated_at`).run(
        user.id, lessonId, completed ? 'completed' : 'in_progress', completed ? now() : null, body.lastPosition, now(),
      );
      const courseStatus = await db.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN p.status = 'completed' THEN 1 ELSE 0 END) AS completed
        FROM lessons l JOIN modules m ON m.id = l.module_id
        LEFT JOIN progress p ON p.lesson_id = l.id AND p.user_id = ?
        WHERE m.course_id = ?`).get(user.id, lesson.courseId);
      if (courseStatus.total > 0 && courseStatus.completed === courseStatus.total) {
        await db.prepare("UPDATE enrollments SET status = 'completed' WHERE user_id = ? AND course_id = ?").run(user.id, lesson.courseId);
      }
      await audit(user.id, completed ? 'lesson.completed' : 'lesson.progressed', 'lesson', lessonId);
      return json(res, 200, { ok: true, status: completed ? 'completed' : 'in_progress' });
    }
    if (lessonMatch && method === 'POST' && lessonMatch[2] === 'check') {
      await checkCsrf(req);
      const lessonId = decodeURIComponent(lessonMatch[1]);
      const body = await readJson(req);
      const lesson = await courseForLesson(lessonId);
      if (!lesson) throw fail(404, 'LESSON_NOT_FOUND', 'Lesson not found.');
      await requireEnrollment(user.id, lesson.courseId);
      const retryAfter = limitRequest(req, `exercise:${user.id}`, 60, 5 * 60 * 1000);
      if (retryAfter) return json(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many exercise attempts. Take a short break and retry later.' } }, { 'Retry-After': String(retryAfter) });
      const exercise = await db.prepare('SELECT id, correct_option_index, explanation FROM exercises WHERE lesson_id = ?').get(lessonId);
      if (!exercise) throw fail(404, 'EXERCISE_NOT_FOUND', 'Exercise not found.');
      const optionCount = JSON.parse((await db.prepare('SELECT options_json AS optionsJson FROM exercises WHERE id = ?').get(exercise.id)).optionsJson).length;
      if (!Number.isInteger(body.answerIndex) || body.answerIndex < 0 || body.answerIndex >= optionCount) {
        throw fail(400, 'ANSWER_INVALID', 'Choose an answer before checking.');
      }
      const passed = body.answerIndex === exercise.correct_option_index;
      await db.prepare(`INSERT INTO exercise_attempts (id, user_id, exercise_id, selected_option_index, passed, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?)`).run(newId(), user.id, exercise.id, body.answerIndex, passed ? 1 : 0, now());
      if (passed) {
        await db.prepare(`INSERT INTO progress (user_id, lesson_id, status, completed_at, last_position, updated_at)
          VALUES (?, ?, 'completed', ?, 0, ?)
          ON CONFLICT(user_id, lesson_id) DO UPDATE SET
            status = 'completed', completed_at = COALESCE(progress.completed_at, excluded.completed_at),
            updated_at = excluded.updated_at`).run(user.id, lessonId, now(), now());
      }
      return json(res, 200, { passed, explanation: exercise.explanation });
    }

    const submissionMatch = pathname.match(/^\/api\/projects\/([^/]+)\/submissions$/);
    if (submissionMatch && method === 'POST') {
      await checkCsrf(req);
      const projectId = decodeURIComponent(submissionMatch[1]);
      const project = await db.prepare('SELECT id, course_id AS courseId FROM projects WHERE id = ?').get(projectId);
      if (!project) throw fail(404, 'PROJECT_NOT_FOUND', 'Project not found.');
      await requireEnrollment(user.id, project.courseId);
      const retryAfter = limitRequest(req, `project-submission:${user.id}`, 20, 60 * 60 * 1000);
      if (retryAfter) return json(res, 429, { error: { code: 'RATE_LIMITED', message: 'Too many project submissions. Try again later.' } }, { 'Retry-After': String(retryAfter) });
      const body = await readJson(req);
      const description = typeof body.description === 'string' ? body.description.trim() : '';
      const repositoryUrl = typeof body.repositoryUrl === 'string' && body.repositoryUrl.trim() ? body.repositoryUrl.trim() : null;
      const visibility = body.visibility === 'public' ? 'public' : body.visibility === 'private' ? 'private' : '';
      const milestonesCompleted = body.milestonesCompleted;
      if (description.length < 10 || description.length > 2000) throw fail(400, 'DESCRIPTION_INVALID', 'Describe your project in 10 to 2,000 characters.');
      if (!visibility) throw fail(400, 'VISIBILITY_INVALID', 'Choose private or public visibility.');
      if (!Number.isInteger(milestonesCompleted) || milestonesCompleted < 0 || milestonesCompleted > 20) {
        throw fail(400, 'MILESTONES_INVALID', 'Choose a valid milestone count.');
      }
      if (repositoryUrl) {
        let parsed;
        try {
          parsed = new URL(repositoryUrl);
        } catch {
          throw fail(400, 'URL_INVALID', 'Enter a valid project URL.');
        }
        if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || repositoryUrl.length > 500) {
          throw fail(400, 'URL_INVALID', 'Project URL must be a public HTTP or HTTPS link without embedded credentials.');
        }
      }
      const id = newId();
      await db.prepare(`INSERT INTO project_submissions
        (id, user_id, project_id, description, repository_url, visibility, milestones_completed, submitted_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(id, user.id, projectId, description, repositoryUrl, visibility, milestonesCompleted, now());
      await audit(user.id, 'project.submitted', 'project_submission', id);
      return json(res, 201, { id });
    }

    throw fail(404, 'ROUTE_NOT_FOUND', 'API route not found.');
  }

  function serveStatic(req, res, pathname) {
    const fileMap = {
      '/': 'index.html',
      '/index.html': 'index.html',
      '/styles.css': 'styles.css',
      '/app.js': 'app.js',
    };
    const file = fileMap[pathname];
    if (!file) return false;
    const filePath = path.join(ROOT, file);
    try {
      const contents = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(filePath)],
        'Cache-Control': 'no-cache',
        'Content-Length': contents.length,
      });
      res.end(contents);
      return true;
    } catch {
      throw fail(500, 'ASSET_UNAVAILABLE', 'A required application file is unavailable.');
    }
  }

  async function handle(req, res) {
    setSecurityHeaders(res);
    try {
      const host = req.headers.host || 'localhost';
      const url = new URL(req.url, `http://${host}`);
      if (url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET' && req.method !== 'POST' && req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'DELETE') {
          throw fail(405, 'METHOD_NOT_ALLOWED', 'This request method is not allowed.');
        }
        if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) && url.pathname !== '/api/health') {
          await checkCsrf(req);
        }
        await handleApi(req, res, url);
        return;
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') throw fail(405, 'METHOD_NOT_ALLOWED', 'This request method is not allowed.');
      if (serveStatic(req, res, url.pathname)) return;
      throw fail(404, 'NOT_FOUND', 'Page not found.');
    } catch (error) {
      if (res.headersSent) {
        res.destroy();
        return;
      }
      const status = error.status || 500;
      if (status >= 500) console.error(error);
      json(res, status, {
        error: {
          code: error.code || 'INTERNAL_ERROR',
          message: status >= 500 ? 'Something went wrong. Please try again.' : error.message,
        },
      });
    }
  }

  const server = http.createServer((req, res) => {
    handle(req, res).catch((error) => {
      console.error(error);
      if (!res.headersSent) json(res, 500, { error: { code: 'INTERNAL_ERROR', message: 'Something went wrong. Please try again.' } });
      else res.destroy();
    });
  });

  return {
    server,
    async close() {
      await db.close();
    },
  };
}

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  createApplication().then((app) => {
    app.server.listen(port, host, () => {
      console.log(`LearnBuild running at http://${host}:${port}`);
      console.log(`MySQL database connected: ${process.env.LEARNBUILD_DB_NAME || 'learnbuild'}`);
    });
    const shutdown = () => app.server.close(() => {
      app.close().then(() => process.exit(0));
    });
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }).catch((error) => {
    console.error('LearnBuild could not start because its database connection failed.', error);
    process.exitCode = 1;
  });
}

module.exports = { createApplication };
