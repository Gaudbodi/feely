const API_URL = ''; // Use relative paths
let currentToken = localStorage.getItem('token');
let isLoginMode = true;
let healthChart = null;
let currentFilter = 'all'; // 'all', 'systolic', 'diastolic'
let allReadings = [];
let viewingOwner = null; // null if own dashboard, or email of the person who shared with you

// DOM Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const authForm = document.getElementById('auth-form');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const logoutBtn = document.getElementById('logout-btn');
const readingForm = document.getElementById('reading-form');

// Sharing Elements
const inviteModal = document.getElementById('invite-modal');
const btnOpenInvite = document.getElementById('btn-open-invite');
const btnCloseModal = document.getElementById('btn-close-modal');
const btnCreateInvite = document.getElementById('btn-create-invite');
const inviteResult = document.getElementById('invite-result');
const inviteTokenDisplay = document.getElementById('invite-token-display');
const sharedWithMeList = document.getElementById('shared-with-me-list');
const accessLogsList = document.getElementById('access-logs-list');

// Initialize
function init() {
    if (currentToken) {
        showDashboard();
    } else {
        showAuth();
    }
}

// View Management
function showAuth() {
    dashboardView.classList.add('hidden');
    authView.classList.remove('hidden');
    authView.querySelector('.card').classList.add('animate-in');
}

function showDashboard(ownerEmail = null) {
    viewingOwner = ownerEmail;
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    
    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('reading-date').value = now.toISOString().slice(0, 16);

    // Refresh animations
    document.querySelectorAll('#dashboard-view .animate-in').forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight; 
        el.style.animation = null;
    });

    const userEmail = localStorage.getItem('userEmail') || 'User';
    const headerTitle = viewingOwner ? `Viewing: ${viewingOwner.split('@')[0]}` : `Hello, ${userEmail.split('@')[0]}`;
    document.getElementById('user-greeting').innerText = headerTitle;

    loadReadings();
    if (!viewingOwner) {
        loadSharingData();
    }
}

// Sharing UI Handlers
btnOpenInvite.addEventListener('click', () => {
    inviteModal.classList.remove('hidden');
    inviteResult.classList.add('hidden');
});

btnCloseModal.addEventListener('click', () => {
    inviteModal.classList.add('hidden');
});

btnCreateInvite.addEventListener('click', async () => {
    const perms = document.getElementById('invite-perms').value;
    const expiry = document.getElementById('invite-expiry').value;

    try {
        const response = await fetch(`${API_URL}/api/invites`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ permissions: perms, expiry_hours: expiry })
        });
        const data = await response.json();
        if (response.ok) {
            inviteResult.classList.remove('hidden');
            inviteTokenDisplay.innerText = data.token;
        }
    } catch (err) {
        alert('Failed to generate invite');
    }
});

async function loadSharingData() {
    // Load Shared with me
    try {
        const sharedResponse = await fetch(`${API_URL}/api/shared-with-me`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const sharedData = await sharedResponse.json();
        
        sharedWithMeList.innerHTML = '';
        if (sharedData.shared && sharedData.shared.length > 0) {
            sharedData.shared.forEach(acc => {
                const item = document.createElement('div');
                item.className = 'shared-account-item';
                item.innerHTML = `
                    <span>${acc.owner_email} (${acc.permissions})</span>
                    <button class="btn-filter" style="background: var(--primary); color: white;" onclick="showDashboard('${acc.owner_email}')">View</button>
                `;
                sharedWithMeList.appendChild(item);
            });
            // Add "Back to Mine" button if viewing shared
            if (viewingOwner) {
                const mineBtn = document.createElement('button');
                mineBtn.className = 'btn-primary';
                mineBtn.style.marginTop = '1rem';
                mineBtn.innerText = 'Back to My Account';
                mineBtn.onclick = () => showDashboard(null);
                sharedWithMeList.appendChild(mineBtn);
            }
        } else {
            sharedWithMeList.innerHTML = '<p>No shared accounts.</p>';
        }

        // Add "Accept Invite" trigger
        const acceptBtn = document.createElement('button');
        acceptBtn.className = 'btn-link';
        acceptBtn.style.marginTop = '0.5rem';
        acceptBtn.innerText = 'Got a token? Click to accept access.';
        acceptBtn.onclick = showAcceptView;
        sharedWithMeList.appendChild(acceptBtn);

        // Load Access Logs
        const logsResponse = await fetch(`${API_URL}/api/access-logs`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        const logsData = await logsResponse.json();
        accessLogsList.innerHTML = '';
        if (logsData.logs && logsData.logs.length > 0) {
            logsData.logs.forEach(log => {
                const logEl = document.createElement('div');
                logEl.className = 'log-entry';
                const time = new Date(log.timestamp).toLocaleString();
                logEl.innerHTML = `<strong>${log.user_email}</strong>: ${log.action} at ${time}`;
                accessLogsList.appendChild(logEl);
            });
        } else {
            accessLogsList.innerHTML = '<p>No logs yet.</p>';
        }

    } catch (err) {
        console.error('Error loading sharing data', err);
    }
}

function showAcceptView() {
    dashboardView.classList.add('hidden');
    document.getElementById('accept-view').classList.remove('hidden');
}

document.getElementById('btn-accept-invite').addEventListener('click', async () => {
    const token = document.getElementById('accept-token-input').value;
    try {
        const response = await fetch(`${API_URL}/api/invites/accept`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({ token: token })
        });
        const data = await response.json();
        if (response.ok) {
            alert('Access accepted!');
            location.reload();
        } else {
            alert(data.detail || 'Failed to accept invite');
        }
    } catch (err) {
        alert('Connection error');
    }
});

// Auth Actions
authToggleBtn.addEventListener('click', () => {
    isLoginMode = !isLoginMode;
    authTitle.innerText = isLoginMode ? 'Welcome Back' : 'Create Account';
    authSubmit.innerText = isLoginMode ? 'Sign In' : 'Sign Up';
    document.getElementById('auth-toggle-text').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    authToggleBtn.innerText = isLoginMode ? 'Sign Up' : 'Sign In';
});

authForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const originalText = authSubmit.innerText;
    
    authSubmit.innerText = 'Processing...';
    authSubmit.disabled = true;

    try {
        let response;
        if (isLoginMode) {
            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);
            response = await fetch(`${API_URL}/token`, { method: 'POST', body: formData });
        } else {
            response = await fetch(`${API_URL}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
        }

        const data = await response.json();
        if (response.ok) {
            localStorage.setItem('token', data.access_token);
            localStorage.setItem('userEmail', email);
            currentToken = data.access_token;
            showDashboard();
        } else {
            alert(data.detail || 'Auth failed');
        }
    } catch (err) {
        alert('Connection error');
    } finally {
        authSubmit.innerText = originalText;
        authSubmit.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    currentToken = null;
    showAuth();
});

// Reading Actions
readingForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const systolic = document.getElementById('reading-systolic').value;
    const diastolic = document.getElementById('reading-diastolic').value;
    const bpm = document.getElementById('reading-bpm').value;
    const dateInput = document.getElementById('reading-date').value;
    
    const timestamp = dateInput ? new Date(dateInput).toISOString() : new Date().toISOString();
    
    try {
        const response = await fetch(`${API_URL}/api/readings`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${currentToken}`
            },
            body: JSON.stringify({
                reading_type: 'Blood Pressure',
                value: `${systolic}/${diastolic}`,
                bpm: bpm,
                timestamp: timestamp,
                owner_email: viewingOwner // If writing to someone else's account
            })
        });

        if (response.ok) {
            document.getElementById('reading-systolic').value = '';
            document.getElementById('reading-diastolic').value = '';
            document.getElementById('reading-bpm').value = '';
            loadReadings();
        } else if (response.status === 401) {
            logoutBtn.click();
        } else {
            const data = await response.json();
            alert(data.detail || 'Failed to save');
        }
    } catch (err) {
        alert('Failed to save reading');
    }
});

async function loadReadings() {
    try {
        const url = viewingOwner 
            ? `${API_URL}/api/readings?owner_email=${viewingOwner}`
            : `${API_URL}/api/readings`;
            
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
        
        if (response.status === 401) {
            logoutBtn.click();
            return;
        }

        const data = await response.json();
        allReadings = data.readings || [];
        allReadings.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        renderChart();
    } catch (err) {
        console.error('Failed to load readings');
    }
}

// Graph Filters
document.querySelectorAll('.btn-filter').forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.id === 'btn-open-invite') return;
        document.querySelectorAll('.btn-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.getAttribute('data-filter');
        renderChart();
    });
});

function renderChart() {
    const readings = allReadings;
    const noData = document.getElementById('no-data');
    const canvas = document.getElementById('healthChart');

    if (!readings || readings.length === 0) {
        noData.classList.remove('hidden');
        canvas.classList.add('hidden');
        return;
    }

    noData.classList.add('hidden');
    canvas.classList.remove('hidden');

    const labels = readings.map(r => new Date(r.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
    
    const datasets = [];
    
    if (currentFilter === 'all' || currentFilter === 'systolic') {
        datasets.push({
            label: 'Systolic',
            data: readings.map(r => parseFloat(r.value.split('/')[0])),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#6366f1'
        });
    }
    
    if (currentFilter === 'all' || currentFilter === 'diastolic') {
        datasets.push({
            label: 'Diastolic',
            data: readings.map(r => parseFloat(r.value.split('/')[1])),
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointBackgroundColor: '#10b981'
        });
    }

    if (healthChart) healthChart.destroy();

    const ctx = canvas.getContext('2d');
    healthChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: true, position: 'top' },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: { grid: { color: '#f1f5f9' }, beginAtZero: false },
                x: { grid: { display: false } }
            },
            interaction: {
                intersect: false,
                mode: 'index',
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}

init();
