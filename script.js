// Constants
const API_BASE_URL = 'http://51.44.25.48/api';
const ENDPOINTS = {
    SALES: `${API_BASE_URL}/sales`,
    COFFEE_STATS: `${API_BASE_URL}/stats/coffee`,
    DAILY_STATS: `${API_BASE_URL}/stats/daily`
};

// DOM Elements
const salesTable = document.getElementById('salesTable');
const saleForm = document.getElementById('saleForm');
const saleModal = document.getElementById('saleModal');
const confirmModal = document.getElementById('confirmModal');
const modalTitle = document.getElementById('modalTitle');
const addSaleBtn = document.getElementById('addSaleBtn');
const refreshBtn = document.getElementById('refreshBtn');
const closeModalBtn = document.querySelector('.close');
const cancelBtn = document.getElementById('cancelBtn');
const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
const deleteCancelBtn = document.getElementById('deleteCancelBtn');
const applyFiltersBtn = document.getElementById('applyFilters');
const clearFiltersBtn = document.getElementById('clearFilters');
const coffeeStatsContainer = document.getElementById('coffeeStats');
const toastContainer = document.getElementById('toastContainer');

// Form Elements
const saleIdInput = document.getElementById('saleId');
const coffeeNameInput = document.getElementById('coffeeNameInput');
const moneyInput = document.getElementById('moneyInput');
const cashTypeInput = document.getElementById('cashTypeInput');
const cardInput = document.getElementById('cardInput');
const datetimeInput = document.getElementById('datetimeInput');

// Filter Elements
const dateFilter = document.getElementById('dateFilter');
const coffeeFilter = document.getElementById('coffeeFilter');
const cardFilter = document.getElementById('cardFilter');

// Summary Elements
const totalSalesEl = document.getElementById('totalSales');
const todaySalesEl = document.getElementById('todaySales');
const avgSaleEl = document.getElementById('avgSale');

// State Variables
let salesData = [];
let coffeeTypes = new Set();
let deleteId = null;
let isEditing = false;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    loadSalesData();
    loadCoffeeStats();
    setupEventListeners();
    updateFormValidation();
});

// Event Listeners Setup
function setupEventListeners() {
    // Button clicks
    addSaleBtn.addEventListener('click', openAddSaleModal);
    refreshBtn.addEventListener('click', refreshData);
    closeModalBtn.addEventListener('click', closeModal);
    cancelBtn.addEventListener('click', closeModal);
    deleteCancelBtn.addEventListener('click', closeConfirmModal);
    deleteConfirmBtn.addEventListener('click', confirmDelete);
    applyFiltersBtn.addEventListener('click', applyFilters);
    clearFiltersBtn.addEventListener('click', clearFilters);

    // Form submissions
    saleForm.addEventListener('submit', handleFormSubmit);

    // Form changes
    cashTypeInput.addEventListener('change', updateFormValidation);
}

// Data Loading Functions
async function loadSalesData() {
    try {
        // Build query string from filters
        let queryParams = new URLSearchParams();

        if (dateFilter.value) {
            queryParams.append('date', dateFilter.value);
        }

        if (coffeeFilter.value) {
            queryParams.append('coffee_name', coffeeFilter.value);
        }

        if (cardFilter.value) {
            queryParams.append('card', cardFilter.value);
        }

        const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';

        // Fetch data
        const response = await fetch(`${ENDPOINTS.SALES}${queryString}`);
        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to load sales data');
        }

        salesData = result.data;
        renderSalesTable(salesData);
        updateSalesSummary(salesData);
        updateCoffeeFilterOptions(salesData);

    } catch (error) {
        showToast('error', `Error loading sales data: ${error.message}`);
        console.error('Error loading sales data:', error);
        renderSalesTable([]);
    }
}
// Improved error handling for loadCoffeeStats function
async function loadCoffeeStats() {
    try {
        const response = await fetch(ENDPOINTS.COFFEE_STATS);

        // Check if response is OK before trying to parse JSON
        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to load coffee statistics');
        }

        // Check if data is available and is an array
        if (!Array.isArray(result.data) || result.data.length === 0) {
            coffeeStatsContainer.innerHTML = '<p class="empty-stats">No coffee sales data available</p>';
            return;
        }

        renderCoffeeStats(result.data);

    } catch (error) {
        console.error('Error loading coffee stats:', error);
        showToast('error', `Error loading coffee stats: ${error.message}`);
        coffeeStatsContainer.innerHTML = '<p class="error-message">Failed to load coffee statistics</p>';
    }
}

// Improved renderCoffeeStats function to handle data type issues
function renderCoffeeStats(stats) {
    if (!stats || !Array.isArray(stats) || stats.length === 0) {
        coffeeStatsContainer.innerHTML = '<p class="empty-stats">No coffee sales data available</p>';
        return;
    }

    coffeeStatsContainer.innerHTML = stats.map(stat => {
        // Ensure values are properly converted to numbers
        const count = parseInt(stat.count, 10) || 0;
        const totalSales = parseFloat(stat.total_sales) || 0;

        return `
        <div class="coffee-stat-item">
            <span class="coffee-name">${stat.coffee_name || 'Unknown'}</span>
            <div>
                <span class="coffee-count">${count}</span>
                <span class="coffee-sales">$${totalSales.toFixed(2)}</span>
            </div>
        </div>
        `;
    }).join('');
}

// Rendering Functions
function renderSalesTable(sales) {
    const tbody = salesTable.querySelector('tbody');

    if (sales.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="empty-table">No sales data found. Try adding some sales or adjusting your filters.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = sales.map(sale => `
        <tr data-id="${sale.id}">
            <td>${sale.id}</td>
            <td>${formatDateTime(sale.datetime)}</td>
            <td>${sale.cash_type}</td>
            <td>${sale.card || '-'}</td>
            <td>$${parseFloat(sale.money).toFixed(2)}</td>
            <td>${sale.coffee_name}</td>
            <td class="actions-cell">
                <button class="action-btn edit-btn" onclick="openEditSaleModal(${sale.id})">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="action-btn delete-btn" onclick="openDeleteConfirmModal(${sale.id})">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function updateCoffeeFilterOptions(sales) {
    // Extract unique coffee types
    const uniqueCoffees = [...new Set(sales.map(sale => sale.coffee_name))];

    // Save current selection
    const currentSelection = coffeeFilter.value;

    // Populate dropdown
    coffeeFilter.innerHTML = `<option value="">All Types</option>`;
    uniqueCoffees.sort().forEach(coffee => {
        coffeeFilter.innerHTML += `<option value="${coffee}">${coffee}</option>`;
    });

    // Restore selection if it still exists
    if (currentSelection && uniqueCoffees.includes(currentSelection)) {
        coffeeFilter.value = currentSelection;
    }
}

function updateSalesSummary(sales) {
    if (sales.length === 0) {
        totalSalesEl.textContent = '0';
        todaySalesEl.textContent = '0';
        avgSaleEl.textContent = '$0.00';
        return;
    }

    // Total number of sales
    totalSalesEl.textContent = sales.length;

    // Today's sales count
    const today = new Date().toISOString().split('T')[0];
    const todayCount = sales.filter(sale =>
        sale.datetime.startsWith(today)
    ).length;
    todaySalesEl.textContent = todayCount;

    // Average sale amount
    const totalAmount = sales.reduce((sum, sale) => sum + parseFloat(sale.money), 0);
    const average = sales.length > 0 ? totalAmount / sales.length : 0;
    avgSaleEl.textContent = `$${average.toFixed(2)}`;
}

// Form Handling Functions
function openAddSaleModal() {
    isEditing = false;
    modalTitle.textContent = 'Add New Sale';
    resetForm();

    // Set default date to current time
    const now = new Date();
    const localDatetime = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
    datetimeInput.value = localDatetime;

    saleModal.style.display = 'flex';
}

function openEditSaleModal(id) {
    isEditing = true;
    const sale = salesData.find(s => s.id === id);
    if (!sale) {
        showToast('error', 'Sale not found');
        return;
    }

    modalTitle.textContent = 'Edit Sale';

    // Populate form
    saleIdInput.value = sale.id;
    coffeeNameInput.value = sale.coffee_name;
    moneyInput.value = parseFloat(sale.money);
    cashTypeInput.value = sale.cash_type;
    cardInput.value = sale.card || '';

    // Format datetime for the input
    if (sale.datetime) {
        const dateObj = new Date(sale.datetime);
        const localDatetime = new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
        datetimeInput.value = localDatetime;
    }

    updateFormValidation();
    saleModal.style.display = 'flex';
}

function openDeleteConfirmModal(id) {
    deleteId = id;
    confirmModal.style.display = 'flex';
}

function closeModal() {
    saleModal.style.display = 'none';
}

function closeConfirmModal() {
    confirmModal.style.display = 'none';
    deleteId = null;
}

function resetForm() {
    saleForm.reset();
    saleIdInput.value = '';
    updateFormValidation();
}

function updateFormValidation() {
    // Show/hide card input based on payment type
    const isCard = cashTypeInput.value === 'card';
    cardInput.required = isCard;
    const cardField = document.querySelector('.card-field');

    if (isCard) {
        cardField.style.display = 'block';
    } else {
        cardField.style.display = 'none';
        cardInput.value = '';
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();

    try {
        const formData = {
            coffee_name: coffeeNameInput.value,
            money: parseFloat(moneyInput.value),
            cash_type: cashTypeInput.value,
            card: cashTypeInput.value === 'card' ? cardInput.value : '',
        };

        // Add datetime if specified
        if (datetimeInput.value) {
            formData.datetime = new Date(datetimeInput.value).toISOString();
        }

        // Determine if this is an add or update operation
        let url = ENDPOINTS.SALES;
        let method = 'POST';

        if (isEditing) {
            url = `${ENDPOINTS.SALES}/${saleIdInput.value}`;
            method = 'PUT';
        }

        // Send request
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to save sale');
        }

        // Show success message and close modal
        showToast('success', isEditing ? 'Sale updated successfully' : 'Sale added successfully');
        closeModal();
        refreshData();

    } catch (error) {
        showToast('error', `Error saving sale: ${error.message}`);
        console.error('Error saving sale:', error);
    }
}

// Other Operations
async function confirmDelete() {
    if (!deleteId) return;

    try {
        const response = await fetch(`${ENDPOINTS.SALES}/${deleteId}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Failed to delete sale');
        }

        showToast('success', 'Sale deleted successfully');
        closeConfirmModal();
        refreshData();

    } catch (error) {
        showToast('error', `Error deleting sale: ${error.message}`);
        console.error('Error deleting sale:', error);
        closeConfirmModal();
    }
}

function refreshData() {
    loadSalesData();
    loadCoffeeStats();
}

function applyFilters() {
    loadSalesData();
}

function clearFilters() {
    dateFilter.value = '';
    coffeeFilter.value = '';
    cardFilter.value = '';
    loadSalesData();
}

// Utility Functions
function formatDateTime(dateStr) {
    if (!dateStr) return '-';

    const options = {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };

    return new Date(dateStr).toLocaleString(undefined, options);
}
// Updated Toast Functions
function showToast(type, message) {
    // Validate toast type
    const validTypes = ['success', 'error', 'warning', 'info'];
    if (!validTypes.includes(type)) {
        type = 'info'; // Default fallback
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`; // Use specific class for styling

    // Icon mapping for different toast types
    const iconMap = {
        'success': 'check-circle',
        'error': 'exclamation-circle',
        'warning': 'exclamation-triangle',
        'info': 'info-circle'
    };

    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${iconMap[type]}"></i>
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close">
            <i class="fas fa-times"></i>
        </button>
    `;

    // Add close button functionality
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    });

    toastContainer.appendChild(toast);

    // Trigger entrance animation
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // Auto-remove after 5 seconds
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, 300);
    }, 5000);
}
// Make functions available globally for the onclick attributes
window.openEditSaleModal = openEditSaleModal;
window.openDeleteConfirmModal = openDeleteConfirmModal;