import sys

with open('src/components/SupervisorViews.tsx', 'r') as f:
    code = f.read()

old_file_change = """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      alert('حجم الملف كبير جداً. يرجى اختيار ملف بحجم أقل من 15 ميجابايت.');
      return;
    }
    const sizeFormatted = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
    setFileName(file.name);
    setFileSize(sizeFormatted);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFileUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };"""

new_file_change = """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 800 * 1024) {
      alert('حجم الملف كبير جداً (الحد الأقصى المسموح 800 كيلوبايت لتوافق قاعدة البيانات السحابية). يرجى اختيار ملف أصغر.');
      return;
    }
    const sizeFormatted = (file.size / 1024).toFixed(1) + ' KB';
    setFileName(file.name);
    setFileSize(sizeFormatted);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setFileUrl(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };"""

if old_file_change in code:
    code = code.replace(old_file_change, new_file_change)
else:
    print("Warning: old_file_change not found exactly")

with open('src/components/SupervisorViews.tsx', 'w') as f:
    f.write(code)

print("Updated SupervisorViews.tsx file size check successfully")
