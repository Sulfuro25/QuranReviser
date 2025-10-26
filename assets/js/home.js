// home.js - Homepage dynamic content

// Juz data for page lookups
const JUZ_DATA = [
  { id: 1, startPage: 1 }, { id: 2, startPage: 22 }, { id: 3, startPage: 42 },
  { id: 4, startPage: 62 }, { id: 5, startPage: 82 }, { id: 6, startPage: 102 },
  { id: 7, startPage: 122 }, { id: 8, startPage: 142 }, { id: 9, startPage: 162 },
  { id: 10, startPage: 182 }, { id: 11, startPage: 202 }, { id: 12, startPage: 222 },
  { id: 13, startPage: 242 }, { id: 14, startPage: 262 }, { id: 15, startPage: 282 },
  { id: 16, startPage: 302 }, { id: 17, startPage: 322 }, { id: 18, startPage: 342 },
  { id: 19, startPage: 362 }, { id: 20, startPage: 382 }, { id: 21, startPage: 402 },
  { id: 22, startPage: 422 }, { id: 23, startPage: 442 }, { id: 24, startPage: 462 },
  { id: 25, startPage: 482 }, { id: 26, startPage: 502 }, { id: 27, startPage: 522 },
  { id: 28, startPage: 542 }, { id: 29, startPage: 562 }, { id: 30, startPage: 582 }
];

// Hizb data for page lookups
const HIZB_DATA = [
  { id: 1, startPage: 1 }, { id: 2, startPage: 11 }, { id: 3, startPage: 22 }, { id: 4, startPage: 32 },
  { id: 5, startPage: 42 }, { id: 6, startPage: 52 }, { id: 7, startPage: 62 }, { id: 8, startPage: 72 },
  { id: 9, startPage: 82 }, { id: 10, startPage: 92 }, { id: 11, startPage: 102 }, { id: 12, startPage: 112 },
  { id: 13, startPage: 122 }, { id: 14, startPage: 132 }, { id: 15, startPage: 142 }, { id: 16, startPage: 152 },
  { id: 17, startPage: 162 }, { id: 18, startPage: 172 }, { id: 19, startPage: 182 }, { id: 20, startPage: 192 },
  { id: 21, startPage: 202 }, { id: 22, startPage: 212 }, { id: 23, startPage: 222 }, { id: 24, startPage: 232 },
  { id: 25, startPage: 242 }, { id: 26, startPage: 252 }, { id: 27, startPage: 262 }, { id: 28, startPage: 272 },
  { id: 29, startPage: 282 }, { id: 30, startPage: 292 }, { id: 31, startPage: 302 }, { id: 32, startPage: 312 },
  { id: 33, startPage: 322 }, { id: 34, startPage: 332 }, { id: 35, startPage: 342 }, { id: 36, startPage: 352 },
  { id: 37, startPage: 362 }, { id: 38, startPage: 372 }, { id: 39, startPage: 382 }, { id: 40, startPage: 392 },
  { id: 41, startPage: 402 }, { id: 42, startPage: 412 }, { id: 43, startPage: 422 }, { id: 44, startPage: 432 },
  { id: 45, startPage: 442 }, { id: 46, startPage: 452 }, { id: 47, startPage: 462 }, { id: 48, startPage: 472 },
  { id: 49, startPage: 482 }, { id: 50, startPage: 492 }, { id: 51, startPage: 502 }, { id: 52, startPage: 512 },
  { id: 53, startPage: 522 }, { id: 54, startPage: 532 }, { id: 55, startPage: 542 }, { id: 56, startPage: 552 },
  { id: 57, startPage: 562 }, { id: 58, startPage: 572 }, { id: 59, startPage: 582 }, { id: 60, startPage: 592 }
];

(function(){
  // Wait for DOM and core modules to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHomepage);
  } else {
    initHomepage();
  }

  function initHomepage() {
    // Run updates (async operations will complete in background)
    updateRevisionCard();
    updateMemorizedPages();
  }

  async function updateRevisionCard() {
    // Get today's daily plan from localStorage
    const dailyPlan = getDailyPlan();

    // Get elements
    const metricSpan = document.querySelector('.hero-metric span');
    const metricStrong = document.querySelector('.hero-metric strong');
    const progressBar = document.querySelector('.hero-progress');
    const heroNote = document.querySelector('.hero-note');

    if (!metricSpan || !metricStrong || !heroNote) return;

    if (!dailyPlan) {
      // No plan set up
      metricSpan.textContent = 'Today';
      metricStrong.textContent = 'Start tracking';
      if (progressBar) progressBar.style.display = 'none';
      heroNote.innerHTML = `
        <a href="hifdh.html" style="color: var(--primary); text-decoration: underline;">Set up your daily revision plan</a> 
        to build a consistent memorization routine.
      `;
      return;
    }

    // Build the pool of items to review
    const pool = await buildPlanPool(dailyPlan);
    const amount = Math.max(1, Number(dailyPlan.amount) || 1);
    const completedAssignments = Math.max(0, Number(dailyPlan.completedAssignments) || 0);
    
    if (!pool.length) {
      metricSpan.textContent = 'Today';
      metricStrong.textContent = 'No pages tracked';
      if (progressBar) progressBar.style.display = 'none';
      heroNote.innerHTML = `
        No tracked pages match this plan. 
        <a href="hifdh.html" style="color: var(--primary); text-decoration: underline;">Update your progress</a> 
        or adjust the plan.
      `;
      return;
    }

    // Get today's assignment based on the plan settings
    // Calculate which units should be reviewed today based on startValue and completedAssignments
    const startValue = Math.max(1, Number(dailyPlan.startValue) || 1);
    const offset = completedAssignments * amount;
    const assignmentStart = startValue + offset;
    
    // Generate the assignment as a range from the plan
    const assignment = [];
    for (let i = 0; i < amount; i++) {
      assignment.push(assignmentStart + i);
    }
    
    // Calculate total assignments based on plan unit max values
    const maxValue = dailyPlan.unit === 'pages' ? 604 : dailyPlan.unit === 'juz' ? 30 : 60;
    const totalUnits = Math.max(0, maxValue - startValue + 1);
    const totalAssignments = totalUnits > 0 ? Math.ceil(totalUnits / amount) : 0;
    const remainingAssignments = Math.max(0, totalAssignments - completedAssignments);

    // Check if assignment exceeds max value
    if (assignment[0] > maxValue) {
      // Plan complete
      metricSpan.textContent = 'Today';
      metricStrong.textContent = 'Plan complete! 🎉';
      if (progressBar) {
        progressBar.style.display = 'block';
        progressBar.style.width = '100%';
      }
      heroNote.innerHTML = `
        Congratulations! You've completed your revision plan. 
        <a href="hifdh.html" style="color: var(--primary); text-decoration: underline;">Adjust your pace or reset</a> 
        to continue.
      `;
      return;
    }

    // Format the assignment with page numbers
    const assignmentText = formatPlanAssignment(dailyPlan, assignment);
    const pageRange = getPageRangeForAssignment(dailyPlan.unit, assignment);

    // Update card content
    metricSpan.textContent = 'Today';
    metricStrong.textContent = assignmentText;
    
    if (progressBar) {
      progressBar.style.display = 'block';
      // Show progress through the plan
      const progress = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0;
      progressBar.style.width = `${Math.min(100, progress)}%`;
    }

    // Create note with assignment details and direct link
    let noteHTML = '';
    
    if (remainingAssignments > 1) {
      const afterAssignments = remainingAssignments - 1;
      noteHTML = `${afterAssignments} assignment${afterAssignments === 1 ? '' : 's'} remaining after today<br><br>`;
    } else if (remainingAssignments === 1) {
      noteHTML = '🏁 Finish this assignment to complete the plan!<br><br>';
    }

    if (pageRange && pageRange.start) {
      // Link directly to the first page of today's assignment
      noteHTML += `
        <a href="mushaf.html?page=${pageRange.start}&view=viewer" class="btn primary" style="margin-top: 0.5rem; display: inline-flex; align-items: center; gap: 0.5rem;">
          <ion-icon name="book-outline"></ion-icon>
          Open Mushaf
        </a>
      `;
    } else {
      noteHTML += `
        <a href="hifdh.html" class="btn primary" style="margin-top: 0.5rem; display: inline-flex; align-items: center; gap: 0.5rem;">
          <ion-icon name="calendar-outline"></ion-icon>
          View Plan
        </a>
      `;
    }

    heroNote.innerHTML = noteHTML;
  }

  function updateMemorizedPages() {
    const memorizedMetric = document.querySelectorAll('.hero-metric')[1];
    if (!memorizedMetric) return;

    const strong = memorizedMetric.querySelector('strong');
    if (!strong) return;

    // Count pages marked as memorized (confidence = 'strong' or page has bookmark)
    let memorizedCount = 0;
    try {
      if (window.QR && QR.pageData) {
        const pageData = QR.pageData.read();
        memorizedCount = Object.keys(pageData || {}).filter(page => {
          const data = pageData[page];
          return data && (data.confidence === 'strong' || data.bookmark);
        }).length;
      }
    } catch (e) {
      console.error('Error counting memorized pages:', e);
    }

    if (memorizedCount > 0) {
      strong.textContent = `${memorizedCount} page${memorizedCount !== 1 ? 's' : ''}`;
    } else {
      strong.textContent = 'Start tracking';
    }
  }

  function getDailyPlan() {
    try {
      // Use the same method as hifdh.js to read the plan
      const raw = (window.QR && QR.profiles && typeof QR.profiles.getItem === 'function')
        ? QR.profiles.getItem('qr_daily_revision_plan')
        : localStorage.getItem('qr_daily_revision_plan');
      
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      
      // Normalize the plan structure
      if (!parsed || typeof parsed !== 'object') return null;
      const unit = parsed.unit === 'juz' ? 'juz' : parsed.unit === 'hizb' ? 'hizb' : 'pages';
      const maxStart = unit === 'pages' ? 604 : unit === 'juz' ? 30 : 60;
      let startValue = Number(parsed.startValue);
      if (!startValue || Number.isNaN(startValue) || startValue < 1) startValue = 1;
      startValue = Math.min(startValue, maxStart);
      const amount = Math.max(1, Number(parsed.amount) || 1);
      
      return {
        version: 1,
        unit,
        amount,
        startMode: parsed.startMode === 'custom' ? 'custom' : 'first',
        startValue,
        createdAt: parsed.createdAt || new Date().toISOString().slice(0, 10),
        completedAssignments: Math.max(0, Number(parsed.completedAssignments) || 0),
        lastCompletedAt: parsed.lastCompletedAt || null,
      };
    } catch (e) {
      console.error('Error reading daily plan:', e);
      return null;
    }
  }

  async function buildPlanPool(plan) {
    const pages = await getTrackedPagesArray();
    if (!pages.length) return [];
    const unit = plan.unit || 'pages';
    const start = Math.max(1, Number(plan.startValue) || 1);
    
    if (unit === 'pages') {
      return pages.filter((p) => p >= start);
    }
    
    if (unit === 'juz') {
      const pageToJuz = await getPageToJuz();
      const set = new Set();
      pages.forEach((p) => {
        const j = pageToJuz[p];
        if (j) set.add(j);
      });
      return Array.from(set).sort((a, b) => a - b).filter((j) => j >= start);
    }
    
    const pageToHizb = await getPageToHizb();
    const set = new Set();
    pages.forEach((p) => {
      const h = pageToHizb[p];
      if (h) set.add(h);
    });
    return Array.from(set).sort((a, b) => a - b).filter((h) => h >= start);
  }

  async function getTrackedPagesArray() {
    try {
      // Use the same logic as hifdh.js - get pages from hifdh progress (ayat memorized)
      const progressKey = 'hifdh_progress';
      const raw = (window.QR && QR.profiles && typeof QR.profiles.getItem === 'function')
        ? QR.profiles.getItem(progressKey)
        : localStorage.getItem(progressKey);
      
      if (!raw) {
        console.log('[Home] No hifdh progress found');
        return [];
      }
      
      const progress = JSON.parse(raw);
      const set = new Set();
      const entries = Object.entries(progress).filter(([sid, m]) => (Number(m) || 0) > 0);
      
      // For each surah with progress, get its pages
      for (const [surahId, memorizedCount] of entries) {
        const sid = parseInt(surahId);
        if (!window.CHAPTERS_DATA) continue;
        
        const surah = window.CHAPTERS_DATA.find(s => s.id === sid);
        if (!surah || !surah.pages) continue;
        
        const pagesArr = surah.pages;
        const upto = Math.max(0, Math.min(pagesArr.length, Number(memorizedCount) || 0));
        
        for (let i = 0; i < upto; i++) {
          const p = pagesArr[i];
          if (p >= 1 && p <= 604) set.add(p);
        }
      }
      
      const pages = Array.from(set).sort((a, b) => a - b);
      return pages;
    } catch (e) {
      console.error('Error getting tracked pages:', e);
      return [];
    }
  }

  async function getPageToJuz() {
    const map = {};
    JUZ_DATA.forEach((juz, idx) => {
      const nextStart = idx < JUZ_DATA.length - 1 ? JUZ_DATA[idx + 1].startPage : 605;
      for (let p = juz.startPage; p < nextStart; p++) {
        map[p] = juz.id;
      }
    });
    return map;
  }

  async function getPageToHizb() {
    const map = {};
    HIZB_DATA.forEach((hizb, idx) => {
      const nextStart = idx < HIZB_DATA.length - 1 ? HIZB_DATA[idx + 1].startPage : 605;
      for (let p = hizb.startPage; p < nextStart; p++) {
        map[p] = hizb.id;
      }
    });
    return map;
  }

  async function getPagesForUnits(unit, unitIds) {
    // Get all pages covered by the given unit IDs
    const pages = [];
    
    if (unit === 'page') {
      return unitIds;
    } else if (unit === 'juz') {
      unitIds.forEach(juzId => {
        const juz = JUZ_DATA.find(j => j.id === juzId);
        if (juz) {
          const nextJuz = JUZ_DATA.find(j => j.id === juzId + 1);
          const endPage = nextJuz ? nextJuz.startPage - 1 : 604;
          for (let p = juz.startPage; p <= endPage; p++) {
            pages.push(p);
          }
        }
      });
    } else if (unit === 'hizb') {
      unitIds.forEach(hizbId => {
        const hizb = HIZB_DATA.find(h => h.id === hizbId);
        if (hizb) {
          const nextHizb = HIZB_DATA.find(h => h.id === hizbId + 1);
          const endPage = nextHizb ? nextHizb.startPage - 1 : 604;
          for (let p = hizb.startPage; p <= endPage; p++) {
            pages.push(p);
          }
        }
      });
    }
    
    return pages.sort((a, b) => a - b);
  }

  function formatUnitLabel(unit) {
    if (unit === 'juz') return 'Juz';
    if (unit === 'hizb') return 'Hizb';
    return 'Page';
  }

  function formatPlanAssignment(plan, items) {
    if (!items || !items.length) return 'All assignments completed';
    const unitLabel = formatUnitLabel(plan.unit);
    
    // Format the unit range - check if items are consecutive
    let unitText = '';
    if (items.length === 1) {
      unitText = `${unitLabel.toLowerCase()} ${items[0]}`;
    } else {
      // Check if consecutive
      let isConsecutive = true;
      for (let i = 1; i < items.length; i++) {
        if (items[i] !== items[i-1] + 1) {
          isConsecutive = false;
          break;
        }
      }
      
      if (isConsecutive) {
        // Consecutive: "hizbs 1-3"
        unitText = `${unitLabel.toLowerCase()}s ${items[0]}-${items[items.length - 1]}`;
      } else if (items.length <= 3) {
        // Few non-consecutive items: "hizbs 1, 5, 25"
        unitText = `${unitLabel.toLowerCase()}s ${items.join(', ')}`;
      } else {
        // Many non-consecutive items: "hizbs 1-25 (3 units)"
        unitText = `${items.length} ${unitLabel.toLowerCase()}s`;
      }
    }
    
    // Convert items to page numbers for display
    let pageInfo = '';
    if (plan.unit === 'page') {
      if (items.length === 1) {
        pageInfo = ` (Page ${items[0]})`;
      } else {
        pageInfo = ` (Pages ${items[0]}-${items[items.length - 1]})`;
      }
    } else if (plan.unit === 'juz') {
      // Get page range for juz - actual pages covered by these specific juz
      const allPages = new Set();
      items.forEach(juzId => {
        const juz = JUZ_DATA.find(j => j.id === juzId);
        if (juz) {
          const nextJuz = JUZ_DATA.find(j => j.id === juzId + 1);
          const endPage = nextJuz ? nextJuz.startPage - 1 : 604;
          for (let p = juz.startPage; p <= endPage; p++) {
            allPages.add(p);
          }
        }
      });
      if (allPages.size > 0) {
        const pages = Array.from(allPages).sort((a, b) => a - b);
        const startPage = pages[0];
        const endPage = pages[pages.length - 1];
        pageInfo = ` (Pages ${startPage}-${endPage})`;
      }
    } else if (plan.unit === 'hizb') {
      // Get page range for hizb - actual pages covered by these specific hizbs
      const allPages = new Set();
      items.forEach(hizbId => {
        const hizb = HIZB_DATA.find(h => h.id === hizbId);
        if (hizb) {
          const nextHizb = HIZB_DATA.find(h => h.id === hizbId + 1);
          const endPage = nextHizb ? nextHizb.startPage - 1 : 604;
          for (let p = hizb.startPage; p <= endPage; p++) {
            allPages.add(p);
          }
        }
      });
      if (allPages.size > 0) {
        const pages = Array.from(allPages).sort((a, b) => a - b);
        const startPage = pages[0];
        const endPage = pages[pages.length - 1];
        pageInfo = ` (Pages ${startPage}-${endPage})`;
      }
    }
    
    return `Review ${unitText}${pageInfo}`;
  }

  function getPageRangeForAssignment(unit, items) {
    if (!items || !items.length) return null;
    
    if (unit === 'page') {
      return {
        start: items[0],
        end: items[items.length - 1]
      };
    } else if (unit === 'juz') {
      const firstJuz = JUZ_DATA.find(j => j.id === items[0]);
      if (firstJuz) {
        const lastJuz = items.length > 1 ? JUZ_DATA.find(j => j.id === items[items.length - 1]) : firstJuz;
        const endPage = lastJuz && lastJuz.id < 30 ? JUZ_DATA.find(j => j.id === lastJuz.id + 1).startPage - 1 : 604;
        return {
          start: firstJuz.startPage,
          end: endPage
        };
      }
    } else if (unit === 'hizb') {
      const firstHizb = HIZB_DATA.find(h => h.id === items[0]);
      if (firstHizb) {
        const lastHizb = items.length > 1 ? HIZB_DATA.find(h => h.id === items[items.length - 1]) : firstHizb;
        const endPage = lastHizb && lastHizb.id < 60 ? HIZB_DATA.find(h => h.id === lastHizb.id + 1).startPage - 1 : 604;
        return {
          start: firstHizb.startPage,
          end: endPage
        };
      }
    }
    
    return null;
  }

  // Listen for profile changes and data updates
  window.addEventListener('qr:profile-changed', updateRevisionCard);
  window.addEventListener('qr:data-changed', () => {
    updateMemorizedPages();
    updateRevisionCard();
  });
  window.addEventListener('qr:page-data-changed', updateMemorizedPages);
})();

