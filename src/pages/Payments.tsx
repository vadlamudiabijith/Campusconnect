import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Wallet, CheckCircle2, Clock, XCircle, Plus, ArrowUpRight, Smartphone, Building2, Receipt } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input, Select } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Badge } from '../components/ui/Badge';
import { Skeleton } from '../components/ui/Skeleton';
import { EmptyState } from '../components/ui/EmptyState';
import { formatDate } from '../lib/utils';
import type { Payment } from '../types';

const PAYMENT_METHODS = [
  { id: 'upi', label: 'UPI Payment', icon: <Smartphone size={18} />, desc: 'PhonePe, GPay, Paytm, BHIM' },
  { id: 'netbanking', label: 'Net Banking', icon: <Building2 size={18} />, desc: 'All major Indian banks' },
  { id: 'card', label: 'Debit / Credit Card', icon: <CreditCard size={18} />, desc: 'Visa, Mastercard, RuPay' },
];

const BANKS = ['State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'Bank of Baroda', 'Punjab National Bank', 'Canara Bank', 'Kotak Mahindra Bank'];
const UPI_APPS = ['PhonePe', 'Google Pay', 'Paytm', 'BHIM UPI', 'Amazon Pay'];

export const Payments: React.FC = () => {
  const { profile } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPay, setShowPay] = useState(false);
  const [step, setStep] = useState<'form' | 'credentials' | 'method' | 'processing' | 'success'>('form');
  const [form, setForm] = useState({ description: '', amount: '', reference_type: 'fee' });
  const [credentials, setCredentials] = useState({ full_name: '', email: '', phone: '' });
  const [selectedMethod, setSelectedMethod] = useState('upi');
  const [selectedBank, setSelectedBank] = useState(BANKS[0]);
  const [selectedUpi, setSelectedUpi] = useState(UPI_APPS[0]);
  const [upiId, setUpiId] = useState('');

  const load = async () => {
    if (!profile) return;
    const { data } = await supabase.from('payments').select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    if (data) setPayments(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [profile]);

  const handleProceed = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('credentials');
  };

  const handleCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('method');
  };

  const handlePay = async () => {
    if (!profile) return;
    setStep('processing');
    await new Promise(r => setTimeout(r, 2200));
    const txId = 'TXN-IN-' + Date.now().toString(36).toUpperCase();
    const desc = selectedMethod === 'netbanking' ? selectedBank : selectedMethod === 'upi' ? `${selectedUpi}${upiId ? ' - ' + upiId : ''}` : 'Card';
    const { error } = await supabase.from('payments').insert({
      user_id: profile.id, description: form.description,
      amount: parseFloat(form.amount), reference_type: form.reference_type,
      status: 'completed', transaction_id: txId, payment_method: `${selectedMethod}:${desc}`,
      currency: 'INR',
    });
    if (error) { toast.error('Payment failed'); setStep('method'); return; }
    setStep('success');
    setTimeout(() => {
      setShowPay(false);
      setStep('form');
      setForm({ description: '', amount: '', reference_type: 'fee' });
      load();
    }, 2500);
  };

  const totalSpent = payments.filter(p => p.status === 'completed').reduce((s, p) => s + p.amount, 0);

  const statusIcon: Record<string, React.ReactNode> = {
    completed: <CheckCircle2 size={15} className="text-emerald-500" />,
    pending: <Clock size={15} className="text-amber-500" />,
    failed: <XCircle size={15} className="text-red-500" />,
    refunded: <ArrowUpRight size={15} className="text-blue-500" />,
  };
  const statusColors: Record<string, any> = { completed: 'success', pending: 'warning', failed: 'danger', refunded: 'info' };

  const getMethodDisplay = (method: string) => {
    if (!method) return { icon: '💳', name: 'Card' };
    if (method.startsWith('netbanking:')) return { icon: '🏦', name: method.split(':')[1] };
    if (method.startsWith('upi:')) return { icon: '📱', name: method.split(':')[1] };
    return { icon: '💳', name: method.includes(':') ? method.split(':')[1] : method };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Payments</h2>
          <p className="text-sm text-zinc-500">All transactions in <span className="font-semibold text-emerald-600 dark:text-emerald-400">Indian Rupee (₹)</span></p>
        </div>
        <Button icon={<Plus size={16} />} onClick={() => { setStep('form'); setShowPay(true); }}>Make Payment</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Paid', value: `₹${totalSpent.toFixed(2)}`, icon: <Wallet size={20} />, color: 'emerald', sub: `${payments.filter(p => p.status === 'completed').length} completed` },
          { label: 'Pending', value: `₹${payments.filter(p=>p.status==='pending').reduce((s,p)=>s+p.amount,0).toFixed(2)}`, icon: <Clock size={20} />, color: 'amber', sub: `${payments.filter(p=>p.status==='pending').length} pending` },
          { label: 'Transactions', value: payments.length, icon: <Receipt size={20} />, color: 'blue', sub: 'total transactions' },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
            <Card className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-zinc-500 mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-zinc-900 dark:text-white">{stat.value}</p>
                  <p className="text-xs text-zinc-400 mt-1">{stat.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  stat.color === 'emerald' ? 'bg-emerald-500/10 text-emerald-500' :
                  stat.color === 'amber' ? 'bg-amber-500/10 text-amber-500' :
                  'bg-blue-500/10 text-blue-500'}`}>{stat.icon}</div>
              </div>
            </Card>
          </motion.div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-16 rounded-xl" />)}</div>
      ) : payments.length === 0 ? (
        <EmptyState icon={<Wallet size={28} />} title="No transactions yet"
          action={<Button icon={<Plus size={16} />} onClick={() => setShowPay(true)}>Make First Payment</Button>} />
      ) : (
        <Card className="overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h3 className="font-semibold text-zinc-900 dark:text-white">Transaction History</h3>
            <Badge variant="default">{payments.length} records</Badge>
          </div>
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {payments.map((p, idx) => {
              const method = getMethodDisplay(p.payment_method);
              return (
                <motion.div key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                  className="flex items-center justify-between px-5 py-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-lg">{method.icon}</div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white text-sm">{p.description}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-xs text-zinc-400">{formatDate(p.created_at)}</p>
                        <span className="text-zinc-200 dark:text-zinc-700">·</span>
                        <p className="text-xs text-zinc-400">{method.name}</p>
                        {p.transaction_id && <>
                          <span className="text-zinc-200 dark:text-zinc-700">·</span>
                          <p className="text-xs text-zinc-300 dark:text-zinc-600 font-mono">{p.transaction_id}</p>
                        </>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className={`font-bold text-base ${p.status === 'completed' ? 'text-zinc-900 dark:text-white' : 'text-zinc-400'}`}>
                        ₹{p.amount.toFixed(2)}
                      </span>
                    </div>
                    <Badge variant={statusColors[p.status]}>{p.status}</Badge>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </Card>
      )}

      <Modal isOpen={showPay} onClose={() => { setShowPay(false); setStep('form'); }} title="Make a Payment" size="md">
        <AnimatePresence mode="wait">
          {step === 'form' && (
            <motion.form key="form" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleProceed} className="space-y-4">
              <Input label="Description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="e.g., Event registration, Library fee" required />
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Amount (₹)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500">₹</span>
                  <input type="number" min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-4 py-2.5 text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-lg font-bold" placeholder="0.00" required />
                </div>
              </div>
              <Select label="Payment Type" value={form.reference_type} onChange={e => setForm(f => ({ ...f, reference_type: e.target.value }))}
                options={[{value:'event',label:'Event Registration Fee'},{value:'fee',label:'Campus / Admin Fee'},{value:'other',label:'Other Payment'}]} />
              <Button type="submit" className="w-full" size="lg" disabled={!form.description || !form.amount}>
                Continue to Payment →
              </Button>
            </motion.form>
          )}

          {step === 'credentials' && (
            <motion.form key="credentials" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} onSubmit={handleCredentials} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-zinc-600 dark:text-zinc-400">{form.description}</span>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">₹{parseFloat(form.amount || '0').toFixed(2)}</span>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Payer Details</p>
              <Input label="Full Name" value={credentials.full_name} onChange={e => setCredentials(c => ({ ...c, full_name: e.target.value }))} placeholder="As per bank records" required />
              <Input label="Email Address" type="email" value={credentials.email} onChange={e => setCredentials(c => ({ ...c, email: e.target.value }))} placeholder="receipt@email.com" required />
              <Input label="Phone Number" value={credentials.phone} onChange={e => setCredentials(c => ({ ...c, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX" required />
              <div className="flex gap-3 pt-1">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setStep('form')}>← Back</Button>
                <Button type="submit" className="flex-1" disabled={!credentials.full_name || !credentials.email || !credentials.phone}>Continue →</Button>
              </div>
            </motion.form>
          )}

          {step === 'method' && (
            <motion.div key="method" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 rounded-xl px-4 py-3 flex items-center justify-between">
                <div>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">{form.description}</span>
                  <p className="text-xs text-zinc-400 mt-0.5">{credentials.full_name}</p>
                </div>
                <span className="text-xl font-black text-blue-600 dark:text-blue-400">₹{parseFloat(form.amount || '0').toFixed(2)}</span>
              </div>
              <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Select Payment Method</p>
              <div className="space-y-2">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} type="button" onClick={() => setSelectedMethod(m.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all text-left ${selectedMethod === m.id ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'}`}>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedMethod === m.id ? 'bg-blue-500 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'}`}>{m.icon}</div>
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-white text-sm">{m.label}</p>
                      <p className="text-xs text-zinc-400">{m.desc}</p>
                    </div>
                    {selectedMethod === m.id && <CheckCircle2 size={18} className="text-blue-500 ml-auto" />}
                  </button>
                ))}
              </div>
              {selectedMethod === 'netbanking' && (
                <Select label="Select Bank" value={selectedBank} onChange={e => setSelectedBank(e.target.value)}
                  options={BANKS.map(b => ({ value: b, label: b }))} />
              )}
              {selectedMethod === 'upi' && (
                <div className="space-y-3">
                  <Select label="UPI App" value={selectedUpi} onChange={e => setSelectedUpi(e.target.value)}
                    options={UPI_APPS.map(u => ({ value: u, label: u }))} />
                  <Input label="UPI ID (optional)" value={upiId} onChange={e => setUpiId(e.target.value)} placeholder="yourname@upi" />
                </div>
              )}
              {selectedMethod === 'card' && (
                <div className="bg-zinc-50 dark:bg-zinc-800/50 rounded-xl p-4 space-y-3">
                  <Input label="Card Number" placeholder="XXXX XXXX XXXX XXXX" maxLength={19} />
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="Expiry (MM/YY)" placeholder="MM/YY" />
                    <Input label="CVV" placeholder="XXX" type="password" maxLength={3} />
                  </div>
                  <Input label="Cardholder Name" placeholder="Name on card" />
                </div>
              )}
              <div className="flex gap-3 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setStep('credentials')}>← Back</Button>
                <Button className="flex-1" size="lg" onClick={handlePay}>
                  Pay ₹{parseFloat(form.amount || '0').toFixed(2)}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'processing' && (
            <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-10">
              <div className="w-16 h-16 mx-auto rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mb-4">
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                  <CreditCard size={28} className="text-blue-500" />
                </motion.div>
              </div>
              <p className="font-semibold text-zinc-900 dark:text-white text-lg">Processing Payment</p>
              <p className="text-sm text-zinc-400 mt-1">Connecting to {selectedMethod === 'netbanking' ? selectedBank : selectedMethod === 'upi' ? selectedUpi : 'payment gateway'}...</p>
              <div className="flex justify-center gap-1 mt-4">
                {[0,1,2].map(i => (
                  <motion.div key={i} animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    className="w-2 h-2 rounded-full bg-blue-500" />
                ))}
              </div>
            </motion.div>
          )}

          {step === 'success' && (
            <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-10">
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.1 }}
                className="w-20 h-20 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4">
                <CheckCircle2 size={40} className="text-emerald-500" />
              </motion.div>
              <p className="font-bold text-zinc-900 dark:text-white text-xl">Payment Successful!</p>
              <p className="text-zinc-500 mt-1">₹{parseFloat(form.amount || '0').toFixed(2)} paid</p>
              <p className="text-xs text-zinc-400 mt-2">{form.description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </Modal>
    </div>
  );
};
