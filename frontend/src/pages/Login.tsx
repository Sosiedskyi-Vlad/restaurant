import React, { useState } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { BuildingStorefrontIcon, LockClosedIcon, EnvelopeIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';

export default function Login({ setRole }: { setRole: any }) {
    const [email, setEmail] = useState('admin@restaurant.com');
    const [password, setPassword] = useState('admin123');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await api.post('/auth/staff-login', { email, password });
            localStorage.setItem('staff_token', res.data.token);
            setRole(res.data.role);
            navigate('/staff/kitchen');
        } catch (err) {
            setError('Невірний email або пароль. Перевірте облікові дані.');
        } finally {
            setLoading(false);
        }
    };

    const fillDemo = (demoEmail: string, demoPass: string) => {
        setEmail(demoEmail);
        setPassword(demoPass);
        setError(null);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-stone-100 dark:bg-stone-950 p-4 font-sans text-stone-900 dark:text-stone-100">
            <div className="w-full max-w-md bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 shadow-xl overflow-hidden">
                <div className="p-8 sm:p-10">
                    <div className="flex items-center gap-3.5 mb-8">
                        <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0">
                            <BuildingStorefrontIcon className="w-6 h-6 stroke-2" />
                        </div>
                        <div>
                            <span className="text-2xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-500 block">
                                Restaurant POS & KDS
                            </span>
                            <h1 className="text-xl font-bold text-stone-900 dark:text-white">
                                Вхід для персоналу
                            </h1>
                        </div>
                    </div>

                    {error && (
                        <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-semibold flex items-center gap-2.5">
                            <ExclamationCircleIcon className="w-5 h-5 text-red-500 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                                Робочий Email
                            </label>
                            <div className="relative">
                                <EnvelopeIcon className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="email"
                                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white pl-11 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 outline-none transition-all placeholder:text-stone-400"
                                    placeholder="name@restaurant.com"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1.5">
                                Пароль
                            </label>
                            <div className="relative">
                                <LockClosedIcon className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                    type="password"
                                    className="w-full bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 text-stone-900 dark:text-white pl-11 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500/30 focus:border-amber-600 outline-none transition-all placeholder:text-stone-400"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white py-3.5 rounded-xl font-bold text-sm active:scale-[0.99] transition-all shadow-sm disabled:opacity-50 mt-2"
                        >
                            {loading ? 'Авторизація...' : 'Увійти в систему'}
                        </button>
                    </form>
                </div>

                <div className="px-8 py-4 bg-stone-50 dark:bg-stone-950/60 border-t border-stone-200/80 dark:border-stone-800">
                    <div className="text-2xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                        Швидкий вхід (демо-ролі)
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => fillDemo('admin@restaurant.com', 'admin123')}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-amber-500 hover:text-amber-600 transition-colors"
                        >
                            Адмін
                        </button>
                        <button
                            type="button"
                            onClick={() => fillDemo('waiter@restaurant.com', 'waiter123')}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-amber-500 hover:text-amber-600 transition-colors"
                        >
                            Офіціант
                        </button>
                        <button
                            type="button"
                            onClick={() => fillDemo('cook@restaurant.com', 'cook123')}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-amber-500 hover:text-amber-600 transition-colors"
                        >
                            Кухар (KDS)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
