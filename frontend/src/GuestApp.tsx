import PromoCarousel from './components/PromoCarousel';
import LeafletMap from './components/LeafletMap';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from './api';
import { getStompClient, onWsConnect } from './ws';
import ThemeToggle, { useTheme } from './ThemeToggle';
import { BellIcon, CreditCardIcon, CheckCircleIcon, FireIcon, InformationCircleIcon, BanknotesIcon, WifiIcon, ClockIcon, MapPinIcon, PhoneIcon } from '@heroicons/react/24/outline';
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
                <div className="flex items-center gap-2">
                    <ThemeToggle 
                        theme={theme} 
                        toggle={toggle} 
                        className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 ring-1 ring-slate-200 dark:ring-slate-700/80 shadow-xs hover:scale-105 active:scale-95 transition-all" 
                    />
                    <CallWaiterButton />
                </div>
            </header>
            <main className="p-6">
                <GuestFlow />
            </main>
            <Footer info={restaurantInfo} />
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
        const unsubConnect = onWsConnect(() => {
            client.subscribe('/user/queue/service-calls', (m) => {
                const body = JSON.parse(m.body);
                if (body.type === 'CALL_CREATED') setCalling(true);
                if (body.type === 'CALL_RESOLVED') setCalling(false);
            });
        });
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/user/queue/service-calls'); };
    }, []);

    const call = () => {
        if (calling) {
            setCalling(false);
            api.delete('/service-calls/my').catch(() => setCalling(true));
            return;
        }
        
        setCalling(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 4000);
        
        api.post('/service-calls', { type: 'WAITER' })
           .catch(() => {
               setCalling(false);
               setShowToast(false);
               alert('Помилка при виклику офіціанта');
           });
    };

    return (
        <>
            <button onClick={call} className={`relative p-3 rounded-full transition-all duration-500 shadow-xs ${calling ? 'bg-amber-500 text-white scale-110 shadow-amber-500/40 ring-4 ring-amber-500/20' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105 ring-1 ring-slate-200 dark:ring-slate-700/80'}`} title="Покликати офіціанта">
                <BellIcon className={`w-6 h-6 ${calling ? 'animate-wiggle' : ''}`} />
                {calling && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full animate-ping"></span>}
                {calling && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 border-2 border-white rounded-full"></span>}
            </button>
            
            {showToast && createPortal(
                <div className="fixed bottom-10 inset-x-0 mx-auto z-[100] flex justify-center px-6 pointer-events-none animate-slideUpFade w-full max-w-md">
                    <div className="bg-emerald-500 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-3 w-full border border-emerald-400">
                        <CheckCircleIcon className="w-8 h-8 text-emerald-100 shrink-0" />
                        <div>
                            <div className="font-bold text-lg leading-tight">Офіціант вже в дорозі!</div>
                            <div className="text-emerald-50 text-sm font-medium mt-0.5">Будь ласка, зачекайте хвилиночку</div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
}

// Новий тип для корзини з опціями
type CartItem = {
    cartId: string;
    menuItemId: number;
    name: string;
    price: number; // Ціна за 1 шт (з урахуванням опцій)
    quantity: number;
    options: Record<string, string[]>;
};

function GuestFlow() {
    const [cart, setCart] = useState<CartItem[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [targetPromoMenuItemId, setTargetPromoMenuItemId] = useState<number | null>(null);

    const fetchOrders = () => api.get('/orders/my').then(res => setOrders(res.data));
    useEffect(() => {
        fetchOrders();
        const client = getStompClient();
        if (!client) return;
        const unsubConnect = onWsConnect(() => client.subscribe('/user/queue/order-updates', () => fetchOrders()));
        return () => { unsubConnect(); if (client.connected) client.unsubscribe('/user/queue/order-updates'); };
    }, []);

    const sendOrder = async () => {
        // Формуємо запит за новим форматом
        const payloadItems = cart.map(c => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            options: c.options
        }));
        
        if (!payloadItems.length) return;
        
        try {
            await api.post('/orders', { items: payloadItems });
            setCart([]);
            fetchOrders();
        } catch(e:any) { alert(e.response?.data?.message || 'Помилка замовлення'); }
    };

    const count = cart.reduce((a, b) => a + b.quantity, 0);
    const totalAmount = cart.reduce((a, b) => a + (b.price * b.quantity), 0);

    return (
        <div className="space-y-8 relative">
            <PromoCarousel onSelectMenuItem={(id) => setTargetPromoMenuItemId(id)} />
            {orders.length > 0 && <ActiveOrders orders={orders} />}
            <Menu 
                cart={cart} 
                setCart={setCart} 
                targetPromoMenuItemId={targetPromoMenuItemId} 
                clearTargetPromo={() => setTargetPromoMenuItemId(null)} 
            />
            
            {count > 0 && (
                <div className="fixed bottom-6 left-0 right-0 px-6 z-40 max-w-md mx-auto animate-slideUpFade">
                    <button onClick={sendOrder} className="w-full glass-dark dark:bg-indigo-600/90 dark:border-indigo-400/30 text-white p-4 rounded-3xl font-bold flex flex-col justify-center hover:scale-[1.02] active:scale-95 transition-transform shadow-2xl">
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-3">
                                <div className="bg-white/20 p-2 rounded-2xl"><ShoppingBagIcon className="w-6 h-6" /></div>
                                <span className="text-lg">Оформити ({count})</span>
                            </div>
                            <span className="text-xl tracking-tight">{totalAmount} ₴ →</span>
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
}

function ActiveOrders({ orders }: { orders: any[] }) {
    const [checkingOut, setCheckingOut] = useState<string | null>(null);

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

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                <FireIcon className="w-5 h-5 text-amber-500" /> Ваші замовлення
            </h2>
            <div className="space-y-4">
                {orders.map(o => (
                    <div key={o.id} className="p-5 rounded-3xl bg-white dark:bg-slate-900 shadow-xs border border-slate-100 dark:border-slate-800 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-center mb-4">
                            <span className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wider rounded-xl ${
                                o.status === 'NEW' 
                                    ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-100 dark:ring-blue-900/40' 
                                    : o.status === 'PREPARING' 
                                        ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/40' 
                                        : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-100 dark:ring-emerald-900/40'
                            }`}>
                                {o.status === 'NEW' ? 'В черзі' : o.status === 'PREPARING' ? 'Готується' : 'Готово'}
                            </span>
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{o.total} ₴</span>
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
                        {!o.paid ? (
                            <div className="flex flex-col gap-2 mt-4">
                                <button onClick={() => pay(o.id)} disabled={checkingOut === o.id} className="w-full flex items-center justify-center gap-2 bg-slate-900 dark:bg-indigo-600 text-white p-3.5 rounded-2xl font-semibold disabled:opacity-50 hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors shadow-xs">
                                    <CreditCardIcon className="w-5 h-5" />
                                    {checkingOut === o.id ? 'Зачекайте...' : 'Оплатити онлайн (LiqPay)'}
                                </button>
                                <button onClick={() => {
                                    api.post('/service-calls', { type: 'BILL' }).then(() => alert('Офіціант зараз підійде з рахунком!'));
                                }} className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3.5 rounded-2xl font-semibold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
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
        </div>
    );
}

function Menu({ 
    cart, 
    setCart,
    targetPromoMenuItemId,
    clearTargetPromo
}: { 
    cart: CartItem[]; 
    setCart: any;
    targetPromoMenuItemId?: number | null;
    clearTargetPromo?: () => void;
}) {
    const [items, setItems] = useState<any[]>([]);
    const [activeCategory, setActiveCategory] = useState<string>('');
    const [selectedItem, setSelectedItem] = useState<any>(null); // Для модалки
    const [likedItems, setLikedItems] = useState<Set<number>>(new Set());
    
    // Стейт для опцій в модалці
    const [modalOptions, setModalOptions] = useState<Record<string, string[]>>({});
    const [modalPrice, setModalPrice] = useState<number>(0);

    useEffect(() => { 
        api.get('/menu/items').then(res => {
            setItems(res.data);
            const cats = Array.from(new Set(res.data.filter((i:any) => i.isAvailable).map((i:any) => i.categoryName)));
            if (cats.length > 0) setActiveCategory(cats[0] as string);
        }); 
        
        try {
            const saved = localStorage.getItem('liked_items');
            if (saved) setLikedItems(new Set(JSON.parse(saved)));
        } catch(e) {}
    }, []);

    // При кліку на акцію зі стравою відкриваємо модалку страви та активуємо її категорію
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
                
                // First apply absolute prices
                for (const opt of selectedOpts) {
                    if (opt.isAbsolute) p = parseFloat(opt.price);
                }
                
                // Then apply additive prices
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
        
        // Виставляємо дефолтні опції (першу в групі)
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
        
        // Шукаємо чи є вже такий товар З ТАКИМИ Ж ОПЦІЯМИ
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
    
    // Quick Add from Grid (uses default options)
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
        setCart(prev => prev.map(c => c.cartId === cartId ? {...c, quantity: c.quantity + delta} : c).filter(c => c.quantity > 0));
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

    const categories = Array.from(new Set(items.filter(i => i.isAvailable).map(i => i.categoryName)));
    const currentItems = items.filter(i => i.isAvailable && i.categoryName === activeCategory);

    // Допоміжна функція для рендеру опцій
    const renderVariations = (variationsStr: string) => {
        try {
            const vars = JSON.parse(variationsStr);
            return vars.map((group: any, idx: number) => (
                <div key={idx} className="mb-5">
                    <h3 className="font-bold text-slate-900 dark:text-white mb-2">{group.name}</h3>
                    <div className="flex flex-wrap gap-2">
                        {group.options.map((opt: any, optIdx: number) => {
                            const isSelected = (modalOptions[group.name] || []).includes(opt.name);
                            const toggleOption = () => {
                                const current = modalOptions[group.name] || [];
                                let next;
                                if (group.type === 'SINGLE') {
                                    next = [opt.name]; // always select exactly one
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
                                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                                        isSelected 
                                            ? 'bg-indigo-600 text-white shadow-md' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    {opt.name} 
                                    <span className={`ml-1 opacity-75 text-xs`}>
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
                        className={`snap-start whitespace-nowrap px-5 py-2.5 rounded-full font-bold transition-all ${
                            activeCategory === cat 
                                ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-md' 
                                : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                        }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Модалка з інформацією про продукт */}
            {selectedItem && createPortal(
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 sm:p-0 animate-slideUpFade" onClick={() => setSelectedItem(null)}>
                    <div className="bg-white dark:bg-slate-900 w-full sm:max-w-sm rounded-[2rem] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh] border border-slate-100 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        {selectedItem.imageUrl && <div className="shrink-0"><img src={selectedItem.imageUrl} className="w-full aspect-[4/3] object-cover" /></div>}
                        <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur-md z-10 hover:bg-black/70 transition-colors">✕</button>
                        
                        <div className="p-6 overflow-y-auto">
                            <div className="flex justify-between items-start mb-2">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white leading-tight pr-4">{selectedItem.name}</h2>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-6 text-sm font-medium text-pink-500 bg-pink-50 dark:bg-pink-950/40 w-fit px-3 py-1 rounded-full">
                                <HeartIcon className="w-4 h-4" /> 
                                {(selectedItem.favoritesCount || 0)} людям подобається
                            </div>

                            {selectedItem.variations && (
                                <div className="mb-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    {renderVariations(selectedItem.variations)}
                                </div>
                            )}

                            {selectedItem.ingredients && (
                                <div className="mb-4">
                                    <h3 className="font-bold text-slate-900 dark:text-white mb-1">Склад:</h3>
                                    <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed">{selectedItem.ingredients}</p>
                                </div>
                            )}

                            {selectedItem.allergens && (
                                <div className="mb-6 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                                    <h3 className="font-bold text-amber-900 dark:text-amber-300 mb-1 text-sm">Алергени:</h3>
                                    <p className="text-amber-700 dark:text-amber-400 text-sm">{selectedItem.allergens}</p>
                                </div>
                            )}

                            {!selectedItem.ingredients && !selectedItem.allergens && !selectedItem.variations && (
                                <p className="text-slate-500 dark:text-slate-400 mb-6 italic">Детальна інформація відсутня</p>
                            )}

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900">
                                <button onClick={addToCart} className="w-full bg-slate-900 dark:bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 dark:hover:bg-indigo-500 transition-colors flex justify-center gap-2 items-center shadow-md">
                                    <span>Додати</span>
                                    <span className="opacity-50">•</span>
                                    <span>{modalPrice} ₴</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Сітка товарів */}
            <div className="grid grid-cols-2 gap-4">
                {currentItems.map((i:any) => {
                    // Рахуємо скільки ТАКИХ товарів (з будь-якими опціями) в кошику
                    const qtyInCart = cart.filter(c => c.menuItemId === i.id).reduce((sum, c) => sum + c.quantity, 0);
                    
                    return (
                    <div key={i.id} className="flex flex-col bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-xs border border-slate-100 dark:border-slate-800 hover:shadow-lg dark:hover:border-slate-700 transition-all group relative">
                        <button 
                            onClick={(e) => handleLike(e, i.id)} 
                            className="absolute top-2 right-2 z-10 h-8 px-2.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full flex items-center gap-1.5 shadow-xs text-xs font-bold text-slate-600 dark:text-slate-300 transition-transform active:scale-90"
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
                                <button onClick={() => quickAdd(i)} className="w-full bg-slate-50 dark:bg-slate-800/80 font-bold text-slate-700 dark:text-slate-200 h-11 rounded-2xl text-sm active:scale-95 transition-all ring-1 ring-slate-200 dark:ring-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-700">
                                    Додати
                                </button>
                            )}
                        </div>
                    </div>
                )})}
            </div>
            
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
                                        <button onClick={() => updateCartQty(c.cartId, -1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-xs font-bold text-slate-600 dark:text-slate-200 active:scale-95 transition-all">−</button>
                                        <span className="font-bold text-slate-900 dark:text-white w-4 text-center">{c.quantity}</span>
                                        <button onClick={() => updateCartQty(c.cartId, 1)} className="w-8 h-8 flex items-center justify-center bg-white dark:bg-slate-700 rounded-lg shadow-xs font-bold text-slate-600 dark:text-slate-200 active:scale-95 transition-all">+</button>
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

function Footer({ info }: { info: any }) {
    const name = info?.name || 'Ресторан «RestoFlow»';
    const description = info?.description || 'Авторська кухня, затишна атмосфера та швидкий сервіс';
    const wifiSsid = info?.wifiSsid || 'Resto_Guest';
    const wifiPassword = info?.wifiPassword || 'resto2026';
    const workingHours = info?.workingHours || 'Пн–Нд: 10:00 – 22:00';
    const address = info?.address || 'вул. Володимирська, 24';
    const phone = info?.phone || '+380442345678';
    const phoneLink = 'tel:' + phone.replace(/[^0-9+]/g, '');
    const allergensNote = info?.allergensNote || 'Якщо у вас є харчова алергія або особливі побажання до інгредієнтів, будь ласка, повідомте про це офіціанта.';

    return (
        <footer className="mt-8 px-6 pt-8 pb-12 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 rounded-t-[2.5rem] shadow-xs">
            {/* Логотип закладу та назва */}
            <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-black text-xl mb-3 shadow-xs border border-indigo-100 dark:border-indigo-900/50">
                    {name.charAt(0) || 'R'}
                </div>
                <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white">{name}</h2>
                {description && <p className="text-xs text-slate-400 dark:text-slate-400 mt-1">{description}</p>}
            </div>

            {/* Швидкі картки з інформацією */}
            <div className="space-y-3 mb-6">
                {/* Wi-Fi плашка */}
                {wifiSsid && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-indigo-100/70 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                <WifiIcon className="w-5 h-5" />
                            </div>
                            <div className="text-left">
                                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Wi-Fi для гостей</div>
                                <div className="text-sm font-bold text-slate-800 dark:text-slate-200">{wifiSsid}</div>
                            </div>
                        </div>
                        {wifiPassword && (
                            <span className="text-xs font-mono font-bold bg-white dark:bg-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-2xs">
                                {wifiPassword}
                            </span>
                        )}
                    </div>
                )}

                {/* Графік роботи */}
                {workingHours && (
                    <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                        <div className="p-2 bg-emerald-100/70 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <ClockIcon className="w-5 h-5" />
                        </div>
                        <div className="text-left">
                            <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Графік роботи</div>
                            <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{workingHours}</div>
                        </div>
                    </div>
                )}

                {/* Адреса та контакт */}
                {(address || phone) && (
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                        <div className="flex items-center gap-3 text-left">
                            <div className="p-2 bg-amber-100/70 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 rounded-xl">
                                <MapPinIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="text-xs text-slate-400 dark:text-slate-500 font-medium">Локація та бронь</div>
                                <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{address || phone}</div>
                            </div>
                        </div>
                        {phone && (
                            <a href={phoneLink} className="p-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors" title="Зателефонувати">
                                <PhoneIcon className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                )}

                {/* Інтерактивна карта Leaflet */}
                <div className="pt-2">
                    <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Як нас знайти</span>
                        <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium truncate max-w-[200px]">{address}</span>
                    </div>
                    <LeafletMap 
                        lat={info?.latitude || 50.4485} 
                        lng={info?.longitude || 30.5186} 
                        title={name} 
                        address={address} 
                        readOnly={true} 
                        height="200px" 
                    />
                </div>
            </div>

            {/* Інформація про алергени */}
            {allergensNote && (
                <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/40 rounded-2xl border border-amber-100 dark:border-amber-900/40 mb-6 text-left">
                    <div className="flex items-start gap-2.5">
                        <InformationCircleIcon className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-900/80 dark:text-amber-300 leading-relaxed">
                            {allergensNote}
                        </p>
                    </div>
                </div>
            )}

            {/* Копірайт та інфо */}
            <div className="text-center border-t border-slate-100 dark:border-slate-800 pt-5">
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                    Безконтактне обслуговування • Оплата онлайн або карткою
                </p>
                <p className="text-[11px] text-slate-300 dark:text-slate-600 mt-1">
                    © 2026 {name} • Смачного відпочинку! ✨
                </p>
            </div>
        </footer>
    );
}
