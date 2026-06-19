let userData = {
  session: null,
  userId: null,
  email: '',
  workGoal: '',
  strictness: 'hard'
};

let chart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
  loadUserData();
  setupEventListeners();
});

async function loadUserData() {
  try {
    const storage = await chrome.storage.local.get([
      'session', 'user_id', 'email', 'work_goal', 'strictness'
    ]);

    userData = {
      session: storage.session || null,
      userId: storage.user_id || null,
      email: storage.email || '',
      workGoal: storage.work_goal || '',
      strictness: storage.strictness || 'hard'
    };

    if (!userData.session || !userData.userId) {
      window.location.href = '../onboarding/onboarding.html';
      return;
    }

    document.getElementById('user-email').textContent = userData.email;
    
    await loadDashboardData();
  } catch (error) {
    console.error('Error loading user data:', error);
  }
}

async function loadDashboardData() {
  try {
    // Load visit logs from background service worker
    const response = await chrome.runtime.sendMessage({
      type: 'GET_VISIT_LOGS',
      userId: userData.userId
    });

    if (response && response.error) {
      throw new Error(response.error);
    }

    const visits = response.visits || [];
    updateSummaryStats(visits);
    updateChart(visits);
    updateTable(visits);
    updateShareStats(visits);
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

function updateSummaryStats(visits) {
  const today = new Date().toISOString().split('T')[0];
  const todayVisits = visits.filter(v => v.visited_at.startsWith(today));
  const totalVisits = visits.length;
  const overriddenVisits = visits.filter(v => v.was_overridden);
  const overrideRate = totalVisits > 0 ? Math.round((overriddenVisits.length / totalVisits) * 100) : 0;

  // Find top site
  const siteCounts = {};
  visits.forEach(v => {
    siteCounts[v.site_name] = (siteCounts[v.site_name] || 0) + 1;
  });
  const topSite = Object.keys(siteCounts).length > 0 
    ? Object.keys(siteCounts).reduce((a, b) => siteCounts[a] > siteCounts[b] ? a : b)
    : '-';

  document.getElementById('total-visits').textContent = totalVisits;
  document.getElementById('today-visits').textContent = todayVisits.length;
  document.getElementById('top-site').textContent = topSite;
  document.getElementById('override-rate').textContent = overrideRate + '%';
}

function updateChart(visits) {
  const ctx = document.getElementById('shameChart').getContext('2d');
  
  // Generate last 7 days data
  const last7Days = [];
  const visitCounts = [];
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayVisits = visits.filter(v => v.visited_at.startsWith(dateStr));
    
    last7Days.push(date.toLocaleDateString('en-US', { weekday: 'short' }));
    visitCounts.push(dayVisits.length);
  }

  // Destroy existing chart if it exists
  if (chart) {
    chart.destroy();
  }

  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: last7Days,
      datasets: [{
        label: 'Shame Attempts',
        data: visitCounts,
        borderColor: '#b91c1c',
        backgroundColor: 'rgba(185, 28, 28, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            color: '#9ca3af'
          },
          grid: {
            color: '#374151'
          }
        },
        x: {
          ticks: {
            color: '#9ca3af'
          },
          grid: {
            color: '#374151'
          }
        }
      }
    }
  });
}

function updateTable(visits) {
  const tbody = document.getElementById('shame-table-body');
  tbody.innerHTML = '';

  visits.slice(0, 20).forEach(visit => {
    const row = document.createElement('tr');
    const time = new Date(visit.visited_at).toLocaleString();
    const overridden = visit.was_overridden ? 'Yes' : 'No';
    
    row.innerHTML = `
      <td>${visit.site_name}</td>
      <td>${time}</td>
      <td><span class="override-badge ${visit.was_overridden ? 'overridden' : 'not-overridden'}">${overridden}</span></td>
      <td class="roast-text">${visit.roast || 'Static roast'}</td>
    `;
    
    tbody.appendChild(row);
  });
}

function updateShareStats(visits) {
  // Calculate streak (consecutive days with no overrides)
  const today = new Date();
  let streak = 0;
  
  for (let i = 0; i < 30; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const dayVisits = visits.filter(v => v.visited_at.startsWith(dateStr));
    const dayOverrides = dayVisits.filter(v => v.was_overridden);
    
    if (dayVisits.length > 0 && dayOverrides.length === 0) {
      streak++;
    } else if (dayVisits.length > 0) {
      break;
    }
  }

  // Calculate improvement vs last week
  const last7Days = visits.filter(v => {
    const visitDate = new Date(v.visited_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return visitDate >= weekAgo;
  });

  const prev7Days = visits.filter(v => {
    const visitDate = new Date(v.visited_at);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return visitDate >= twoWeeksAgo && visitDate < weekAgo;
  });

  const improvement = prev7Days.length > 0 
    ? Math.round(((prev7Days.length - last7Days.length) / prev7Days.length) * 100)
    : 0;

  document.getElementById('streak-days').textContent = streak;
  document.getElementById('improvement-rate').textContent = (improvement > 0 ? '+' : '') + improvement + '%';
}

function setupEventListeners() {
  document.getElementById('download-png').addEventListener('click', downloadAsPNG);
}

async function downloadAsPNG() {
  try {
    // Use html2canvas library (would need to be included)
    // For now, create a simple download
    const data = {
      totalVisits: document.getElementById('total-visits').textContent,
      todayVisits: document.getElementById('today-visits').textContent,
      topSite: document.getElementById('top-site').textContent,
      overrideRate: document.getElementById('override-rate').textContent,
      streak: document.getElementById('streak-days').textContent,
      improvement: document.getElementById('improvement-rate').textContent
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uwarden-stats-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error downloading stats:', error);
    alert('Failed to download stats. Please try again.');
  }
}