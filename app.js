'use strict';

const state = {
  csrfToken: '',
  user: null,
  dashboard: null,
  courses: [],
  selectedCourse: null,
  selectedLesson: null,
  activeProject: null,
  activeFilter: 'all',
  projectSort: 'recent',
  catalogRequest: 0,
  toastTimer: null,
  savingPosition: false,
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const navButtons = $$('[data-view]');
const views = $$('.view-panel');
const toast = $('#toast');
const viewTitles = {
  home: 'Dashboard',
  learn: 'Explore courses',
  paths: 'Learning paths',
  saved: 'Saved courses',
  projects: 'Projects',
  portfolio: 'My portfolio',
  course: 'Course details',
  lesson: 'Lesson',
  'public-portfolio': 'Learner portfolio',
};

function element(tagName, className = '', text = '') {
  const item = document.createElement(tagName);
  if (className) item.className = className;
  if (text !== '') item.textContent = text;
  return item;
}

async function beginProjectSubmission() {
  try {
    const { projects } = await api('/api/me/projects');
    const project = projects.find((item) => item.enrolled);
    showView('projects');
    if (project) openSubmission(project.id);
    else notify('Enroll in a course before submitting a project.');
  } catch (error) {
    notify(error.message);
  }
}

function setText(target, text) {
  if (target) target.textContent = text;
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.classList.remove('show'), 3000);
}

function updateCsrf(token) {
  if (typeof token === 'string' && token.length === 43) state.csrfToken = token;
}

async function api(url, options = {}) {
  const method = options.method || 'GET';
  const headers = new Headers(options.headers || {});
  if (options.body !== undefined) headers.set('Content-Type', 'application/json');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    if (!state.csrfToken) throw new Error('Your secure session is not ready. Refresh and try again.');
    headers.set('X-CSRF-Token', state.csrfToken);
  }
  const response = await fetch(url, {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The server returned an invalid response.');
  }
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'The request could not be completed.');
    error.status = response.status;
    error.code = payload?.error?.code;
    if (response.status === 401 && state.user) showAuth();
    throw error;
  }
  if (payload.csrfToken) updateCsrf(payload.csrfToken);
  return payload;
}

function showAuth(message = '') {
  $('#auth-screen').hidden = false;
  $('.app-shell').inert = true;
  $('#auth-error').textContent = message;
  $('#auth-form [name="email"]').focus();
}

function hideAuth() {
  $('#auth-screen').hidden = true;
  $('.app-shell').inert = false;
}

function setAuthMode(mode) {
  const isSignup = mode === 'signup';
  $('#auth-title').textContent = isSignup ? 'Create your account' : 'Welcome to LearnBuild';
  $('#auth-description').textContent = isSignup
    ? 'Save your progress and build a portfolio as you learn.'
    : 'Sign in to save your progress and keep building.';
  $('#display-name-field').hidden = !isSignup;
  $('#display-name-field input').required = isSignup;
  $('#auth-form [name="password"]').autocomplete = isSignup ? 'new-password' : 'current-password';
  $('#auth-form .auth-submit').textContent = isSignup ? 'Create account' : 'Sign in';
  $('#auth-toggle-message').textContent = isSignup ? 'Already have an account?' : 'New to LearnBuild?';
  $('#auth-toggle').textContent = isSignup ? 'Sign in' : 'Create an account';
  $('#auth-error').textContent = '';
  $('#auth-form').dataset.mode = mode;
}

function showView(name) {
  if (state.selectedLesson && name !== 'lesson') void saveLessonProgress();
  const target = $(`#view-${name}`);
  if (!target) return;
  views.forEach((view) => {
    const active = view === target;
    view.hidden = !active;
    view.classList.toggle('active', active);
  });
  navButtons.forEach((button) => {
    const active = button.dataset.view === name;
    button.classList.toggle('active', active);
    if (active) button.setAttribute('aria-current', 'page');
    else button.removeAttribute('aria-current');
  });
  $('#breadcrumb-current').textContent = viewTitles[name] || 'LearnBuild';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (name === 'learn') void loadCatalog();
  if (name === 'paths') void loadPaths();
  if (name === 'saved') void loadSaved();
  if (name === 'projects') void loadProjects();
  if (name === 'portfolio') void loadPortfolio();
}

function prettyDate() {
  $('#today-date').textContent = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', month: 'long', day: 'numeric',
  }).format(new Date()).toUpperCase();
}

function updateIdentity(user) {
  state.user = user;
  const displayName = user.displayName || user.display_name || 'Learner';
  const initials = displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  setText($('#welcome-title'), `${greeting}, ${displayName}`);
  $$('.profile-copy strong').forEach((item) => setText(item, displayName));
  $$('.avatar-small, .avatar-top').forEach((item) => setText(item, initials));
  $('.avatar-top').setAttribute('aria-label', `Open ${displayName}’s portfolio`);
  setText($('.help-card strong'), `Keep going, ${displayName.split(/\s+/)[0]}.`);
  setText($('.learning-shortcut strong'), state.dashboard?.courses?.[0]?.title || 'Choose a course');
  setText($('.learning-shortcut small'), state.dashboard?.courses?.[0]
    ? `${state.dashboard.courses[0].completed_lessons || 0} of ${state.dashboard.courses[0].lesson_count || 0} lessons`
    : 'Your next step is waiting');
}

function updateDashboard(dashboard) {
  state.dashboard = dashboard;
  updateIdentity(dashboard.user);
  const cards = $$('.stat-card', $('#view-home'));
  const totalLessons = dashboard.courses.reduce((total, course) => total + course.lesson_count, 0);
  const minutes = dashboard.stats.minutesLearned || 0;
  const timeValue = cards[0]?.querySelector('.stat-value');
  if (timeValue) {
    timeValue.replaceChildren(document.createTextNode((minutes / 60).toFixed(1)), element('span', '', ' hrs'));
  }
  const lessonsValue = cards[1]?.querySelector('.stat-value');
  if (lessonsValue) {
    lessonsValue.replaceChildren(document.createTextNode(String(dashboard.stats.lessonsCompleted)), element('span', '', ` / ${totalLessons}`));
  }
  const overallProgress = totalLessons ? Math.round((dashboard.stats.lessonsCompleted / totalLessons) * 100) : 0;
  const progressRing = cards[1]?.querySelector('.stat-ring');
  if (progressRing) {
    progressRing.style.background = `conic-gradient(#a58fe0 ${overallProgress}%, #f0edf7 ${overallProgress}% 100%)`;
    progressRing.setAttribute('aria-label', `${overallProgress} percent complete`);
    setText(progressRing.querySelector('span'), `${overallProgress}%`);
  }
  const savedValue = cards[2]?.querySelector('.stat-value');
  if (savedValue) savedValue.replaceChildren(document.createTextNode(String(dashboard.stats.savedCount)), element('span', '', ' items'));
  setText(cards[1]?.querySelector('.stat-note'), `Across ${dashboard.courses.length} courses`);
  setText(cards[0]?.querySelector('.stat-note'), 'From completed lessons');
  setText($('.nav-count'), String(dashboard.stats.projectCount));
  renderActivity(dashboard.activityDays);
  const activeCourse = dashboard.courses.find((course) => course.completed_lessons < course.lesson_count)
    || dashboard.courses[0];
  if (activeCourse) {
    setText($('#feature-title'), activeCourse.title);
    $('.feature-copy p').textContent = activeCourse.description;
    $('.feature-tag').lastChild.textContent = ` YOUR LEARNING PATH`;
    const meta = $$('.feature-meta span');
    if (meta[0]) meta[0].lastChild.textContent = ` ${Math.round(activeCourse.estimatedMinutes / 60 * 10) / 10} hours`;
    if (meta[1]) meta[1].lastChild.textContent = ` ${activeCourse.level}`;
    const percent = activeCourse.progress || 0;
    setText($('#path-progress'), String(percent));
    $('#path-progress-bar').style.width = `${percent}%`;
    setText($('.progress-foot'), `${activeCourse.completed_lessons} of ${activeCourse.lesson_count} lessons completed`);
    $('.feature-tag').lastChild.textContent = ` ${activeCourse.title.toUpperCase()}`;
    $('.feature-copy .button').dataset.courseSlug = activeCourse.slug;
  } else {
    setText($('#feature-title'), 'Choose your first course');
    $('.feature-copy p').textContent = 'Start with a practical path and build your skills one lesson at a time.';
    $('.feature-tag').lastChild.textContent = ' YOUR NEXT STEP';
    setText($('#path-progress'), '0');
    $('#path-progress-bar').style.width = '0%';
    setText($('.progress-foot'), 'No lessons completed yet');
    $('.feature-copy .button').removeAttribute('data-course-slug');
  }
  renderDashboardCourses(dashboard.courses);
}

function renderActivity(days) {
  const max = Math.max(1, ...days.map((day) => day.count));
  const miniChart = $('.mini-chart');
  miniChart.replaceChildren();
  days.forEach((day) => {
    const bar = element('i');
    bar.style.height = `${day.count ? Math.max(18, Math.round(day.count / max * 100)) : 8}%`;
    bar.title = `${day.count} lesson updates`;
    miniChart.append(bar);
  });
  const count = days.filter((day) => day.count > 0).length;
  const active = $('.week-summary > strong');
  active.replaceChildren(document.createTextNode(String(count)), element('span', '', ' days active'));
  setText($('.week-goal b'), `${count}/5`);
  const bars = $('#week-bars');
  bars.replaceChildren();
  days.forEach((day) => {
    const column = element('div');
    const bar = element('span', `bar${day.day === new Date().toISOString().slice(0, 10) ? ' bar-today' : ''}`);
    bar.style.height = `${day.count ? Math.max(18, Math.round(day.count / max * 82)) : 12}%`;
    bar.title = `${day.count} lesson updates`;
    const label = element('small', '', new Date(`${day.day}T00:00:00Z`).toLocaleDateString(undefined, { weekday: 'narrow', timeZone: 'UTC' }));
    column.append(bar, label);
    bars.append(column);
  });
  setText($('.activity-foot'), count ? 'You’re building a nice rhythm.' : 'Complete a lesson to start tracking activity.');
  $('.activity-foot').prepend(element('span', 'activity-dot'));
}

function renderDashboardCourses(courses) {
  const list = $('.course-list');
  list.replaceChildren();
  if (!courses.length) {
    const empty = element('div', 'course-row');
    const copy = element('div', 'course-info');
    copy.append(element('h3', '', 'Your learning starts here'), element('p', '', 'Choose a course to see it on your dashboard.'));
    const button = element('button', 'course-continue', 'Explore courses →');
    button.type = 'button';
    button.dataset.viewLink = 'learn';
    empty.append(copy, button);
    list.append(empty);
    return;
  }
  courses.slice(0, 3).forEach((course) => {
    const row = element('article', 'course-row');
    const thumb = element('div', `course-thumb ${course.category === 'web' ? 'thumb-web' : course.category === 'data' ? 'thumb-peach' : 'thumb-js'}`);
    thumb.setAttribute('aria-hidden', 'true');
    thumb.append(element('span', 'thumb-mark', course.category === 'web' ? '</>' : course.category === 'data' ? '◌' : 'JS'));
    const info = element('div', 'course-info');
    info.append(element('span', 'course-category', course.category.toUpperCase()), element('h3', '', course.title));
    const progressLine = element('div', 'course-progress-line');
    const track = element('div', 'progress-track');
    const fill = element('span', course.category === 'programming' ? 'progress-purple' : '');
    fill.style.width = `${course.progress}%`;
    track.append(fill);
    progressLine.append(track, element('span', '', `${course.completed_lessons}/${course.lesson_count} lessons`));
    info.append(progressLine);
    const button = element('button', 'course-continue', 'Continue →');
    button.type = 'button';
    button.dataset.courseSlug = course.slug;
    button.setAttribute('aria-label', `Continue ${course.title}`);
    row.append(thumb, info, button);
    list.append(row);
  });
}

function renderCatalog(courses) {
  state.courses = courses;
  const grid = $('#catalog-grid');
  grid.replaceChildren();
  const covers = { web: 'cover-green', programming: 'cover-lilac', data: 'cover-peach' };
  const marks = { web: '</>', programming: 'JS', data: '✳' };
  courses.forEach((course) => {
    const card = element('article', 'catalog-card');
    const cover = element('div', `catalog-cover ${covers[course.category] || 'cover-blue'}`);
    cover.append(element('span', 'cover-label', course.category.toUpperCase()));
    cover.append(element('span', 'cover-code', marks[course.category] || 'LEARN'));
    const content = element('div', 'catalog-content');
    const meta = element('div', 'catalog-meta');
    meta.append(element('span', '', course.category.toUpperCase()));
    const bookmark = element('button', 'bookmark-button', course.bookmarked ? '♥' : '♡');
    bookmark.type = 'button';
    bookmark.dataset.bookmarkId = course.id;
    bookmark.setAttribute('aria-label', `${course.bookmarked ? 'Remove bookmark for' : 'Save'} ${course.title}`);
    bookmark.setAttribute('aria-pressed', String(course.bookmarked));
    meta.append(bookmark);
    content.append(meta, element('h2', '', course.title), element('p', '', course.description));
    const footer = element('div', 'catalog-footer');
    footer.append(element('span', '', `◷  ${Math.round(course.estimatedMinutes / 60 * 10) / 10} hours`));
    footer.append(element('span', `level-pill${course.level === 'Intermediate' ? ' level-intermediate' : ''}`, course.level));
    const action = element('button', 'button button-dark catalog-cta', course.enrolled ? 'Continue learning →' : 'Start learning →');
    action.type = 'button';
    action.dataset.courseSlug = course.slug;
    content.append(footer, action);
    card.append(cover, content);
    grid.append(card);
  });
  const count = $('[data-filter="all"] span');
  if (count) count.textContent = String(courses.length);
  $('#empty-state').hidden = courses.length > 0;
}

async function loadCatalog() {
  const requestId = ++state.catalogRequest;
  const params = new URLSearchParams();
  const search = $('#global-search').value.trim();
  const level = $('#level-filter').value;
  if (search) params.set('search', search);
  if (state.activeFilter !== 'all') params.set('category', state.activeFilter);
  if (level !== 'all') params.set('level', level);
  try {
    const result = await api(`/api/courses?${params}`);
    if (requestId === state.catalogRequest) renderCatalog(result.courses);
  } catch (error) {
    notify(error.message);
  }
}

async function loadPaths() {
  try {
    const { paths } = await api('/api/learning-paths');
    const grid = $('#paths-grid');
    grid.replaceChildren();
    paths.forEach((path, index) => {
      const card = element('article', 'catalog-card');
      const cover = element('div', `catalog-cover ${index === 0 ? 'cover-green' : 'cover-lilac'}`);
      cover.append(element('span', 'cover-label', `${path.level.toUpperCase()} LEARNING PATH`));
      cover.append(element('span', 'cover-code', `${path.courses.length} courses`));
      const content = element('div', 'catalog-content');
      content.append(element('h2', '', path.title), element('p', '', path.description));
      const metadata = element('div', 'catalog-footer');
      metadata.append(element('span', '', `${path.lessonCount} lessons`));
      metadata.append(element('span', 'level-pill', `${Math.round(path.estimatedMinutes / 60)} hours`));
      content.append(metadata);
      path.courses.forEach((course) => {
        const row = element('div', 'path-course-row');
        const open = element('button', 'course-continue', `${course.title} →`);
        open.type = 'button';
        open.dataset.courseSlug = course.slug;
        const progress = element('small', '', course.enrolled ? `${course.completedLessons}/${course.lessonCount} lessons` : course.level);
        row.append(open, progress);
        content.append(row);
      });
      card.append(cover, content);
      grid.append(card);
    });
  } catch (error) {
    notify(error.message);
  }
}

function renderCourse(course) {
  state.selectedCourse = course;
  const container = $('#course-detail');
  container.replaceChildren();
  const heading = element('div', 'detail-heading');
  const copy = element('div');
  copy.append(element('p', 'eyebrow', course.category.toUpperCase()), element('h1', '', course.title), element('p', 'welcome-subtitle', course.description));
  heading.append(copy);
  const enroll = element('button', `button ${course.enrolled ? 'button-outline' : 'button-dark'}`, course.enrolled ? 'You’re enrolled' : 'Enroll and start learning →');
  enroll.type = 'button';
  enroll.dataset.enrollCourse = course.id;
  enroll.disabled = course.enrolled;
  heading.append(enroll);
  const columns = element('div', 'detail-columns');
  const main = element('div');
  const outcomeCard = element('section', 'detail-card');
  outcomeCard.append(element('h2', '', 'What you’ll learn'));
  const outcomes = element('ul', 'outcome-list');
  course.outcomes.forEach((outcome) => outcomes.append(element('li', '', outcome)));
  outcomeCard.append(outcomes);
  main.append(outcomeCard);
  course.modules.forEach((module) => {
    const moduleCard = element('section', 'module-card');
    moduleCard.append(element('h2', 'module-title', module.title));
    const lessonList = element('ol', 'lesson-list');
    module.lessons.forEach((lesson) => {
      const item = element('li');
      const button = element('button', 'lesson-open');
      button.type = 'button';
      button.dataset.lessonId = lesson.id;
      const index = element('span', 'lesson-index', String(lesson.position).padStart(2, '0'));
      const text = element('span', 'lesson-copy');
      text.append(element('strong', '', lesson.title), element('small', '', `${lesson.estimatedMinutes} min · ${lesson.summary}`));
      button.append(index, text, element('span', 'lesson-done', lesson.completed ? '✓' : '→'));
      item.append(button);
      lessonList.append(item);
    });
    moduleCard.append(lessonList);
    main.append(moduleCard);
  });
  const side = element('aside', 'detail-side');
  const meta = element('section', 'detail-card');
  meta.append(element('h2', '', 'Course details'));
  const facts = element('div', 'detail-meta');
  facts.append(element('span', '', `Level: ${course.level}`));
  facts.append(element('span', '', `Lessons: ${course.lessonCount}`));
  facts.append(element('span', '', `Time: ${Math.round(course.estimatedMinutes / 60 * 10) / 10} hours`));
  facts.append(element('span', '', `Progress: ${course.completedLessons}/${course.lessonCount}`));
  meta.append(facts);
  side.append(meta);
  if (course.project) {
    const projectCard = element('section', 'detail-card');
    projectCard.append(element('h2', '', 'Build a project'), element('p', '', course.project.title), element('p', '', course.project.brief));
    const milestones = element('ul', 'outcome-list');
    course.project.milestones.forEach((milestone) => milestones.append(element('li', '', milestone)));
    projectCard.append(milestones);
    const projectButton = element('button', 'button button-outline', course.enrolled ? 'Open project →' : 'Enroll to start');
    projectButton.type = 'button';
    if (course.enrolled) projectButton.dataset.openProject = course.project.id;
    else projectButton.dataset.courseSlug = course.slug;
    projectCard.append(projectButton);
    side.append(projectCard);
  }
  columns.append(main, side);
  container.append(heading, columns);
  showView('course');
}

async function openCourse(slug) {
  if (!state.user) return showAuth('Sign in to open a course and save your progress.');
  try {
    const { course } = await api(`/api/courses/${encodeURIComponent(slug)}`);
    renderCourse(course);
  } catch (error) {
    notify(error.message);
  }
}

async function enroll(courseId) {
  try {
    await api('/api/enrollments', { method: 'POST', body: { courseId } });
    notify('You’re enrolled. Pick a lesson to get started.');
    const course = state.courses.find((item) => item.id === courseId);
      if (course) await openCourse(course.slug);
    await refreshDashboard();
  } catch (error) {
    notify(error.message);
  }
}

function renderLesson(lesson) {
  state.selectedLesson = lesson;
  const container = $('#lesson-detail');
  container.replaceChildren();
  const topline = element('div', 'lesson-topline');
  const back = element('button', 'button button-outline', '← Back to course');
  back.type = 'button';
  back.dataset.backCourse = lesson.courseSlug;
  topline.append(back, element('span', '', `${lesson.moduleTitle} · ${lesson.estimatedMinutes} min`));
  const layout = element('div', 'lesson-layout');
  const main = element('article', 'lesson-content-card');
  main.append(element('p', 'eyebrow', lesson.courseTitle.toUpperCase()), element('h1', '', lesson.title), element('p', 'welcome-subtitle', lesson.summary));
  lesson.content.forEach(([kind, text]) => {
    if (kind === 'heading') main.append(element('h2', 'lesson-block', text));
    else if (kind === 'code') main.append(element('pre', 'lesson-code', text));
    else main.append(element('p', 'lesson-block', text));
  });
  const aside = element('aside', 'lesson-aside');
  if (lesson.exercise) {
    const exerciseCard = element('section', 'detail-card');
    exerciseCard.append(element('p', 'eyebrow', 'CHECK YOUR UNDERSTANDING'), element('h2', '', lesson.exercise.prompt));
    const options = element('div');
    lesson.exercise.options.forEach((option, index) => {
      const label = element('label', 'exercise-option');
      const input = element('input');
      input.type = 'radio';
      input.name = 'exercise-answer';
      input.value = String(index);
      label.append(input, element('span', '', option));
      options.append(label);
    });
    const feedback = element('p', 'exercise-feedback');
    feedback.id = 'exercise-feedback';
    const check = element('button', 'button button-dark exercise-check', 'Check answer');
    check.type = 'button';
    check.dataset.checkLesson = lesson.id;
    exerciseCard.append(options, check, feedback);
    aside.append(exerciseCard);
  }
  const completeCard = element('section', 'detail-card');
  completeCard.append(element('h2', '', lesson.progressStatus === 'completed' ? 'Lesson completed' : 'Save your progress'));
  const complete = element('button', 'button button-outline lesson-complete', lesson.progressStatus === 'completed' ? 'Completed ✓' : 'Mark lesson complete');
  complete.type = 'button';
  complete.dataset.completeLesson = lesson.id;
  complete.disabled = lesson.progressStatus === 'completed';
  completeCard.append(complete);
  const nav = element('div', 'lesson-nav');
  const currentIndex = lesson.navigation.findIndex((item) => item.id === lesson.id);
  const previous = lesson.navigation[currentIndex - 1];
  const next = lesson.navigation[currentIndex + 1];
  if (previous) {
    const button = element('button', 'button button-outline', `← ${previous.title}`);
    button.type = 'button';
    button.dataset.lessonId = previous.id;
    nav.append(button);
  } else nav.append(element('span'));
  if (next) {
    const button = element('button', 'button button-dark', `Next: ${next.title} →`);
    button.type = 'button';
    button.dataset.lessonId = next.id;
    nav.append(button);
  }
  completeCard.append(nav);
  aside.append(completeCard);
  layout.append(main, aside);
  container.append(topline, layout);
  showView('lesson');
  window.setTimeout(() => {
    if (lesson.lastPosition > 0) window.scrollTo({ top: lesson.lastPosition, behavior: 'smooth' });
  }, 50);
}

async function openLesson(lessonId) {
  if (state.selectedLesson) await saveLessonProgress();
  try {
    const { lesson } = await api(`/api/lessons/${encodeURIComponent(lessonId)}`);
    renderLesson(lesson);
  } catch (error) {
    notify(error.message);
  }
}

async function saveLessonProgress(status = 'in_progress') {
  if (!state.selectedLesson || state.savingPosition) return;
  state.savingPosition = true;
  const lesson = state.selectedLesson;
  try {
    await api(`/api/lessons/${encodeURIComponent(lesson.id)}/progress`, {
      method: 'PUT',
      body: { status, lastPosition: Math.max(0, Math.round(window.scrollY)) },
    });
    if (status === 'completed') lesson.progressStatus = 'completed';
  } catch (error) {
    if (error.status !== 401) notify(error.message);
  } finally {
    state.savingPosition = false;
  }
}

async function checkExercise(lessonId) {
  const selected = $('input[name="exercise-answer"]:checked');
  const feedback = $('#exercise-feedback');
  if (!selected) {
    feedback.textContent = 'Choose an answer first.';
    feedback.classList.add('is-wrong');
    return;
  }
  try {
    const result = await api(`/api/lessons/${encodeURIComponent(lessonId)}/check`, {
      method: 'POST',
      body: { answerIndex: Number(selected.value) },
    });
    feedback.textContent = `${result.passed ? 'That’s right. ' : 'Not quite. '}${result.explanation}`;
    feedback.classList.toggle('is-wrong', !result.passed);
    if (result.passed) {
      state.selectedLesson.progressStatus = 'completed';
      const completeButton = $('[data-complete-lesson]');
      completeButton.textContent = 'Completed ✓';
      completeButton.disabled = true;
      void refreshDashboard();
    }
  } catch (error) {
    feedback.textContent = error.message;
    feedback.classList.add('is-wrong');
  }
}

async function refreshDashboard() {
  const dashboard = await api('/api/me/dashboard');
  updateDashboard(dashboard);
}

async function loadProjects() {
  try {
    const { projects } = await api('/api/me/projects');
    renderProjects(projects);
  } catch (error) {
    notify(error.message);
  }
}

async function loadSaved() {
  try {
    const { courses } = await api('/api/me/bookmarks');
    const list = $('#saved-list');
    list.replaceChildren();
    courses.forEach((course) => {
      const row = element('article', 'course-row');
      const thumb = element('div', `course-thumb ${course.category === 'web' ? 'thumb-web' : course.category === 'data' ? 'thumb-peach' : 'thumb-js'}`);
      thumb.setAttribute('aria-hidden', 'true');
      thumb.append(element('span', 'thumb-mark', course.category === 'web' ? '</>' : course.category === 'data' ? '✳' : 'JS'));
      const info = element('div', 'course-info');
      info.append(element('span', 'course-category', course.category.toUpperCase()), element('h3', '', course.title), element('p', '', course.description));
      const open = element('button', 'course-continue', 'Open course →');
      open.type = 'button';
      open.dataset.courseSlug = course.slug;
      const remove = element('button', 'bookmark-button', '♥');
      remove.type = 'button';
      remove.dataset.bookmarkId = state.courses.find((item) => item.slug === course.slug)?.id || '';
      remove.setAttribute('aria-label', `Remove ${course.title} from saved courses`);
      remove.setAttribute('aria-pressed', 'true');
      row.append(thumb, info, open, remove);
      list.append(row);
    });
    $('#saved-empty').hidden = courses.length > 0;
  } catch (error) {
    notify(error.message);
  }
}

function renderProjects(projects) {
  const grid = $('#projects-grid');
  grid.replaceChildren();
  projects.forEach((project, index) => {
    const card = element('article', 'project-card');
    const art = element('div', `project-art ${index % 2 ? 'project-art-two' : 'project-art-one'}`);
    const preview = element('div', index % 2 ? 'project-note' : 'project-browser');
    preview.append(element('small', '', project.courseTitle.toUpperCase()), element('b', '', project.title));
    art.append(preview, element('span', 'project-step', `${String(index + 1).padStart(2, '0')} / ${projects.length}`));
    const body = element('div', 'project-card-body');
    const line = element('div', 'project-title-line');
    const title = element('div');
    title.append(element('span', 'course-category', project.courseTitle.toUpperCase()), element('h2', '', project.title));
    line.append(title, element('span', `status-pill ${project.submissionId ? 'status-progress' : 'status-ready'}`, project.submissionId ? 'Submitted' : 'Ready to start'));
    body.append(line, element('p', '', project.brief));
    const progress = element('div', 'project-progress');
    const track = element('div', 'progress-track');
    const fill = element('span');
    fill.style.width = `${project.milestones.length ? Math.round((project.milestonesCompleted / project.milestones.length) * 100) : 0}%`;
    track.append(fill);
    progress.append(track, element('span', '', `${project.milestonesCompleted || 0} of ${project.milestones.length} milestones`));
    const submit = element('button', 'text-button project-link', project.enrolled
      ? project.submissionId ? 'Update submission →' : 'Open project brief →'
      : 'Enroll to start →');
    submit.type = 'button';
    if (project.enrolled) submit.dataset.submitProject = project.id;
    else submit.dataset.courseSlug = project.courseSlug;
    body.append(progress, submit);
    card.append(art, body);
    grid.append(card);
  });
  const prompt = element('article', 'project-prompt');
  prompt.append(element('span', 'prompt-spark', '✳'), element('h2', '', 'Your next project is waiting.'), element('p', '', 'Explore a skill and turn it into something real.'));
  const explore = element('button', 'button button-lime', 'Find a course →');
  explore.type = 'button';
  explore.dataset.viewLink = 'learn';
  prompt.append(explore);
  grid.append(prompt);
}

function openSubmission(projectId) {
  api('/api/me/projects').then(({ projects }) => {
    const project = projects.find((item) => item.id === projectId);
    if (!project) throw new Error('Project not found.');
    state.activeProject = project;
    setText($('#submission-title'), project.title);
    setText($('#submission-brief'), project.brief);
    const milestones = $('#submission-form [name="milestonesCompleted"]');
    milestones.replaceChildren();
    project.milestones.forEach((_, index) => {
      const option = element('option', '', `${index} of ${project.milestones.length}`);
      option.value = String(index);
      milestones.append(option);
    });
    const allDone = element('option', '', `All ${project.milestones.length} milestones`);
    allDone.value = String(project.milestones.length);
    milestones.append(allDone);
    if (project.submissionId) {
      $('#submission-form [name="description"]').value = project.description || '';
      $('#submission-form [name="repositoryUrl"]').value = project.repositoryUrl || '';
      $('#submission-form [name="milestonesCompleted"]').value = String(project.milestonesCompleted || 0);
      $('#submission-form [name="visibility"]').value = project.visibility || 'private';
    } else {
      $('#submission-form').reset();
      $('#submission-form [name="milestonesCompleted"]').value = '0';
      $('#submission-form [name="visibility"]').value = 'private';
    }
    $('#submission-error').textContent = '';
    $('#project-dialog').showModal();
  }).catch((error) => notify(error.message));
}

async function loadPortfolio() {
  try {
    const result = await api('/api/portfolio/me');
    renderPortfolio(result);
  } catch (error) {
    notify(error.message);
  }
}

function renderPortfolio(result) {
  const user = result.user;
  const profile = $('#portfolio-profile');
  profile.replaceChildren();
  const initials = user.displayName.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  profile.append(element('div', 'avatar avatar-large', initials));
  const info = element('div');
  const name = element('h2');
  name.append(document.createTextNode(user.displayName), element('span', 'private-badge', `${user.visibility === 'public' ? 'Public' : 'Private'} portfolio`));
  info.append(name, element('p', '', user.learningGoal || 'Learning one practical skill at a time.'));
  const url = element('span', 'portfolio-url');
  const publicUrl = `${window.location.origin}/?portfolio=${encodeURIComponent(user.handle)}`;
  const link = element('a', '', `${window.location.host}/?portfolio=${user.handle}`);
  link.href = publicUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const copy = element('button', '', '↗');
  copy.type = 'button';
  copy.setAttribute('aria-label', 'Copy portfolio link');
  copy.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      notify('Portfolio link copied.');
    } catch {
      notify('Copying is not available in this browser.');
    }
  });
  url.append(link, copy);
  info.append(url);
  const edit = element('button', 'button button-outline edit-profile', 'Edit profile');
  edit.type = 'button';
  edit.addEventListener('click', toggleProfileEditor);
  profile.append(info, edit);
  renderProfileEditor(user);
  const grid = $('#portfolio-grid');
  grid.replaceChildren();
  $('#portfolio-project-count').textContent = String(result.projects.length);
  const portfolioProjects = [...result.projects].sort((first, second) => {
    const difference = new Date(second.submittedAt) - new Date(first.submittedAt);
    return state.projectSort === 'recent' ? difference : -difference;
  });
  const sortButton = $('.sort-button');
  if (sortButton) sortButton.firstChild.textContent = state.projectSort === 'recent' ? 'Recently updated ' : 'Oldest first ';
  portfolioProjects.forEach((project, index) => {
    const card = element('article', 'portfolio-item');
    card.append(element('span', 'status-pill status-progress', `${project.visibility} · ${project.milestonesCompleted} milestones`));
    card.append(element('h3', '', project.projectTitle), element('p', '', project.description), element('p', 'course-category', project.courseTitle));
    if (project.repositoryUrl) {
      const link = element('a', '', 'Open project link ↗');
      link.href = project.repositoryUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      card.append(link);
    }
    card.append(element('div', 'tech-tags', new Date(project.submittedAt).toLocaleDateString()));
    grid.append(card);
  });
  const add = element('button', 'add-project-card', '');
  add.type = 'button';
  add.append(element('span', '', '+'), element('strong', '', 'Submit a project'), element('small', '', 'Share something you’ve built'));
  add.addEventListener('click', () => void beginProjectSubmission());
  grid.append(add);
}

function renderProfileEditor(user) {
  const editor = $('#profile-editor');
  editor.replaceChildren();
  const form = element('form', 'profile-editor-form');
  const nameLabel = element('label', '', 'Display name');
  const nameInput = element('input');
  nameInput.name = 'displayName';
  nameInput.value = user.displayName;
  nameInput.maxLength = 60;
  nameInput.required = true;
  nameLabel.append(nameInput);
  const levelLabel = element('label', '', 'Skill level');
  const levelSelect = element('select');
  levelSelect.name = 'skillLevel';
  [['beginner', 'Beginner'], ['intermediate', 'Intermediate'], ['advanced', 'Advanced']].forEach(([value, title]) => {
    const option = element('option', '', title);
    option.value = value;
    option.selected = user.skillLevel === value;
    levelSelect.append(option);
  });
  levelLabel.append(levelSelect);
  const goalLabel = element('label', '', 'Learning goal');
  const goalInput = element('input');
  goalInput.name = 'learningGoal';
  goalInput.value = user.learningGoal || '';
  goalInput.maxLength = 160;
  goalInput.placeholder = 'What would you like to build?';
  goalLabel.append(goalInput);
  const visibilityLabel = element('label', '', 'Portfolio visibility');
  const visibilitySelect = element('select');
  visibilitySelect.name = 'visibility';
  [['private', 'Private by default'], ['public', 'Public profile']].forEach(([value, title]) => {
    const option = element('option', '', title);
    option.value = value;
    option.selected = user.visibility === value;
    visibilitySelect.append(option);
  });
  visibilityLabel.append(visibilitySelect);
  const error = element('p', 'form-error');
  const save = element('button', 'button button-dark', 'Save profile');
  save.type = 'submit';
  const exportButton = element('button', 'button button-outline', 'Export my data');
  exportButton.type = 'button';
  exportButton.addEventListener('click', exportMyData);
  const deleteButton = element('button', 'button button-outline', 'Delete account');
  deleteButton.type = 'button';
  deleteButton.addEventListener('click', deleteAccount);
  const logoutButton = element('button', 'button button-outline', 'Sign out');
  logoutButton.type = 'button';
  logoutButton.addEventListener('click', logout);
  form.append(nameLabel, levelLabel, goalLabel, visibilityLabel, error, save, exportButton, deleteButton, logoutButton);
  form.addEventListener('submit', saveProfile);
  editor.append(form);
}

function toggleProfileEditor() {
  const editor = $('#profile-editor');
  editor.hidden = !editor.hidden;
}

async function saveProfile(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = new FormData(form);
  const error = $('.form-error', form);
  try {
    await api('/api/me/profile', {
      method: 'PATCH',
      body: {
        displayName: values.get('displayName'),
        skillLevel: values.get('skillLevel'),
        learningGoal: values.get('learningGoal'),
        visibility: values.get('visibility'),
      },
    });
    await loadPortfolio();
    await refreshDashboard();
    $('#profile-editor').hidden = true;
    notify('Profile saved.');
  } catch (problem) {
    error.textContent = problem.message;
  }
}

async function exportMyData() {
  try {
    const data = await api('/api/me/export');
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const link = element('a');
    link.href = url;
    link.download = 'learnbuild-export.json';
    link.click();
    URL.revokeObjectURL(url);
    notify('Your data export is ready.');
  } catch (error) {
    notify(error.message);
  }
}

async function deleteAccount() {
  if (!window.confirm('Delete your LearnBuild account and saved learning data? This cannot be undone.')) return;
  const password = window.prompt('Enter your current password to confirm account deletion.');
  if (!password) return;
  try {
    await api('/api/me', { method: 'DELETE', body: { password } });
    state.user = null;
    showAuth('Your account has been deleted.');
    setAuthMode('signup');
  } catch (error) {
    notify(error.message);
  }
}

async function logout() {
  try {
    await api('/api/auth/logout', { method: 'POST', body: {} });
    state.user = null;
    state.dashboard = null;
    setAuthMode('login');
    showAuth('You have signed out.');
  } catch (error) {
    notify(error.message);
  }
}

async function renderPublicPortfolio(handle) {
  $('.app-shell').classList.add('public-view');
  try {
    const result = await api(`/api/portfolio/${encodeURIComponent(handle)}`);
    setText($('#public-portfolio-title'), `${result.user.displayName}’s portfolio`);
    setText($('#public-portfolio-description'), result.user.learningGoal || 'A selection of projects built while learning.');
    const grid = $('#public-portfolio-items');
    grid.replaceChildren();
    result.projects.forEach((project) => {
      const card = element('article', 'portfolio-item');
      card.append(element('h2', '', project.projectTitle), element('p', '', project.description), element('p', 'course-category', project.courseTitle));
      if (project.repositoryUrl) {
        const link = element('a', '', 'Open project ↗');
        link.href = project.repositoryUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        card.append(link);
      }
      grid.append(card);
    });
    $('#public-portfolio-empty').hidden = result.projects.length > 0;
    showView('public-portfolio');
  } catch (error) {
    setText($('#public-portfolio-title'), 'Portfolio unavailable');
    setText($('#public-portfolio-description'), error.message);
    showView('public-portfolio');
  }
}

async function submitProject(event) {
  event.preventDefault();
  if (!state.activeProject) return;
  const form = event.currentTarget;
  const values = new FormData(form);
  try {
    await api(`/api/projects/${encodeURIComponent(state.activeProject.id)}/submissions`, {
      method: 'POST',
      body: {
        description: values.get('description'),
        repositoryUrl: values.get('repositoryUrl'),
        milestonesCompleted: Number(values.get('milestonesCompleted')),
        visibility: values.get('visibility'),
      },
    });
    $('#project-dialog').close();
    notify('Project submission saved.');
    await loadProjects();
    await loadPortfolio();
  } catch (error) {
    $('#submission-error').textContent = error.message;
  }
}

function toggleBookmark(button) {
  const courseId = button.dataset.bookmarkId;
  const isSaved = button.getAttribute('aria-pressed') === 'true';
  const request = isSaved
    ? api(`/api/me/bookmarks/${encodeURIComponent(courseId)}`, { method: 'DELETE', body: {} })
    : api('/api/me/bookmarks', { method: 'POST', body: { courseId } });
  request.then(() => {
    notify(isSaved ? 'Removed from saved courses.' : 'Saved for later.');
    void loadCatalog();
    void refreshDashboard();
    if (!$('#view-saved').hidden) void loadSaved();
  }).catch((error) => notify(error.message));
}

function setupEvents() {
  navButtons.forEach((button) => button.addEventListener('click', () => showView(button.dataset.view)));
  document.addEventListener('click', (event) => {
    const target = event.target.closest('button');
    if (!target) return;
    if (target.dataset.viewLink) showView(target.dataset.viewLink);
    if (target.dataset.courseSlug) void openCourse(target.dataset.courseSlug);
    if (target.dataset.lessonId) void openLesson(target.dataset.lessonId);
    if (target.dataset.enrollCourse) void enroll(target.dataset.enrollCourse);
    if (target.dataset.bookmarkId) toggleBookmark(target);
    if (target.dataset.checkLesson) void checkExercise(target.dataset.checkLesson);
    if (target.dataset.completeLesson) {
      void saveLessonProgress('completed').then(() => {
        target.textContent = 'Completed ✓';
        target.disabled = true;
        void refreshDashboard();
      });
    }
    if (target.dataset.backCourse) void openCourse(target.dataset.backCourse);
    if (target.dataset.openProject) {
      showView('projects');
      openSubmission(target.dataset.openProject);
    }
    if (target.dataset.submitProject) openSubmission(target.dataset.submitProject);
    if (target.hasAttribute('data-add-project')) void beginProjectSubmission();
    if (target.classList.contains('avatar-top')) showView('portfolio');
    if (target.classList.contains('profile-button')) showView('portfolio');
    if (target.classList.contains('notification-button')) notify('You’re all caught up.');
    if (target.classList.contains('sort-button')) {
      state.projectSort = state.projectSort === 'recent' ? 'oldest' : 'recent';
      void loadPortfolio();
    }
    if (target.classList.contains('dialog-close')) $('#project-dialog').close();
    if (target.dataset.logout) void logout();
  });

  $$('[data-filter]').forEach((button) => button.addEventListener('click', () => {
    state.activeFilter = button.dataset.filter;
    $$('[data-filter]').forEach((filter) => {
      const active = filter === button;
      filter.classList.toggle('selected', active);
      filter.setAttribute('aria-pressed', String(active));
    });
    void loadCatalog();
  }));
  $('#level-filter').addEventListener('change', () => void loadCatalog());
  $('#global-search').addEventListener('input', () => {
    if (!$('#view-learn').hidden) void loadCatalog();
  });
  $('#global-search').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') showView('learn');
    if (event.key === 'Escape') {
      event.currentTarget.value = '';
      void loadCatalog();
      event.currentTarget.blur();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName) && $('#auth-screen').hidden) {
      event.preventDefault();
      $('#global-search').focus();
    }
  });

  $('#auth-toggle').addEventListener('click', () => {
    const next = $('#auth-form').dataset.mode === 'signup' ? 'login' : 'signup';
    setAuthMode(next);
  });
  $('#auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const mode = form.dataset.mode;
    const button = $('.auth-submit', form);
    button.disabled = true;
    $('#auth-error').textContent = '';
    try {
      const result = await api(`/api/auth/${mode}`, {
        method: 'POST',
        body: {
          displayName: values.get('displayName'),
          email: values.get('email'),
          password: values.get('password'),
        },
      });
      updateCsrf(result.csrfToken);
      updateIdentity(result.user);
      hideAuth();
      form.reset();
      await loadWorkspace();
      notify(mode === 'signup' ? 'Your account is ready. Welcome!' : 'You’re signed in.');
    } catch (error) {
      $('#auth-error').textContent = error.message;
    } finally {
      button.disabled = false;
    }
  });
  $('#submission-form').addEventListener('submit', submitProject);
  $('#project-dialog').addEventListener('click', (event) => {
    if (event.target === $('#project-dialog')) $('#project-dialog').close();
  });
}

async function loadWorkspace() {
  const [dashboardResult, catalogResult] = await Promise.all([
    api('/api/me/dashboard'),
    api('/api/courses'),
  ]);
  updateDashboard(dashboardResult);
  renderCatalog(catalogResult.courses);
  void loadProjects();
  void loadPortfolio();
}

async function initialize() {
  prettyDate();
  setAuthMode('login');
  setupEvents();
  try {
    const session = await api('/api/session');
    updateCsrf(session.csrfToken);
    const portfolioHandle = new URLSearchParams(window.location.search).get('portfolio');
    if (portfolioHandle) {
      $('#auth-screen').hidden = true;
      $('.app-shell').inert = false;
      await renderPublicPortfolio(portfolioHandle);
      return;
    }
    $('.app-shell').classList.remove('public-view');
    if (!session.user) {
      showAuth();
      return;
    }
    updateIdentity(session.user);
    await loadWorkspace();
  } catch (error) {
    showAuth(`Could not connect to the database: ${error.message}`);
  }
}

initialize();
