import sys
import re

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

# Replace newInstAmount with newInstPercentage
state_search = "const [newInstAmount, setNewInstAmount] = useState('');"
state_replace = "const [newInstPercentage, setNewInstPercentage] = useState('');"
code = code.replace(state_search, state_replace)

# Replace handleAddInstallment in Quote modal
add_search = """  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstTitle.trim() || !newInstAmount.trim()) return;

    const num = parseFloat(newInstAmount.replace(/[^0-9.]/g, '')) || 0;
    const newInst: Installment = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      title: newInstTitle.trim(),
      amount: `${num.toLocaleString('ar-SA')} ر.س`,
      amountNumber: num,
      dueDate: newInstDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    };
    setInstallments([...installments, newInst]);
    setNewInstTitle('');
    setNewInstAmount('');
    setNewInstDueDate('');
  };"""

add_replace = """  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstTitle.trim() || !newInstPercentage.trim()) return;

    const totalValueNum = parseFloat(quoteAmount.replace(/[^0-9.]/g, '')) || 0;
    const percentage = parseFloat(newInstPercentage.replace(/[^0-9.]/g, '')) || 0;
    const calculatedAmount = (totalValueNum * percentage) / 100;

    const newInst: Installment = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      title: newInstTitle.trim(),
      amount: calculatedAmount > 0 ? `${Number(calculatedAmount).toLocaleString('ar-SA')} ر.س` : `${percentage}%`,
      amountNumber: calculatedAmount,
      dueDate: newInstDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    };
    setInstallments([...installments, newInst]);
    setNewInstTitle('');
    setNewInstPercentage('');
    setNewInstDueDate('');
  };"""
code = code.replace(add_search, add_replace)

# Fix input fields in the render method of Quote modal
input_search = """                  <input
                    type="text"
                    placeholder="المبلغ (ر.س)..."
                    value={newInstAmount}
                    onChange={e => setNewInstAmount(e.target.value)}
                    className="w-1/4 bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
                    dir="ltr"
                  />"""
input_replace = """                  <div className="w-1/4 relative">
                    <input
                      type="text"
                      placeholder="النسبة..."
                      value={newInstPercentage}
                      onChange={e => setNewInstPercentage(e.target.value)}
                      className="w-full bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 pl-8 text-xs font-bold text-[#1C3022] outline-none"
                      dir="ltr"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>"""
code = code.replace(input_search, input_replace)

# There is a second handleUpdateInstallmentAmount in QuoteModal which might need updating or we can just leave it since they type the amount or percentage.
# Let's let them type the amount directly if they edit. Or we can just disable editing amounts directly and force delete/re-add.

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)

