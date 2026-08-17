import sys
import re

with open('src/components/AdminProjectManagerModal.tsx', 'r') as f:
    code = f.read()

# Replace states
state_search = "const [newInstallmentAmount, setNewInstallmentAmount] = useState('');"
state_replace = """const [newInstallmentPercentage, setNewInstallmentPercentage] = useState('');"""
code = code.replace(state_search, state_replace)

# Replace handleAddInstallment
add_search = """  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstallmentTitle.trim() || !newInstallmentAmount.trim()) return;

    const num = parseFloat(newInstallmentAmount.replace(/[^0-9.]/g, '')) || 0;
    const newInst: Installment = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      title: newInstallmentTitle.trim(),
      amount: `${Number(num).toLocaleString('ar-SA')} ر.س`,
      amountNumber: num,
      dueDate: newInstallmentDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      clientApprovalStatus: 'pending'
    };
    setInstallments([...installments, newInst]);
    setNewInstallmentTitle('');
    setNewInstallmentAmount('');
    setNewInstallmentDueDate('');
  };"""

add_replace = """  const handleAddInstallment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstallmentTitle.trim() || !newInstallmentPercentage.trim()) return;

    // Calculate amount from percentage
    const contractValue = project.contracts?.[0]?.totalValue || '0';
    const totalValueNum = parseFloat(contractValue.replace(/[^0-9.]/g, '')) || 0;
    
    const percentage = parseFloat(newInstallmentPercentage.replace(/[^0-9.]/g, '')) || 0;
    const calculatedAmount = (totalValueNum * percentage) / 100;

    const newInst: Installment = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      title: newInstallmentTitle.trim(),
      amount: calculatedAmount > 0 ? `${Number(calculatedAmount).toLocaleString('ar-SA')} ر.س` : `${percentage}%`,
      amountNumber: calculatedAmount,
      dueDate: newInstallmentDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending',
      clientApprovalStatus: 'pending'
    };
    setInstallments([...installments, newInst]);
    setNewInstallmentTitle('');
    setNewInstallmentPercentage('');
    setNewInstallmentDueDate('');
  };"""
code = code.replace(add_search, add_replace)

# Replace input fields
input_search = """                  <input
                    type="text"
                    placeholder="المبلغ (ر.س)..."
                    value={newInstallmentAmount}
                    onChange={e => setNewInstallmentAmount(e.target.value)}
                    className="bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 text-xs font-bold text-[#1C3022] outline-none"
                    dir="ltr"
                  />"""

input_replace = """                  <div className="relative">
                    <input
                      type="text"
                      placeholder="النسبة من المشروع..."
                      value={newInstallmentPercentage}
                      onChange={e => setNewInstallmentPercentage(e.target.value)}
                      className="w-full bg-white border border-[#E8E2D8] rounded-xl px-3 py-2 pl-8 text-xs font-bold text-[#1C3022] outline-none"
                      dir="ltr"
                    />
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">%</span>
                  </div>"""
code = code.replace(input_search, input_replace)

with open('src/components/AdminProjectManagerModal.tsx', 'w') as f:
    f.write(code)

