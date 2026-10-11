with open('frontend/src/pages/AdminAnalytics.tsx', 'r') as f:
    content = f.read()

import_statement = "import { CalendarIcon } from '@heroicons/react/24/outline';"
new_import = "import { CalendarIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';"
content = content.replace(import_statement, new_import)

load_data_block = """    const loadData = () => {
        setLoading(true);
        api.get(`/admin/analytics?from=${fromDate}&to=${toDate}&topLimit=${topLimit}`)
           .then(res => setData(res.data))
           .catch(e => alert(e.response?.data?.message || 'Помилка завантаження даних'))
           .finally(() => setLoading(false));
    };"""

download_func = """    const loadData = () => {
        setLoading(true);
        api.get(`/admin/analytics?from=${fromDate}&to=${toDate}&topLimit=${topLimit}`)
           .then(res => setData(res.data))
           .catch(e => alert(e.response?.data?.message || 'Помилка завантаження даних'))
           .finally(() => setLoading(false));
    };

    const downloadCSV = () => {
        if (!data) return;
        const lines = [];
        lines.push('Звіт за період', `${data.periodStart} - ${data.periodEnd}`);
        lines.push('');
        lines.push('Загальні показники');
        lines.push(`Виручка,${data.revenue} грн`);
        lines.push(`Замовлень,${data.paidOrders}`);
        lines.push(`Середній чек,${data.averageCheck} грн`);
        lines.push(`Середній час видачі,${data.avgCookingMinutes || '-'} хв`);
        lines.push(`Середній час реакції офіціанта,${data.avgWaiterReactionMinutes || '-'} хв`);
        lines.push('');
        lines.push('Топ страв');
        lines.push('Назва,Кількість,Виручка (грн)');
        data.topItems.forEach((i:any) => lines.push(`"${i.name.replace(/"/g, '""')}",${i.quantity},${i.revenue}`));
        lines.push('');
        lines.push('Виручка по днях');
        lines.push('Дата,Замовлень,Виручка (грн)');
        data.revenueByDay.forEach((d:any) => lines.push(`${d.date},${d.orders},${d.revenue}`));
        
        const csvContent = "data:text/csv;charset=utf-8,\\uFEFF" + encodeURIComponent(lines.join('\\n'));
        const link = document.createElement("a");
        link.setAttribute("href", csvContent);
        link.setAttribute("download", `Звіт_${data.periodStart}_${data.periodEnd}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };"""

content = content.replace(load_data_block, download_func)

header_block = """            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Аналітика та Звіти</h1>
                
                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">"""

new_header_block = """            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Аналітика та Звіти</h1>
                    <button onClick={downloadCSV} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md transition-colors">
                        <ArrowDownTrayIcon className="w-4 h-4" /> Завантажити звіт
                    </button>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">"""

content = content.replace(header_block, new_header_block)

stats_block = """                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Виручка" value={`${data.revenue} ₴`} trend={null} />
                        <StatCard title="Замовлень" value={data.paidOrders} />
                        <StatCard title="Середній чек" value={`${data.averageCheck} ₴`} />
                        <StatCard title="Сер. час видачі" value={data.avgCookingMinutes ? `${data.avgCookingMinutes} хв` : '—'} />
                    </div>"""

new_stats_block = """                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                        <StatCard title="Виручка" value={`${data.revenue} ₴`} />
                        <StatCard title="Замовлень" value={data.paidOrders} />
                        <StatCard title="Середній чек" value={`${data.averageCheck} ₴`} />
                        <StatCard title="Кухня (сер. час)" value={data.avgCookingMinutes ? `${data.avgCookingMinutes} хв` : '—'} />
                        <StatCard title="Офіціанти (реакція)" value={data.avgWaiterReactionMinutes ? `${data.avgWaiterReactionMinutes} хв` : '—'} />
                    </div>"""

content = content.replace(stats_block, new_stats_block)

with open('frontend/src/pages/AdminAnalytics.tsx', 'w') as f:
    f.write(content)
