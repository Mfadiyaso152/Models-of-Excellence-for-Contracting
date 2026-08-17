import sys
import re

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

# Replace default installments in QuoteResponseModal
default_inst_search = """    // Default standard construction installments
    return [
      {
        id: `INST-1`,
        title: 'الدفعة الأولى (مقدم التعاقد وإصدار التراخيص)',
        amount: '50,000 ر.س',
        amountNumber: 50000,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        id: `INST-2`,
        title: 'الدفعة الثانية (أعمال الحفر والأساسات والقواعد)',
        amount: '100,000 ر.س',
        amountNumber: 100000,
        dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        id: `INST-3`,
        title: 'الدفعة الثالثة (الهيكل الإنشائي العظم والأسقف)',
        amount: '150,000 ر.س',
        amountNumber: 150000,
        dueDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      },
      {
        id: `INST-4`,
        title: 'الدفعة الرابعة (التمديدات والتشطيبات والتسليم)',
        amount: '150,000 ر.س',
        amountNumber: 150000,
        dueDate: new Date(Date.now() + 150 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'pending'
      }
    ];"""
code = code.replace(default_inst_search, "    return [];")

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)
