import React, { useEffect, useState } from 'react';
import { api } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';
import { CalendarIcon } from '@heroicons/react/24/outline';

export default function AdminAnalytics() {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    
    // Default: last 30 days
    const [fromDate, setFromDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        return d.toISOString().split('T')[0];
    });
    
    const [toDate, setToDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });

    const [topLimit, setTopLimit] = useState(10);

    const loadData = () => {
        setLoading(true);
        api.get(`/admin/analytics?from=${fromDate}&to=${toDate}&topLimit=${topLimit}`)
           .then(res => setData(res.data))
           .catch(e => alert(e.response?.data?.message || 'Помилка завантаження даних'))
           .finally(() => setLoading(false));
    };

    useEffect(() => {
        loadData();
    }, [fromDate, toDate, topLimit]);

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Аналітика та Звіти</h1>
                
                <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center pl-3 text-slate-400">
                        <CalendarIcon className="w-5 h-5" />
                    </div>
                    <input 
                        type="date" 
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                    />
                    <span className="text-slate-400">—</span>
                    <input 
                        type="date" 
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-sm text-slate-700 dark:text-slate-200 cursor-pointer"
                    />
                </div>
            </div>

            {loading && !data ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                </div>
            ) : data ? (
                <>
                    {/* Головні показники */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <StatCard title="Виручка" value={`${data.revenue} ₴`} trend={null} />
                        <StatCard title="Замовлень" value={data.paidOrders} />
                        <StatCard title="Середній чек" value={`${data.averageCheck} ₴`} />
                        <StatCard title="Сер. час видачі" value={data.avgCookingMinutes ? `${data.avgCookingMinutes} хв` : '—'} />
                    </div>

                    {/* Графіки */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                        
                        {/* Графік виручки */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Динаміка виручки</h3>
                            <div className="h-72">
                                {data.revenueByDay?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={data.revenueByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} />
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--tw-prose-body)' }}
                                                itemStyle={{ color: '#6366f1', fontWeight: 'bold' }}
                                            />
                                            <Area type="monotone" name="Виручка (₴)" dataKey="revenue" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Немає даних для графіка</div>
                                )}
                            </div>
                        </div>

                        {/* Графік замовлень */}
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-white">Кількість замовлень</h3>
                            <div className="h-72">
                                {data.revenueByDay?.length > 0 ? (
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={data.revenueByDay} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                            <XAxis dataKey="date" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                                            <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={false} allowDecimals={false} />
                                            <Tooltip 
                                                cursor={{fill: '#334155', opacity: 0.1}}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                itemStyle={{ color: '#10b981', fontWeight: 'bold' }}
                                            />
                                            <Bar dataKey="orders" name="Замовлення" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-full flex items-center justify-center text-slate-400">Немає даних для графіка</div>
                                )}
                            </div>
                        </div>

                    </div>

                    {/* Популярні страви */}
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm mb-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">Популярні страви</h2>
                            <select 
                                value={topLimit} 
                                onChange={(e) => setTopLimit(parseInt(e.target.value))}
                                className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-sm px-3 py-1.5 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                <option value={5}>Топ 5</option>
                                <option value={10}>Топ 10</option>
                                <option value={20}>Топ 20</option>
                                <option value={50}>Топ 50</option>
                            </select>
                        </div>
                        
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                                        <th className="pb-3 font-medium">Назва страви</th>
                                        <th className="pb-3 font-medium">Продано порцій</th>
                                        <th className="pb-3 font-medium text-right">Виручка</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {data.topItems?.map((i:any, index: number) => (
                                        <tr key={i.menuItemId} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="py-3.5 flex items-center gap-3">
                                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index < 3 ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'}`}>
                                                    {index + 1}
                                                </span>
                                                <span className="font-medium text-slate-900 dark:text-slate-200">{i.name}</span>
                                            </td>
                                            <td className="py-3.5 text-slate-700 dark:text-slate-300">
                                                {i.quantity} шт
                                            </td>
                                            <td className="py-3.5 font-bold text-slate-900 dark:text-white text-right">
                                                {i.revenue} ₴
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {(!data.topItems || data.topItems.length === 0) && (
                                <div className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl mt-4">
                                    Немає даних за обраний період
                                </div>
                            )}
                        </div>
                    </div>
                </>
            ) : null}
        </div>
    );
}

function StatCard({ title, value }: { title: string, value: string | number, trend?: any }) {
    return (
        <div className="bg-white dark:bg-slate-800 p-5 lg:p-6 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                {/* Decorative element */}
                <div className="w-16 h-16 rounded-full bg-indigo-500"></div>
            </div>
            <div className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">{title}</div>
            <div className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">{value}</div>
        </div>
    );
}
