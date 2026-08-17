import sys

with open('src/components/CustomerSupportModal.tsx', 'r') as f:
    code = f.read()

# We replace the entire `const content = (` up to the end of the file.
# Need to find the exact start index.

start_str = "  const content = ("
start_idx = code.find(start_str)

if start_idx != -1:
    new_content = """  const content = (
    <div
      className={
        isFullScreen
          ? "bg-[#122119] w-full h-[calc(100vh-110px)] rounded-[2.5rem] shadow-xl border border-[#2A3A2F] overflow-hidden flex flex-col text-[#F8F5F0]"
          : "bg-[#122119] w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-[#2A3A2F] overflow-hidden flex flex-col h-[82vh] text-[#F8F5F0]"
      }
      dir="rtl"
    >
      {/* Header */}
      <div className="bg-[#0B1510] text-[#F8F5F0] p-4 px-6 flex items-center justify-between shrink-0 border-b border-[#2A3A2F]">
        <div className="flex items-center gap-3">
          {isSupportAgent && selectedClientId && (
            <button
              onClick={() => setSelectedClientId(null)}
              className="w-8 h-8 rounded-full bg-[#1A2E23] flex items-center justify-center text-[#D0A97E] hover:bg-[#2A3A2F] transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
          <div className="w-10 h-10 rounded-full bg-[#122119] border border-[#2A3A2F] flex items-center justify-center text-[#D0A97E]">
            <Headphones className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black flex items-center gap-2">
              <span>{isSupportAgent && selectedClientId ? (allClientsMap.get(selectedClientId)?.name || 'محادثة عميل') : 'خدمة عملاء نماذج التميز'}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </h3>
            <p className="text-[10px] text-[#F8F5F0]/60 font-bold flex items-center gap-1 mt-0.5">
              <Mail className="w-3 h-3 text-[#D0A97E]" />
              <span>{isSupportAgent && selectedClientId ? (allClientsMap.get(selectedClientId)?.email || 'عميل') : SUPPORT_EMAIL}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onLogout && (
            <button
              onClick={onLogout}
              className="px-3 py-1.5 rounded-xl bg-red-900/40 border border-red-500/30 hover:bg-red-900/60 text-red-300 text-xs font-black transition-all flex items-center gap-1.5"
            >
              <span>تسجيل خروج</span>
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#122119] border border-[#2A3A2F] hover:bg-[#1A2E23] flex items-center justify-center text-[#F8F5F0]/70 hover:text-[#F8F5F0] transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Body Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Support Agent View: Conversations List */}
        {isSupportAgent && !selectedClientId ? (
          <div className="w-full bg-[#122119] overflow-y-auto p-4 space-y-3">
            <h4 className="text-xs font-black text-[#D0A97E] mb-4 px-2">العملاء النشطون ({allClientsMap.size})</h4>
            {allClientsMap.size === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#F8F5F0]/40 space-y-2">
                <div className="w-14 h-14 rounded-full bg-[#0B1510] border border-[#2A3A2F] flex items-center justify-center text-[#D0A97E]/50">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-black text-[#F8F5F0]/60 mt-2">لا توجد محادثات نشطة بعد</h4>
              </div>
            ) : (
              <div className="grid gap-2">
                {Array.from(allClientsMap.entries()).map(([cId, info]) => (
                  <button
                    key={cId}
                    onClick={() => setSelectedClientId(cId)}
                    className="w-full text-right p-4 rounded-[1.5rem] transition-all flex items-center gap-4 bg-[#0B1510] border border-[#2A3A2F] hover:bg-[#1A2E23] group"
                  >
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-black shrink-0 bg-[#122119] text-[#D0A97E] border border-[#2A3A2F] group-hover:scale-105 transition-transform">
                      <UserIcon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 truncate">
                      <h5 className="text-sm font-black text-[#F8F5F0] truncate mb-0.5">{info.name}</h5>
                      <span className="text-[11px] block truncate text-[#F8F5F0]/50">
                        {info.email || 'محادثة عميل'}
                      </span>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-[#122119] flex items-center justify-center text-[#D0A97E] opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="w-4 h-4 rotate-180" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          {/* Chat Messages Area */}
          <div className="flex-1 flex flex-col bg-[#0B1510] overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-[#F8F5F0]/50 space-y-3">
                  <div className="w-14 h-14 rounded-full bg-[#122119] border border-[#2A3A2F] flex items-center justify-center text-[#D0A97E]">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-[#F8F5F0]">ابدأ المحادثة الفورية</h4>
                  <p className="text-[11px] max-w-xs text-[#F8F5F0]/40 leading-relaxed">
                    جميع المحادثات محفوظة سحابياً ويتم الرد عليها من قبل فريق الدعم الفني بشكل فوري.
                  </p>
                </div>
              ) : (
                filteredMessages.map((msg) => {
                  const isMe = msg.senderRole === (isSupportAgent ? 'support' : 'client');
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1.5 px-2">
                        <span className="text-[10px] font-bold text-[#F8F5F0]/50">{msg.senderName}</span>
                        <span className="text-[9px] text-[#F8F5F0]/30">
                          {new Date(msg.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div
                        className={`max-w-[85%] p-4 rounded-[1.5rem] text-[13px] font-medium shadow-sm leading-relaxed ${
                          isMe
                            ? 'bg-[#D0A97E] text-[#1C3022] rounded-tl-sm'
                            : 'bg-[#122119] border border-[#2A3A2F] text-[#F8F5F0] rounded-tr-sm'
                        }`}
                      >
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#122119] border-t border-[#2A3A2F] flex items-center gap-3">
              <input
                type="text"
                placeholder="اكتب رسالتك هنا..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="flex-1 bg-[#0B1510] border border-[#2A3A2F] rounded-full px-5 py-3.5 text-[13px] font-bold text-[#F8F5F0] outline-none focus:border-[#D0A97E]/50 transition-all placeholder-[#F8F5F0]/30"
              />
              <button
                type="submit"
                disabled={isSending || !newMessage.trim()}
                className="bg-[#D0A97E] text-[#1C3022] hover:bg-[#C29B70] w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 disabled:opacity-50 shrink-0"
              >
                {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 -ml-1" />}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );

  if (isFullScreen) {
    return (
      <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-[#0B1510]">
        {content}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-2xl h-[82vh]"
      >
        {content}
      </motion.div>
    </div>
  );
}
"""
    
    final_code = code[:start_idx] + new_content
    with open('src/components/CustomerSupportModal.tsx', 'w') as f:
        f.write(final_code)

