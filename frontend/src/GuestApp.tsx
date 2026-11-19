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
    XMarkIcon,
    PlusIcon,
    MinusIcon,
    TrashIcon,
    ArrowTopRightOnSquareIcon
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
        <div className="min-h-screen bg-stone-100/60 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans transition-colors duration-300">
            <div className="min-h-screen pb-32 max-w-xl mx-auto bg-stone-50 dark:bg-stone-950 relative sm:border-x sm:border-stone-200/80 dark:sm:border-stone-800/80 shadow-sm flex flex-col">
                <header className="glass dark:bg-stone-900/90 dark:border-stone-800/80 sticky top-0 z-30 px-5 sm:px-6 py-3.5 flex justify-between items-center transition-colors border-x-0 border-t-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-amber-600 text-white flex flex-col items-center justify-center shadow-sm shrink-0">
                            <span className="text-4xs font-bold uppercase tracking-wider leading-none opacity-80">Стіл</span>
                            <span className="text-sm font-black leading-tight">{tableNum}</span>
                        </div>
                        <div>
                            <div className="text-2xs font-semibold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                                {restaurantInfo?.name || 'Цифрове меню'}
                            </div>
                            <h1 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-white leading-tight">
                                Ваше замовлення
                            </h1>
                        </div>
                    </div>
                    <CallWaiterButton />
                </header>
                <main className="p-4 sm:p-6 flex-1">
                    <GuestFlow />
                </main>
                <Footer info={restaurantInfo} theme={theme} toggle={toggle} />
            </div>
        </div>
    );
}

function CallWaiterButton() {
    const [calling, setCalling] = useState(false);
    const [showToast, setShowToast] = useState(false);

    useEffect(() => {
        api.get('/service-calls/my').then(res => setCalling(res.data.length > 0)).catch(() => {});
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => client.subscribe('/user/queue/service-calls', (msg) => {
            try {
                const data = JSON.parse(msg.body);
                if (data.type === 'CALL_RESOLVED' || data.type === 'RESOLVED' || data.call?.status === 'RESOLVED') {
                    setCalling(false);
                }
            } catch {}
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
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-semibold text-xs sm:text-sm transition-all duration-200 cursor-pointer ${
                    calling 
                        ? 'bg-amber-600 text-white shadow-sm' 
                        : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700 border border-stone-200/90 dark:border-stone-700 shadow-xs active:scale-95'
                }`}
                aria-label="Викликати офіціанта"
            >
                <span className="relative flex items-center justify-center">
                    <BellIcon className={`w-4 h-4 stroke-2 ${calling ? 'text-white' : 'text-amber-600 dark:text-amber-500'}`} />
                    {calling && (
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-white animate-ping" />
                    )}
                </span>
                <span>{calling ? 'Офіціант іде...' : 'Офіціант'}</span>
            </button>

            {showToast && (
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 dark:bg-stone-800/95 backdrop-blur-md text-white px-4 py-3 rounded-xl shadow-xl border border-white/10 flex items-center gap-2.5 text-xs font-semibold animate-slideUpFade max-w-xs w-full">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>Офіціант отримав виклик та вже прямує до вашого столу!</span>
                </div>
            )}
        </>
    );
}

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
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [submittingOrder, setSubmittingOrder] = useState(false);

    const fetchOrders = () => api.get('/orders/my').then(res => setOrders(res.data)).catch(() => {});

    const upsertOrRemoveOrder = (updatedOrder: any) => {
        if (!updatedOrder || !updatedOrder.id) return;
        setOrders(prev => {
            if (updatedOrder.status === 'PAID') {
                return prev.filter(o => o.id !== updatedOrder.id);
            }
            const exists = prev.some(o => o.id === updatedOrder.id);
            if (exists) {
                return prev.map(o => o.id === updatedOrder.id ? updatedOrder : o);
            }
            return [...prev, updatedOrder];
        });
    };

    useEffect(() => {
        fetchOrders();
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => client.subscribe('/user/queue/order-updates', (msg) => {
            if (msg?.body) {
                try {
                    const data = JSON.parse(msg.body);
                    if (data?.order) {
                        upsertOrRemoveOrder(data.order);
                        return;
                    }
                } catch {}
            }
            fetchOrders();
        }));
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/user/queue/order-updates'); };
    }, []);

    useEffect(() => {
        if (isCartOpen) {
            const orig = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => { document.body.style.overflow = orig; };
        }
    }, [isCartOpen]);

    const updateCartQty = (cartId: string, delta: number) => {
        setCart((prev: CartItem[]) => {
            const next = prev.map(c => c.cartId === cartId ? { ...c, quantity: c.quantity + delta } : c).filter(c => c.quantity > 0);
            if (next.length === 0) setIsCartOpen(false);
            return next;
        });
    };

    const sendOrder = async () => {
        const payloadItems = cart.map(c => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            options: c.options
        }));
        
        if (!payloadItems.length || submittingOrder) return;
        setSubmittingOrder(true);
        
        try {
            const res = await api.post('/orders', { items: payloadItems });
            let finalOrder = res.data;
            if (lastComboPromoId) {
                try {
                    const promoRes = await api.post(`/orders/${res.data.id}/apply-promotion`, { promotionId: lastComboPromoId });
                    if (promoRes.data) finalOrder = promoRes.data;
                } catch(e) {}
                setLastComboPromoId(null);
            }
            setCart([]);
            setIsCartOpen(false);
            upsertOrRemoveOrder(finalOrder);
        } catch(e:any) {
            alert(e.response?.data?.message || 'Помилка оформлення замовлення');
        } finally {
            setSubmittingOrder(false);
        }
    };

    const count = cart.reduce((a, b) => a + b.quantity, 0);
    const totalAmount = cart.reduce((a, b) => a + (b.price * b.quantity), 0);

    return (
        <div className="space-y-6 relative">
            <PromoCarousel 
                onSelectMenuItem={(id) => setTargetPromoMenuItemId(id)} 
                onSelectCategory={(cat) => setTargetCategory(cat)}
            />
            {orders.length > 0 && (
                <ActiveOrders
                    orders={orders}
                    onOrderUpdated={(updatedOrder?: any) => updatedOrder ? upsertOrRemoveOrder(updatedOrder) : fetchOrders()}
                />
            )}
            <Menu 
                cart={cart} 
                setCart={setCart} 
                updateCartQty={updateCartQty}
                targetPromoMenuItemId={targetPromoMenuItemId} 
                clearTargetPromo={() => setTargetPromoMenuItemId(null)}
                targetCategory={targetCategory}
                clearTargetCategory={() => setTargetCategory(null)}
                onSelectComboForOrder={(promoId) => setLastComboPromoId(promoId)}
            />
            
            {/* Плаваюча панель відкриття кошика */}
            {count > 0 && (
                <div className="fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-0 right-0 px-4 sm:px-6 z-40 max-w-xl mx-auto animate-slideUpFade">
                    <button
                        onClick={() => setIsCartOpen(true)}
                        className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white p-4 rounded-2xl font-bold flex items-center justify-between active:scale-[0.99] transition-all shadow-xl border border-stone-800 dark:border-amber-500/40 cursor-pointer"
                    >
                        <div className="flex items-center gap-3">
                            <div className="bg-amber-500 dark:bg-stone-950/30 text-white px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-sm font-black">
                                <ShoppingBagIcon className="w-4 h-4" />
                                <span>{count}</span>
                            </div>
                            <div className="text-left">
                                <div className="text-sm sm:text-base font-bold leading-tight">Переглянути кошик</div>
                                <div className="text-2xs font-medium text-stone-300 dark:text-amber-100">Перевірте позиції перед відправкою</div>
                            </div>
                        </div>
                        <span className="text-base sm:text-lg font-extrabold bg-white/10 px-3 py-1.5 rounded-xl whitespace-nowrap">
                            {totalAmount}&nbsp;₴ →
                        </span>
                    </button>
                </div>
            )}

            {/* Модальне вікно / шторка кошика (Cart Bottom Sheet) */}
            {isCartOpen && count > 0 && createPortal(
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn"
                    onClick={() => setIsCartOpen(false)}
                >
                    <div
                        className="animate-slideUpFade bg-white dark:bg-stone-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[88dvh] border-t sm:border border-stone-200 dark:border-stone-800"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/60 dark:bg-stone-950/40">
                            <div className="flex items-center gap-2.5">
                                <ShoppingBagIcon className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                                <h3 className="font-bold text-base sm:text-lg text-stone-900 dark:text-white">
                                    Ваше замовлення ({count})
                                </h3>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setCart([]); setIsCartOpen(false); }}
                                    className="p-2 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                                    title="Очистити кошик"
                                >
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsCartOpen(false)}
                                    className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
                                >
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-3 divide-y divide-stone-100 dark:divide-stone-800/80">
                            {cart.map(c => {
                                const optKeys = Object.keys(c.options);
                                const optsText = optKeys.map(k => c.options[k]).flat().filter(Boolean).join(', ');
                                return (
                                    <div key={c.cartId} className="pt-3 first:pt-0 flex justify-between items-center gap-3">
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-sm text-stone-900 dark:text-white leading-snug">
                                                {c.name}
                                            </div>
                                            {optsText && (
                                                <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 leading-tight">
                                                    {optsText}
                                                </div>
                                            )}
                                            <div className="text-amber-700 dark:text-amber-400 font-bold text-xs mt-1">
                                                {c.price} ₴ × {c.quantity} = {c.price * c.quantity} ₴
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-stone-100 dark:bg-stone-800 rounded-xl p-1 shrink-0 border border-stone-200/70 dark:border-stone-700">
                                            <button
                                                type="button"
                                                onClick={() => updateCartQty(c.cartId, -1)}
                                                className="w-7 h-7 flex items-center justify-center bg-white dark:bg-stone-700 rounded-lg shadow-xs font-bold text-stone-700 dark:text-stone-200 active:scale-95 transition-all cursor-pointer"
                                            >
                                                <MinusIcon className="w-3.5 h-3.5 stroke-2" />
                                            </button>
                                            <span className="font-bold text-xs text-stone-900 dark:text-white w-5 text-center">
                                                {c.quantity}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() => updateCartQty(c.cartId, 1)}
                                                className="w-7 h-7 flex items-center justify-center bg-white dark:bg-stone-700 rounded-lg shadow-xs font-bold text-stone-700 dark:text-stone-200 active:scale-95 transition-all cursor-pointer"
                                            >
                                                <PlusIcon className="w-3.5 h-3.5 stroke-2" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-stone-200/80 dark:border-stone-800 bg-stone-50 dark:bg-stone-950/60 space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-stone-500 dark:text-stone-400 font-medium">Разом до сплати:</span>
                                <span className="text-xl font-extrabold text-stone-900 dark:text-white">{totalAmount}&nbsp;₴</span>
                            </div>
                            <button
                                type="button"
                                onClick={sendOrder}
                                disabled={submittingOrder}
                                className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3.5 px-5 rounded-xl font-bold text-sm sm:text-base shadow-md active:scale-[0.99] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <CheckIcon className="w-5 h-5 stroke-2" />
                                <span>{submittingOrder ? 'Відправляємо на кухню...' : 'Підтвердити замовлення'}</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}

function ActiveOrders({ orders, onOrderUpdated }: { orders: any[]; onOrderUpdated?: (updatedOrder?: any) => void }) {
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
            const res = await api.post(`/orders/${orderId}/apply-promotion`, { promotionId });
            setPromosModalOrderId(null);
            if (onOrderUpdated) onOrderUpdated(res.data);
        } catch (e: any) {
            alert(e.response?.data?.message || 'Помилка застосування акції');
        } finally {
            setApplyingPromo(false);
        }
    };

    return (
        <div className="space-y-3">
            <h2 className="text-base font-bold text-stone-900 dark:text-white flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-amber-600" />
                <span>Активні замовлення</span>
            </h2>
            <div className="space-y-4">
                {orders.map(o => (
                    <div key={o.id} className="bg-white dark:bg-stone-900 rounded-2xl p-4 sm:p-5 border border-stone-200/80 dark:border-stone-800 shadow-xs relative">
                        <div className="flex justify-between items-center mb-3.5">
                            <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider inline-flex items-center gap-1.5 ${
                                o.status === 'NEW' 
                                    ? 'bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300' 
                                    : o.status === 'PREPARING' 
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                            }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                    o.status === 'NEW' ? 'bg-stone-400' : o.status === 'PREPARING' ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'
                                }`} />
                                {o.status === 'NEW' ? 'Прийнято' : o.status === 'PREPARING' ? 'Готується' : 'Готово до подачі'}
                            </span>
                            <span className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white whitespace-nowrap">{o.total}&nbsp;₴</span>
                        </div>
                        <div className="text-sm text-stone-600 dark:text-stone-400 mb-4 space-y-2">
                            {o.items.map((i: any, idx: number) => {
                                const opts = formatOptions(i.selectedOptions);
                                const isItemReady = i.status === "READY";
                                const isItemServed = i.status === "SERVED";
                                const isItemPreparing = i.status === "PREPARING";

                                return (
                                <div key={idx} className="flex justify-between items-center p-2.5 rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/60 dark:border-stone-700/50">
                                    <div className="flex gap-2.5 items-center min-w-0 pr-2">
                                        <span className="text-stone-700 dark:text-stone-200 font-bold text-xs bg-white dark:bg-stone-700 px-2 py-0.5 rounded-md border border-stone-200/80 dark:border-stone-600 whitespace-nowrap">{i.quantity}×</span> 
                                        <div className="min-w-0">
                                            <div className={`font-semibold text-sm leading-snug truncate ${isItemServed ? "line-through text-stone-400 dark:text-stone-500" : "text-stone-900 dark:text-stone-100"}`}>{i.name}</div>
                                            {opts && <div className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 truncate">{opts}</div>}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {isItemReady && (
                                            <span className="text-2xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800 inline-flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping" />
                                                <span>Несуть вам</span>
                                            </span>
                                        )}
                                        {isItemServed && (
                                            <span className="text-2xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50 inline-flex items-center gap-1">
                                                <CheckIcon className="w-3 h-3 stroke-2" />
                                                <span>Подано</span>
                                            </span>
                                        )}
                                        {isItemPreparing && (
                                            <span className="text-2xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 rounded-full border border-amber-200/60 dark:border-amber-800/40 inline-flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" />
                                                <span>Готується</span>
                                            </span>
                                        )}
                                        {(!i.status || i.status === "NEW") && (
                                            <span className="text-2xs font-medium text-stone-500 dark:text-stone-400 bg-stone-200/60 dark:bg-stone-700 px-2 py-0.5 rounded-full">
                                                В черзі
                                            </span>
                                        )}
                                        <span className="font-bold text-stone-800 dark:text-stone-200 whitespace-nowrap text-xs ml-1">{i.priceAtTime * i.quantity} ₴</span>
                                    </div>
                                </div>
                            )})}
                        </div>

                        {o.discountAmount > 0 && (
                            <div className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex justify-between items-center text-xs gap-3">
                                <div className="min-w-0 flex-1">
                                    <div className="font-bold text-emerald-800 dark:text-emerald-300 truncate flex items-center gap-1.5">
                                        <TagIcon className="w-4 h-4 shrink-0" />
                                        <span className="truncate">{o.appliedPromotionTitle}</span>
                                    </div>
                                    <div className="text-2xs text-emerald-600 dark:text-emerald-400 mt-0.5 whitespace-nowrap">
                                        Сума без знижки: {o.subtotal || (Number(o.total) + Number(o.discountAmount))}&nbsp;₴
                                    </div>
                                </div>
                                <div className="text-right shrink-0 whitespace-nowrap">
                                    <span className="font-black text-sm text-emerald-700 dark:text-emerald-400 whitespace-nowrap inline-block">
                                        -{o.discountAmount}&nbsp;₴
                                    </span>
                                </div>
                            </div>
                        )}

                        {!o.paid && (!o.discountAmount || o.discountAmount === 0) && (
                            <div className="mb-3 space-y-2">
                                {activePromotions.length > 0 && (
                                    <button
                                        type="button"
                                        onClick={() => setPromosModalOrderId(o.id)}
                                        className="w-full p-2.5 rounded-xl bg-stone-100 hover:bg-stone-200/70 dark:bg-stone-800 dark:hover:bg-stone-700/70 border border-stone-200 dark:border-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                                    >
                                        <span className="flex items-center gap-1.5">
                                            <SparklesIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                            <span>Застосувати акцію або комбо</span>
                                        </span>
                                        <span className="text-2xs font-bold text-amber-700 dark:text-amber-400">
                                            Обрати →
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
                                    className="w-full p-2.5 rounded-xl bg-amber-50/70 hover:bg-amber-100/70 dark:bg-amber-950/30 dark:hover:bg-amber-900/40 border border-amber-200/80 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer"
                                >
                                    <span className="flex items-center gap-1.5">
                                        <GiftIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                        <span>День народження чи свято?</span>
                                    </span>
                                    <span className="text-2xs font-bold text-amber-700 dark:text-amber-300">
                                        Повідомити →
                                    </span>
                                </button>
                            </div>
                        )}

                        {!o.paid ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                                <button onClick={() => pay(o.id)} disabled={checkingOut === o.id} className="w-full flex items-center justify-center gap-2 bg-stone-900 dark:bg-amber-600 text-white p-3 rounded-xl text-xs sm:text-sm font-bold disabled:opacity-50 hover:bg-stone-800 dark:hover:bg-amber-500 transition-colors shadow-xs cursor-pointer">
                                    <CreditCardIcon className="w-4 h-4 shrink-0" />
                                    <span>{checkingOut === o.id ? 'Зачекайте...' : `Оплатити ${o.total} ₴ (LiqPay)`}</span>
                                </button>
                                <button onClick={() => {
                                    api.post('/service-calls', { type: 'BILL' }).then(() => alert('Офіціант зараз підійде з рахунком!'));
                                }} className="w-full flex items-center justify-center gap-2 bg-stone-100 dark:bg-stone-800 text-stone-800 dark:text-stone-200 p-3 rounded-xl text-xs sm:text-sm font-semibold hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer border border-stone-200/70 dark:border-stone-700">
                                    <BanknotesIcon className="w-4 h-4 shrink-0" />
                                    <span>Карткою / готівкою офіціанту</span>
                                </button>
                            </div>
                        ) : (
                            <div className="w-full flex items-center justify-center gap-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 p-3 rounded-xl text-sm font-bold border border-emerald-200 dark:border-emerald-800">
                                <CheckCircleIcon className="w-5 h-5" /> Оплачено
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {promosModalOrderId && createPortal(
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-sm animate-fadeIn" onClick={() => setPromosModalOrderId(null)}>
                    <div className="animate-slideUpFade bg-white dark:bg-stone-900 w-full max-w-sm rounded-2xl p-5 shadow-2xl border border-stone-200 dark:border-stone-800 space-y-4" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center">
                            <h3 className="font-bold text-base text-stone-900 dark:text-white">Доступні акції</h3>
                            <button onClick={() => setPromosModalOrderId(null)} className="p-1 rounded-lg text-stone-400 hover:text-stone-600">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-2 max-h-72 overflow-y-auto">
                            {activePromotions.map(p => (
                                <button
                                    key={p.id}
                                    disabled={applyingPromo}
                                    onClick={() => handleApplyPromotion(promosModalOrderId, p.id)}
                                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-500 text-left transition-all hover:bg-stone-50 dark:hover:bg-stone-800 cursor-pointer disabled:opacity-50"
                                >
                                    <div className="font-bold text-xs text-stone-900 dark:text-white flex items-center justify-between">
                                        <span>{p.title}</span>
                                        {p.promoType === 'COMBO' ? (
                                            <span className="text-3xs text-amber-600 font-bold uppercase flex items-center gap-1">
                                                <FireIcon className="w-3.5 h-3.5" /> Комбо
                                            </span>
                                        ) : p.discountPercent > 0 ? (
                                            <span className="text-3xs text-emerald-600 font-bold">-{p.discountPercent}%</span>
                                        ) : null}
                                    </div>
                                    {p.shortDescription && (
                                        <p className="text-2xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2 leading-relaxed">
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
    updateCartQty,
    targetPromoMenuItemId,
    clearTargetPromo,
    targetCategory,
    clearTargetCategory,
    onSelectComboForOrder
}: { 
    cart: CartItem[]; 
    setCart: any;
    updateCartQty: (cartId: string, delta: number) => void;
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
    
    const [modalOptions, setModalOptions] = useState<Record<string, string[]>>({});
    const [modalPrice, setModalPrice] = useState<number>(0);

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
                setActiveCategory('COMBO');
            } else if (normalCats.length > 0) {
                setActiveCategory(normalCats[0] as string);
            }
        }); 
        
        try {
            const saved = localStorage.getItem('liked_items');
            if (saved) setLikedItems(new Set(JSON.parse(saved)));
        } catch(e) {}
    }, []);

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
        setActiveCategory(targetCategory === '🔥 Комбо' ? 'COMBO' : targetCategory);
        if (clearTargetCategory) clearTargetCategory();
    }, [targetCategory]);

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

    const decrementItemFromCard = (itemId: number) => {
        const matching = cart.filter(c => c.menuItemId === itemId);
        if (matching.length > 0) {
            const targetCartItem = matching[matching.length - 1];
            updateCartQty(targetCartItem.cartId, -1);
        }
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

        if (config.reward && config.reward.rewardType === 'FREE_ITEM' && comboRewardSelection) {
            const rewardItem = items.find(i => i.id === comboRewardSelection);
            if (rewardItem) {
                const rQty = config.reward.quantity || 1;
                for (let k = 0; k < rQty; k++) {
                    itemsToAdd.push({
                        cartId: Math.random().toString(36).substring(7),
                        menuItemId: rewardItem.id,
                        name: `${rewardItem.name} (Подарунок)`,
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
    const categories = comboPromotions.length > 0 ? ['COMBO', ...normalCats] : normalCats;
    const currentItems = items.filter(i => i.isAvailable && i.categoryName === activeCategory);

    const renderVariations = (variationsStr: string) => {
        try {
            const vars = JSON.parse(variationsStr);
            return vars.map((group: any, idx: number) => (
                <div key={idx} className="mb-4">
                    <h3 className="font-bold text-stone-900 dark:text-white mb-2 text-xs uppercase tracking-wider">{group.name}</h3>
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
                                    className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border ${
                                        isSelected 
                                            ? 'bg-stone-900 dark:bg-amber-600 text-white border-stone-900 dark:border-amber-600 shadow-xs' 
                                            : 'bg-stone-50 dark:bg-stone-800 text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-700'
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
        <div className="space-y-5 pb-12">
            {/* Горизонтальний список категорій */}
            <div className="flex gap-2 overflow-x-auto pb-2 pt-1 -mx-4 px-4 sm:-mx-6 sm:px-6 no-scrollbar snap-x">
                {categories.map((cat: any) => {
                    const isCombo = cat === 'COMBO';
                    const isActive = activeCategory === cat;
                    return (
                        <button 
                            key={cat} 
                            onClick={() => setActiveCategory(cat)}
                            className={`snap-start whitespace-nowrap px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                                isActive 
                                    ? (isCombo ? 'bg-amber-600 text-white shadow-sm' : 'bg-stone-900 dark:bg-amber-600 text-white shadow-sm')
                                    : 'bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 border border-stone-200/80 dark:border-stone-800'
                            }`}
                        >
                            {isCombo && <FireIcon className="w-4 h-4 stroke-2 shrink-0" />}
                            <span>{isCombo ? 'Комбо-набори' : cat}</span>
                        </button>
                    );
                })}
            </div>

            {/* Модалка зі стравою */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn touch-none overscroll-none" onClick={() => setSelectedItem(null)}>
                    <div className="animate-slideUpFade bg-white dark:bg-stone-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[88dvh] sm:max-h-[88vh] border-t sm:border border-stone-200 dark:border-stone-800 overscroll-contain" onClick={e => e.stopPropagation()}>
                        {selectedItem.imageUrl && (
                            <div className="shrink-0 h-48 sm:h-52 w-full bg-stone-950 relative">
                                <img src={selectedItem.imageUrl} alt={selectedItem.name} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                            </div>
                        )}
                        <button onClick={() => setSelectedItem(null)} className="absolute top-3.5 right-3.5 w-9 h-9 bg-black/55 text-white rounded-full flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/80 transition-colors cursor-pointer shadow-md">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                        
                        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain">
                            <div className="flex justify-between items-start gap-3">
                                <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-white leading-tight">{selectedItem.name}</h2>
                                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-500 whitespace-nowrap shrink-0">{modalPrice} ₴</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 w-fit px-3 py-1 rounded-full">
                                <HeartIcon className="w-3.5 h-3.5" /> 
                                {(selectedItem.favoritesCount || 0)} вподобань гостей
                            </div>

                            {selectedItem.variations && (
                                <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80">
                                    {renderVariations(selectedItem.variations)}
                                </div>
                            )}

                            {selectedItem.ingredients && (
                                <div className="pt-3 border-t border-stone-100 dark:border-stone-800/80">
                                    <h3 className="font-bold text-stone-900 dark:text-white mb-1 text-xs uppercase tracking-wider">Опис та склад</h3>
                                    <p className="text-stone-600 dark:text-stone-300 text-sm leading-relaxed">{selectedItem.ingredients}</p>
                                </div>
                            )}

                            {selectedItem.allergens && (
                                <div className="bg-amber-50/80 dark:bg-amber-950/30 p-3.5 rounded-xl border border-amber-200/70 dark:border-amber-900/40">
                                    <h3 className="font-bold text-amber-900 dark:text-amber-300 mb-0.5 text-xs">Алергени:</h3>
                                    <p className="text-amber-800 dark:text-amber-400 text-xs">{selectedItem.allergens}</p>
                                </div>
                            )}

                            {!selectedItem.ingredients && !selectedItem.allergens && !selectedItem.variations && (
                                <p className="text-stone-500 dark:text-stone-400 italic text-sm">Детальний опис страви уточнюйте в офіціанта.</p>
                            )}
                        </div>

                        <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
                            <button 
                                onClick={addToCart} 
                                className="w-full bg-stone-900 hover:bg-stone-800 dark:bg-amber-600 dark:hover:bg-amber-500 text-white py-3.5 px-4 rounded-xl font-bold active:scale-[0.98] transition-all flex justify-center gap-2 items-center shadow-sm cursor-pointer text-sm sm:text-base"
                            >
                                <PlusIcon className="w-5 h-5 stroke-2" />
                                <span>Додати до замовлення</span>
                                <span className="opacity-50">•</span>
                                <span>{modalPrice} ₴</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Конфігуратор комбо */}
            {activeComboModal && createPortal(
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-stone-950/70 backdrop-blur-sm p-0 sm:p-4 animate-fadeIn touch-none overscroll-none" onClick={() => setActiveComboModal(null)}>
                    <div className="animate-slideUpFade bg-white dark:bg-stone-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl relative flex flex-col max-h-[90dvh] sm:max-h-[90vh] border-t sm:border border-stone-200 dark:border-stone-800 overscroll-contain" onClick={e => e.stopPropagation()}>
                        {activeComboModal.imageUrl && (
                            <div className="relative aspect-[16/9] w-full shrink-0 bg-stone-900">
                                <img src={activeComboModal.imageUrl} alt={activeComboModal.title} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent"></div>
                                <span className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-600 text-white text-xs font-bold uppercase tracking-wider rounded-full shadow-md flex items-center gap-1">
                                    <FireIcon className="w-3.5 h-3.5" />
                                    <span>Зібрати комбо</span>
                                </span>
                                <button onClick={() => setActiveComboModal(null)} className="absolute top-4 right-4 w-9 h-9 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/75 transition-colors cursor-pointer">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        )}

                        <div className="p-6 overflow-y-auto space-y-5 flex-1 overscroll-contain">
                            {!activeComboModal.imageUrl && (
                                <div className="flex justify-between items-start">
                                    <div>
                                        <span className="text-amber-600 font-bold text-xs uppercase tracking-wider flex items-center gap-1">
                                            <FireIcon className="w-3.5 h-3.5" /> Зібрати комбо
                                        </span>
                                        <h2 className="text-xl font-bold text-stone-900 dark:text-white leading-tight mt-0.5">
                                            {activeComboModal.title}
                                        </h2>
                                    </div>
                                    <button onClick={() => setActiveComboModal(null)} className="p-1 text-stone-400 hover:text-stone-600">
                                        <XMarkIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            )}

                            {activeComboModal.shortDescription && (
                                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">
                                    {activeComboModal.shortDescription}
                                </p>
                            )}

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
                                                <div key={slot.id || sIdx} className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-bold text-xs text-stone-800 dark:text-stone-200">
                                                            {slot.name || `Позиція #${sIdx + 1}`} ({slot.quantity || 1} шт.)
                                                        </span>
                                                        <span className="text-3xs text-stone-400 uppercase font-bold">Оберіть 1 варіант</span>
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
                                                                            : 'bg-white dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-700/60'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-2 min-w-0">
                                                                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-300'}`}>
                                                                            {isSelected && <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />}
                                                                        </div>
                                                                        <span className="font-bold text-xs truncate">{item.name}</span>
                                                                    </div>
                                                                    <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 shrink-0 ml-2">
                                                                        {item.price} ₴
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            );
                                        })}

                                        {config.reward && config.reward.rewardType === 'FREE_ITEM' && (
                                            <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2.5">
                                                <div className="flex items-center justify-between">
                                                    <span className="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                                        <GiftIcon className="w-4 h-4" />
                                                        <span>Ваш подарунок (0 ₴)</span>
                                                    </span>
                                                    <span className="text-3xs text-emerald-600 dark:text-emerald-400 font-bold uppercase">Безкоштовно</span>
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
                                                                        : 'bg-white dark:bg-stone-800 border-emerald-200/60 dark:border-emerald-800/60 text-stone-700 dark:text-stone-200'
                                                                }`}
                                                            >
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${isSelected ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-stone-300'}`}>
                                                                        {isSelected && <CheckIcon className="w-2.5 h-2.5 stroke-[3]" />}
                                                                    </div>
                                                                    <span className="font-bold text-xs truncate">{item.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-1.5 shrink-0 ml-2">
                                                                    <span className="text-xs line-through text-stone-400">{item.price} ₴</span>
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

                        <div className="p-4 sm:p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] border-t border-stone-100 dark:border-stone-800 bg-white dark:bg-stone-900 shrink-0">
                            <button
                                onClick={addComboToCart}
                                className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <SparklesIcon className="w-5 h-5 stroke-2" />
                                <span>Додати комбо до замовлення</span>
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Рендер категорії комбо або сітки страв */}
            {activeCategory === 'COMBO' ? (
                <div className="space-y-4">
                    {comboPromotions.length === 0 ? (
                        <div className="text-center py-12 text-stone-400 bg-white dark:bg-stone-900 rounded-2xl p-6 border border-stone-200/80 dark:border-stone-800">
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
                                    className="bg-white dark:bg-stone-900 rounded-2xl p-5 border border-stone-200/80 dark:border-stone-800 shadow-xs space-y-4 overflow-hidden relative"
                                >
                                    {combo.imageUrl && (
                                        <div className="aspect-[16/9] -mx-5 -mt-5 mb-4 relative overflow-hidden bg-stone-900">
                                            <img src={combo.imageUrl} alt={combo.title} className="w-full h-full object-cover" />
                                            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-transparent to-transparent"></div>
                                            <span className="absolute top-3 left-3 bg-amber-600 text-white font-bold text-2xs px-3 py-1 rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1">
                                                <FireIcon className="w-3.5 h-3.5" /> Комбо-набір
                                            </span>
                                        </div>
                                    )}

                                    <div>
                                        <div className="flex items-center gap-2 mb-1.5">
                                            {!combo.imageUrl && (
                                                <span className="bg-amber-500/10 text-amber-700 dark:text-amber-400 font-bold text-2xs px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
                                                    <FireIcon className="w-3 h-3" /> Комбо
                                                </span>
                                            )}
                                            {combo.badgeText && (
                                                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold text-2xs px-2.5 py-0.5 rounded-full">
                                                    {combo.badgeText}
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-lg text-stone-900 dark:text-white leading-tight">
                                            {combo.title}
                                        </h3>
                                        {combo.shortDescription && (
                                            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 leading-relaxed">
                                                {combo.shortDescription}
                                            </p>
                                        )}
                                    </div>

                                    <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 space-y-2">
                                        <span className="text-2xs font-bold text-amber-900 dark:text-amber-300 block uppercase tracking-wider">
                                            Склад комбо-пропозиції:
                                        </span>
                                        <div className="flex flex-wrap items-center gap-2 text-xs">
                                            {slots.map((s: any, idx: number) => {
                                                const label = s.selectionType === 'CATEGORY'
                                                    ? `${s.quantity}× Будь-яка ${s.categoryName || 'страва'}`
                                                    : `${s.quantity}× [${s.itemNames?.join(', ') || 'Обрана страва'}]`;
                                                return (
                                                    <React.Fragment key={s.id || idx}>
                                                        <span className="px-2.5 py-1 rounded-lg bg-white dark:bg-stone-800 font-semibold text-stone-800 dark:text-stone-200 border border-stone-200/80 dark:border-stone-700">
                                                            {label}
                                                        </span>
                                                        {idx < slots.length - 1 && <span className="font-bold text-amber-600">+</span>}
                                                    </React.Fragment>
                                                );
                                            })}

                                            {reward && (
                                                <>
                                                    <span className="font-bold text-amber-600">→</span>
                                                    <span className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold inline-flex items-center gap-1">
                                                        {reward.rewardType === 'FREE_ITEM' ? (
                                                            <>
                                                                <GiftIcon className="w-3.5 h-3.5" />
                                                                <span>{reward.quantity || 1}× {reward.selectionType === 'CATEGORY' ? reward.categoryName : reward.itemNames?.join(', ')} (0 ₴)</span>
                                                            </>
                                                        ) : reward.rewardType === 'FIXED_PRICE' ? (
                                                            <>
                                                                <TagIcon className="w-3.5 h-3.5" />
                                                                <span>Ціна: {reward.fixedPrice} ₴</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <TagIcon className="w-3.5 h-3.5" />
                                                                <span>Знижка -{reward.discountPercent}%</span>
                                                            </>
                                                        )}
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => openComboModal(combo)}
                                        className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm shadow-xs transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
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
                <div className="grid grid-cols-2 gap-3.5 sm:gap-4">
                    {currentItems.map((i:any) => {
                        const qtyInCart = cart.filter(c => c.menuItemId === i.id).reduce((sum, c) => sum + c.quantity, 0);
                        
                        return (
                        <div key={i.id} className="flex flex-col bg-white dark:bg-stone-900 rounded-2xl overflow-hidden shadow-xs border border-stone-200/80 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-700 transition-all group relative">
                            <button 
                                onClick={(e) => handleLike(e, i.id)} 
                                className="absolute top-2.5 right-2.5 z-10 h-7 px-2 bg-white/90 dark:bg-stone-900/90 backdrop-blur-md rounded-full flex items-center gap-1 shadow-xs text-2xs font-bold text-stone-600 dark:text-stone-300 transition-transform active:scale-90 cursor-pointer border border-stone-200/50 dark:border-stone-700/60"
                            >
                                {likedItems.has(i.id) ? <HeartIcon className="w-3.5 h-3.5 text-rose-500" /> : <HeartIconOutline className="w-3.5 h-3.5 text-stone-400" />}
                                <span className={likedItems.has(i.id) ? "text-rose-600 dark:text-rose-400" : "text-stone-500 dark:text-stone-400"}>{i.favoritesCount || 0}</span>
                            </button>
                            
                            <div className="w-full aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800 relative cursor-pointer" onClick={() => openModal(i)}>
                                {i.imageUrl ? 
                                    <img src={i.imageUrl} alt={i.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    : <div className="w-full h-full" />
                                }
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                                <span className="absolute bottom-2 left-2 w-7 h-7 bg-black/45 backdrop-blur-md text-white rounded-full flex items-center justify-center pointer-events-none">
                                    <InformationCircleIcon className="w-4 h-4" />
                                </span>
                            </div>
                            
                            <div className="p-3.5 flex flex-col flex-1">
                                <h3 className="font-bold text-stone-900 dark:text-white leading-snug mb-1 text-sm line-clamp-2 min-h-[2.5rem] cursor-pointer hover:text-amber-600 dark:hover:text-amber-400 transition-colors" onClick={() => openModal(i)}>
                                    {i.name}
                                </h3>
                                <p className="text-stone-900 dark:text-stone-100 font-extrabold mb-3 text-base cursor-pointer" onClick={() => openModal(i)}>
                                    {i.price} <span className="text-xs font-semibold text-stone-500">₴</span>
                                </p>
                                
                                <div className="mt-auto">
                                    {qtyInCart > 0 ? (
                                        <div className="flex justify-between items-center bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800/70 rounded-xl p-1 h-10">
                                            <button
                                                type="button"
                                                onClick={() => decrementItemFromCard(i.id)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 shadow-xs active:scale-95 transition-transform cursor-pointer"
                                                aria-label="Зменшити кількість"
                                            >
                                                <MinusIcon className="w-4 h-4 stroke-2" />
                                            </button>
                                            <span className="font-extrabold text-amber-900 dark:text-amber-300 text-sm">{qtyInCart}</span>
                                            <button
                                                type="button"
                                                onClick={() => quickAdd(i)}
                                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-amber-600 text-white shadow-xs active:scale-95 transition-transform cursor-pointer"
                                                aria-label="Додати ще"
                                            >
                                                <PlusIcon className="w-4 h-4 stroke-2" />
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => quickAdd(i)}
                                            className="w-full bg-stone-100 hover:bg-stone-900 hover:text-white dark:bg-stone-800 dark:hover:bg-amber-600 font-bold text-stone-800 dark:text-stone-100 h-10 rounded-xl text-xs sm:text-sm active:scale-95 transition-all border border-stone-200/80 dark:border-stone-700 cursor-pointer flex items-center justify-center gap-1.5"
                                        >
                                            <PlusIcon className="w-4 h-4 stroke-2" />
                                            <span>Додати</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )})}
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
        <footer className="mt-8 space-y-5 pt-6 border-t border-stone-200/80 dark:border-stone-800/80 px-5 sm:px-6 pb-8 text-stone-600 dark:text-stone-400 transition-colors">
            <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between shadow-2xs">
                <span className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                    Тема оформлення
                </span>
                <div className="inline-flex rounded-lg p-0.5 bg-stone-100 dark:bg-stone-800 border border-stone-200/60 dark:border-stone-700">
                    <button
                        type="button"
                        onClick={theme === 'dark' ? toggle : undefined}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                            theme === 'light'
                                ? 'bg-white text-amber-600 shadow-xs'
                                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                        }`}
                        aria-pressed={theme === 'light'}
                    >
                        <SunIcon className="w-3.5 h-3.5" />
                        <span>Світла</span>
                    </button>
                    <button
                        type="button"
                        onClick={theme === 'light' ? toggle : undefined}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                            theme === 'dark'
                                ? 'bg-stone-900 text-amber-400 shadow-xs'
                                : 'text-stone-500 hover:text-stone-800 dark:text-stone-400'
                        }`}
                        aria-pressed={theme === 'dark'}
                    >
                        <MoonIcon className="w-3.5 h-3.5" />
                        <span>Темна</span>
                    </button>
                </div>
            </div>

            <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-stone-900 dark:text-white">{name}</h3>
                <p className="text-xs leading-relaxed text-stone-500 dark:text-stone-400">{description}</p>
            </div>

            <div className="grid grid-cols-1 gap-2 text-xs">
                {wifiPass && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
                        <div className="flex items-center gap-2.5 text-stone-700 dark:text-stone-300">
                            <WifiIcon className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                            <span className="font-medium">Wi-Fi: <strong className="text-stone-900 dark:text-white">{wifiSsid}</strong></span>
                        </div>
                        <span className="font-mono text-2xs font-bold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md">{wifiPass}</span>
                    </div>
                )}
                {hours && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300">
                        <ClockIcon className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                        <span>{hours}</span>
                    </div>
                )}
                {address && (
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300">
                        <MapPinIcon className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                        <span>{address}</span>
                    </div>
                )}
                {phone && (
                    <a href={`tel:${phone.replace(/\s+/g, '')}`} className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:text-amber-600 transition-colors">
                        <PhoneIcon className="w-4 h-4 text-amber-600 dark:text-amber-500 shrink-0" />
                        <span className="font-semibold">{phone}</span>
                    </a>
                )}
                {instagram && (
                    <a href={instagram.startsWith('http') ? instagram : `https://instagram.com/${instagram.replace('@', '')}`} target="_blank" rel="noreferrer" className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 text-stone-800 dark:text-stone-200 font-semibold hover:border-amber-500 transition-colors">
                        <span className="flex items-center gap-2">
                            <ArrowTopRightOnSquareIcon className="w-4 h-4 text-amber-600 dark:text-amber-500" />
                            <span>Instagram закладу</span>
                        </span>
                        <span className="text-xs text-amber-600 dark:text-amber-400">@{instagram.replace(/^.*instagram\.com\//, '').replace('@', '').replace(/\/$/, '')} →</span>
                    </a>
                )}
            </div>

            {info?.lat && info?.lng && (
                <div className="space-y-2 pt-1">
                    <span className="text-2xs font-bold uppercase tracking-wider text-stone-400">Розташування</span>
                    <LeafletMap lat={lat} lng={lng} label={name} />
                </div>
            )}

            <div className="pt-3 text-center text-2xs text-stone-400 dark:text-stone-600">
                © {new Date().getFullYear()} {name}
            </div>
        </footer>
    );
}
