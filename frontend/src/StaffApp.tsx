import React, { useState, useEffect } from 'react';
import { api } from './api';
import { Routes, Route, Link, useNavigate, useLocation } from 'react-router-dom';
import KitchenBoard from './pages/KitchenBoard';
import WaiterBoard from './pages/WaiterBoard';
import OrderHistory from './pages/OrderHistory';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminMenu from './pages/AdminMenu';
import AdminTables from './pages/AdminTables';
import AdminSettings from './pages/AdminSettings';
import AdminPromotions from './pages/AdminPromotions';
import ThemeToggle, { useTheme } from './ThemeToggle';
import { 
    ChartBarIcon, 
    ClipboardDocumentListIcon, 
    Squares2X2Icon, 
    UsersIcon, 
    PowerIcon, 
    QrCodeIcon, 
    BuildingStorefrontIcon,
    ClockIcon,
    MegaphoneIcon
} from '@heroicons/react/24/outline';

export default function StaffApp({ role, setRole }: { role: string, setRole: any }) {
    const { theme, toggle } = useTheme();
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
            <Link 
                to={to} 
                className={`flex items-center justify-between p-3 rounded-xl transition-all font-medium text-sm ${
                    active 
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 font-semibold' 
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/60'
                }`}
            >
                <div className="flex items-center gap-3">
                    {icon} <span>{label}</span>
                </div>
                {badge > 0 && (
                    <span className={`${badgeColor} text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-xs animate-pulse`}>
                        {badge}
                    </span>
                )}
            </Link>
        );
    };

    return (
        <div className="h-screen flex bg-slate-50 dark:bg-slate-900 overflow-hidden text-slate-900 dark:text-slate-100 font-sans tracking-tight transition-colors duration-300">
            {/* Ліве меню: адаптивне під світлу та темну теми */}
            <div className="w-72 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800/80 flex flex-col shadow-xs dark:shadow-2xl z-20 transition-colors duration-300">
                <div className="p-5 sm:p-6 font-bold text-xl sm:text-2xl border-b border-slate-100 dark:border-slate-800/80 text-slate-900 dark:text-white tracking-tight flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-sm font-black text-white shadow-md shadow-indigo-500/30">
                            R
                        </div>
                        <span>Персонал</span>
                    </div>
                </div>
                <div className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 mt-2 px-3">
                        Робочі зони
                    </div>
                    {(role === 'ROLE_COOK' || role === 'ROLE_ADMIN' || role === 'ROLE_WAITER') && (
                        <LinkItem to="/staff/kitchen" icon={<Squares2X2Icon className="w-5 h-5"/>} label="Дошка замовлень" badge={newOrders} badgeColor="bg-blue-500" />
                    )}
                    {(role === 'ROLE_WAITER' || role === 'ROLE_ADMIN') && (
                        <LinkItem to="/staff/waiter" icon={<UsersIcon className="w-5 h-5"/>} label="Виклики столів" badge={openCalls} badgeColor="bg-amber-500" />
                    )}
                    {(role === 'ROLE_COOK' || role === 'ROLE_ADMIN' || role === 'ROLE_WAITER') && (
                        <LinkItem to="/staff/orders" icon={<ClockIcon className="w-5 h-5"/>} label="Історія замовлень" />
                    )}
                    
                    {role === 'ROLE_ADMIN' && (
                        <>
                            <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2.5 mt-6 px-3">
                                Управління
                            </div>
                            <LinkItem to="/staff/analytics" icon={<ChartBarIcon className="w-5 h-5"/>} label="Аналітика" />
                            <LinkItem to="/staff/menu" icon={<ClipboardDocumentListIcon className="w-5 h-5"/>} label="Редактор меню" />
                            <LinkItem to="/staff/promotions" icon={<MegaphoneIcon className="w-5 h-5"/>} label="Акції та новини" />
                            <LinkItem to="/staff/tables" icon={<QrCodeIcon className="w-5 h-5"/>} label="Столи та QR-коди" />
                            <LinkItem to="/staff/settings" icon={<BuildingStorefrontIcon className="w-5 h-5"/>} label="Заклад і Wi-Fi" />
                        </>
                    )}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 flex flex-col gap-3.5 bg-slate-50/60 dark:bg-slate-900/40">
                    <div className="flex justify-between items-center px-2">
                        <div>
                            <div className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">Авторизовано як</div>
                            <div className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wide">{role.replace('ROLE_','')}</div>
                        </div>
                        <ThemeToggle theme={theme} toggle={toggle} className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-200/70 dark:hover:bg-slate-800 transition-colors shadow-2xs" />
                    </div>
                    <button 
                        onClick={logout} 
                        className="w-full flex items-center justify-center gap-2 bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 p-2.5 rounded-xl text-sm font-bold hover:bg-red-50 hover:text-red-600 hover:border-red-200 dark:hover:bg-red-500/20 dark:hover:text-red-400 transition-all active:scale-95 shadow-2xs"
                    >
                        <PowerIcon className="w-4 h-4 stroke-2" /> 
                        <span>Вийти</span>
                    </button>
                </div>
            </div>
            <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
                <Routes>
                    <Route path="/kitchen" element={<KitchenBoard role={role} />} />
                    <Route path="/waiter" element={<WaiterBoard />} />
                    <Route path="/orders" element={<OrderHistory role={role} />} />
                    <Route path="/analytics" element={<AdminAnalytics />} />
                    <Route path="/menu" element={<AdminMenu />} />
                    <Route path="/promotions" element={<AdminPromotions />} />
                    <Route path="/tables" element={<AdminTables />} />
                    <Route path="/settings" element={<AdminSettings />} />
                    <Route path="/" element={<div className="h-full flex items-center justify-center text-slate-400 font-medium text-lg">Оберіть розділ меню зліва</div>} />
                </Routes>
            </div>
        </div>
    );
}
