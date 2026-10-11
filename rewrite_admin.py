import sys

new_content = """import React, { useEffect, useState, useRef } from 'react';
import { api } from '../api';
import { PhotoIcon, PencilIcon, PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function AdminMenu() {
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [newCat, setNewCat] = useState('');
    const [newItem, setNewItem] = useState({ name: '', price: '', categoryId: '', ingredients: '', allergens: '' });
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const [editingItem, setEditingItem] = useState<any>(null);
    const [editingVariations, setEditingVariations] = useState<any[]>([]);

    const load = () => {
        api.get('/menu/categories').then(res => setCategories(res.data));
        api.get('/menu/items').then(res => setItems(res.data));
    };
    useEffect(() => { load(); }, []);

    const addCat = async () => {
        if(!newCat) return;
        await api.post('/menu/categories', { name: newCat });
        setNewCat('');
        load();
    };

    const addItem = async () => {
        if(!newItem.name || !newItem.price || !newItem.categoryId) return;
        try {
            const res = await api.post('/menu/items', { 
                name: newItem.name, 
                price: parseFloat(newItem.price), 
                categoryId: parseInt(newItem.categoryId) 
            });
            if (selectedFile) {
                const formData = new FormData();
                formData.append('file', selectedFile);
                await api.post(`/menu/items/${res.data.id}/image`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            setNewItem({ name: '', price: '', categoryId: '', ingredients: '', allergens: '' });
            setSelectedFile(null);
            if(fileInputRef.current) fileInputRef.current.value = '';
            load();
        } catch(err:any) { alert(err.response?.data?.message || 'Помилка створення'); }
    };

    const toggleAvail = async (id: number, avail: boolean) => {
        await api.patch(`/menu/items/${id}/availability`, { isAvailable: !avail });
        load();
    };

    const uploadImageForItem = async (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0]) return;
        try {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            await api.post(`/menu/items/${id}/image`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            load();
        } catch(err:any) { alert(err.response?.data?.message || 'Помилка завантаження'); }
    };

    const openEditModal = (item: any) => {
        setEditingItem({ ...item });
        try {
            if (item.variations) {
                setEditingVariations(JSON.parse(item.variations));
            } else {
                setEditingVariations([]);
            }
        } catch (e) {
            setEditingVariations([]);
        }
    };

    const saveEditItem = async () => {
        if (!editingItem) return;
        try {
            const varsJson = editingVariations.length > 0 ? JSON.stringify(editingVariations) : null;
            await api.put(`/menu/items/${editingItem.id}`, {
                name: editingItem.name,
                price: parseFloat(editingItem.price),
                categoryId: parseInt(editingItem.categoryId) || categories.find((c:any) => c.name === editingItem.categoryName)?.id,
                ingredients: editingItem.ingredients || '',
                allergens: editingItem.allergens || '',
                variations: varsJson
            });
            setEditingItem(null);
            load();
        } catch (err: any) {
            alert(err.response?.data?.message || 'Помилка збереження');
        }
    };

    const addVariationGroup = () => {
        setEditingVariations([...editingVariations, { name: '', type: 'SINGLE', options: [] }]);
    };

    const updateVariationGroup = (index: number, key: string, value: any) => {
        const newVars = [...editingVariations];
        newVars[index][key] = value;
        setEditingVariations(newVars);
    };

    const removeVariationGroup = (index: number) => {
        const newVars = [...editingVariations];
        newVars.splice(index, 1);
        setEditingVariations(newVars);
    };

    const addVariationOption = (groupIndex: number) => {
        const newVars = [...editingVariations];
        newVars[groupIndex].options.push({ name: '', priceModifier: 0, isAbsolutePrice: false });
        setEditingVariations(newVars);
    };

    const updateVariationOption = (groupIndex: number, optionIndex: number, key: string, value: any) => {
        const newVars = [...editingVariations];
        newVars[groupIndex].options[optionIndex][key] = value;
        setEditingVariations(newVars);
    };

    const removeVariationOption = (groupIndex: number, optionIndex: number) => {
        const newVars = [...editingVariations];
        newVars[groupIndex].options.splice(optionIndex, 1);
        setEditingVariations(newVars);
    };

    return (
        <div className="p-8 max-w-6xl">
            <h1 className="text-2xl font-bold mb-6 text-slate-900 dark:text-white">Редактор меню</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Categories */}
                <div className="col-span-1 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 h-fit">
                    <h2 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Категорії</h2>
                    <div className="flex gap-2 mb-6">
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg flex-1" value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Нова категорія"/>
                        <button onClick={addCat} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700">Додати</button>
                    </div>
                    <ul className="space-y-2">
                        {categories.map((c:any) => <li key={c.id} className="p-3 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-900/50 font-medium text-slate-900 dark:text-slate-200">{c.name}</li>)}
                    </ul>
                </div>
                {/* Items */}
                <div className="col-span-2 bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h2 className="font-bold text-lg mb-4 text-slate-900 dark:text-white">Нова страва</h2>
                    <div className="grid grid-cols-2 gap-4 mb-6 p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg col-span-2" value={newItem.name} onChange={e=>setNewItem({...newItem, name:e.target.value})} placeholder="Назва страви"/>
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg col-span-2 text-sm" value={newItem.ingredients} onChange={e=>setNewItem({...newItem, ingredients:e.target.value})} placeholder="Склад (інгредієнти)"/>
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg col-span-2 text-sm" value={newItem.allergens} onChange={e=>setNewItem({...newItem, allergens:e.target.value})} placeholder="Алергени"/>
                        <input className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg" type="number" step="0.01" value={newItem.price} onChange={e=>setNewItem({...newItem, price:e.target.value})} placeholder="Ціна (₴)"/>
                        <select className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg" value={newItem.categoryId} onChange={e=>setNewItem({...newItem, categoryId:e.target.value})}>
                            <option value="">Оберіть категорію...</option>
                            {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <div className="col-span-2 flex items-center gap-3">
                            <input type="file" accept="image/png, image/jpeg, image/jpg" ref={fileInputRef} onChange={e => setSelectedFile(e.target.files ? e.target.files[0] : null)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-indigo-500/20 dark:file:text-indigo-400 dark:hover:file:bg-indigo-500/30" />
                        </div>
                        <button onClick={addItem} className="bg-indigo-600 text-white px-4 py-3 rounded-lg col-span-2 font-bold hover:bg-indigo-700">Створити страву</button>
                    </div>

                    <h2 className="font-bold text-lg mb-4 text-slate-900 dark:text-white mt-8">Меню закладу</h2>
                    <div className="space-y-3">
                        {items.map((i:any) => (
                            <div key={i.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex gap-4 items-center flex-1">
                                    <div className="relative group shrink-0">
                                        {i.imageUrl ? 
                                            <img src={i.imageUrl} className="w-14 h-14 rounded-lg object-cover border border-slate-200 dark:border-slate-600 shadow-sm" /> 
                                            : <div className="w-14 h-14 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center border border-slate-200 dark:border-slate-600"><PhotoIcon className="w-6 h-6 text-slate-400"/></div>
                                        }
                                        <input type="file" accept="image/png, image/jpeg, image/jpg" onChange={(e) => uploadImageForItem(i.id, e)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Натисніть щоб змінити фото" />
                                        <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            <PhotoIcon className="w-6 h-6 text-white"/>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="font-bold text-lg text-slate-900 dark:text-white">{i.name} <span className="text-slate-500 dark:text-slate-400 font-normal ml-2">{i.price} ₴</span></div>
                                        <div className="text-sm text-slate-500 dark:text-slate-400 font-medium bg-slate-200 dark:bg-slate-700 w-fit px-2 py-0.5 rounded mt-1">{i.categoryName}</div>
                                        {i.variations && (
                                            <div className="text-xs text-indigo-600 dark:text-indigo-400 mt-1 font-medium flex items-center gap-1">
                                                <span>Має модифікатори</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => toggleAvail(i.id, i.isAvailable)} className={`px-3 py-2 rounded-lg font-bold text-sm ${i.isAvailable ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/30':'bg-red-100 dark:bg-red-500/20 text-red-800 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30'} transition-colors`}>
                                        {i.isAvailable ? 'В наявності' : 'В стоп-листі'}
                                    </button>
                                    <button onClick={() => openEditModal(i)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Редагувати">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modal for editing */}
            {editingItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Редагування: {editingItem.name}</h2>
                            <button onClick={() => setEditingItem(null)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-full transition-colors">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Назва</label>
                                <input className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg" value={editingItem.name} onChange={e=>setEditingItem({...editingItem, name:e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Ціна (₴)</label>
                                    <input className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg" type="number" step="0.01" value={editingItem.price} onChange={e=>setEditingItem({...editingItem, price:e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Категорія</label>
                                    <select className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg" value={editingItem.categoryId || categories.find((c:any) => c.name === editingItem.categoryName)?.id || ''} onChange={e=>setEditingItem({...editingItem, categoryId:e.target.value})}>
                                        <option value="">Оберіть категорію...</option>
                                        {categories.map((c:any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Склад</label>
                                <input className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg text-sm" value={editingItem.ingredients} onChange={e=>setEditingItem({...editingItem, ingredients:e.target.value})} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Алергени</label>
                                <input className="w-full bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2.5 rounded-lg text-sm" value={editingItem.allergens} onChange={e=>setEditingItem({...editingItem, allergens:e.target.value})} />
                            </div>
                        </div>

                        {/* Варіації */}
                        <div className="border-t border-slate-200 dark:border-slate-700 pt-6 mb-6">
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Модифікатори</h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">Розміри, додатки, варіанти молока тощо.</p>
                                </div>
                                <button onClick={addVariationGroup} className="flex items-center gap-1 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 px-3 py-2 rounded-lg font-bold hover:bg-indigo-200 dark:hover:bg-indigo-500/30 transition-colors text-sm">
                                    <PlusIcon className="w-4 h-4"/> Додати групу
                                </button>
                            </div>

                            <div className="space-y-6">
                                {editingVariations.map((group, gIdx) => (
                                    <div key={gIdx} className="p-4 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                                        <div className="flex justify-between items-start gap-4 mb-4">
                                            <div className="flex-1 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Назва групи</label>
                                                    <input placeholder="Напр. Розмір, Молоко" className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm" value={group.name} onChange={e => updateVariationGroup(gIdx, 'name', e.target.value)} />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wider">Тип вибору</label>
                                                    <select className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm" value={group.type} onChange={e => updateVariationGroup(gIdx, 'type', e.target.value)}>
                                                        <option value="SINGLE">Один варіант (Обов'язково)</option>
                                                        <option value="MULTIPLE">Декілька варіантів (За бажанням)</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <button onClick={() => removeVariationGroup(gIdx)} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-lg transition-colors mt-5">
                                                <TrashIcon className="w-5 h-5"/>
                                            </button>
                                        </div>

                                        {/* Опції */}
                                        <div className="pl-4 border-l-2 border-indigo-100 dark:border-indigo-500/30 space-y-3">
                                            {group.options.map((opt:any, oIdx:number) => (
                                                <div key={oIdx} className="flex items-center gap-3">
                                                    <input placeholder="Варіант (M, L, Мигдальне)" className="flex-1 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm" value={opt.name} onChange={e => updateVariationOption(gIdx, oIdx, 'name', e.target.value)} />
                                                    <input type="number" step="1" placeholder="Ціна" className="w-24 bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-300 dark:border-slate-600 p-2 rounded-lg text-sm" value={opt.priceModifier} onChange={e => updateVariationOption(gIdx, oIdx, 'priceModifier', parseFloat(e.target.value)||0)} />
                                                    <div className="flex items-center gap-2">
                                                        <input type="checkbox" id={`abs-${gIdx}-${oIdx}`} className="w-4 h-4 text-indigo-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-indigo-600" checked={opt.isAbsolutePrice} onChange={e => updateVariationOption(gIdx, oIdx, 'isAbsolutePrice', e.target.checked)} />
                                                        <label htmlFor={`abs-${gIdx}-${oIdx}`} className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer" title="Якщо увімкнено, ця ціна замінює базову ціну страви. Якщо вимкнено - додається до неї (+20 грн).">Фікс. ціна</label>
                                                    </div>
                                                    <button onClick={() => removeVariationOption(gIdx, oIdx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/20 rounded-md transition-colors">
                                                        <TrashIcon className="w-4 h-4"/>
                                                    </button>
                                                </div>
                                            ))}
                                            <button onClick={() => addVariationOption(gIdx)} className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 flex items-center gap-1 mt-2">
                                                <PlusIcon className="w-4 h-4"/> Додати варіант
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {editingVariations.length === 0 && (
                                    <div className="text-center py-6 text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/30 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                                        Модифікаторів немає. Додайте групи для розмірів або додаткових інгредієнтів.
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-slate-700">
                            <button onClick={() => setEditingItem(null)} className="px-5 py-2.5 rounded-xl font-bold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                                Скасувати
                            </button>
                            <button onClick={saveEditItem} className="px-5 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
                                Зберегти зміни
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
"""

with open("frontend/src/pages/AdminMenu.tsx", "w") as f:
    f.write(new_content)
