(function(){
  // ---------- GLOBAL STATE ----------
  let conversations = [];        // array of { id, title, messages: [{id, text, sender, timestamp}] }
  let currentConversationId = null;
  let isWaitingResponse = false; // mencegah spam saat AI merespon / typing
  let currentTypingIndicatorElement = null;
  let aiMessageElement = null;   // Referensi untuk bubble AI yang sedang streaming

  // DOM references
  let messagesContainer;
  let emptyPlaceholder;
  let conversationListEl;
  let chatContentEl;
  let messageInput;
  let sendBtn;
  let scrollTopFab;
  let chatTitleEl;

  // Helper: Generate unique ID
  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  // ---------- ION ALERT GLOBAL KONFIRM DINAMIS (Promise based) ----------
  async function confirmDialog(header, message) {
    return new Promise((resolve) => {
      const alert = document.createElement('ion-alert');
      alert.header = header;
      alert.message = message;
      alert.buttons = [
        {
          text: 'Batal',
          role: 'cancel',
          handler: () => resolve(false)
        },
        {
          text: 'Ya, Hapus',
          role: 'confirm',
          handler: () => resolve(true)
        }
      ];
      document.body.appendChild(alert);
      alert.present().then(() => {
        alert.onDidDismiss().then((event) => {
          resolve(event.role === 'confirm');
          alert.remove();
        });
      });
    });
  }

  // General alert info
  async function showAlert(header, message) {
    const alert = document.createElement('ion-alert');
    alert.header = header;
    alert.message = message;
    alert.buttons = ['OK'];
    document.body.appendChild(alert);
    await alert.present();
    alert.onDidDismiss().then(() => alert.remove());
  }

  // ---------- LOCAL STORAGE ----------
  function saveToLocalStorage() {
    const dataToStore = {
      conversations: conversations,
      currentConversationId: currentConversationId
    };
    localStorage.setItem('ai_chat_app_data', JSON.stringify(dataToStore));
  }

  function loadFromLocalStorage() {
    const raw = localStorage.getItem('ai_chat_app_data');
    if (!raw) {
      // Buat percakapan default
      const defaultId = generateId();
      conversations = [{
        id: defaultId,
        title: 'Percakapan',
        messages: []
      }];
      currentConversationId = defaultId;
      saveToLocalStorage();
      return;
    }
    try {
      const data = JSON.parse(raw);
      conversations = data.conversations || [];
      currentConversationId = data.currentConversationId || (conversations[0]?.id || null);
      if (!conversations.length) {
        const newId = generateId();
        conversations = [{ id: newId, title: 'Percakapan', messages: [] }];
        currentConversationId = newId;
        saveToLocalStorage();
      } else if (currentConversationId && !conversations.find(c => c.id === currentConversationId)) {
        currentConversationId = conversations[0].id;
      }
    } catch(e) {
      console.warn(e);
      const defaultId = generateId();
      conversations = [{ id: defaultId, title: 'Percakapan', messages: [] }];
      currentConversationId = defaultId;
    }
  }

  // Update title percakapan berdasarkan pesan pertama user
  function updateConversationTitle(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const firstUserMsg = conv.messages.find(m => m.sender === 'user');
    if (firstUserMsg && firstUserMsg.text) {
      let newTitle = firstUserMsg.text.length > 30 ? firstUserMsg.text.substring(0, 27) + '...' : firstUserMsg.text;
      if (newTitle.trim() === '') newTitle = 'Percakapan';
      conv.title = newTitle;
    } else {
      conv.title = 'Percakapan';
    }
    saveToLocalStorage();
    renderSidebar();
    if (currentConversationId === convId) {
      chatTitleEl.innerText = conv.title;
    }
  }

  // ---------- RENDER SIDEBAR (Riwayat Chat) ----------
  function renderSidebar() {
    if (!conversationListEl) return;
    if (conversations.length === 0) {
      conversationListEl.innerHTML = `<ion-item lines="none" class="ion-text-center"><ion-label color="medium">Tidak ada percakapan</ion-label></ion-item>`;
      return;
    }
    let html = '';
    conversations.forEach(conv => {
      const isActive = (currentConversationId === conv.id);
      const activeClass = isActive ? 'active' : '';
      // title aman
      const titleEscaped = escapeHtml(conv.title);
      html += `
        <ion-item class="conversation-item ${activeClass}" data-conv-id="${conv.id}" button detail="false">
          <ion-label class="ion-text-wrap">
            <h3>${titleEscaped}</h3>
            <p style="font-size: 12px; color: gray;">${conv.messages.length} pesan</p>
          </ion-label>
          <ion-buttons slot="end">
            <ion-button class="delete-conv-btn" fill="clear" color="danger" data-conv-delete="${conv.id}">
              <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>
      `;
    });
    conversationListEl.innerHTML = html;
    
    // event listeners untuk item & tombol delete
    document.querySelectorAll('.conversation-item').forEach(item => {
      const convId = item.getAttribute('data-conv-id');
      if (convId && !item.getAttribute('data-listener-attached')) {
        item.addEventListener('click', (e) => {
          // cegah jika klik tombol delete
          if (e.target.closest('.delete-conv-btn')) return;
          if (convId !== currentConversationId) {
            switchConversation(convId);
          }
        });
        item.setAttribute('data-listener-attached', 'true');
      }
    });
    
    document.querySelectorAll('.delete-conv-btn').forEach(btn => {
      btn.removeEventListener('click', handleDeleteClick);
      btn.addEventListener('click', handleDeleteClick);
    });
  }
  
  function handleDeleteClick(e) {
    e.stopPropagation();
    const btn = e.currentTarget;
    const convId = btn.getAttribute('data-conv-delete');
    if (convId) {
      deleteConversation(convId);
    }
  }
  
  async function deleteConversation(convId) {
    const convToDelete = conversations.find(c => c.id === convId);
    if (!convToDelete) return;
    const confirmed = await confirmDialog('Hapus Percakapan', `Apakah Anda yakin ingin menghapus "${convToDelete.title}"?`);
    if (!confirmed) return;
    
    const index = conversations.findIndex(c => c.id === convId);
    if (index !== -1) conversations.splice(index, 1);
    
    if (conversations.length === 0) {
      // create new one
      const newId = generateId();
      conversations.push({ id: newId, title: 'Percakapan', messages: [] });
      currentConversationId = newId;
    } else if (currentConversationId === convId) {
      currentConversationId = conversations[0].id;
    }
    saveToLocalStorage();
    renderSidebar();
    renderCurrentChat();
    // update header title
    const currentConv = conversations.find(c => c.id === currentConversationId);
    if (currentConv) chatTitleEl.innerText = currentConv.title;
    else chatTitleEl.innerText = 'AI Chat';
  }
  
  function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>]/g, function(m) {
      if (m === '&') return '&amp;';
      if (m === '<') return '&lt;';
      if (m === '>') return '&gt;';
      return m;
    });
  }
  
  // Update HANYA konten bubble AI tanpa re-render seluruh DOM (smooth streaming)
  function updateAIBubbleOnly(fullText) {
    if (!aiMessageElement) return;
    const bubble = aiMessageElement.querySelector('.bubble');
    if (bubble) {
      if (window.marked) {
        bubble.innerHTML = marked.parse(fullText);
      } else {
        bubble.innerText = fullText;
      }
      scrollToBottom();
    }
  }
  
  // ---------- RENDER CHAT (messages dan typing indicator) ----------
  function renderCurrentChat() {
    if (!messagesContainer) return;
    const currentConv = conversations.find(c => c.id === currentConversationId);
    if (!currentConv) return;
    
    messagesContainer.innerHTML = '';
    const messages = currentConv.messages;
    if (messages.length === 0) {
      emptyPlaceholder.style.display = 'flex';
    } else {
      emptyPlaceholder.style.display = 'none';
      messages.forEach(msg => {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${msg.sender}`;
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'bubble';
        
        // Render Markdown if AI, else plain text
        if (msg.sender === 'ai' && window.marked) {
          bubbleDiv.innerHTML = marked.parse(msg.text);
        } else {
          bubbleDiv.innerText = msg.text;
        }
        
        messageDiv.appendChild(bubbleDiv);
        messagesContainer.appendChild(messageDiv);
      });
    }
    // jika sedang menampilkan typing indicator, kita harus menambahkannya kembali
    if (isWaitingResponse) {
      showTypingIndicatorOnly();
    } else {
      removeTypingIndicator();
    }
    scrollToBottom();
  }
  
  function showTypingIndicatorOnly() {
    removeTypingIndicator(); // hapus jika ada
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.id = 'live-typing-indicator';
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.className = 'typing-dot';
      typingDiv.appendChild(dot);
    }
    messagesContainer.appendChild(typingDiv);
    scrollToBottom();
    currentTypingIndicatorElement = typingDiv;
  }
  
  function removeTypingIndicator() {
    if (currentTypingIndicatorElement && currentTypingIndicatorElement.parentNode) {
      currentTypingIndicatorElement.remove();
      currentTypingIndicatorElement = null;
    }
    const existing = document.getElementById('live-typing-indicator');
    if (existing) existing.remove();
  }
  
  // fungsi menambahkan pesan baru ke percakapan aktif
  function addMessageToCurrent(sender, text) {
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return false;
    const newMsg = {
      id: generateId(),
      text: text,
      sender: sender,
      timestamp: Date.now()
    };
    conv.messages.push(newMsg);
    // update title jika pesan pertama dari user
    if (sender === 'user' && conv.messages.filter(m => m.sender === 'user').length === 1) {
      updateConversationTitle(currentConversationId);
    }
    saveToLocalStorage();
    renderCurrentChat();
    return true;
  }
  
  // API Configuration
  const API_BASE_URL = 'https://ai-quran-backend.vildaesa.workers.dev';

  // AI response dari backend dengan streaming
  async function getAIResponse(userMessage) {
    if (isWaitingResponse) return;
    isWaitingResponse = true;
    showTypingIndicatorOnly();

    const currentConv = conversations.find(c => c.id === currentConversationId);
    if (!currentConv) return;

    const messageHistory = currentConv.messages.map(m => ({
      role: m.sender === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messageHistory })
      });

      if (!response.ok) throw new Error('Gagal koneksi server.');

      // Hapus indikator SEBELUM mulai stream dan rendering bubble AI
      removeTypingIndicator();

      // Buat pesan AI kosong
      const aiMsg = {
        id: generateId(),
        text: '',
        sender: 'ai',
        timestamp: Date.now()
      };
      currentConv.messages.push(aiMsg);
      
      // Buat bubble AI element sekali saja (tidak akan di-re-render selama streaming)
      const messageDiv = document.createElement('div');
      messageDiv.className = 'message ai';
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'bubble';
      messageDiv.appendChild(bubbleDiv);
      messagesContainer.appendChild(messageDiv);
      aiMessageElement = messageDiv; // Simpan referensi
      
      scrollToBottom();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiFullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Simpan sisa baris yang belum lengkap ke buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine || !trimmedLine.startsWith('data: ')) continue;
          
          const dataStr = trimmedLine.substring(6);
          if (dataStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.response) {
              aiFullText += parsed.response;
              aiMsg.text = aiFullText;
              
              // Update hanya bubble AI, JANGAN re-render seluruh DOM (smooth no blinking!)
              updateAIBubbleOnly(aiFullText);
            }
          } catch (e) { }
        }
      }

      // PROSES SISA BUFFER (PENTING: supaya tidak terpotong di akhir)
      if (buffer.trim().startsWith('data: ')) {
        const dataStr = buffer.trim().substring(6);
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.response) {
              aiFullText += parsed.response;
              aiMsg.text = aiFullText;
              updateAIBubbleOnly(aiFullText);
            }
          } catch (e) { }
        }
      }

      saveToLocalStorage();
      aiMessageElement = null; // Clear referensi setelah selesai
    } catch (error) {
      console.error('Error:', error);
      removeTypingIndicator();
      addMessageToCurrent('ai', 'Maaf Bro, koneksi terputus. Pastikan backend sudah jalan ya!');
      aiMessageElement = null;
    } finally {
      isWaitingResponse = false;
      removeTypingIndicator(); // Double check
    }
  }

  // Kirim pesan user
  async function sendUserMessage() {
    if (isWaitingResponse) {
      await showAlert('Tunggu sebentar', 'AI sedang mengetik... harap tunggu balasan selesai.');
      return;
    }
    let rawText = messageInput.value?.trim();
    if (!rawText) {
      await showAlert('Pesan kosong', 'Silakan ketik pesan terlebih dahulu.');
      return;
    }
    // Tambahkan pesan user
    addMessageToCurrent('user', rawText);
    messageInput.value = '';
    // Panggil AI response asli
    await getAIResponse(rawText);
  }
  
  // New chat
  function createNewChat() {
    if (isWaitingResponse) {
      showAlert('Tunggu', 'Tunggu hingga AI selesai merespon.');
      return;
    }
    const newId = generateId();
    const newConv = {
      id: newId,
      title: 'Percakapan',
      messages: []
    };
    conversations.unshift(newConv);
    currentConversationId = newId;
    saveToLocalStorage();
    renderSidebar();
    renderCurrentChat();
    chatTitleEl.innerText = 'Percakapan';
    scrollToBottom();
  }
  
  // Switch conversation
  function switchConversation(convId) {
    if (isWaitingResponse) {
      showAlert('Tunggu', 'Selesaikan pesan terlebih dahulu sebelum beralih riwayat.');
      return;
    }
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    currentConversationId = convId;
    saveToLocalStorage();
    renderSidebar();
    renderCurrentChat();
    const activeConv = conversations.find(c => c.id === convId);
    chatTitleEl.innerText = activeConv ? activeConv.title : 'AI Chat';
    // kosongkan input
    messageInput.value = '';
    aiMessageElement = null; // Clear referensi
  }
  
  // Clear all messages in current conversation (dengan konfirmasi)
  async function clearCurrentChat() {
    if (isWaitingResponse) {
      showAlert('Tunggu', 'AI sedang merespon, coba lagi nanti.');
      return;
    }
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;
    if (conv.messages.length === 0) {
      showAlert('Info', 'Percakapan sudah kosong.');
      return;
    }
    const confirmed = await confirmDialog('Hapus semua pesan', `Hapus seluruh riwayat chat di "${conv.title}"?`);
    if (confirmed) {
      conv.messages = [];
      saveToLocalStorage();
      renderCurrentChat();
      // Update title menjadi default jika kosong
      updateConversationTitle(currentConversationId);
      chatTitleEl.innerText = conv.title;
      aiMessageElement = null; // Clear referensi
    }
  }
  
  // SCROLL helpers
  async function scrollToBottom() {
    // Tunggu render
    await new Promise(r => setTimeout(r, 50));
    const contentEl = document.querySelector('#chat-content');
    if (contentEl && contentEl.getScrollElement) {
      const scrollEl = await contentEl.getScrollElement();
      if (scrollEl) {
        scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: 'smooth' });
      }
    }
  }
  
  async function scrollToTop() {
    const contentEl = document.querySelector('#chat-content');
    if (contentEl && contentEl.getScrollElement) {
      const scrollEl = await contentEl.getScrollElement();
      if (scrollEl) {
        scrollEl.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }
  }
  
  // Show/hide scroll-to-top FAB based on scroll position
  function initScrollListener() {
    const chatContent = document.querySelector('#chat-content');
    if (!chatContent) return;
    chatContent.addEventListener('ionScroll', async (ev) => {
      const scrollTop = ev.detail.scrollTop;
      if (scrollTop > 300) {
        scrollTopFab.style.display = 'flex';
      } else {
        scrollTopFab.style.display = 'none';
      }
    });
  }
  
  // ---------- INITIALIZE APP ----------
  function init() {
    loadFromLocalStorage();
    messagesContainer = document.getElementById('messages-container');
    emptyPlaceholder = document.getElementById('empty-chat-placeholder');
    conversationListEl = document.getElementById('conversation-list');
    messageInput = document.getElementById('message-input');
    sendBtn = document.getElementById('send-message-btn');
    scrollTopFab = document.getElementById('scroll-top-fab');
    chatTitleEl = document.getElementById('chat-title');
    
    // Render awal
    renderSidebar();
    renderCurrentChat();
    const curConv = conversations.find(c => c.id === currentConversationId);
    if (curConv) chatTitleEl.innerText = curConv.title;
    
    // Event listeners
    sendBtn.addEventListener('click', () => sendUserMessage());
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendUserMessage();
      }
    });
    document.getElementById('new-chat-btn')?.addEventListener('click', () => createNewChat());
    document.getElementById('clear-current-chat-btn')?.addEventListener('click', () => clearCurrentChat());
    document.getElementById('scroll-top-btn')?.addEventListener('click', () => scrollToTop());
    
    initScrollListener();
    
    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }
  
  window.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();
