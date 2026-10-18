import PromoCarousel from './components/PromoCarousel';
import LeafletMap from './components/LeafletMap';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import { getStompClient, onWsConnect } from './ws';
import { useTheme } from './ThemeToggle';
import {
    BellIcon,
    CreditCardIcon,
    CheckCircleIcon,
    FireIcon,
    InformationCircleIcon,
    BanknotesIcon,
    WifiIcon,
    ClockIcon,
    MapPinIcon,
    PhoneIcon,
    SunIcon,
    MoonIcon,
    SparklesIcon,
    GiftIcon,
    TagIcon,
    CheckIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconOutline } from '@heroicons/react/24/outline';
import { ShoppingBagIcon, HeartIcon } from '@heroicons/react/24/solid';

export default function GuestApp() {
    const { theme, toggle } = useTheme();
    const tableNum = localStorage.getItem('guest_table_num') || '?';
    const [restaurantInfo, setRestaurantInfo] = useState<any>(null);

    useEffect(() => {
        api.get('/restaurant-info')
            .then(res => setRestaurantInfo(res.data))
            .catch(() => {});
    }, []);
    
    return (
        <div className="min-h-screen pb-32 max-w-md mx-auto bg-slate-50 dark:bg-slate-950 relative shadow-2xl overflow-hidden sm:rounded-[3rem] sm:my-10 sm:border-[8px] sm:border-slate-900 dark:sm:border-slate-800 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            <header className="glass dark:bg-slate-900/80 dark:border-slate-800/60 sticky top-0 z-30 px-6 py-4 flex justify-between items-center transition-colors">
                <div>
                    <h1 className="text-xs sm:text-sm font-semibold tracking-widest text-slate-500 dark:text-slate-400 uppercase">Стіл {tableNum}</h1>
                    <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Ваше меню</div>
                </div>
                <CallWaiterButton />
            </header>
            <main className="p-6">
                <GuestFlow />
            </main>
            <Footer info={restaurantInfo} theme={theme} toggle={toggle} />
        </div>
    );
}

function CallWaiterButton() {
    const [calling, setCalling] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        api.get('/service-calls/my').then(res => setCalling(res.data.length > 0));
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => client.subscribe('/user/queue/service-calls', (msg) => {
            const data = JSON.parse(msg.body);
            if (data.type === 'RESOLVED') {
                setCalling(false);
            }
        }));
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/user/queue/service-calls'); };
    }, []);

    const call = async () => {
        if (calling) return;
        setCalling(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        try {
            await api.post('/service-calls', { type: 'WAITER' });
        } catch(e) { setCalling(false); }
    };

    return (
        <>
            <button 
                onClick={call} 
                disabled={calling}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full font-bold text-sm transition-all duration-200 cursor-pointer ${
                    calling 
                        ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 animate-pulse' 
                        : 'bg-white dark:bg-slate-800/90 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 shadow-xs active:scale-95'
                }`}
                aria-label="Викликати офіціанта"
            >
                <BellIcon className={`w-4 h-4 stroke-2 ${calling ? 'text-white animate-bounce' : 'text-slate-500 dark:text-slate-400'}`} />
                <span>{calling ? 'Офіціант іде...' : 'Офіціант'}</span>
            </button>

            {showToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl border border-white/10 flex items-center gap-2.5 text-xs font-semibold animate-slideUpFade">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Офіціант повідомлений та вже прямує до вашого столу!</span>
                </div>
            )}
        </>
    );
}

// Тип для корзини з опціями
type CartItem = {
    cartId: string;
    menuItemId: number;
    name: string;
    price: number;
    quantity: number;
    options: Record<string, string[]>;
};

function GuestFlow() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [targetPromoMenuItemId, setTargetPromoMenuItemId] = useState<number | null>(null);
    const [targetCategory, setTargetCategory] = useState<string | null>(null);
    const [lastComboPromoId, setLastComboPromoId] = useState<string | null>(null);

    const fetchOrders = () => api.get('/orders/my').then(res => setOrders(res.data));
    useEffect(() => {
        fetchOrders();
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => client.subscribe('/user/queue/order-updates', () => fetchOrders()));
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/user/queue/order-updates'); };
    }, []);

    const sendOrder = async () => {
        const payloadItems = cart.map(c => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            options: c.options
        }));
        
        if (!payloadItems.length) return;
        
        try {
            const res = await api.post('/orders', { items: payloadItems });
            if (lastComboPromoId) {
                try {
                    await api.post(`/orders/${res.data.id}/apply-promotion`, { promotionId: lastComboPromoId });
                } catch(e) {}
                setLastComboPromoId(null);
            }
            setCart([]);
            fetchOrders();
        } catch(e:any) { alert(e.response?.data?.message || 'Помилка замовлення'); }
    };

    const count = cart.reduce((a, b) => a + b.quantity, 0);
    const totalAmount = cart.reduce((a, b) => a + (b.price * b.quantity), 0);

    return (
        <div className="space-y-8 relative">
            <PromoCarousel 
                onSelectMenuItem={(id) => setTargetPromoMenuItemId(id)} 
                onSelectCategory={(cat) => setTargetCategory(cat)}
            />
            {orders.length > 0 && <ActiveOrders orders={orders} onOrderUpdated={fetchOrders} />}
            <Menu 
                cart={cart} 
                setCart={setCart} 
                targetPromoMenuItemId={targetPromoMenuItemId} 
                clearTargetPromo={() => setTargetPromoMenuItemId(null)}
                targetCategory={targetCategory}
                clearTargetCategory={() => setTargetCategory(null)}
                onSelectComboForOrder={(promoId) => setLastComboPromoId(promoId)}
            />
            
            {count > 0 && (
                <div className="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-0 right-0 px-6 z-40 max-w-md mx-auto animate-slideUpFade">
                    <button onClick={sendOrder} className="w-full glass-dark dark:bg-indigo-600/90 dark:border-indigo-400/30 text-white p-4 rounded-3xl font-bold flex flex-col justify-center hover:scale-[1.02] active:scale-95 transition-transform shadow-2xl cursor-pointer">
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-2xl"><ShoppingBagIcon className="w-6 h-6" /></div>
                                <span className="text-lg">Оформити ({count})</span>
                            </div>
                            <span className="text-xl tracking-tight">{totalAmount}&nbsp;₴ →</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}

function ActiveOrders({ orders, onOrderUpdated }: { orders: any[]; onOrderUpdated?: () => void }) {
    const [checkingOut, setCheckingOut] = useState<string | null>(null);
    const [promosModalOrderId, setPromosModalOrderId] = useState<string | null>(null);
    const [activePromotions, setActivePromotions] = useState<any[]>([]);
    const [applyingPromo, setApplyingPromo] = useState(false);

    useEffect(() => {
        api.get('/promotions/active').then(res => setActivePromotions(res.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (promosModalOrderId) {
            const orig = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = orig; };
        }
    }, [promosModalOrderId]);

    const pay = async (orderId: string) => {
        try {
            setCheckingOut(orderId);
            const res = await api.post('/payments/checkout', { orderId });
            const form = document.createElement('form');
            form.method = 'POST'; form.action = res.data.checkoutUrl;
            const d = document.createElement('input'); d.type='hidden'; d.name='data'; d.value=res.data.data;
            const s = document.createElement('input'); s.type='hidden'; s.name='signature'; s.value=res.data.signature;
            form.appendChild(d); form.appendChild(s);
            document.body.appendChild(form);
            form.submit();
        } catch (e: any) {
            setCheckingOut(null);
            alert(e.response?.data?.message || 'Помилка оплати');
        }
    };
    
    const formatOptions = (optStr: string) => {
        if (!optStr) return null;
        try {
            const parsed = JSON.parse(optStr);
            const keys = Object.keys(parsed);
            if (keys.length === 0) return null;
            return keys.map(k => parsed[k]).join(', ');
        } catch(e) { return null; }
    };

    const handleApplyPromotion = async (orderId: string, promotionId: string) => {
        setApplyingPromo(true);
        try {
            await api.post(`/orders/${orderId}/apply-promotion`, { promotionId });
            setPromosModalOrderId(null);
            if (onOrderUpdated) onOrderUpdated();
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка застосування акції');
        } finally {
            setApplyingPromo(false);
        }
    };

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-amber-500" /> Ваші замовлення
            </h2>
            <div className="space-y-4">
                {orders.map(o => (
                    <div key={o.id} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs relative">
                        <div className="flex justify-between items-start mb-3">
                            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                                o.status === 'NEW' 
                                    ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' 
                                    : o.status === 'PREPARING' 
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/40' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/40'
                            }`}>
                                {o.status === 'NEW' ? 'В черзі' : o.status === 'PREPARING' ? 'Готується' : 'Готово'}
                            </span>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">{o.total}&nbsp;₴</span>
                        </div>
                        <div className="text-sm text-slate-500 dark:text-slate-400 mb-5 space-y-2.5">
                            {o.items.map((i: any, idx: number) => {
                                const opts = formatOptions(i.selectedOptions);
                                const isItemReady = i.status === "READY";
                                const isItemServed = i.status === "SERVED";
                                const isItemPreparing = i.status === "PREPARING";

                                return (
                                <div key={idx} className="flex justify-between items-center p-2.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/50">
                                    <div className="flex gap-2.5 items-center min-w-0 pr-2">
                                        <span className="text-slate-600 dark:text-slate-300 font-bold text-xs bg-white dark:bg-slate-700 px-2 py-1 rounded-lg shadow-2xs border border-slate-200/60 dark:border-slate-600 whitespace-nowrap">{i.quantity}×</span> 
                                        <div className="min-w-0">
                                            <div className={`font-semibold leading-tight truncate ${isItemServed ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}`}>{i.name}</div>
                                            {opts && <div className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 truncate">{opts}</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isItemReady && (
                                            <span className="text-[10px] font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 animate-pulse">
                                                🍳 Несуть вам!
                                            </span>
                                        )}
                                        {isItemServed && (
                                            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100/90 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-300/30">
                                                ✓ Подано
                                            </span>
                                        )}
                                        {isItemPreparing && (
                                            <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/50 dark:border-amber-800/40">
                                                ⏳ Готується
                                            </span>
                                        )}
                                        {(!i.status || i.status === "NEW") && (
                                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 bg-slate-200/60 dark:bg-slate-700 px-2 py-0.5 rounded-full">
                                                В черзі
                                            </span>
                                        )}
                                        <span className="font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap text-xs ml-1">{i.priceAtTime * i.quantity} ₴</span>
                                    </div>
                                </div>
                            )})}
                        </div>

                        {/* Знижка за акцією (якщо застосована) */}
                        {o.discountAmount > 0 && (
                            <div className="mb-4 p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex justify-between items-center text-xs gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-emerald-800 dark:text-emerald-300 truncate">
                                        🎉 {o.appliedPromotionTitle}
                                    </div>
                                    <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 whitespace-nowrap">
                                        Сума без знижки: {o.subtotal || (Number(o.total) + Number(o.discountAmount))}&nbsp;₴
                                    </div>
                                </div>
                                <div className="text-right shrink-0 whitespace-nowrap">
                                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400 whitespace-nowrap inline-block">
                                        -{o.discountAmount}&nbsp;₴
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Кнопка активації акції або виклику офіціанта */}
                        {!o.paid && (!o.discountAmount || o.discountAmount === 0) && (
                            <div className="mb-3 space-y-2">
                                {activePromotions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPromosModalOrderId(o.id)}
                                        className="w-full p-2.5 rounded-2xl bg-indigo-50/80 hover:bg-indigo-100/80 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-200/80 dark:border-indigo-800/60 text-indigo-900 dark:text-indigo-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <span>✨</span>
                                            <span>Застосувати акцію або комбо</span>
                                        </span>
                                        <span className="text-[11px] underline font-bold text-indigo-700 dark:text-indigo-300">
                                            Обрати акцію →
                                        </span>
                                    </button>
                                )}

                                <button
                                    type="button"
                                    onClick={() => {
                                        api.post("/service-calls", { type: "WAITER" })
                                            .then(() => alert("Офіціанта викликано до вашого столу для перевірки та активації святкової знижки!"))
                                            .catch(() => alert("Помилка виклику офіціанта"));
                                    }}
                                    className="w-full p-2.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/40 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <span>🎂</span>
                                        <span>У вас День народження чи свято?</span>
                                    </span>
                                    <span className="text-[11px] underline font-bold text-amber-700 dark:text-amber-300">
                                        Повідомити офіціанта →
                                    </span>
                                </button>
                            </div>
                        )}

                        {!o.paid ? (
                            <div className="flex flex-col gap-2 mt-4">
                                <button onClick={() => pay(o.id)} disabled={checkingOut === o.id} className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white p-3.5 rounded-2xl font-semibold disabled:opacity-50 hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors shadow-xs cursor-pointer">
                                    <CreditCardIcon className="w-5 h-5" />
                                    {checkingOut === o.id ? 'Зачекайте...' : `Оплатити онлайн ${o.total} ₴ (LiqPay)`}
                                </button>
                                <button onClick={() => {
                                    api.post('/service-calls', { type: 'BILL' }).then(() => alert('Офіціант зараз підійде з рахунком!'));
                                }} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3.5 rounded-2xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer">
                                    <BanknotesIcon className="w-5 h-5" />
                                    Готівкою або терміналом
                                </button>
                            </div>
                        ) : (
                            <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 p-3.5 rounded-2xl font-bold ring-1 ring-emerald-200 dark:ring-emerald-800">
                                <CheckCircleIcon className="w-5 h-5" /> Оплачено
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Модалка вибору акції для замовлення */}
            {promosModalOrderId && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in" onClick={() => setPromosModalOrderId(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full max-w-sm rounded-3xl p-5 shadow-2xl border border-slate-100 dark:border-slate-800 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-extrabold text-base text-slate-900 dark:text-white">Доступні акції</h3>
                            <button onClick={() => setPromosModalOrderId(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {activePromotions.map(p => (
                                <button
                                    key={p.id}
                                    disabled={applyingPromo}
                                    onClick={() => handleApplyPromotion(promosModalOrderId, p.id)}
                                    className="w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                                >
                                    <div className="font-bold text-xs text-slate-900 dark:text-white flex items-center justify-between">
                                        <span>{p.title}</span>
                                        {p.promoType === 'COMBO' ? (
                                            <span className="text-[10px] text-amber-500 font-extrabold">🔥 КОМБО</span>
                                        ) : p.discountPercent > 0 ? (
                                            <span className="text-[10px] text-emerald-600 font-extrabold">-{p.discountPercent}%</span>
                                        ) : null}
                                    </div>
                                    {p.shortDescription && (
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                                            {p.shortDescription}
                                        </p>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function Menu({ 
    cart, 
    setCart,
    targetPromoMenuItemId,
    clearTargetPromo,
    targetCategory,
    clearTargetCategory,
    onSelectComboForOrder
}: { 
    cart: CartItem[]; 
    setCart: any;
    targetPromoMenuItemId?: number | null;
    clearTargetPromo?: () => void;
    targetCategory?: string | null;
    clearTargetCategory?: () => void;
    onSelectComboForOrder?: (promoId: string) => void;
}) {
    const [items, setItems] = useState<any[]>([]);
    const [comboPromotions, setComboPromotions] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<any>(null);
    const [likedItems, setLikedItems] = useState<Set<number>>(new Set());
    
    // Стан для опцій у модалці страви
    const [modalOptions, setModalOptions] = useState<Record<string, string[]>>({});
    const [modalPrice, setModalPrice] = useState<number>(0);

    // Стан для модалки збирання комбо
    const [activeComboModal, setActiveComboModal] = useState<any>(null);
    const [comboSlotSelections, setComboSlotSelections] = useState<Record<string, number>>({});
    const [comboRewardSelection, setComboRewardSelection] = useState<number | null>(null);

    useEffect(() => { 
        Promise.all([
            api.get('/menu/items'),
            api.get('/promotions/active').catch(() => ({ data: [] }))
        ]).then(([itemsRes, promosRes]) => {
            setItems(itemsRes.data || []);
            const combos = (promosRes.data || []).filter((p: any) => p.promoType === 'COMBO');
            setComboPromotions(combos);

            const normalCats = Array.from(new Set((itemsRes.data || []).filter((i:any) => i.isAvailable).map((i:any) => i.categoryName)));
            if (combos.length > 0) {
                setActiveCategory('🔥 Комбо');
            } else if (normalCats.length > 0) {
                setActiveCategory(normalCats[0] as string);
            }
        }); 
        
        try {
            const saved = localStorage.getItem('liked_items');
            if (saved) setLikedItems(new Set(JSON.parse(saved)));
        } catch(e) {}
    }, []);

    // При кліку на категорію з каруселі
    // Блокування скролу фонової сторінки під час відкритих модальних вікон
    useEffect(() => {
        if (selectedItem || activeComboModal) {
            const origOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = origOverflow;
            };
        }
    }, [selectedItem, activeComboModal]);

    useEffect(() => {
        if (!targetCategory) return;
        setActiveCategory(targetCategory);
        if (clearTargetCategory) clearTargetCategory();
    }, [targetCategory]);

    // При кліку на акцію зі стравою
    useEffect(() => {
        if (!targetPromoMenuItemId || items.length === 0) return;
        const target = items.find((i: any) => i.id === targetPromoMenuItemId);
        if (target) {
            if (target.categoryName) {
                setActiveCategory(target.categoryName);
            }
            openModal(target);
            if (clearTargetPromo) clearTargetPromo();
        }
    }, [targetPromoMenuItemId, items]);
    
    // Обчислення ціни в модалці при зміні опцій
    useEffect(() => {
        if (!selectedItem) return;
        let p = parseFloat(selectedItem.price);
        if (selectedItem.variations) {
            try {
                const vars = JSON.parse(selectedItem.variations);
                const selectedOpts: any[] = [];
                for (const vGroup of vars) {
                    const selectedOptNames = modalOptions[vGroup.name] || [];
                    for (const selectedOptName of selectedOptNames) {
                        const opt = vGroup.options.find((o:any) => o.name === selectedOptName);
                        if (opt) selectedOpts.push(opt);
                    }
                }
                for (const opt of selectedOpts) {
                    if (opt.isAbsolute) p = parseFloat(opt.price);
                }
                for (const opt of selectedOpts) {
                    if (!opt.isAbsolute) p += parseFloat(opt.price);
                }
            } catch(e) {}
        }
        setModalPrice(p);
    }, [selectedItem, modalOptions]);

    const openModal = (item: any) => {
        setSelectedItem(item);
        setModalPrice(parseFloat(item.price));
        const defOpts: Record<string, string[]> = {};
        if (item.variations) {
            try {
                const vars = JSON.parse(item.variations);
                for (const vGroup of vars) {
                    if (vGroup.options && vGroup.options.length > 0 && vGroup.type === 'SINGLE') {
                        defOpts[vGroup.name] = [vGroup.options[0].name];
                    } else if (vGroup.type === 'MULTIPLE') {
                        defOpts[vGroup.name] = [];
                    }
                }
            } catch(e) {}
        }
        setModalOptions(defOpts);
    };

    const addToCart = () => {
        if (!selectedItem) return;
        const existingIdx = cart.findIndex(c => 
            c.menuItemId === selectedItem.id && 
            JSON.stringify(c.options) === JSON.stringify(modalOptions)
        );
        
        if (existingIdx >= 0) {
            const newCart = [...cart];
            newCart[existingIdx].quantity += 1;
            setCart(newCart);
        } else {
            setCart([...cart, {
                cartId: Math.random().toString(36).substring(7),
                menuItemId: selectedItem.id,
                name: selectedItem.name,
                price: modalPrice,
                quantity: 1,
                options: modalOptions
            }]);
        }
        setSelectedItem(null);
    };

    const quickAdd = (item: any) => {
        let p = parseFloat(item.price);
        const defOpts: Record<string, string[]> = {};
        if (item.variations) {
            try {
                const vars = JSON.parse(item.variations);
                const selectedOpts: any[] = [];
                for (const vGroup of vars) {
                    if (vGroup.options && vGroup.options.length > 0 && vGroup.type === 'SINGLE') {
                        const opt = vGroup.options[0];
                        defOpts[vGroup.name] = [opt.name];
                        selectedOpts.push(opt);
                    } else if (vGroup.type === 'MULTIPLE') {
                        defOpts[vGroup.name] = [];
                    }
                }
                for (const opt of selectedOpts) {
                    if (opt.isAbsolute) p = parseFloat(opt.price);
                }
                for (const opt of selectedOpts) {
                    if (!opt.isAbsolute) p += parseFloat(opt.price);
                }
            } catch(e) {}
        }
        
        const existingIdx = cart.findIndex(c => 
            c.menuItemId === item.id && 
            JSON.stringify(c.options) === JSON.stringify(defOpts)
        );
        
        if (existingIdx >= 0) {
            const newCart = [...cart];
            newCart[existingIdx].quantity += 1;
            setCart(newCart);
        } else {
            setCart([...cart, {
                cartId: Math.random().toString(36).substring(7),
                menuItemId: item.id,
                name: item.name,
                price: p,
                quantity: 1,
                options: defOpts
            }]);
        }
    };
    
    const updateCartQty = (cartId: string, delta: number) => {
        setCart((prev: CartItem[]) => prev.map(c => c.cartId === cartId ? {...c, quantity: c.quantity + delta} : c).filter(c => c.quantity > 0));
    };

    const handleLike = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        const isLiked = likedItems.has(id);
        if (isLiked) {
            api.delete(`/menu/items/${id}/like`).catch(()=>{});
            const newSet = new Set(likedItems);
            newSet.delete(id);
            setLikedItems(newSet);
            localStorage.setItem('liked_items', JSON.stringify(Array.from(newSet)));
            setItems(prev => prev.map(i => i.id === id ? {...i, favoritesCount: Math.max(0, (i.favoritesCount || 0) - 1)} : i));
        } else {
            api.post(`/menu/items/${id}/like`).catch(()=>{});
            const newSet = new Set(likedItems);
            newSet.add(id);
            setLikedItems(newSet);
            localStorage.setItem('liked_items', JSON.stringify(Array.from(newSet)));
            setItems(prev => prev.map(i => i.id === id ? {...i, favoritesCount: (i.favoritesCount || 0) + 1} : i));
        }
    };

    // Відкриття модалки конфігуратора комбо
    const openComboModal = (combo: any) => {
        let config: any = null;
        try { config = JSON.parse(combo.comboConfig); } catch(e) {}
        if (!config || !config.slots) return;

        const slotPicks: Record<string, number> = {};
        config.slots.forEach((s: any) => {
            const eligible = items.filter(i => {
                if (!i.isAvailable) return false;
                if (s.selectionType === 'CATEGORY') {
                    return i.categoryId === s.categoryId || (s.categoryName && i.categoryName === s.categoryName);
                } else {
                    return s.itemIds && s.itemIds.includes(i.id);
                }
            });
            if (eligible.length > 0) {
                slotPicks[s.id] = eligible[0].id;
            }
        });

        let rewardPick: number | null = null;
        if (config.reward && config.reward.rewardType === 'FREE_ITEM') {
            const r = config.reward;
            const eligibleReward = items.filter(i => {
                if (!i.isAvailable) return false;
                if (r.selectionType === 'CATEGORY') {
                    return i.categoryId === r.categoryId || (r.categoryName && i.categoryName === r.categoryName);
                } else {
                    return r.itemIds && r.itemIds.includes(i.id);
                }
            });
            if (eligibleReward.length > 0) {
                rewardPick = eligibleReward[0].id;
            }
        }

        setComboSlotSelections(slotPicks);
        setComboRewardSelection(rewardPick);
        setActiveComboModal(combo);
    };

    const addComboToCart = () => {
        if (!activeComboModal) return;
        let config: any = null;
        try { config = JSON.parse(activeComboModal.comboConfig); } catch(e) {}
        if (!config) return;

        const itemsToAdd: CartItem[] = [];

        // Додаємо позиції вимог (слоти)
        config.slots.forEach((s: any) => {
            const pickedId = comboSlotSelections[s.id];
            const item = items.find(i => i.id === pickedId);
            if (item) {
                const qty = s.quantity || 1;
                for (let k = 0; k < qty; k++) {
                    itemsToAdd.push({
                        cartId: Math.random().toString(36).substring(7),
                        menuItemId: item.id,
                        name: item.name,
                        price: parseFloat(item.price),
                        quantity: 1,
                        options: {}
                    });
                }
            }
        });

        // Додаємо подарункову позицію
        if (config.reward && config.reward.rewardType === 'FREE_ITEM' && comboRewardSelection) {
            const rewardItem = items.find(i => i.id === comboRewardSelection);
            if (rewardItem) {
                const rQty = config.reward.quantity || 1;
                for (let k = 0; k < rQty; k++) {
                    itemsToAdd.push({
                        cartId: Math.random().toString(36).substring(7),
                        menuItemId: rewardItem.id,
                        name: `${rewardItem.name} (🎁 Подарунок)`,
                        price: parseFloat(rewardItem.price),
                        quantity: 1,
                        options: {}
                    });
                }
            }
        }

        if (itemsToAdd.length > 0) {
            setCart((prev: CartItem[]) => [...prev, ...itemsToAdd]);
            if (onSelectComboForOrder) {
                onSelectComboForOrder(activeComboModal.id);
            }
        }

        setActiveComboModal(null);
    };

    const normalCats = Array.from(new Set(items.filter(i => i.isAvailable).map(i => i.categoryName)));
    const categories = comboPromotions.length > 0 ? ['🔥 Комбо', ...normalCats] : normalCats;
    const currentItems = items.filter(i => i.isAvailable && i.categoryName === activeCategory);

    const renderVariations = (variationsStr: string) => {
        try {
            const vars = JSON.parse(variationsStr);
            return vars.map((group: any, idx: number) => (
                <div key={idx} className="mb-3.5">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-1.5 text-sm">{group.name}</h3>
                    <div className="flex flex-wrap gap-2">
                        {group.options.map((opt: any, optIdx: number) => {
                            const isSelected = (modalOptions[group.name] || []).includes(opt.name);
                            const toggleOption = () => {
                                const current = modalOptions[group.name] || [];
                                let next;
                                if (group.type === 'SINGLE') {
                                    next = [opt.name];
                                } else {
                                    if (isSelected) next = current.filter((n: string) => n !== opt.name);
                                    else next = [...current, opt.name];
                                }
                                setModalOptions({...modalOptions, [group.name]: next});
                            };
                            return (
                                <button 
                                    key={optIdx}
                                    onClick={toggleOption}
                                    className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                                        isSelected 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {opt.name} 
                                    <span className="ml-1 opacity-75 text-xs">
                                        {opt.isAbsolute ? `${opt.price} ₴` : (opt.price > 0 ? `+${opt.price} ₴` : '')}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            ));
        } catch(e) { return null; }
    };

    return (
        <div className="space-y-6 pb-20">
            {/* Горизонтальний список категорій */}
            <div className="flex gap-3 overflow-x-auto pb-4 pt-2 -mx-6 px-6 scroll-pl-6 no-scrollbar snap-x after:content-[''] after:w-1 after:shrink-0">
                {categories.map((cat: any) => (
                    <button 
                        key={cat} 
                        onClick={() => setActiveCategory(cat)}
                        className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full font-bold transition-all cursor-pointer ${
                            activeCategory === cat 
                                ? (cat === '🔥 Комбо' ? 'bg-amber-500 text-white shadow-md' : 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md')
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Модалка зі стравою */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4 animate-slideUpFade touch-none overscroll-none" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[2rem] rounded-b-none sm:rounded-[2.2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[88dvh] sm:max-h-[88vh] border-t sm:border border-slate-100 dark:border-slate-800 overscroll-contain" onClick={e => e.stopPropagation()}>
                        {selectedItem.imageUrl && (
                            <div className="shrink-0 h-40 sm:h-48 w-full bg-slate-950 relative">
                                <img src={selectedItem.imageUrl} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                            </div>
                        )}
                        <button onClick={() => setSelectedItem(null)} className="absolute top-3.5 right-3.5 w-9 h-9 bg-black/60 text-white rounded-full flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/80 transition-colors cursor-pointer text-sm shadow-md">✕</button>
                        
                        {/* Зона скролу контенту */}
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain">
                            <div className="flex justify-between items-start">
                                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-tight pr-4">{selectedItem.name}</h2>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-pink-500 bg-pink-50 dark:bg-pink-950/40 w-fit px-3 py-1 rounded-full">
                                <HeartIcon className="w-3.5 h-3.5" /> 
                                {(selectedItem.favoritesCount || 0)} людям подобається
                            </div>

                            {selectedItem.variations && (
                                <div className="pt-1 border-t border-slate-100 dark:border-slate-800/80">
                                    {renderVariations(selectedItem.variations)}
                                </div>
                            )}

                            {selectedItem.ingredients && (
                                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1 text-sm">Склад:</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-xs sm:text-sm leading-relaxed">{selectedItem.ingredients}</p>
                                </div>
                            )}

                            {selectedItem.allergens && (
                                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                                    <h3 className="font-bold text-amber-900 dark:text-amber-300 mb-1 text-xs">Алергени:</h3>
                                    <p className="text-amber-700 dark:text-amber-400 text-xs">{selectedItem.allergens}</p>
                                </div>
                            )}

                            {!selectedItem.ingredients && !selectedItem.allergens && !selectedItem.variations && (
                                <p className="text-slate-500 dark:text-slate-400 italic text-sm">Детальна інформація відсутня</p>
                            )}
                        </div>

                        {/* Фіксована панель кнопки додавання (текст ніколи не вилазить під кнопку) */}
                        <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 shadow-lg">
                            <button 
                                onClick={addToCart} 
                                className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-3.5 px-4 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 active:scale-[0.98] transition-all flex justify-center gap-2 items-center shadow-md cursor-pointer text-base"
                            >
                                <span>Додати</span>
                                <span className="opacity-50">•</span>
                                <span>{modalPrice} ₴</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Конфігуратор комбо (Модальне вікно) */}
            {activeComboModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-xs p-0 sm:p-4 animate-slideUpFade touch-none overscroll-none" onClick={() => setActiveComboModal(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full sm:max-w-md rounded-t-[2rem] rounded-b-none sm:rounded-[2.5rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90dvh] sm:max-h-[90vh] border-t sm:border border-slate-100 dark:border-slate-800 overscroll-contain" onClick={e => e.stopPropagation()}>
                        {activeComboModal.imageUrl && (
                            <div className="relative aspect-[16/9] w-full shrink-0 bg-slate-900">
                                <img src={activeComboModal.imageUrl} alt={activeComboModal.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                                <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-full shadow-md">
                                    🔥 Зібрати комбо
                                </span>
                                <button onClick={() => setActiveComboModal(null)} className="absolute top-4 right-4 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/75 transition-colors cursor-pointer">
                                    ✕
                                </button>
                            </div>
                        )}

                        <div className="p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
                            {!activeComboModal.imageUrl && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-amber-500 font-black text-xs uppercase tracking-wider">🔥 Зібрати комбо</span>
                                        <h2 className="text-xl font-black text-slate-900 dark:text-white leading-tight mt-0.5">
                                            {activeComboModal.title}
                                        </h2>
                                    </div>
                                    <button onClick={() => setActiveComboModal(null)} className="p-1 text-slate-400 hover:text-slate-600">✕</button>
                                </div>
                            )}

                            {activeComboModal.shortDescription && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    {activeComboModal.shortDescription}
                                </p>
                            )}

                            {/* Слоти вимог */}
                            {(() => {
                                let config: any = null;
                                try { config = JSON.parse(activeComboModal.comboConfig); } catch(e) {}
                                if (!config) return null;

                                return (
                                    <div className="space-y-4">
                                        {config.slots.map((slot: any, sIdx: number) => {
                                            const eligible = items.filter(i => {
                                                if (!i.isAvailable) return false;
                                                if (slot.selectionType === 'CATEGORY') {
                                                    return i.categoryId === slot.categoryId || (slot.categoryName && i.categoryName === slot.categoryName);
                                                } else {
                                                    return slot.itemIds && slot.itemIds.includes(i.id);
                                                }
                                            });

                                            return (
                                                <div key={slot.id || sIdx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-extrabold text-xs text-slate-800 dark:text-slate-200">
                                                            {slot.name || `Позиція #${sIdx + 1}`} ({slot.quantity || 1} шт.)
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold">Оберіть 1 варіант</span>
                                                    </div>

                                                    <div className="grid grid-cols-1 gap-2">
                                                        {eligible.map((item: any) => {
                                                            const isSelected = comboSlotSelections[slot.id] === item.id;
                                                            return (
                                                                <button
                                                                    key={item.id}
                                                                    type="button"
                                                                    onClick={() => setComboSlotSelections(prev => ({ ...prev, [slot.id]: item.id }))}
                                                                    className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                                                        isSelected
                                                                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 text-amber-900 dark:text-amber-200 ring-2 ring-amber-500/20'
                                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300'}`}>
                                                                            {isSelected && <span className="text-[10px]">✓</span>}
                                                                        </div>
                                                                        <span className="font-bold text-xs truncate">{item.name}</span>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 ml-2">
                                                                        {item.price} ₴
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {/* Подарункова позиція */}
                                        {config.reward && config.reward.rewardType === 'FREE_ITEM' && (
                                            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-extrabold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                                        <span>🎁</span>
                                                        <span>Ваш подарунок (0 ₴)</span>
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Безкоштовно</span>
                                                </div>

                                                <div className="grid grid-cols-1 gap-2">
                                                    {items.filter(i => {
                                                        if (!i.isAvailable) return false;
                                                        if (config.reward.selectionType === 'CATEGORY') {
                                                            return i.categoryId === config.reward.categoryId || (config.reward.categoryName && i.categoryName === config.reward.categoryName);
                                                        } else {
                                                            return config.reward.itemIds && config.reward.itemIds.includes(i.id);
                                                        }
                                                    }).map((item: any) => {
                                                        const isSelected = comboRewardSelection === item.id;
                                                        return (
                                                            <button
                                                                key={item.id}
                                                                type="button"
                                                                onClick={() => setComboRewardSelection(item.id)}
                                                                className={`p-2.5 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                                                                    isSelected
                                                                        ? 'bg-emerald-100/90 dark:bg-emerald-900/60 border-emerald-500 text-emerald-900 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                                                                        : 'bg-white dark:bg-slate-800 border-emerald-200/60 dark:border-emerald-800/60 text-slate-700 dark:text-slate-200'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300'}`}>
                                                                        {isSelected && <span className="text-[10px]">✓</span>}
                                                                    </div>
                                                                    <span className="font-bold text-xs truncate">{item.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                    <span className="text-xs line-through text-slate-400">{item.price} ₴</span>
                                                                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">0 ₴</span>
                                                                </div>
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>

                        {/* Кнопка додавання зібраного комбо в кошик */}
                        <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
                            <button
                                onClick={addComboToCart}
                                className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <SparklesIcon className="w-5 h-5 stroke-2" />
                                <span>Додати все комбо до кошика</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Рендер категорії: якщо '🔥 Комбо' - показуємо картки комбо-наборів */}
            {activeCategory === '🔥 Комбо' ? (
                <div className="space-y-4">
                    {comboPromotions.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800">
                            Наразі немає активних комбо-наборів
                        </div>
                    ) : (
                        comboPromotions.map((combo: any) => {
                            let parsed: any = null;
                            try { parsed = JSON.parse(combo.comboConfig); } catch(e) {}
                            const slots = parsed?.slots || [];
                            const reward = parsed?.reward || null;

                            return (
                                <div
                                    key={combo.id}
                                    className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs space-y-4 overflow-hidden relative"
                                >
                                    {combo.imageUrl && (
                                        <div className="aspect-[16/9] -mx-5 -mt-5 mb-4 relative overflow-hidden bg-slate-900">
                                            <img src={combo.imageUrl} alt={combo.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent"></div>
                                            <span className="absolute top-3 left-3 bg-amber-500 text-white font-black text-[11px] px-3 py-1 rounded-full uppercase tracking-wider shadow-md">
                                                🔥 Комбо набір
                                            </span>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {!combo.imageUrl && (
                                                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full uppercase">
                                                    🔥 Комбо
                                                </span>
                                            )}
                                            {combo.badgeText && (
                                                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-extrabold text-[11px] px-2.5 py-0.5 rounded-full">
                                                    {combo.badgeText}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-extrabold text-lg text-slate-900 dark:text-white leading-tight">
                                            {combo.title}
                                        </h3>
                                        {combo.shortDescription && (
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                                                {combo.shortDescription}
                                            </p>
                                        )}
                                    </div>

                                    {/* Формула комбо */}
                                    <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-800/50 space-y-2">
                                        <span className="text-[11px] font-black text-amber-800 dark:text-amber-300 block uppercase tracking-wider">
                                            Склад комбо-пропозиції:
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {slots.map((s: any, idx: number) => {
                                                const label = s.selectionType === 'CATEGORY'
                                                    ? `${s.quantity}× Будь-яка ${s.categoryName || 'страва'}`
                                                    : `${s.quantity}× [${s.itemNames?.join(', ') || 'Обрана страва'}]`;
                                                return (
                                                    <React.Fragment key={s.id || idx}>
                                                        <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 font-bold text-slate-800 dark:text-slate-200 shadow-2xs border border-slate-200/80 dark:border-slate-700">
                                                            {label}
                                                        </span>
                                                        {idx < slots.length - 1 && <span className="font-black text-amber-600">+</span>}
                                                    </React.Fragment>
                                                );
                                            })}

                                            {reward && (
                                                <>
                                                    <span className="font-black text-amber-600">➔</span>
                                                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white font-black shadow-xs">
                                                        {reward.rewardType === 'FREE_ITEM'
                                                            ? `🎁 ${reward.quantity || 1}× ${reward.selectionType === 'CATEGORY' ? reward.categoryName : reward.itemNames?.join(', ')} (0 ₴)`
                                                            : reward.rewardType === 'FIXED_PRICE'
                                                                ? `🏷️ Ціна: ${reward.fixedPrice} ₴`
                                                                : `🏷️ Знижка -${reward.discountPercent}%`}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => openComboModal(combo)}
                                        className="w-full py-3.5 px-4 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-sm shadow-md transition-all active:scale-98 flex items-center justify-center gap-2 cursor-pointer"
                                    >
                                        <SparklesIcon className="w-4 h-4 stroke-2" />
                                        <span>Зібрати та замовити комбо</span>
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            ) : (
                /* Сітка звичайних страв меню */
                <div className="grid grid-cols-2 gap-4">
                    {currentItems.map((i:any) => {
                        const qtyInCart = cart.filter(c => c.menuItemId === i.id).reduce((sum, c) => sum + c.quantity, 0);
                        
                        return (
                        <div key={i.id} className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs border border-slate-100 dark:border-slate-800 hover:shadow-lg dark:hover:border-slate-700 transition-all group relative">
                            <button 
                                onClick={(e) => handleLike(e, i.id)} 
                                className="absolute top-2 right-2 z-10 h-8 px-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full flex items-center gap-1.5 shadow-xs text-xs font-bold text-slate-600 dark:text-slate-300 transition-transform active:scale-90 cursor-pointer"
                            >
                                {likedItems.has(i.id) ? <HeartIcon className="w-4 h-4 text-pink-500" /> : <HeartIconOutline className="w-4 h-4 text-slate-400 dark:text-slate-400" />}
                                <span className={likedItems.has(i.id) ? "text-pink-600 dark:text-pink-400" : "text-slate-500 dark:text-slate-400"}>{i.favoritesCount || 0}</span>
                            </button>
                            
                            <div className="w-full aspect-[4/3] overflow-hidden bg-slate-100 dark:bg-slate-800 relative cursor-pointer" onClick={() => openModal(i)}>
                                {i.imageUrl ? 
                                    <img src={i.imageUrl} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    : <div className="w-full h-full"></div>
                                }
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                                <button className="absolute bottom-2 left-2 w-8 h-8 bg-black/40 backdrop-blur-md text-white rounded-full flex items-center justify-center pointer-events-none">
                                    <InformationCircleIcon className="w-5 h-5" />
                                </button>
                            </div>
                            
                            <div className="p-4 flex flex-col flex-1">
                                <h3 className="font-semibold text-slate-900 dark:text-white leading-tight mb-1 text-sm cursor-pointer hover:underline" onClick={() => openModal(i)}>{i.name}</h3>
                                <p className="text-slate-500 dark:text-slate-400 font-medium mb-4 flex-1 text-sm cursor-pointer" onClick={() => openModal(i)}>{i.price} ₴</p>
                                
                                {qtyInCart > 0 ? (
                                    <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 rounded-2xl p-1 shadow-inner h-11 px-4">
                                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">В кошику:</span>
                                        <span className="font-bold text-slate-900 dark:text-white text-center text-lg">{qtyInCart}</span>
                                    </div>
                                ) : (
                                    <button onClick={() => quickAdd(i)} className="w-full bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 h-11 rounded-2xl text-sm active:scale-95 transition-all ring-1 ring-slate-200 dark:ring-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                        Додати
                                    </button>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
            
            {/* Відображення детального кошика перед кнопкою "Оформити" */}
            {cart.length > 0 && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs mt-8">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-4 text-lg">Ваш кошик</h3>
                    <div className="space-y-4">
                        {cart.map(c => {
                            const optKeys = Object.keys(c.options);
                            return (
                                <div key={c.cartId} className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800/80 pb-3 last:border-0 last:pb-0">
                                    <div className="flex-1">
                                        <div className="font-medium text-slate-900 dark:text-white">{c.name}</div>
                                        {optKeys.length > 0 && (
                                            <div className="text-xs text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                                                {optKeys.map(k => c.options[k]).flat().filter(Boolean).join(', ')}
                                            </div>
                                        )}
                                        <div className="text-slate-900 dark:text-white font-bold text-sm mt-1">{c.price} ₴</div>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 rounded-xl p-1 shadow-inner shrink-0">
                                        <button onClick={() => updateCartQty(c.cartId, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-xs font-bold text-slate-600 dark:text-slate-200 active:scale-95 transition-all cursor-pointer">−</button>
                                        <span className="font-bold text-slate-900 dark:text-white w-4 text-center">{c.quantity}</span>
                                        <button onClick={() => updateCartQty(c.cartId, 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-xs font-bold text-slate-600 dark:text-slate-200 active:scale-95 transition-all cursor-pointer">+</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function Footer({ info, theme, toggle }: { info: any; theme: 'light' | 'dark'; toggle: () => void }) {
    const name = info?.name || 'Ресторан «RestoFlow»';
    const description = info?.description || 'Авторська кухня, затишна атмосфера та швидкий сервіс';
    const wifiSsid = info?.wifiSsid || 'Resto_Guest';
    const wifiPass = info?.wifiPassword || 'resto2026';
    const hours = info?.workingHours || '10:00 – 23:00 щодня';
    const address = info?.address || 'вул. Хрещатик, 1, Київ';
    const phone = info?.phone || '+380 44 123 45 67';
    const instagram = info?.instagram;
    const lat = info?.lat ? Number(info.lat) : 50.4501;
    const lng = info?.lng ? Number(info.lng) : 30.5234;

    return (
        <footer className="mt-16 space-y-6 pt-8 border-t border-slate-200/70 dark:border-slate-800/80 px-6 pb-6 text-slate-600 dark:text-slate-400 transition-colors">
            {/* Блок перемикача теми (Опція 1: окремий перемикач) */}
            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 flex items-center justify-between shadow-xs">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Тема інтерфейсу
                </span>
                <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700">
                    <button
                        type="button"
                        onClick={theme === 'dark' ? toggle : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            theme === 'light'
                                ? 'bg-white text-amber-600 shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                        aria-pressed={theme === 'light'}
                    >
                        <SunIcon className="w-3.5 h-3.5" />
                        <span>Світла</span>
                    </button>
                    <button
                        type="button"
                        onClick={theme === 'light' ? toggle : undefined}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                            theme === 'dark'
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                        }`}
                        aria-pressed={theme === 'dark'}
                    >
                        <MoonIcon className="w-3.5 h-3.5" />
                        <span>Темна</span>
                    </button>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{name}</h3>
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 text-xs">
                {wifiPass && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
                        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                            <WifiIcon className="w-4 h-4 text-indigo-500" />
                            <span className="font-medium">Wi-Fi: <strong className="text-slate-900 dark:text-white">{wifiSsid}</strong></span>
                        </div>
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-lg">{wifiPass}</span>
                    </div>
                )}
                {hours && (
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-slate-700 dark:text-slate-300">
                        <ClockIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>{hours}</span>
                    </div>
                )}
                {address && (
                    <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-slate-700 dark:text-slate-300">
                        <MapPinIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>{address}</span>
                    </div>
                )}
                {phone && (
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-2.5 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors">
                        <PhoneIcon className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span className="font-semibold">{phone}</span>
                    </a>
                )}
                {instagram && (
                    <a href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-amber-500/10 border border-pink-200/60 dark:border-pink-900/40 text-pink-700 dark:text-pink-300 font-semibold hover:opacity-90 transition-opacity">
                        <span>📸 Наш Instagram</span>
                        <span className="text-xs">@{instagram.replace(/^.*instagram\.com\//, '').replace('@', '').replace(/\/$/, '')} →</span>
                    </a>
                )}
            </div>

            {info?.lat && info?.lng && (
                <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Як нас знайти</span>
                    <LeafletMap lat={lat} lng={lng} label={name} />
                </div>
            )}

            <div className="pt-4 text-center text-[10px] text-slate-400 dark:text-slate-600">
                © {new Date().getFullYear()} {name}. Працює на RestoFlow.
            </div>
        </footer>
    );
}
