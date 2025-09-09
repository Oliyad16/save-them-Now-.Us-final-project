// Global variables
let map;
let markers = [];
let missingPersonsData = [];
let filteredData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeMap();
    loadMissingPersonsData();
    setupEventListeners();
});

// Initialize the Leaflet map
function initializeMap() {
    // Center the map on the United States
    map = L.map('map').setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 18
    }).addTo(map);
}

// Load missing persons data from the API
async function loadMissingPersonsData() {
    try {
        const response = await fetch('/api/missing-persons');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        missingPersonsData = await response.json();
        filteredData = [...missingPersonsData];
        
        displayMarkersOnMap();
        updateStats();
        analyzeDataForSafety();
        
    } catch (error) {
        console.error('Error loading missing persons data:', error);
        showError('Failed to load missing persons data. Please try again later.');
    }
}

// Display markers on the map
function displayMarkersOnMap() {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    filteredData.forEach(person => {
        if (person.latitude && person.longitude) {
            const marker = createMarker(person);
            markers.push(marker);
            marker.addTo(map);
        }
    });
}

// Create a marker for a missing person
function createMarker(person) {
    const markerColor = getMarkerColor(person.category);
    
    // Create custom icon
    const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: ${markerColor}; width: 20px; height: 20px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    const marker = L.marker([person.latitude, person.longitude], { icon: customIcon });
    
    // Create popup content
    const popupContent = createPopupContent(person);
    marker.bindPopup(popupContent);
    
    return marker;
}

// Get marker color based on category
function getMarkerColor(category) {
    switch (category) {
        case 'Missing Adults':
            return '#e74c3c';
        case 'Missing Children':
            return '#f39c12';
        case 'Missing Veterans':
            return '#9b59b6';
        default:
            return '#3498db';
    }
}

// Create popup content for a marker
function createPopupContent(person) {
    const statusClass = person.status.toLowerCase().includes('cold') ? 'cold-case' : 'active';
    
    return `
        <div class="popup-content">
            <h3>${person.category}</h3>
            <p><strong>Location:</strong> ${person.location}</p>
            <p><strong>Date:</strong> ${person.date}</p>
            <p><strong>Reported Missing:</strong> ${person.reportedMissing}</p>
            <p><strong>Status:</strong> <span class="status ${statusClass}">${person.status}</span></p>
            <button class="tip-btn" onclick="openTipModal(${person.id})">Submit a Tip</button>
        </div>
    `;
}

// Update statistics
function updateStats() {
    const totalCount = filteredData.length;
    const activeCount = filteredData.filter(person => 
        !person.status.toLowerCase().includes('cold')
    ).length;
    
    // Format numbers with commas for readability
    document.getElementById('totalCount').textContent = totalCount.toLocaleString();
    document.getElementById('activeCount').textContent = activeCount.toLocaleString();
    
    // Add national context information
    updateNationalContext();
}

// Add national context information
function updateNationalContext() {
    const existingContext = document.getElementById('nationalContext');
    if (existingContext) {
        existingContext.remove();
    }
    
    const contextDiv = document.createElement('div');
    contextDiv.id = 'nationalContext';
    contextDiv.className = 'national-context';
    contextDiv.innerHTML = `
        <h4>National Context</h4>
        <p><strong>~600,000</strong> people reported missing annually in the US</p>
        <p><strong>~87,000-100,000</strong> active cases nationwide</p>
        <p class="context-note">The map above shows a subset of publicly available cases for awareness purposes.</p>
    `;
    
    const statsDiv = document.querySelector('.stats');
    statsDiv.appendChild(contextDiv);
}

// Analyze data for safety insights
function analyzeDataForSafety() {
    if (missingPersonsData.length === 0) return;
    
    // Age analysis
    const ageGroups = analyzeAgeGroups();
    renderChart('ageChart', ageGroups, 'Age Groups');
    
    // Gender analysis
    const genderData = analyzeGender();
    renderChart('genderChart', genderData, 'Gender');
    
    // Location analysis
    const countyData = analyzeCounties();
    renderChart('countyChart', countyData, 'Counties');
    
    const stateData = analyzeStates();
    renderChart('stateChart', stateData, 'States');
    
    // Temporal analysis
    const temporalData = analyzeTemporal();
    renderChart('temporalChart', temporalData, 'Monthly Trends');
    
    // Generate safety insights
    generateSafetyInsights();
}

function analyzeAgeGroups() {
    const ageGroups = {
        'Children (0-12)': 0,
        'Teens (13-17)': 0,
        'Young Adults (18-25)': 0,
        'Adults (26-50)': 0,
        'Seniors (50+)': 0
    };
    
    missingPersonsData.forEach(person => {
        const ageStr = person.missing_age || person.age || '0';
        const age = parseInt(ageStr.replace(/[^0-9]/g, ''));
        
        if (age <= 12) ageGroups['Children (0-12)']++;
        else if (age <= 17) ageGroups['Teens (13-17)']++;
        else if (age <= 25) ageGroups['Young Adults (18-25)']++;
        else if (age <= 50) ageGroups['Adults (26-50)']++;
        else ageGroups['Seniors (50+)']++;
    });
    
    return ageGroups;
}

function analyzeGender() {
    const genderData = {};
    missingPersonsData.forEach(person => {
        const gender = person.biological_sex || person.gender || 'Unknown';
        genderData[gender] = (genderData[gender] || 0) + 1;
    });
    return genderData;
}

function analyzeCounties() {
    const countyData = {};
    missingPersonsData.forEach(person => {
        const county = person.county || 'Unknown';
        countyData[county] = (countyData[county] || 0) + 1;
    });
    
    // Return top 10 counties
    return Object.fromEntries(
        Object.entries(countyData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
    );
}

function analyzeStates() {
    const stateData = {};
    missingPersonsData.forEach(person => {
        const state = person.state || 'Unknown';
        stateData[state] = (stateData[state] || 0) + 1;
    });
    
    // Return top 10 states
    return Object.fromEntries(
        Object.entries(stateData)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
    );
}

function analyzeTemporal() {
    const monthData = {};
    missingPersonsData.forEach(person => {
        const dateStr = person.dlc || person.date || '';
        if (dateStr.includes('/')) {
            const month = dateStr.split('/')[0];
            const monthName = getMonthName(parseInt(month));
            monthData[monthName] = (monthData[monthName] || 0) + 1;
        }
    });
    return monthData;
}

function getMonthName(monthNum) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthNum - 1] || 'Unknown';
}

function renderChart(containerId, data, title) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const maxValue = Math.max(...Object.values(data));
    
    let html = `<div style="margin-bottom: 1rem; font-weight: 600; color: #2c3e50;">${title}</div>`;
    
    Object.entries(data).forEach(([label, value]) => {
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        html += `
            <div class="chart-bar">
                <div class="chart-label">${label}</div>
                <div class="chart-value" style="width: ${percentage}%;"></div>
                <div class="chart-number">${value}</div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function generateSafetyInsights() {
    const container = document.getElementById('safetyInsights');
    if (!container || missingPersonsData.length === 0) return;
    
    const ageGroups = analyzeAgeGroups();
    const genderData = analyzeGender();
    const stateData = analyzeStates();
    
    let insights = [];
    
    // Age-based insights
    const teenCount = ageGroups['Teens (13-17)'];
    const childCount = ageGroups['Children (0-12)'];
    if (teenCount + childCount > missingPersonsData.length * 0.5) {
        insights.push('⚠️ Over 50% of cases involve minors - increased supervision and safety education crucial');
    }
    
    // Gender insights
    const femaleCount = genderData['Female'] || 0;
    if (femaleCount > missingPersonsData.length * 0.6) {
        insights.push('🚨 Females represent majority of cases - consider gender-specific safety precautions');
    }
    
    // Location insights
    const topStates = Object.keys(stateData).slice(0, 3);
    if (topStates.length > 0) {
        insights.push(`📍 Top risk areas: ${topStates.join(', ')} - extra vigilance needed in these regions`);
    }
    
    // General safety tips
    insights.push('📱 Always share location with trusted contacts when out alone');
    insights.push('🏠 Establish regular check-in times with family members');
    insights.push('🚶 Avoid isolated areas, especially during late hours');
    insights.push('📋 Keep updated photos and identifying information readily available');
    
    let html = '<div style="margin-bottom: 1rem; font-weight: 600; color: #2c3e50;">Key Safety Insights</div>';
    insights.forEach(insight => {
        html += `<div class="insight-item">${insight}</div>`;
    });
    
    container.innerHTML = html;
}

// Setup event listeners
function setupEventListeners() {
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    
    searchBtn.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    // Filter functionality
    const categoryFilter = document.getElementById('categoryFilter');
    const statusFilter = document.getElementById('statusFilter');
    
    categoryFilter.addEventListener('change', applyFilters);
    statusFilter.addEventListener('change', applyFilters);

    // Modal functionality
    const modal = document.getElementById('tipModal');
    const closeModal = document.getElementById('closeModal');
    const tipForm = document.getElementById('tipForm');
    
    closeModal.addEventListener('click', closeTipModal);
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeTipModal();
        }
    });
    
    tipForm.addEventListener('submit', submitTip);
    
    // Analysis tab functionality
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });
}

// Switch analysis tabs
function switchTab(tabName) {
    // Remove active class from all tabs and buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Add active class to selected tab and button
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// Perform search
function performSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    if (searchTerm === '') {
        filteredData = [...missingPersonsData];
    } else {
        filteredData = missingPersonsData.filter(person => 
            person.location.toLowerCase().includes(searchTerm) ||
            person.category.toLowerCase().includes(searchTerm) ||
            person.status.toLowerCase().includes(searchTerm)
        );
    }
    
    applyFilters();
}

// Apply filters
function applyFilters() {
    const categoryFilter = document.getElementById('categoryFilter').value;
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = [...filteredData];
    
    if (categoryFilter) {
        filtered = filtered.filter(person => person.category === categoryFilter);
    }
    
    if (statusFilter) {
        if (statusFilter === 'Active') {
            filtered = filtered.filter(person => !person.status.toLowerCase().includes('cold'));
        } else if (statusFilter === 'Cold Case') {
            filtered = filtered.filter(person => person.status.toLowerCase().includes('cold'));
        }
    }
    
    filteredData = filtered;
    displayMarkersOnMap();
    updateStats();
}

// Open tip modal
function openTipModal(personId) {
    const modal = document.getElementById('tipModal');
    modal.style.display = 'block';
    modal.dataset.personId = personId;
}

// Close tip modal
function closeTipModal() {
    const modal = document.getElementById('tipModal');
    modal.style.display = 'none';
    document.getElementById('tipForm').reset();
}

// Submit tip
async function submitTip(e) {
    e.preventDefault();
    
    const modal = document.getElementById('tipModal');
    const personId = modal.dataset.personId;
    
    const formData = new FormData(e.target);
    const tipData = {
        personId: personId,
        name: formData.get('name'),
        email: formData.get('email'),
        message: formData.get('message'),
        timestamp: new Date().toISOString()
    };
    
    try {
        const response = await fetch('/api/tips', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(tipData)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        showSuccess('Thank you for your tip. It has been submitted successfully.');
        closeTipModal();
        
    } catch (error) {
        console.error('Error submitting tip:', error);
        showError('Failed to submit tip. Please try again later.');
    }
}

// Show success message
function showSuccess(message) {
    // Create a simple success notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #27ae60;
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 3000;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}

// Show error message
function showError(message) {
    // Create a simple error notification
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #e74c3c;
        color: white;
        padding: 1rem 2rem;
        border-radius: 5px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        z-index: 3000;
        font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        document.body.removeChild(notification);
    }, 5000);
}

// Reset filters
function resetFilters() {
    document.getElementById('searchInput').value = '';
    document.getElementById('categoryFilter').value = '';
    document.getElementById('statusFilter').value = '';
    
    filteredData = [...missingPersonsData];
    displayMarkersOnMap();
    updateStats();
}

