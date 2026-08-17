import sys

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

# Replace newInstAmount with newInstPercentage
code = code.replace('newInstAmount', 'newInstPercentage')

# Replace the handler to calculate amount from percentage
old_handler = """  const handleAddInstallmentRow = (e: React.FormEvent) => {
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

new_handler = """  const handleAddInstallmentRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstTitle.trim() || !newInstPercentage.trim()) return;
    const pct = parseFloat(newInstPercentage.replace(/[^0-9.]/g, '')) || 0;
    const num = Math.round((parsedQuoteAmount * pct) / 100);
    const newInst: Installment = {
      id: `INST-${Date.now().toString().slice(-4)}`,
      title: `${newInstTitle.trim()} (${pct}%)`,
      amount: `${num.toLocaleString('ar-SA')} ر.س`,
      amountNumber: num,
      dueDate: newInstDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'pending'
    };
    setInstallments([...installments, newInst]);
    setNewInstTitle('');
    setNewInstPercentage('');
    setNewInstDueDate('');
  };"""

if old_handler in code:
    code = code.replace(old_handler, new_handler)

# Also fix placeholder in input
code = code.replace('placeholder="المبلغ (مثل: 50000)..."', 'placeholder="النسبة المئوية (مثل: 25%)..."')

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)

print("Fixed installment percentage input successfully")
