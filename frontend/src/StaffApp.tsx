import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import KitchenBoard from './pages/KitchenBoard';
import WaiterBoard from './pages/WaiterBoard';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminMenu from './pages/AdminMenu';
import AdminTables from './pages/AdminTables';
import AdminSettings from './pages/AdminSettings';
import ThemeToggle, { useTheme } from './ThemeToggle';
import { ChartBarIcon, ClipboardDocumentListIcon, Squares2X2Icon, UsersIcon, PowerIcon, QrCodeIcon, BuildingStorefrontIcon } from '@heroicons/react/24/outline';

export default function StaffApp({ role, setRole }: { role: string, setRole: any }) {
    useTheme();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [newOrders, setNewOrders] = useState(0);
    const [openCalls, setOpenCalls] = useState(0);

    useEffect(() => {
        const fetchBadges = () => {
            api.get('/orders/active').then(res => {
                setNewOrders(res.data.filter((o:any) => o.status === 'NEW').length);
            }).catch(()=>{});
            
            api.get('/service-calls/active').then(res => {
                setOpenCalls(res.data.length);
            }).catch(()=>{});
        };

        fetchBadges();
        const interval = setInterval(fetchBadges, 5000);
        window.addEventListener('refresh-badges', fetchBadges);
        return () => {
            clearInterval(interval);
            window.removeEventListener('refresh-badges', fetchBadges);
        };
    }, [location.pathname]);

    const logout = () => {
        localStorage.removeItem('staff_token');
        setRole(null);
        navigate('/login');
    };

    const LinkItem = ({ to, icon, label, badge = 0, badgeColor = 'bg-red-500' }: any) => {
        const active = location.pathname.startsWith(to);
        return (
            <Link to={to} className={`flex items-center justify-between p-3 rounded-xl transition-colors font-medium ${active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
                <div className="flex items-center gap-3">
                    {icon} {label}
                </div>
                {badge > 0 && (
                    <span className={`${badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse`}>
                        {badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-slate-100 font-sans tracking-tight transition-colors duration-300">
            <div className="w-72 bg-slate-950 flex flex-col shadow-2xl z-20">
                <div className="p-6 font-bold text-2xl border-b border-slate-800 text-white tracking-tight flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-sm shadow-lg shadow-indigo-500/50">R</div>
                        Персонал
                    </div>
                </div>
                <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 mt-2 px-3">Робочі зони</div>
                    {(role === 'ROLE_COOK' || role === 'ROLE_ADMIN' || role === 'ROLE_WAITER') && (
                        <LinkItem to="/staff/kitchen" icon={<Squares2X2Icon className="w-5 h-5"/>} label="Дошка замовлень" badge={newOrders} badgeColor="bg-blue-500" />
                    )}
                    {(role === 'ROLE_WAITER' || role === 'ROLE_ADMIN') && (
                        <LinkItem to="/staff/waiter" icon={<UsersIcon className="w-5 h-5"/>} label="Виклики столів" badge={openCalls} badgeColor="bg-amber-500" />
                    )}
                    
                    {role === 'ROLE_ADMIN' && (
                        <>
                            <div className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4 mt-8 px-3">Управління</div>
                            <LinkItem to="/staff/analytics" icon={<ChartBarIcon className="w-5 h-5"/>} label="Аналітика" />
                            <LinkItem to="/staff/menu" icon={<ClipboardDocumentListIcon className="w-5 h-5"/>} label="Редактор меню" />
                            <LinkItem to="/staff/tables" icon={<QrCodeIcon className="w-5 h-5"/>} label="Столи та QR-коди" />
                            <LinkItem to="/staff/settings" icon={<BuildingStorefrontIcon className="w-5 h-5"/>} label="Заклад і Wi-Fi" />
                        </>
                    )}
                </div>
                <div className="p-4 border-t border-slate-800 flex flex-col gap-4">
                    <div className="flex justify-between items-center px-3">
                        <div>
                            <div className="text-xs text-slate-500">Авторизовано як</div>
                            <div className="text-sm font-bold text-white uppercase">{role.replace('ROLE_','')}</div>
                        </div>
                        <ThemeToggle className="hover:bg-slate-800" />
                    </div>
                    <button onClick={logout} className="w-full flex items-center justify-center gap-2 bg-slate-800/50 text-slate-300 p-3 rounded-xl font-bold hover:bg-red-500 hover:text-white transition-colors">
                        <PowerIcon className="w-5 h-5" /> Вийти
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
                <Routes>
                    <Route path="/kitchen" element={<KitchenBoard role={role} />} />
                    <Route path="/waiter" element={<WaiterBoard />} />
                    <Route path="/analytics" element={<AdminAnalytics />} />
                    <Route path="/menu" element={<AdminMenu />} />
                    <Route path="/tables" element={<AdminTables />} />
                    <Route path="/settings" element={<AdminSettings />} />
                    <Route path="/" element={<div className="h-full flex items-center justify-center text-slate-400 font-medium text-lg">Оберіть розділ меню зліва</div>} />
                </Routes>
            </div>
        </div>
    );
}
