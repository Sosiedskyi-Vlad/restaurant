with open('frontend/src/GuestApp.tsx', 'r') as f:
    content = f.read()

import_statement = "import { BellIcon, CreditCardIcon, CheckCircleIcon, FireIcon, InformationCircleIcon } from '@heroicons/react/24/outline';"
new_import = "import { BellIcon, CreditCardIcon, CheckCircleIcon, FireIcon, InformationCircleIcon, BanknotesIcon } from '@heroicons/react/24/outline';"
content = content.replace(import_statement, new_import)

old_pay_block = """                        {!o.paid ? (
                            <button onClick={() => pay(o.id)} disabled={checkingOut === o.id} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-3.5 rounded-2xl font-semibold disabled:opacity-50 hover:bg-slate-800 transition-colors">
                                <CreditCardIcon className="w-5 h-5" />
                                {checkingOut === o.id ? 'Зачекайте...' : 'Сплатити онлайн'}
                            </button>
                        ) : ("""

new_pay_block = """                        {!o.paid ? (
                            <div className="flex flex-col gap-2 mt-4">
                                <button onClick={() => pay(o.id)} disabled={checkingOut === o.id} className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white p-3.5 rounded-2xl font-semibold disabled:opacity-50 hover:bg-slate-800 transition-colors">
                                    <CreditCardIcon className="w-5 h-5" />
                                    {checkingOut === o.id ? 'Зачекайте...' : 'Оплатити онлайн (LiqPay)'}
                                </button>
                                <button onClick={() => {
                                    api.post('/service-calls', { type: 'BILL' }).then(() => alert('Офіціант зараз підійде з рахунком!'));
                                }} className="w-full flex items-center justify-center gap-2 bg-slate-100 text-slate-800 p-3.5 rounded-2xl font-semibold hover:bg-slate-200 transition-colors">
                                    <BanknotesIcon className="w-5 h-5" />
                                    Готівкою або терміналом
                                </button>
                            </div>
                        ) : ("""

content = content.replace(old_pay_block, new_pay_block)

with open('frontend/src/GuestApp.tsx', 'w') as f:
    f.write(content)
