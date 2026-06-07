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
      alert.cssClass = 'minimalist-alert'; // Hook untuk custom styling jika diperlukan
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
        title: 'Percakapan Baru',
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
        conversations = [{ id: newId, title: 'Percakapan Baru', messages: [] }];
        currentConversationId = newId;
        saveToLocalStorage();
      } else if (currentConversationId && !conversations.find(c => c.id === currentConversationId)) {
        currentConversationId = conversations[0].id;
      }
    } catch(e) {
      console.warn(e);
      const defaultId = generateId();
      conversations = [{ id: defaultId, title: 'Percakapan Baru', messages: [] }];
      currentConversationId = defaultId;
    }
  }

  // Update title percakapan berdasarkan pesan pertama user
  function updateConversationTitle(convId) {
    const conv = conversations.find(c => c.id === convId);
    if (!conv) return;
    const firstUserMsg = conv.messages.find(m => m.sender === 'user');
    if (firstUserMsg && firstUserMsg.text) {
      let newTitle = firstUserMsg.text.length > 20 ? firstUserMsg.text.substring(0, 18) + '...' : firstUserMsg.text;
      if (newTitle.trim() === '') newTitle = 'Percakapan Baru';
      conv.title = newTitle;
    } else {
      conv.title = 'Percakapan Baru';
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
      conversationListEl.innerHTML = `
        <div class="menu-loading-container">
          <p style="color: #a0aec0;">Tidak ada percakapan</p>
        </div>`;
      return;
    }
    let html = '';
    conversations.forEach(conv => {
      const isActive = (currentConversationId === conv.id);
      const activeClass = isActive ? 'active' : '';
      const titleEscaped = escapeHtml(conv.title);
      const messageCount = conv.messages.length;
      
      html += `
        <ion-item class="history-item ${activeClass}" data-conv-id="${conv.id}" button detail="false">
          <ion-icon name="chatbubble-outline" slot="start" class="history-icon"></ion-icon>
          <ion-label class="history-label">
            <h2>${titleEscaped}</h2>
            <p>${messageCount} pesan</p>
          </ion-label>
          <ion-buttons slot="end">
            <ion-button class="delete-conv-btn minimalist-btn-danger" fill="clear" data-conv-delete="${conv.id}">
              <ion-icon slot="icon-only" name="trash-outline" style="font-size: 16px;"></ion-icon>
            </ion-button>
          </ion-buttons>
        </ion-item>
      `;
    });
    conversationListEl.innerHTML = html;

    // Event listener untuk peralihan chat
    document.querySelectorAll('.history-item').forEach(item => {
      const convId = item.getAttribute('data-conv-id');
      if (convId && !item.getAttribute('data-listener-attached')) {
        item.addEventListener('click', (e) => {
          // Cegah jika menekan tombol hapus (trash)
          if (e.target.closest('.delete-conv-btn')) return;
          if (convId !== currentConversationId) {
            switchConversation(convId);
          }
        });
        item.setAttribute('data-listener-attached', 'true');
      }
    });

    // Event listener untuk tombol hapus riwayat
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
      const newId = generateId();
      conversations.push({ id: newId, title: 'Percakapan Baru', messages: [] });
      currentConversationId = newId;
    } else if (currentConversationId === convId) {
      currentConversationId = conversations[0].id;
    }
    saveToLocalStorage();
    renderSidebar();
    renderCurrentChat();
    
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
    const bubble = aiMessageElement.querySelector('.message-bubble');
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

    // Perbaikan Logika Welcome Screen: Hanya tampil jika kosong total
    if (messages.length === 0) {
      emptyPlaceholder.style.display = 'flex';
    } else {
      emptyPlaceholder.style.display = 'none';
      messages.forEach(msg => {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = `message-wrapper ${msg.sender}`;
        
        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        // Render Markdown jika AI, selain itu teks biasa
        if (msg.sender === 'ai' && window.marked) {
          bubbleDiv.innerHTML = marked.parse(msg.text);
        } else {
          bubbleDiv.innerText = msg.text;
        }

        wrapperDiv.appendChild(bubbleDiv);
        messagesContainer.appendChild(wrapperDiv);
      });
    }

    // Mengontrol penayangan typing indicator meluncur dinamis
    if (isWaitingResponse) {
      showTypingIndicatorOnly();
    } else {
      removeTypingIndicator();
    }
    scrollToBottom();
  }

  // Menampilkan typing indicator berbentuk pil minimalis modern
  function showTypingIndicatorOnly() {
    removeTypingIndicator();
    
    // Menyembunyikan welcome screen jika sedang mengetik pesan pertama
    if (emptyPlaceholder) {
      emptyPlaceholder.style.display = 'none';
    }

    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator-container';
    typingDiv.id = 'live-typing-indicator';
    
    const bubbleDiv = document.createElement('div');
    bubbleDiv.className = 'typing-bubble';

    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('span');
      dot.className = 'typing-dot';
      bubbleDiv.appendChild(dot);
    }
    
    typingDiv.appendChild(bubbleDiv);
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

  // Fungsi menambahkan pesan baru ke percakapan aktif
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
    
    // Sembunyikan placeholder welcome screen saat pesan pertama dikirim
    if (emptyPlaceholder) {
      emptyPlaceholder.style.display = 'none';
    }

    // Update title jika pesan pertama dari user
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

      // Hapus indikator sebelum mulai rendering stream bubble AI
      removeTypingIndicator();

      // Buat pesan AI kosong
      const aiMsg = {
        id: generateId(),
        text: '',
        sender: 'ai',
        timestamp: Date.now()
      };
      currentConv.messages.push(aiMsg);

      // Desain bubble wrapper baru disesuaikan dengan template CSS kita
      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'message-wrapper ai';
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'message-bubble';
      wrapperDiv.appendChild(bubbleDiv);
      messagesContainer.appendChild(wrapperDiv);
      aiMessageElement = wrapperDiv; // Simpan referensi penargetan streaming

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
        buffer = lines.pop() || '';

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
              updateAIBubbleOnly(aiFullText);
            }
          } catch (e) { }
        }
      }

      // Sisa Buffer terakhir
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
      aiMessageElement = null;
    } catch (error) {
      console.error('Error:', error);
      removeTypingIndicator();
      addMessageToCurrent('ai', 'Maaf Bro, ada gangguan koneksi dengan asisten AI. Silakan periksa jaringanmu dan coba kembali.');
      aiMessageElement = null;
    } finally {
      isWaitingResponse = false;
      removeTypingIndicator();
    }
  }

  // Kirim pesan user
  async function sendUserMessage() {
    if (isWaitingResponse) {
      await showAlert('Tunggu Sebentar', 'Asisten AI sedang menyusun tanggapan... mohon tunggu sesaat.');
      return;
    }
    let rawText = messageInput.value?.trim();
    if (!rawText) {
      return; // Kembalikan tanpa alert kosong yang berisik
    }
    addMessageToCurrent('user', rawText);
    messageInput.value = '';
    await getAIResponse(rawText);
  }

  // New chat
  function createNewChat() {
    if (isWaitingResponse) {
      showAlert('Tunggu', 'Selesaikan percakapan saat ini sebelum memulai baru.');
      return;
    }
    const newId = generateId();
    const newConv = {
      id: newId,
      title: 'Percakapan Baru',
      messages: []
    };
    conversations.unshift(newConv);
    currentConversationId = newId;
    saveToLocalStorage();
    renderSidebar();
    renderCurrentChat();
    chatTitleEl.innerText = 'Percakapan Baru';
    scrollToBottom();
  }

  // Switch conversation
  function switchConversation(convId) {
    if (isWaitingResponse) {
      showAlert('Tunggu', 'Harap tunggu hingga asisten selesai merespon chat saat ini.');
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
    messageInput.value = '';
    aiMessageElement = null;
  }

  // Clear all messages in current conversation
  async function clearCurrentChat() {
    if (isWaitingResponse) {
      showAlert('Tunggu', 'Asisten sedang memproses tanggapan, tidak bisa mengosongkan riwayat sekarang.');
      return;
    }
    const conv = conversations.find(c => c.id === currentConversationId);
    if (!conv) return;
    if (conv.messages.length === 0) {
      showAlert('Info', 'Kotak obrolan ini sudah bersih.');
      return;
    }
    const confirmed = await confirmDialog('Bersihkan Obrolan', `Hapus seluruh pesan yang ada pada "${conv.title}"?`);
    if (confirmed) {
      conv.messages = [];
      saveToLocalStorage();
      renderCurrentChat();
      updateConversationTitle(currentConversationId);
      chatTitleEl.innerText = conv.title;
      aiMessageElement = null;
    }
  }

  // SCROLL helpers
  async function scrollToBottom() {
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

  // Show/hide scroll-to-top FAB
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

// Lisensi Proteksi Template
document.addEventListener('DOMContentLoaded', function () {
    const dev = 'aHR0cHM6Ly92aWxkYWVzYS5naXRodWIuaW8=';
    const myLicense = atob(dev);
    const metaLicenseEl = document.querySelector('meta[name="license"]');
    const metaLicense = metaLicenseEl ? metaLicenseEl.getAttribute('content') : null;

    let second = 10;
    if (metaLicense && metaLicense === myLicense) return;

    const lockStyleAndHtml = `
        <style>
            body { background: #000000b3 !important; overflow: hidden !important; }
            #peringatan { z-index: 99999999999999; position: fixed; top: 0; right: 0; left: 0; height: 100%; padding: 16% 0; text-align: center; background: #000000f2; color: #fff; font-family: sans-serif; }
            #peringatan h4 { margin-bottom: 35px; font-size: 32px; }
            #peringatan p { margin-top: 20px; font-size: 18px; letter-spacing: 2px; line-height: 30px; }
            #aktivasi { font-size: 50px; display: block; margin-top: 20px; color: #ff4444; }
            @media only screen and (max-width:680px) { #peringatan { padding: 60% 0; } #peringatan h4 { font-size: 20px !important; } }
        </style>
        <div id="peringatan">
            <h4>🔒︄ Template is Locked Up</h4>
            <p>Meta license template tidak valid.<br>Mohon jangan menghapus / merubah license.</p>
            <span id="aktivasi">${second}</span>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', lockStyleAndHtml);
    const aktivasiEl = document.getElementById('aktivasi');
    const lockInterval = setInterval(function () {
        second--;
        if (aktivasiEl) aktivasiEl.textContent = second;
        if (second <= 0) {
            clearInterval(lockInterval);
            window.location.href = "https://mia-miaaw.github.io/blog/";
        }
    }, 1000);
});
