const API_URL = ''; // Use relative paths
let currentToken = localStorage.getItem('token');
let isLoginMode = true;
let healthChart = null;
let currentFilter = 'all'; // 'all', 'systolic', 'diastolic'
let allReadings = [];

// DOM Elements
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');
const authForm = document.getElementById('auth-form');
const authToggleBtn = document.getElementById('auth-toggle-btn');
const authTitle = document.getElementById('auth-title');
const authSubmit = document.getElementById('auth-submit');
const logoutBtn = document.getElementById('logout-btn');
const readingForm = document.getElementById('reading-form');

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

function showDashboard() {
    authView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    
    // Set default date to now
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    document.getElementById('reading-date').value = now.toISOString().slice(0, 16);

    // Staggered animation refresh
    document.querySelectorAll('#dashboard-view .animate-in').forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight; // trigger reflow
        el.style.animation = null;
    });

    const userEmail = localStorage.getItem('userEmail') || 'User';
    document.getElementById('user-greeting').innerText = `Hello, ${userEmail.split('@')[0]}`;
    loadReadings();
}

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
                timestamp: timestamp
            })
        });

        if (response.ok) {
            document.getElementById('reading-systolic').value = '';
            document.getElementById('reading-diastolic').value = '';
            document.getElementById('reading-bpm').value = '';
            loadReadings();
        } else if (response.status === 401) {
            logoutBtn.click();
        }
    } catch (err) {
        alert('Failed to save reading');
    }
});

async function loadReadings() {
    try {
        const response = await fetch(`${API_URL}/api/readings`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        });
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
