// --- Chart Theme & Colors ---
window.catColors = {
    'Bills': 'chart1',
    'Food': 'chart3',
    'Shopping': 'chart4',
    'Transport': 'chart5',
    'Other': 'chart6',
    'Salary': 'chart2'
};

window.getChartColors = function() {
    const style = getComputedStyle(document.body);
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    return {
        text: style.getPropertyValue('--text-main').trim() || (isDark ? '#f8fafc' : '#111827'),
        textMuted: style.getPropertyValue('--text-muted').trim() || (isDark ? '#94a3b8' : '#6b7280'),
        grid: style.getPropertyValue('--border').trim() || (isDark ? '#334155' : '#e5e7eb'),
        primary: style.getPropertyValue('--primary').trim() || '#4f46e5',
        primaryLight: style.getPropertyValue('--primary-light').trim() || 'rgba(79,70,229,0.1)',
        chart1: style.getPropertyValue('--chart-1').trim() || '#4f46e5',
        chart2: style.getPropertyValue('--chart-2').trim() || '#10b981',
        chart3: style.getPropertyValue('--chart-3').trim() || '#f59e0b',
        chart4: style.getPropertyValue('--chart-4').trim() || '#a855f7',
        chart5: style.getPropertyValue('--chart-5').trim() || '#ec4899',
        chart6: style.getPropertyValue('--chart-6').trim() || '#64748b'
    };
};

window.expenseDonutInst = null;
window.analyticsLineInst = null;
window.analyticsDonutInst = null;
window.analyticsBarInst = null;

// --- Dashboard Chart ---
window.renderExpenseDonut = function() {
    const canvas = document.getElementById('expenseDonutChart');
    if (!canvas || typeof Chart === 'undefined') return;

    if (window.expenseDonutInst) window.expenseDonutInst.destroy();

    const expenses = window.transactions.filter(t => t.type === 'Expense');
    const totals = {};
    let totalValue = 0;
    expenses.forEach(e => {
        totals[e.category] = (totals[e.category] || 0) + e.amount;
        totalValue += e.amount;
    });

    const labels = Object.keys(totals);
    const data = Object.values(totals);
    const colors = window.getChartColors();
    const bgColors = labels.map(l => colors[window.catColors[l]] || colors.chart6);

    const legendEl = document.getElementById('donut-legend');
    if (totalValue === 0) {
        if (legendEl) legendEl.innerHTML = "<p class='text-sm text-muted' style='text-align:center;'>No expenses found.</p>";
        return;
    }

    window.expenseDonutInst = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ data: data, backgroundColor: bgColors, borderWidth: 0, cutout: '75%' }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: { callbacks: { label: (c) => ` ${c.label}: ${window.formatCurrency(c.raw)}` } }
            }
        },
        plugins: [{
            id: 'centerText',
            beforeDraw: (chart) => {
                const { width, height, ctx } = chart;
                ctx.save();
                ctx.font = "bold 1.2rem Poppins";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = colors.text;
                ctx.fillText(window.formatCurrency(totalValue), width/2, height/2 - 5);
                ctx.font = "600 0.6rem Poppins";
                ctx.fillStyle = colors.textMuted;
                ctx.fillText("TOTAL SPENT", width/2, height/2 + 20);
                ctx.restore();
            }
        }]
    });

    if (legendEl) {
        legendEl.innerHTML = labels.map((lbl, i) => `
            <div class="legend-row" style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:0.8rem;">
                <div style="display:flex; align-items:center; gap:0.5rem;">
                    <span style="width:10px; height:10px; border-radius:50%; background:${bgColors[i]}"></span>
                    <span>${lbl}</span>
                </div>
                <strong>${Math.round(data[i]/totalValue*100)}%</strong>
            </div>`).join('');
    }
};

// --- Analytics Charts ---
window.renderAnalyticsCharts = function(filtered) {
    if (typeof Chart === 'undefined') return;
    const colors = window.getChartColors();

    const lineCanvas = document.getElementById('spendingLineChart');
    if (lineCanvas) {
        if (window.analyticsLineInst) window.analyticsLineInst.destroy();
        const dayData = {};
        filtered.filter(t => t.type === 'Expense').forEach(t => {
            const d = new Date(t.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            dayData[d] = (dayData[d] || 0) + t.amount;
        });
        window.analyticsLineInst = new Chart(lineCanvas, {
            type: 'line',
            data: {
                labels: Object.keys(dayData),
                datasets: [{ 
                    label: 'Spent', 
                    data: Object.values(dayData), 
                    borderColor: colors.primary, 
                    backgroundColor: colors.primaryLight, 
                    fill: true, tension: 0.4, pointRadius: 4 
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false, 
                plugins: { legend: { display: false } },
                scales: { 
                    x: { grid: { display: false }, ticks: { color: colors.textMuted, font: { family: 'Poppins' } } },
                    y: { beginAtZero: true, grid: { color: colors.grid, borderDash: [5, 5] }, ticks: { color: colors.textMuted, font: { family: 'Poppins' } } }
                }
            }
        });
    }

    const barCanvas = document.getElementById('incomeExpenseBarChart');
    if (barCanvas) {
        if (window.analyticsBarInst) window.analyticsBarInst.destroy();
        
        // Month sorting map
        const mSort = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
        
        const monthTotals = {};
        filtered.forEach(t => {
            const m = new Date(t.date).toLocaleString(undefined, { month: 'short' });
            if (!monthTotals[m]) monthTotals[m] = { inc: 0, exp: 0 };
            if (t.type === 'Income') monthTotals[m].inc += t.amount;
            else monthTotals[m].exp += t.amount;
        });

        const sortedMonths = Object.keys(monthTotals).sort((a,b) => mSort[a] - mSort[b]);

        window.analyticsBarInst = new Chart(barCanvas, {
            type: 'bar',
            data: {
                labels: sortedMonths,
                datasets: [
                    { 
                        label: 'Income', 
                        data: sortedMonths.map(m => monthTotals[m].inc), 
                        backgroundColor: colors.chart2, 
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.5
                    },
                    { 
                        label: 'Expense', 
                        data: sortedMonths.map(m => monthTotals[m].exp), 
                        backgroundColor: colors.primary, 
                        borderRadius: 6,
                        barPercentage: 0.6,
                        categoryPercentage: 0.5
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                scales: { 
                    x: { 
                        grid: { display: false }, 
                        ticks: { color: colors.textMuted, font: { family: 'Poppins' } } 
                    },
                    y: { 
                        grid: { color: colors.grid, borderDash: [5, 5] }, 
                        ticks: { color: colors.textMuted, font: { family: 'Poppins' } } 
                    }
                },
                plugins: { 
                    legend: { 
                        position: 'bottom', 
                        labels: { color: colors.text, font: { family: 'Poppins' }, usePointStyle: true, padding: 20 } 
                    } 
                }
            }
        });
    }

    const donutCanvas = document.getElementById('categoryDonutChart');
    if (donutCanvas) {
        if (window.analyticsDonutInst) window.analyticsDonutInst.destroy();
        const totals = {};
        filtered.filter(t => t.type === 'Expense').forEach(e => totals[e.category] = (totals[e.category]||0) + e.amount);
        window.analyticsDonutInst = new Chart(donutCanvas, {
            type: 'doughnut',
            data: {
                labels: Object.keys(totals),
                datasets: [{ 
                    data: Object.values(totals), 
                    backgroundColor: Object.keys(totals).map(l => colors[window.catColors[l]] || colors.chart6),
                    borderWidth: 0 
                }]
            },
            options: { 
                responsive: true, maintainAspectRatio: false,
                plugins: { 
                    legend: { 
                        position: 'right', 
                        labels: { color: colors.text, font: { family: 'Poppins' }, padding: 15 } 
                    } 
                }
            }
        });
    }
};
