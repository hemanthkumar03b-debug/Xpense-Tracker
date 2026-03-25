// --- Theme Management ---
window.applyTheme = function(theme) {
    if (theme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) themeBtn.innerHTML = "<i class='bx bxs-sun'></i>";
    } else {
        document.body.removeAttribute('data-theme');
        const themeBtn = document.getElementById('theme-toggle');
        if (themeBtn) themeBtn.innerHTML = "<i class='bx bx-moon'></i>";
    }
    // Refresh visual components after theme change
    if (typeof window.renderExpenseDonut === 'function') window.renderExpenseDonut();
    if (typeof window.initAnalytics === 'function' && document.getElementById('spendingLineChart')) window.initAnalytics(); 
};

// --- Dashboard Logic ---
window.renderDashboard = function() {
    if (!document.getElementById('total-income')) return;

    const income = window.transactions.filter(t => t.type === 'Income').reduce((acc, t) => acc + t.amount, 0);
    const expense = window.transactions.filter(t => t.type === 'Expense').reduce((acc, t) => acc + t.amount, 0);
    
    document.getElementById('total-income').textContent = window.formatCurrency(income);
    document.getElementById('total-expense').textContent = window.formatCurrency(expense);
    document.getElementById('net-balance').textContent = window.formatCurrency(income - expense);
    
    const percent = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;
    const boundedPerc = Math.max(0, percent);
    document.getElementById('savings-percent').textContent = boundedPerc;
    document.getElementById('savings-progress').style.width = `${boundedPerc}%`;
    
    window.updateChangeLabels();
    window.renderSmartInsight();
    window.applyFilters();
};

window.updateChangeLabels = function() {
    const curMonth = new Date().getMonth();
    const lastMonth = curMonth === 0 ? 11 : curMonth - 1;
    
    const getMonthTotal = (type, month) => window.transactions
        .filter(t => t.type === type && new Date(t.date).getMonth() === month)
        .reduce((acc, t) => acc + t.amount, 0);
    
    const incomeChangeEl = document.getElementById('income-change');
    if (incomeChangeEl) {
        const cur = getMonthTotal('Income', curMonth);
        const last = getMonthTotal('Income', lastMonth);
        const diff = last > 0 ? ((cur - last) / last * 100).toFixed(1) : '0';
        incomeChangeEl.textContent = `${diff >= 0 ? '+' : ''}${diff}%`;
    }

    const expenseChangeEl = document.getElementById('expense-change');
    if (expenseChangeEl) {
        const cur = getMonthTotal('Expense', curMonth);
        const last = getMonthTotal('Expense', lastMonth);
        const diff = last > 0 ? ((cur - last) / last * 100).toFixed(1) : '0';
        expenseChangeEl.textContent = `${diff >= 0 ? '+' : ''}${diff}%`;
    }
};

window.renderSmartInsight = function() {
    const insightEl = document.getElementById('smart-insight-text');
    if(!insightEl) return;
    if(window.transactions.length < 3) {
        insightEl.textContent = "Keep tracking your expenses to see spending patterns.";
        return;
    }
    const expenses = window.transactions.filter(t => t.type === 'Expense');
    const m = {};
    expenses.forEach(e => m[e.category] = (m[e.category] || 0) + e.amount);
    let topCat = 'None', max = 0;
    for(let c in m) { if(m[c]>max) { max=m[c]; topCat=c; } }
    insightEl.innerHTML = `You've spent the most on <strong>${topCat}</strong> so far. Watch your budget!`;
};

window.applyFilters = function() {
    const searchInput = document.getElementById('search-tx');
    if (!searchInput) return;

    const term = searchInput.value.toLowerCase();
    const cat = document.getElementById('filter-category').value;

    window.filteredTransactions = window.transactions.filter(tx => {
        const matchTerm = tx.desc.toLowerCase().includes(term);
        const matchCat = cat === 'All' || tx.category === cat;
        return matchTerm && matchCat;
    });

    window.filteredTransactions.sort((a,b) => new Date(b.date) - new Date(a.date));
    window.currentPage = 1;
    if (typeof window.renderTable === 'function') window.renderTable();
};

// --- Analytics Logic ---
window.analyticsFilter = 'this-month';

window.initAnalytics = function() {
    if (!document.getElementById('spendingLineChart')) return;
    
    // Check if filter exists, otherwise use state
    const filterGroup = document.getElementById('analytics-filter-group');
    const activeBtn = filterGroup?.querySelector('.active-filter');
    const filter = activeBtn ? activeBtn.getAttribute('data-filter') : window.analyticsFilter;

    const now = new Date();
    let start = new Date(now.getFullYear(), now.getMonth(), 1);
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (filter === 'last-3-months') {
        start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    } else if (filter === 'all') {
        start = new Date(0);
    }
    
    const filtered = window.transactions.filter(t => {
        const d = new Date(t.date);
        return d >= start && d <= end;
    });
    
    const expenses = filtered.filter(t => t.type === 'Expense');
    const totalSpent = expenses.reduce((a, b) => a + b.amount, 0);
    
    // Update Summaries
    if (document.getElementById('analytics-total-spent')) 
        document.getElementById('analytics-total-spent').textContent = window.formatCurrency(totalSpent);
    
    const avgEl = document.getElementById('analytics-avg-daily');
    if (avgEl) {
        const dates = expenses.map(t => new Date(t.date));
        if (dates.length > 0) {
            const minDate = new Date(Math.min(...dates));
            const maxDate = new Date(Math.max(...dates));
            const diffDays = Math.ceil((maxDate - minDate) / (1000 * 3600 * 24)) + 1;
            avgEl.textContent = window.formatCurrency(totalSpent / diffDays);
        } else avgEl.textContent = window.formatCurrency(0);
    }

    // Top Category List in Analytics
    const catTotals = {};
    expenses.forEach(e => catTotals[e.category] = (catTotals[e.category]||0) + e.amount);
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    
    const topCatName = sorted.length > 0 ? sorted[0][0] : 'N/A';
    const topCatEl = document.getElementById('analytics-top-category');
    if (topCatEl) topCatEl.textContent = topCatName;

    const topCatPercentEl = document.getElementById('top-cat-percent');
    if (topCatPercentEl && totalSpent > 0 && sorted.length > 0) {
        topCatPercentEl.textContent = Math.round((sorted[0][1] / totalSpent) * 100);
    }

    const listEl = document.getElementById('top-categories-list');
    if (listEl) {
        // Icon mapping
        const catIcons = {
            'Bills': { icon: 'bx-receipt', class: 'icon-bills' },
            'Food': { icon: 'bx-restaurant', class: 'icon-food' },
            'Shopping': { icon: 'bx-shopping-bag', class: 'icon-shopping' },
            'Transport': { icon: 'bx-car', class: 'icon-transport' },
            'Salary': { icon: 'bx-wallet', class: 'icon-bills' }, // Reusing bills style for salary
            'Other': { icon: 'bx-dots-horizontal-rounded', class: 'icon-other' }
        };

        listEl.innerHTML = sorted.slice(0, 4).map(([cat, amt]) => {
            const config = catIcons[cat] || catIcons['Other'];
            return `
                <div class="cat-progress-item">
                    <div class="cat-progress-header">
                        <div class="cat-name-wrap">
                            <div class="cat-icon ${config.class}"><i class='bx ${config.icon}'></i></div>
                            <span>${cat}</span>
                        </div>
                        <span class="cat-amount">${window.formatCurrency(amt)}</span>
                    </div>
                    <div class="cat-bar-bg">
                        <div class="cat-bar-fill" style="width: ${totalSpent > 0 ? (amt/totalSpent*100) : 0}%"></div>
                    </div>
                </div>`;
        }).join('');
    }

    // Call Chart JS function
    if (typeof window.renderAnalyticsCharts === 'function') {
        window.renderAnalyticsCharts(filtered);
    }
};

// --- Custom Filter Logic ---
window.applyCustomFilter = function() {
    const from = document.getElementById('filter-date-from').value;
    const to = document.getElementById('filter-date-to').value;
    
    if (!from || !to) return alert("Please select both dates.");
    
    const startDate = new Date(from);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(to);
    endDate.setHours(23,59,59,999);
    
    const filtered = window.transactions.filter(t => {
        const d = new Date(t.date);
        return d >= startDate && d <= endDate;
    });

    // Update headers and charts manually for custom range
    const expenses = filtered.filter(t => t.type === 'Expense');
    const totalSpent = expenses.reduce((a, b) => a + b.amount, 0);
    
    if (document.getElementById('analytics-total-spent')) 
        document.getElementById('analytics-total-spent').textContent = window.formatCurrency(totalSpent);
        
    if (typeof window.renderAnalyticsCharts === 'function') window.renderAnalyticsCharts(filtered);
    // Refresh the rest of the list
    initAnalyticsWithData(filtered, totalSpent);
};

function initAnalyticsWithData(filtered, totalSpent) {
    const expenses = filtered.filter(t => t.type === 'Expense');
    const avgEl = document.getElementById('analytics-avg-daily');
    if (avgEl) {
        const dates = expenses.map(t => new Date(t.date));
        if (dates.length > 1) {
            const diffDays = Math.ceil((Math.max(...dates) - Math.min(...dates)) / (1000 * 3600 * 24)) + 1;
            avgEl.textContent = window.formatCurrency(totalSpent / diffDays);
        } else avgEl.textContent = window.formatCurrency(totalSpent);
    }
    const catTotals = {};
    expenses.forEach(e => catTotals[e.category] = (catTotals[e.category]||0) + e.amount);
    const sorted = Object.entries(catTotals).sort((a,b) => b[1] - a[1]);
    
    const topCatName = sorted.length > 0 ? sorted[0][0] : 'N/A';
    if (document.getElementById('analytics-top-category')) 
        document.getElementById('analytics-top-category').textContent = topCatName;

    const topCatPercentEl = document.getElementById('top-cat-percent');
    if (topCatPercentEl && totalSpent > 0 && sorted.length > 0) {
        topCatPercentEl.textContent = Math.round((sorted[0][1] / totalSpent) * 100);
    }

    const listEl = document.getElementById('top-categories-list');
    if (listEl) {
        const catIcons = {
            'Bills': { icon: 'bx-receipt', class: 'icon-bills' },
            'Food': { icon: 'bx-restaurant', class: 'icon-food' },
            'Shopping': { icon: 'bx-shopping-bag', class: 'icon-shopping' },
            'Transport': { icon: 'bx-car', class: 'icon-transport' },
            'Salary': { icon: 'bx-wallet', class: 'icon-bills' },
            'Other': { icon: 'bx-dots-horizontal-rounded', class: 'icon-other' }
        };

        listEl.innerHTML = sorted.slice(0, 4).map(([cat, amt]) => {
            const config = catIcons[cat] || catIcons['Other'];
            return `
                <div class="cat-progress-item">
                    <div class="cat-progress-header">
                        <div class="cat-name-wrap">
                            <div class="cat-icon ${config.class}"><i class='bx ${config.icon}'></i></div>
                            <span>${cat}</span>
                        </div>
                        <span class="cat-amount">${window.formatCurrency(amt)}</span>
                    </div>
                    <div class="cat-bar-bg">
                        <div class="cat-bar-fill" style="width: ${totalSpent > 0 ? (amt/totalSpent*100) : 0}%"></div>
                    </div>
                </div>`;
        }).join('');
    }
}

// --- Export Function ---
window.exportData = function() {
    if (window.transactions.length === 0) return alert("Nothing to export yet.");
    let csv = "ID,Date,Description,Category,Type,Amount\n";
    window.transactions.forEach(t => csv += `${t.id},${t.date},"${t.desc.replace(/"/g, '""')}",${t.category},${t.type},${t.amount}\n`);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense_report_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
};

// --- Initialization & Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Determine which page we are on
    const isDashboard = !!document.getElementById('add-tx-form');
    const isAnalytics = !!document.getElementById('spendingLineChart');

    if (isDashboard) window.renderDashboard();
    if (isAnalytics) window.initAnalytics();

    // Theme toggle
    document.getElementById('theme-toggle')?.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') === 'dark';
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('xpense_theme', newTheme);
        window.applyTheme(newTheme);
    });

    // Form submission
    document.getElementById('add-tx-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const idInput = document.getElementById('tx-id');
        const tx = {
            id: idInput.value || Date.now().toString(),
            amount: parseFloat(document.getElementById('tx-amount').value),
            type: document.getElementById('tx-type').value,
            category: document.getElementById('tx-category').value,
            date: document.getElementById('tx-date').value,
            desc: document.getElementById('tx-desc').value
        };
        if (idInput.value) {
            const idx = window.transactions.findIndex(t => t.id === tx.id);
            if (idx !== -1) window.transactions[idx] = tx;
        } else window.transactions.unshift(tx);

        window.saveData();
        e.target.reset();
        idInput.value = '';
        if (document.getElementById('submit-btn')) document.getElementById('submit-btn').innerHTML = "<i class='bx bx-save'></i> Add Transaction";
        if (document.getElementById('form-title')) document.getElementById('form-title').innerText = "Add Transaction";
        if (document.getElementById('cancel-edit-btn')) document.getElementById('cancel-edit-btn').style.display = 'none';
        window.renderDashboard();
    });

    document.getElementById('search-tx')?.addEventListener('input', window.applyFilters);
    document.getElementById('filter-category')?.addEventListener('change', window.applyFilters);
    
    document.getElementById('prev-page')?.addEventListener('click', () => { if(window.currentPage > 1) { window.currentPage--; window.renderTable(); }});
    document.getElementById('next-page')?.addEventListener('click', () => { 
        if(window.currentPage < Math.ceil(window.filteredTransactions.length/window.ITEMS_PER_PAGE)) { window.currentPage++; window.renderTable(); }
    });

    // Analytics Filters
    document.getElementById('analytics-filter-group')?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        const group = document.getElementById('analytics-filter-group');
        group.querySelectorAll('.btn').forEach(b => b.classList.remove('active-filter'));
        btn.classList.add('active-filter');
        
        const customRange = document.getElementById('custom-date-range');
        if (btn.dataset.filter === 'custom') {
            if (customRange) customRange.style.display = 'flex';
        } else {
            if (customRange) customRange.style.display = 'none';
            window.initAnalytics();
        }
    });

    document.getElementById('apply-custom-filter')?.addEventListener('click', window.applyCustomFilter);

    // Mobile Menu
    document.getElementById('mobile-menu-btn')?.addEventListener('click', () => {
        document.getElementById('nav-links').classList.toggle('show');
    });
});

// Run theme check immediately to prevent flash, but after functions are defined
(function() {
    const savedTheme = localStorage.getItem('xpense_theme') || 'light';
    window.applyTheme(savedTheme);
})();
