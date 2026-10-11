import React, { useEffect, useState } from 'react';
import { api } from '../api';
import LeafletMap from '../components/LeafletMap';
import { 
    BuildingStorefrontIcon, 
    WifiIcon, 
    ClockIcon, 
    ExclamationTriangleIcon,
    CheckCircleIcon
} from '@heroicons/react/24/outline';

export default function AdminSettings() {
    const [info, setInfo] = useState({
        name: '',
        description: '',
        wifiSsid: '',
        wifiPassword: '',
        workingHours: '',
        address: '',
        phone: '',
        allergensNote: '',
        latitude: 50.4485,
        longitude: 30.5186
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [savedNotice, setSavedNotice] = useState(false);

    useEffect(() => {
        api.get('/restaurant-info')
            .then(res => {
                if (res.data) {
                    setInfo(prev => ({
                        ...prev,
                        ...res.data,
                        latitude: typeof res.data.latitude === 'number' && !isNaN(res.data.latitude) ? res.data.latitude : 50.4485,
                        longitude: typeof res.data.longitude === 'number' && !isNaN(res.data.longitude) ? res.data.longitude : 30.5186
                    }));
                }
            })
            .catch(err => console.error(err))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setSavedNotice(false);
        try {
            const payload = {
                ...info,
                latitude: typeof info.latitude === 'number' && !isNaN(info.latitude) ? info.latitude : 50.4485,
                longitude: typeof info.longitude === 'number' && !isNaN(info.longitude) ? info.longitude : 30.5186
            };
            const res = await api.put('/restaurant-info', payload);
            if (res.data) {
                setInfo(prev => ({
                    ...prev,
                    ...res.data,
                    latitude: typeof res.data.latitude === 'number' && !isNaN(res.data.latitude) ? res.data.latitude : 50.4485,
                    longitude: typeof res.data.longitude === 'number' && !isNaN(res.data.longitude) ? res.data.longitude : 30.5186
                }));
            }
            setSavedNotice(true);
            setTimeout(() => setSavedNotice(false), 4000);
        } catch (err: any) {
            alert(err.response?.data?.message || 'Помилка збереження налаштувань');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8 flex justify-center items-center min-h-[400px]">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Інформація про заклад</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Ці дані автоматично відображаються у футері гостьового меню для всіх відвідувачів.
                    </p>
                </div>
                {savedNotice && (
                    <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-semibold animate-fadeIn">
                        <CheckCircleIcon className="w-5 h-5" /> Збережено успішно!
                    </div>
                )}
            </div>

            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 sm:p-8 space-y-6">
                
                {/* Основне */}
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <BuildingStorefrontIcon className="w-5 h-5 text-indigo-500" />
                        Основні реквізити
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Назва закладу *
                            </label>
                            <input
                                required
                                type="text"
                                value={info.name}
                                onChange={e => setInfo({ ...info, name: e.target.value })}
                                placeholder="Ресторан «RestoFlow»"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Короткий опис / слоган
                            </label>
                            <input
                                type="text"
                                value={info.description || ''}
                                onChange={e => setInfo({ ...info, description: e.target.value })}
                                placeholder="Авторська кухня, затишна атмосфера та швидкий сервіс"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* Wi-Fi для гостей */}
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <WifiIcon className="w-5 h-5 text-indigo-500" />
                        Гостьовий Wi-Fi
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Назва мережі (SSID)
                            </label>
                            <input
                                type="text"
                                value={info.wifiSsid || ''}
                                onChange={e => setInfo({ ...info, wifiSsid: e.target.value })}
                                placeholder="Resto_Guest"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Пароль від Wi-Fi
                            </label>
                            <input
                                type="text"
                                value={info.wifiPassword || ''}
                                onChange={e => setInfo({ ...info, wifiPassword: e.target.value })}
                                placeholder="resto2026"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* Графік та Контакти */}
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5 text-indigo-500" />
                        Графік та Контакти
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Графік роботи
                            </label>
                            <input
                                type="text"
                                value={info.workingHours || ''}
                                onChange={e => setInfo({ ...info, workingHours: e.target.value })}
                                placeholder="Пн–Нд: 10:00 – 22:00"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Номер телефону
                            </label>
                            <input
                                type="text"
                                value={info.phone || ''}
                                onChange={e => setInfo({ ...info, phone: e.target.value })}
                                placeholder="+380442345678"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                Адреса закладу
                            </label>
                            <input
                                type="text"
                                value={info.address || ''}
                                onChange={e => setInfo({ ...info, address: e.target.value })}
                                placeholder="вул. Володимирська, 24"
                                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>

                        {/* Інтерактивна карта Leaflet */}
                        <div className="sm:col-span-2 mt-2">
                            <div className="flex justify-between items-center mb-2">
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    Мітка закладу на карті OpenStreetMap (Leaflet)
                                </label>
                                <span className="text-xs text-slate-400 font-mono">
                                    {(Number(info.latitude) || 50.4485).toFixed(4)}, {(Number(info.longitude) || 30.5186).toFixed(4)}
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 mb-2">Клікніть по карті або перетягніть маркер, щоб уточнити розташування закладу.</p>
                            <LeafletMap
                                lat={Number(info.latitude) || 50.4485}
                                lng={Number(info.longitude) || 30.5186}
                                title={info.name || 'Ресторан'}
                                address={info.address || ''}
                                readOnly={false}
                                height="280px"
                                onPositionChange={(lat, lng) => setInfo(prev => ({ ...prev, latitude: lat, longitude: lng }))}
                            />
                        </div>
                    </div>
                </div>

                <hr className="border-slate-100 dark:border-slate-700" />

                {/* Алергени */}
                <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                        Попередження для гостей (Алергени)
                    </h2>
                    <div>
                        <textarea
                            rows={3}
                            value={info.allergensNote || ''}
                            onChange={e => setInfo({ ...info, allergensNote: e.target.value })}
                            placeholder="Якщо у вас є харчова алергія або особливі побажання..."
                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                        />
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
                    >
                        {saving ? 'Збереження...' : 'Зберегти налаштування'}
                    </button>
                </div>

            </form>
        </div>
    );
}
