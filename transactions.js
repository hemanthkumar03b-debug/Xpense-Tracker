// --- Global State ---
window.transactions = JSON.parse(localStorage.getItem('xpense_tracker_data')) || [];
window.filteredTransactions = [...window.transactions];
window.currentPage = 1;
window.ITEMS_PER_PAGE = 5;

// --- Global Utilities ---
window.saveData = function() {
    localStorage.setItem('xpense_tracker_data', JSON.stringify(window.transactions));
};

window.formatCurrency = function(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount || 0);
};

window.formatDate = function(dateStr) {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? 'N/A' : date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

// --- Table Rendering (Dashboard) ---
window.renderTable = function() {
    const txListEl = document.getElementById('transaction-list');
    const noTxMsg = document.getElementById('no-tx-msg');
    if (!txListEl) return;

    txListEl.innerHTML = '';
    const start = (window.currentPage - 1) * window.ITEMS_PER_PAGE;
    const paginated = window.filteredTransactions.slice(start, start + window.ITEMS_PER_PAGE);

    if (window.filteredTransactions.length === 0) {
        if (txListEl.parentElement.tagName === 'TABLE') txListEl.parentElement.style.display = 'none';
        if (noTxMsg) noTxMsg.style.display = 'block';
    } else {
        if (txListEl.parentElement.tagName === 'TABLE') txListEl.parentElement.style.display = 'table';
        if (noTxMsg) noTxMsg.style.display = 'none';
        
        paginated.forEach(tx => {
            const tr = document.createElement('tr');
            const sign = tx.type === 'Income' ? '+' : '-';
            const amountClass = tx.type === 'Income' ? 'amount-income' : 'amount-expense';
            const badgeClass = `bg-${(tx.category || 'other').toLowerCase()}`;
            
            tr.innerHTML = `
                <td>${window.formatDate(tx.date)}</td>
                <td style="font-weight: 500;">${tx.desc}</td>
                <td><span class="badge ${badgeClass}">${tx.category}</span></td>
                <td class="${amountClass}">${sign}${window.formatCurrency(tx.amount)}</td>
                <td style="text-align: right;">
                    <div class="tx-actions">
                        <button class="action-btn edit" onclick="window.editTx('${tx.id}')" title="Edit"><i class='bx bx-edit-alt'></i></button>
                        <button class="action-btn delete" onclick="window.deleteTx('${tx.id}')" title="Delete"><i class='bx bx-trash'></i></button>
                    </div>
                </td>
            `;
            txListEl.appendChild(tr);
        });
    }
    window.renderPagination();
};

window.renderPagination = function() {
    const pageNumbers = document.getElementById('page-numbers');
    const pageInfo = document.getElementById('page-info');
    const prevBtn = document.getElementById('prev-page');
    const nextBtn = document.getElementById('next-page');
    if (!pageNumbers) return;

    const totalPages = Math.ceil(window.filteredTransactions.length / window.ITEMS_PER_PAGE);
    if (prevBtn) prevBtn.disabled = window.currentPage === 1;
    if (nextBtn) nextBtn.disabled = window.currentPage === totalPages || totalPages === 0;

    const startItem = window.filteredTransactions.length > 0 ? ((window.currentPage-1)*window.ITEMS_PER_PAGE)+1 : 0;
    const endItem = Math.min(window.currentPage*window.ITEMS_PER_PAGE, window.filteredTransactions.length);
    if (pageInfo) pageInfo.textContent = `Showing ${startItem} to ${endItem} of ${window.filteredTransactions.length} entries`;

    pageNumbers.innerHTML = '';
    for (let i = 1; i <= totalPages; i++) {
        if (totalPages > 7 && i > 3 && i < totalPages - 2 && (i < window.currentPage - 1 || i > window.currentPage + 1)) {
             if (i === 4 || i === totalPages - 3) {
                 const dot = document.createElement('span');
                 dot.textContent = '...';
                 dot.style.padding = '0.5rem';
                 pageNumbers.appendChild(dot);
             }
             continue;
        }
        const btn = document.createElement('button');
        btn.className = `page-number ${i === window.currentPage ? 'active' : ''}`;
        btn.textContent = i;
        btn.onclick = () => { window.currentPage = i; window.renderTable(); };
        pageNumbers.appendChild(btn);
    }
};

// --- CRUD Global Actions ---
window.deleteTx = function(id) {
    if (confirm('Are you sure you want to delete this transaction?')) {
        window.transactions = window.transactions.filter(t => t.id !== id);
        window.saveData();
        // Update both possible views
        if (typeof window.renderDashboard === 'function') window.renderDashboard();
        if (typeof window.initAnalytics === 'function' && document.getElementById('spendingLineChart')) window.initAnalytics();
    }
};

window.editTx = function(id) {
    const tx = window.transactions.find(t => t.id === id);
    if (tx) {
        if (document.getElementById('tx-id')) document.getElementById('tx-id').value = tx.id;
        if (document.getElementById('tx-amount')) document.getElementById('tx-amount').value = tx.amount;
        if (document.getElementById('tx-type')) document.getElementById('tx-type').value = tx.type;
        if (document.getElementById('tx-category')) document.getElementById('tx-category').value = tx.category;
        if (document.getElementById('tx-date')) document.getElementById('tx-date').value = tx.date;
        if (document.getElementById('tx-desc')) document.getElementById('tx-desc').value = tx.desc;
        
        if (document.getElementById('submit-btn')) document.getElementById('submit-btn').innerHTML = '<i class="bx bx-check"></i> Update';
        if (document.getElementById('form-title')) document.getElementById('form-title').innerText = 'Edit Transaction';
        if (document.getElementById('cancel-edit-btn')) document.getElementById('cancel-edit-btn').style.display = 'inline-block';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};
