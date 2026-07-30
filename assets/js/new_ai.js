(function(){
  // ---------- KONFIGURASI FIREBASE AUTH ----------
  const firebaseConfig = {
      apiKey: "AIzaSyATyvdXXQHvJE6-EYiwXJ0jCZkvUBW-3c8",
      authDomain: "my-ai-quran.firebaseapp.com",
      projectId: "my-ai-quran",
      storageBucket: "my-ai-quran.firebasestorage.app",
      messagingSenderId: "1025965303376",
      appId: "1:1025965303376:web:d2aa080d9f81b4fa699355"
  };

  let currentUser = null; 
  let auth = null;

  function initFirebase() {
    updateAuthUI(null);

    if (window.firebase) {
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();

        auth.onAuthStateChanged((user) => {
          const wasLoggedOut = !currentUser && user;
          currentUser = user;
          updateAuthUI(user);

          if (user) {
            removeLoginFloatingBanner();
            if (wasLoggedOut) {
              showWelcomeToast(user.displayName || 'Pengguna');
            }
          }
        });
      } catch (e) {
        console.warn("Kredensial Firebase belum dikonfigurasi dengan benar:", e);
      }
    } else {
      console.warn("Firebase SDK tidak ditemukan di window object.");
    }
  }

  // Toast Notifikasi Selamat Datang
  async function showWelcomeToast(userName) {
    if (window.Ionic && Ionic.toastController) {
      const toast = await Ionic.toastController.create({
        message: `Selamat datang kembali, ${userName}! 🕌`,
        duration: 3500,
        position: 'top',
        color: 'success',
        icon: 'checkmark-circle-outline',
        buttons: [{ text: 'OK', role: 'cancel' }]
      });
      await toast.present();
    } else {
      const toastDiv = document.createElement('div');
      toastDiv.id = 'custom-welcome-toast';
      toastDiv.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: #ffffff;
        padding: 12px 24px;
        border-radius: 30px;
        font-size: 0.9rem;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 999999;
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        transition: all 0.3s ease;
      `;
      toastDiv.innerHTML = `<span>✨ Selamat datang kembali, <strong>${escapeHtml(userName)}</strong>!</span>`;
      document.body.appendChild(toastDiv);
      setTimeout(() => {
        toastDiv.style.opacity = '0';
        setTimeout(() => toastDiv.remove(), 300);
      }, 3500);
    }
  }

  function updateAuthUI(user) {
    const authContainer = document.getElementById('firebase-auth-container');
    if (!authContainer) return;

    if (user) {
      authContainer.innerHTML = `
        <div class="user-profile-card">
          <a href="./profile" class="user-profile-info" style="text-decoration: none; color: inherit; cursor: pointer;">
            <img src="${user.photoURL || 'https://www.gravatar.com/avatar?d=mp'}" class="user-avatar" alt="User Profile" />
            <div class="user-details">
              <span class="user-name">${escapeHtml(user.displayName || 'Pengguna')}</span>
              <span class="user-email">${escapeHtml(user.email || '')}</span>
            </div>
          </a>
          <ion-button fill="clear" size="small" id="google-logout-btn" class="logout-btn">
            <ion-icon name="log-out-outline" slot="icon-only"></ion-icon>
          </ion-button>
        </div>
      `;

      document.getElementById('google-logout-btn')?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (auth) {
          auth.signOut().then(() => {
            showAlert('Logout', 'Anda telah keluar dari akun Google.');
          });
        }
      });
    } else {
      authContainer.innerHTML = `
        <button class="google-login-native-btn" id="sidebar-google-login-btn">
          <svg class="google-icon-svg" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Masuk dengan Google</span>
        </button>
      `;

      document.getElementById('sidebar-google-login-btn')?.addEventListener('click', loginWithGoogle);
    }
  }

  async function loginWithGoogle() {
    if (!auth) {
      await showAlert('Firebase Konfigurasi', 'Harap periksa kredensial Firebase SDK.');
      return;
    }
    const provider = new firebase.auth.GoogleAuthProvider();
    try {
      await auth.signInWithPopup(provider);
    } catch (error) {
      console.error("Gagal Login Google:", error);
      showAlert('Gagal Login', error.message || 'Terjadi kesalahan saat masuk dengan Google.');
    }
  }

  // ---------- FLOATING BANNER NOTIFIKASI LOGIN ----------
  function showLoginFloatingBanner() {
    removeLoginFloatingBanner();

    const bannerDiv = document.createElement('div');
    bannerDiv.id = 'floating-login-banner';
    bannerDiv.style.cssText = `
      position: fixed;
      bottom: 80px;
      left: 50%;
      transform: translateX(-50%);
      width: calc(100% - 32px);
      max-width: 480px;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #4285F4;
      border-radius: 14px;
      padding: 12px 16px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      animation: bannerSlideUp 0.3s ease-out;
    `;

    if (!document.getElementById('banner-anim-style')) {
      const style = document.createElement('style');
      style.id = 'banner-anim-style';
      style.innerHTML = `
        @keyframes bannerSlideUp {
          from { opacity: 0; transform: translate(-50%, 20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (prefers-color-scheme: dark) {
          #floating-login-banner {
            background: #1e293b !important;
            border-color: #334155 !important;
            color: #f8fafc !important;
          }
        }
      `;
      document.head.appendChild(style);
    }

    bannerDiv.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-size: 0.85rem; font-weight: 700; color: #1e293b;">🔒 Akses Terbatas</span>
        <span style="font-size: 0.78rem; color: #64748b;">Silakan login terlebih dahulu untuk menggunakan AI.</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button class="google-login-native-btn" id="banner-google-btn" style="padding: 6px 12px; font-size: 0.78rem; border-radius: 8px; margin: 0; white-space: nowrap;">
          <svg class="google-icon-svg" viewBox="0 0 24 24" style="width: 14px; height: 14px;">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
          </svg>
          <span>Masuk</span>
        </button>
        <button id="close-login-banner" style="background: transparent; border: none; font-size: 1.2rem; cursor: pointer; color: #94a3b8; padding: 2px 6px;">&times;</button>
      </div>
    `;

    document.body.appendChild(bannerDiv);

    document.getElementById('banner-google-btn')?.addEventListener('click', () => {
      loginWithGoogle();
    });

    document.getElementById('close-login-banner')?.addEventListener('click', () => {
      removeLoginFloatingBanner();
    });
  }

  function removeLoginFloatingBanner() {
    const existing = document.getElementById('floating-login-banner');
    if (existing) existing.remove();
  }

  // ---------- GLOBAL STATE ----------
  let conversations = [];        // array of { id, title, messages: [{id, text, sender, timestamp}] }
  let currentConversationId = null;
  let isWaitingResponse = false; // mencegah spam saat AI merespon / typing
  let currentTypingIndicatorElement = null;
  let aiMessageElement = null;   // Referensi untuk bubble AI yang sedang streaming

  // Audio state Al-Quran
  let currentAudioPlayer = null; // Memegang instance Audio yang sedang menyala
  let activeAudioBtn = null;     // Memegang tombol ikon aktif agar bisa diganti ikonnya ke "pause"

  // STATE: Playlist Murottal Kontinu
  let isContinuousPlaying = false; 
  let currentSurahVerses = [];    // Menyimpan daftar ayat yang sedang dibuka [{ nomorAyat, audioUrl }]
  let currentPlayingIndex = -1;   // Index ayat yang sedang berjalan di dalam playlist
  let loadedSurahNumber = null;

  // DOM references
  let messagesContainer;
  let emptyPlaceholder;
  let conversationListEl;
  let chatContentEl;
  let messageInput;
  let sendBtn;
  let scrollTopFab;
  let chatTitleEl;

  // DOM Al-Quran Modal
  let quranModal;
  let closeQuranBtn;
  let quranBackBtn;
  let quranModalTitle;
  let quranBookView;
  let quranReadingView;
  let quranSurahGrid;
  let quranVersesContainer;
  let quranModalFooter;

  // DOM Al-Quran Continuous Player Controls (Footer)
  let quranPlayAllBtn;
  let quranStopBtn;
  let quranPrevBtn;
  let quranNextBtn;
  let playerCurrentAyahText;
  let playAllIcon;

  // Helper: Generate unique ID
  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

  // Update Teks Waktu Real-Time di Empty Placeholder
  function updatePlaceholderTime() {
    const subtitleEl = document.getElementById('empty-chat-subtitle-text');
    if (!subtitleEl) return;

    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeString = `${hours}:${minutes}`;

    let ucapan = "Selamat malam";
    const hourInt = now.getHours();
    if (hourInt >= 4 && hourInt < 11) {
      ucapan = "Selamat pagi";
    } else if (hourInt >= 11 && hourInt < 15) {
      ucapan = "Selamat siang";
    } else if (hourInt >= 15 && hourInt < 18) {
      ucapan = "Selamat sore";
    }

    subtitleEl.innerHTML = `${ucapan}.<br>sekarang pukul ${timeString} WIB<br>Ada yang bisa saya bantu tentang Al-Quran?`;
  }

  // ---------- ION ALERT GLOBAL KONFIRM DINAMIS (Promise based) ----------
  async function confirmDialog(header, message) {
    return new Promise((resolve) => {
      const alert = document.createElement('ion-alert');
      alert.header = header;
      alert.message = message;
      alert.cssClass = 'minimalist-alert';
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

  // ---------- RENDER SIDEBAR ----------
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

    document.querySelectorAll('.history-item').forEach(item => {
      const convId = item.getAttribute('data-conv-id');
      if (convId && !item.getAttribute('data-listener-attached')) {
        item.addEventListener('click', (e) => {
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

  // ---------- RENDER CHAT ----------
  function renderCurrentChat() {
    if (!messagesContainer) return;
    const currentConv = conversations.find(c => c.id === currentConversationId);
    if (!currentConv) return;

    messagesContainer.innerHTML = '';
    const messages = currentConv.messages;

    if (messages.length === 0) {
      updatePlaceholderTime();
      emptyPlaceholder.style.display = 'flex';
    } else {
      emptyPlaceholder.style.display = 'none';
      messages.forEach(msg => {
        const wrapperDiv = document.createElement('div');
        wrapperDiv.className = `message-wrapper ${msg.sender}`;

        const bubbleDiv = document.createElement('div');
        bubbleDiv.className = 'message-bubble';

        if (msg.sender === 'ai' && window.marked) {
          bubbleDiv.innerHTML = marked.parse(msg.text);
        } else {
          bubbleDiv.innerText = msg.text;
        }

        wrapperDiv.appendChild(bubbleDiv);
        messagesContainer.appendChild(wrapperDiv);
      });
    }

    if (isWaitingResponse) {
      showTypingIndicatorOnly();
    } else {
      removeTypingIndicator();
    }
    scrollToBottom();
  }

  function showTypingIndicatorOnly() {
    removeTypingIndicator();

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

    if (emptyPlaceholder) {
      emptyPlaceholder.style.display = 'none';
    }

    if (sender === 'user' && conv.messages.filter(m => m.sender === 'user').length === 1) {
      updateConversationTitle(currentConversationId);
    }
    saveToLocalStorage();
    renderCurrentChat();
    return true;
  }

  // API Configuration
  const API_BASE_URL = 'https://ai-quran-backend.vildaesa.workers.dev';

  async function getAIResponse(userMessage) {
    if (isWaitingResponse) return;

    // VALIDASI FRONTEND: TAMPILKAN FLOATING BANNER JIKA BELUM LOGIN (TANPA MERUSAK HISTORY)
    if (!currentUser) {
      showLoginFloatingBanner();
      return;
    }

    isWaitingResponse = true;
    showTypingIndicatorOnly();

    const currentConv = conversations.find(c => c.id === currentConversationId);
    if (!currentConv) return;

    const messageHistory = currentConv.messages.map(m => ({
      role: m.sender === 'ai' ? 'assistant' : 'user',
      content: m.text
    }));

    const activeUserId = currentUser.uid;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': activeUserId
        },
        body: JSON.stringify({ 
          userId: activeUserId,
          messages: messageHistory 
        })
      });

      if (!response.ok) {
        let errorText = 'Terjadi kendala pada server backend.';
        try {
          const errData = await response.json();
          if (errData && errData.error) {
            errorText = errData.error;
          }
          if (errData && errData.requireLogin) {
            removeTypingIndicator();
            showLoginFloatingBanner();
            return;
          }
        } catch(e) {
          if (response.status === 401) {
            removeTypingIndicator();
            showLoginFloatingBanner();
            return;
          }
          if (response.status === 402) {
            errorText = `Saldo token untuk ID Akun (${activeUserId}) habis. Silakan top-up saldo token terlebih dahulu.`;
          }
        }
        throw new Error(errorText);
      }

      const aiMsg = {
        id: generateId(),
        text: '',
        sender: 'ai',
        timestamp: Date.now()
      };
      currentConv.messages.push(aiMsg);

      const wrapperDiv = document.createElement('div');
      wrapperDiv.className = 'message-wrapper ai';
      const bubbleDiv = document.createElement('div');
      bubbleDiv.className = 'message-bubble';
      wrapperDiv.appendChild(bubbleDiv);
      messagesContainer.appendChild(wrapperDiv);
      aiMessageElement = wrapperDiv;

      scrollToBottom();

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let aiFullText = '';
      let buffer = '';
      let currentEvent = 'message'; 

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('event:')) {
            currentEvent = trimmedLine.split(':')[1].trim();
            continue;
          }

          if (trimmedLine.startsWith('data:')) {
            const dataStr = trimmedLine.substring(5).trim();
            if (dataStr === '[DONE]') break;

            if (currentEvent === 'action') {
              try {
                const action = JSON.parse(dataStr);
                if (action.type === 'openSurah') {
                  const surahNum = parseInt(action.surah, 10);
                  const ayahNum = parseInt(action.ayah, 10);
                  const surahName = action.surahName || `Surah ${surahNum}`;

                  setTimeout(() => {
                    removeTypingIndicator();

                    if (quranModal && typeof quranModal.present === 'function') {
                      quranModal.present();
                    }

                    openSurahReadingView(surahNum, surahName);
                    waitForAyahAndScroll(surahNum, ayahNum);
                  }, 2200); 
                }
              } catch (err) {
                console.error("Gagal membaca payload event action:", err);
              }
            } else {
              removeTypingIndicator();

              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.response) {
                  aiFullText += parsed.response;
                  aiMsg.text = aiFullText;
                  updateAIBubbleOnly(aiFullText);
                }
              } catch (e) {
                aiFullText += dataStr;
                aiMsg.text = aiFullText;
                updateAIBubbleOnly(aiFullText);
              }
            }
          }
        }
      }

      if (buffer.trim().startsWith('data: ')) {
        const dataStr = buffer.trim().substring(5).trim();
        if (dataStr !== '[DONE]') {
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.response) {
              aiFullText += parsed.response;
              aiMsg.text = aiFullText;
              updateAIBubbleOnly(aiFullText);
            }
          } catch (e) {
            aiFullText += dataStr;
            aiMsg.text = aiFullText;
            updateAIBubbleOnly(aiFullText);
          }
        }
      }

      saveToLocalStorage();
      aiMessageElement = null;
    } catch (error) {
      console.error('Error:', error);
      removeTypingIndicator();
      addMessageToCurrent('ai', `Maaf Bro, ada kendala:\n\n**Detail Kendala:** ${error.message || error}`);
      aiMessageElement = null;
    } finally {
      isWaitingResponse = false;
      setTimeout(() => {
        removeTypingIndicator();
      }, 2500);
    }
  }

  async function sendUserMessage() {
    if (isWaitingResponse) {
      await showAlert('Tunggu Sebentar', 'Asisten AI sedang menyusun tanggapan... mohon tunggu sesaat.');
      return;
    }
    let rawText = messageInput.value?.trim();
    if (!rawText) return;

    if (!currentUser) {
      showLoginFloatingBanner();
      return;
    }

    addMessageToCurrent('user', rawText);
    messageInput.value = '';
    await getAIResponse(rawText);
  }

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


  // ========================================================
  // LOGIKA AL-QURAN DIGITAL & PLAYLIST MUROTTAL KONTINU
  // ========================================================

  async function renderQuranBookGrid() {
    if (!quranSurahGrid) return;

    quranSurahGrid.innerHTML = `
      <div class="menu-loading-container" style="grid-column: 1/-1; padding: 100px 0; text-align: center;">
        <ion-spinner name="crescent" class="custom-spinner"></ion-spinner>
        <p style="margin-top: 12px; color: #718096;">Membuka lembaran mushaf...</p>
      </div>`;

    try {
      const response = await fetch('https://equran.id/api/v2/surat');
      const result = await response.json();

      let surahArray = null;
      if (result && Array.isArray(result.data)) {
        surahArray = result.data;
      } else if (result && Array.isArray(result)) {
        surahArray = result;
      }

      if (surahArray && surahArray.length > 0) {
        let html = '';
        surahArray.forEach(surah => {
          const nomor = surah.nomor || surah.number;
          const namaLatin = surah.namaLatin || surah.englishName || "Surat";
          const arti = surah.arti || surah.englishNameTranslation || "";
          const jumlahAyat = surah.jumlahAyat || surah.numberOfAyahs || 0;
          const namaArab = surah.nama || surah.name || "";

          html += `
            <div class="quran-surah-card" data-surah-num="${nomor}" data-surah-name="${namaLatin}">
              <div class="surah-number-badge">${nomor}</div>
              <div class="surah-meta-info">
                <h4>${namaLatin}</h4>
                <p>${arti} • ${jumlahAyat} Ayat</p>
              </div>
              <div class="surah-arabic-name">${namaArab}</div>
            </div>
          `;
        });

        quranSurahGrid.innerHTML = html;

        document.querySelectorAll('.quran-surah-card').forEach(card => {
          card.addEventListener('click', () => {
            const num = parseInt(card.getAttribute('data-surah-num'), 10);
            const name = card.getAttribute('data-surah-name');
            openSurahReadingView(num, name);
          });
        });

      } else {
        throw new Error("Format respons list API tidak didukung");
      }
    } catch (e) {
      console.error('Gagal memuat katalog Al-Quran:', e);
      quranSurahGrid.innerHTML = `
        <div class="quran-welcome-state" style="grid-column: 1/-1; color: #e53e3e; text-align: center;">
          <ion-icon name="alert-circle-outline" class="quran-large-icon" style="color: #feb2b2; font-size: 40px;"></ion-icon>
          <h4>Gagal Memuat Indeks</h4>
          <p>Terjadi kesalahan atau hambatan jaringan internet saat memuat daftar surah.</p>
          <ion-button fill="outline" size="small" id="retry-load-quran" style="margin-top: 16px; --color: #2b6cb0;">Coba Lagi</ion-button>
        </div>`;

      document.getElementById('retry-load-quran')?.addEventListener('click', renderQuranBookGrid);
    }
  }

  function openSurahReadingView(surahNumber, surahName) {
    resetContinuousPlayerState();

    quranBookView.style.display = 'none';
    quranReadingView.style.display = 'block';
    quranBackBtn.style.display = 'block';
    closeQuranBtn.style.display = 'none';
    quranModalFooter.style.display = 'block';

    quranModalTitle.innerText = surahName.startsWith("Surah") ? surahName : `Surah ${surahName}`;
    loadedSurahNumber = parseInt(surahNumber, 10);

    fetchAndRenderSurah(loadedSurahNumber);
  }

  function closeSurahReadingView() {
    resetContinuousPlayerState();

    quranBookView.style.display = 'block';
    quranReadingView.style.display = 'none';
    quranBackBtn.style.display = 'none';
    closeQuranBtn.style.display = 'block';
    quranModalFooter.style.display = 'none';

    quranModalTitle.innerText = 'Al-Quran Digital';
    loadedSurahNumber = null;
  }

  async function fetchAndRenderSurah(surahNumber) {
    quranVersesContainer.innerHTML = `
      <div class="menu-loading-container" style="padding: 100px 0; text-align: center;">
        <ion-spinner name="crescent" class="custom-spinner"></ion-spinner>
        <p style="margin-top: 12px; color: #718096;">Memuat lantunan ayat suci...</p>
      </div>`;

    currentSurahVerses = [];

    // --- API UTAMA: equran.id ---
    try {
      const response = await fetch(`https://equran.id/api/v2/surat/${surahNumber}`);
      const result = await response.json();

      let verses = null;
      if (result && result.code === 200 && result.data && Array.isArray(result.data.ayat)) {
        verses = result.data.ayat;
      } else if (result && result.data && Array.isArray(result.data.ayat)) {
        verses = result.data.ayat;
      }

      if (verses && verses.length > 0) {
        verses.forEach(v => {
          const audioUrl = v.audio ? (v.audio['01'] || v.audio['02'] || Object.values(v.audio)[0] || '') : '';
          currentSurahVerses.push({
            nomorAyat: v.nomorAyat,
            audioUrl: audioUrl
          });
        });

        renderAyatToDOM(verses, surahNumber);
        enableContinuousPlayerControls();
        return; 
      } else {
        throw new Error("Struktur data Equran.id tidak didukung. Memulai Fallback API...");
      }
    } catch (e) {
      console.warn("API Utama gagal atau lambat, beralih ke Fallback API Global...", e);
    }

    // --- API FALLBACK: alquran.cloud ---
    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,id.kemenag`);
      const result = await response.json();

      if (result && result.code === 200 && Array.isArray(result.data) && result.data.length >= 2) {
        const arabicData = result.data[0].verses;
        const translationData = result.data[1].verses;

        if (Array.isArray(arabicData) && arabicData.length > 0) {
          currentSurahVerses = []; 

          const formattedVerses = arabicData.map((v, idx) => {
            const audioUrl = `https://cdn.aladhan.com/audios/ar.alafasy/${v.number}.mp3`;
            currentSurahVerses.push({
              nomorAyat: v.numberInSurah,
              audioUrl: audioUrl
            });

            return {
              nomorAyat: v.numberInSurah,
              teksArab: v.text,
              teksIndonesia: translationData[idx]?.text || 'Terjemahan tidak tersedia',
              audio: { "01": audioUrl }
            };
          });

          renderAyatToDOM(formattedVerses, surahNumber);
          enableContinuousPlayerControls();
          return; 
        }
      }
      throw new Error("API Fallback juga mengalami kendala");
    } catch (e) {
      console.error('Semua API Al-Quran mengalami gangguan:', e);
      quranVersesContainer.innerHTML = `
        <div class="quran-welcome-state" style="color: #e53e3e; text-align: center; padding: 30px 10px;">
          <ion-icon name="alert-circle-outline" class="quran-large-icon" style="color: #feb2b2; font-size: 40px;"></ion-icon>
          <h4>Pemuatan Gagal</h4>
          <p>Terjadi gangguan koneksi pada server penyedia ayat. Mohon periksa sinyal internet Anda dan ketuk tombol di bawah.</p>
          <ion-button fill="outline" size="small" id="retry-load-verses" style="margin-top: 16px; --color: #2b6cb0;">Coba Lagi</ion-button>
        </div>`;

      document.getElementById('retry-load-verses')?.addEventListener('click', () => fetchAndRenderSurah(surahNumber));
    }
  }

  function renderAyatToDOM(versesList, surahNumber) {
    const surahId = parseInt(surahNumber, 10);
    let html = '<div class="quran-verses-container">';

    if (surahId !== 1 && surahId !== 9) {
      html += `
        <div class="bismillah-header" style="text-align: center; padding: 12px 0 24px 0; border-bottom: 1px dashed rgba(0,0,0,0.04);">
          <p class="ayah-arabic" style="text-align: center; font-size: 1.7rem; color: #2b6cb0; font-family: 'Amiri', serif;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
        </div>`;
    }

    versesList.forEach((verse) => {
      const ayahNum = verse.nomorAyat || verse.numberInSurah;
      let arabicText = verse.teksArab || verse.text || "";
      const translationText = verse.teksIndonesia || verse.translation || 'Terjemahan tidak tersedia';

      let audioUrl = '';
      if (verse.audio) {
        if (typeof verse.audio === 'object') {
          audioUrl = verse.audio['01'] || verse.audio['02'] || Object.values(verse.audio)[0] || '';
        } else if (typeof verse.audio === 'string') {
          audioUrl = verse.audio;
        }
      }

      const bismillahStandard = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";
      const bismillahAlternative = "بِسمِ اللَّهِ الرَّحمٰnِ الرَّحيمِ";
      if (surahId !== 1 && surahId !== 9 && ayahNum === 1) {
        if (arabicText.startsWith(bismillahStandard)) {
          arabicText = arabicText.replace(bismillahStandard, "").trim();
        } else if (arabicText.startsWith(bismillahAlternative)) {
          arabicText = arabicText.replace(bismillahAlternative, "").trim();
        }
      }

      html += `
        <div class="ayah-card" id="ayah-${ayahNum}" data-ayah-index="${ayahNum - 1}" style="transition: background-color 0.4s ease, border-left 0.4s ease;">
          <div class="ayah-header">
            <span class="ayah-badge">Ayat ${ayahNum}</span>
          </div>
          <p class="ayah-arabic">${arabicText}</p>
          <p class="ayah-translation">${translationText}</p>
          ${audioUrl ? `
          <div class="ayah-actions">
            <ion-button fill="clear" size="small" class="audio-play-btn" data-audio-src="${audioUrl}" data-ayah-num="${ayahNum}">
              <ion-icon name="play-outline" slot="icon-only"></ion-icon>
            </ion-button>
          </div>` : ''}
        </div>
      `;
    });

    html += '</div>';
    quranVersesContainer.innerHTML = html;

    document.querySelectorAll('.audio-play-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const btnEl = e.currentTarget;
        const audioSrc = btnEl.getAttribute('data-audio-src');
        const ayahNum = parseInt(btnEl.getAttribute('data-ayah-num'), 10);

        handleIndividualAyahPlay(audioSrc, ayahNum, btnEl);
      });
    });
  }


  // ========================================================
  // ENGINE LOGIC: PLAYLIST OTOMATIS BERURUTAN (FOOTER SYSTEM)
  // ========================================================

  function enableContinuousPlayerControls() {
    quranPlayAllBtn.style.display = 'block';

    playAllIcon.name = 'play-outline';
    playAllIcon.setAttribute('name', 'play-outline');

    playerCurrentAyahText.innerText = 'Ketuk tombol play untuk mendengarkan semua surah';
  }

  function resetContinuousPlayerState() {
    if (currentAudioPlayer) {
      currentAudioPlayer.pause();
      currentAudioPlayer = null;
    }
    isContinuousPlaying = false;
    currentPlayingIndex = -1;
    activeAudioBtn = null;

    quranPlayAllBtn.style.display = 'block';
    quranPlayAllBtn.className = 'mini-control-btn play-main-btn';
    quranStopBtn.style.display = 'none';

    playAllIcon.name = 'play-outline';
    playAllIcon.setAttribute('name', 'play-outline');

    playerCurrentAyahText.innerText = 'Putar semua surah';

    document.querySelectorAll('.ayah-card').forEach(card => {
      card.classList.remove('active-playing-ayah');
    });
  }

  function toggleContinuousPlay() {
    if (currentSurahVerses.length === 0) return;

    if (isContinuousPlaying) {
      if (currentAudioPlayer && !currentAudioPlayer.paused) {
        currentAudioPlayer.pause();

        playAllIcon.name = 'play-outline';
        playAllIcon.setAttribute('name', 'play-outline');
        forceIconRefresh(playAllIcon); 

        playerCurrentAyahText.innerText = `Murottal Ayat ${currentPlayingIndex + 1} sedang dijeda`;

        const activeCardBtn = document.querySelector(`#ayah-${currentPlayingIndex + 1} .audio-play-btn`);
        if (activeCardBtn) {
          activeCardBtn.innerHTML = `<ion-icon name="play-outline" slot="icon-only"></ion-icon>`;
        }
      } else if (currentAudioPlayer && currentAudioPlayer.paused) {
        currentAudioPlayer.play().catch(e => console.error("Gagal melanjutkan audio:", e));

        playAllIcon.name = 'pause-outline';
        playAllIcon.setAttribute('name', 'pause-outline');
        forceIconRefresh(playAllIcon); 

        playerCurrentAyahText.innerText = `Melantunkan Ayat ${currentPlayingIndex + 1}...`;

        const activeCardBtn = document.querySelector(`#ayah-${currentPlayingIndex + 1} .audio-play-btn`);
        if (activeCardBtn) {
          activeCardBtn.innerHTML = `<ion-icon name="pause-outline" slot="icon-only"></ion-icon>`;
        }
      }
    } else {
      isContinuousPlaying = true;
      currentPlayingIndex = 0;

      quranStopBtn.style.display = 'block';

      playAllIcon.name = 'pause-outline';
      playAllIcon.setAttribute('name', 'pause-outline');
      forceIconRefresh(playAllIcon); 

      playContinuousAyatByIndex(currentPlayingIndex);
    }
  }

  function playContinuousAyatByIndex(index) {
    if (index < 0 || index >= currentSurahVerses.length) {
      resetContinuousPlayerState();
      showAlert("Selesai Membaca", "Lantunan ayat suci satu surah penuh telah selesai dikumandangkan.");
      return;
    }

    currentPlayingIndex = index;
    const ayahItem = currentSurahVerses[index];
    const ayahNum = ayahItem.nomorAyat;
    const audioUrl = ayahItem.audioUrl;

    if (!audioUrl) {
      playContinuousAyatByIndex(index + 1);
      return;
    }

    document.querySelectorAll('.ayah-card').forEach(card => {
      card.classList.remove('active-playing-ayah');
    });

    const activeCard = document.getElementById(`ayah-${ayahNum}`);
    if (activeCard) {
      activeCard.classList.add('active-playing-ayah');
      activeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    playerCurrentAyahText.innerText = `Melantunkan Ayat ${ayahNum}...`;

    if (currentAudioPlayer) {
      currentAudioPlayer.pause();
    }

    currentAudioPlayer = new Audio(audioUrl);

    const currentCardBtn = activeCard ? activeCard.querySelector('.audio-play-btn') : null;
    if (currentCardBtn) {
      currentCardBtn.innerHTML = `<ion-icon name="pause-outline" slot="icon-only"></ion-icon>`;
      activeAudioBtn = currentCardBtn;
    }

    currentAudioPlayer.play().catch(err => {
      console.error("Gagal melantunkan murottal:", err);
      setTimeout(() => {
        playContinuousAyatByIndex(index + 1);
      }, 1000);
    });

    currentAudioPlayer.onended = () => {
      if (currentCardBtn) {
        currentCardBtn.innerHTML = `<ion-icon name="play-outline" slot="icon-only"></ion-icon>`;
      }
      playContinuousAyatByIndex(index + 1);
    };
  }

  function playNextAyah() {
    if (!currentSurahVerses.length) return;

    let nextIndex;

    if (currentPlayingIndex < 0) {
      nextIndex = 0;
    } else {
      nextIndex = currentPlayingIndex + 1;
    }

    if (nextIndex >= currentSurahVerses.length) {
      showAlert(
        "Ujung Surah",
        "Ini adalah ayat terakhir."
      );
      return;
    }

    isContinuousPlaying = true;

    quranStopBtn.style.display = 'block';

    playContinuousAyatByIndex(nextIndex);
  }

  function playPrevAyah() {
    if (!currentSurahVerses.length) return;

    let prevIndex;

    if (currentPlayingIndex <= 0) {
      prevIndex = 0;
    } else {
      prevIndex = currentPlayingIndex - 1;
    }

    isContinuousPlaying = true;

    quranStopBtn.style.display = 'block';

    playContinuousAyatByIndex(prevIndex);
  }

  function handleIndividualAyahPlay(audioUrl, ayahNum, buttonElement) {
    const index = ayahNum - 1;

    if (isContinuousPlaying && currentPlayingIndex === index) {
      toggleContinuousPlay();
      return;
    }

    isContinuousPlaying = true;
    currentPlayingIndex = index;
    quranStopBtn.style.display = 'block';

    playAllIcon.name = 'pause-outline';
    playAllIcon.setAttribute('name', 'pause-outline');

    playContinuousAyatByIndex(index);
  }

  // Fungsi Refresh Ikon Paksa
  function forceIconRefresh(iconElement) {
    if (!iconElement) return;

    iconElement.style.visibility = 'visible';
    iconElement.style.display = 'block';

    const currentName = iconElement.getAttribute('name');
    iconElement.removeAttribute('name');
    setTimeout(() => {
        iconElement.setAttribute('name', currentName);
    }, 10);
  }

  // Fungsi Pembantu: Pewaktu Tunggu Ayat Render di DOM & Memicu Autoscroll
  function waitForAyahAndScroll(surahNumber, ayahNumber) {
    let attempts = 0;
    const maxAttempts = 30; 

    const interval = setInterval(() => {
      attempts++;
      const targetAyah = document.getElementById(`ayah-${ayahNumber}`);

      if (targetAyah) {
        clearInterval(interval);

        targetAyah.scrollIntoView({ behavior: 'smooth', block: 'center' });

        targetAyah.style.backgroundColor = '#f7fafc';
        targetAyah.style.borderLeft = '4px solid #2b6cb0';

        setTimeout(() => {
          targetAyah.style.backgroundColor = 'transparent';
          targetAyah.style.borderLeft = 'none';
        }, 4000); 

      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn(`Elemen ayat tujuan #ayah-${ayahNumber} gagal termuat di halaman.`);
      }
    }, 200);
  }

  // ---------- INITIALIZE APP ----------
  function init() {
    messagesContainer = document.getElementById('messages-container');
    emptyPlaceholder = document.getElementById('empty-chat-placeholder');
    conversationListEl = document.getElementById('conversation-list');
    messageInput = document.getElementById('message-input');
    sendBtn = document.getElementById('send-message-btn');
    scrollTopFab = document.getElementById('scroll-top-fab');
    chatTitleEl = document.getElementById('chat-title');

    // DOM References Al-Quran
    quranModal = document.getElementById('quran-modal');
    closeQuranBtn = document.getElementById('close-quran-btn');
    quranBackBtn = document.getElementById('quran-back-btn');
    quranModalTitle = document.getElementById('quran-modal-title');
    quranBookView = document.getElementById('quran-book-view');
    quranReadingView = document.getElementById('quran-reading-view');
    quranSurahGrid = document.getElementById('quran-surah-grid');
    quranVersesContainer = document.getElementById('quran-verses-container');
    quranModalFooter = document.getElementById('quran-modal-footer');

    // DOM Continuous Player Controls (Footer)
    quranPlayAllBtn = document.getElementById('quran-play-all-btn');
    quranStopBtn = document.getElementById('quran-stop-btn');
    quranPrevBtn = document.getElementById('quran-prev-btn');
    quranNextBtn = document.getElementById('quran-next-btn');
    playerCurrentAyahText = document.getElementById('player-current-ayah');
    playAllIcon = document.getElementById('play-all-icon');

    initFirebase();

    loadFromLocalStorage();

    updatePlaceholderTime();
    renderSidebar();
    renderCurrentChat();

    setInterval(updatePlaceholderTime, 30000);

    const curConv = conversations.find(c => c.id === currentConversationId);
    if (curConv) chatTitleEl.innerText = curConv.title;

    sendBtn?.addEventListener('click', () => sendUserMessage());
    messageInput?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        sendUserMessage();
      }
    });

    document.getElementById('new-chat-btn')?.addEventListener('click', () => createNewChat());
    document.getElementById('clear-current-chat-btn')?.addEventListener('click', () => clearCurrentChat());
    document.getElementById('scroll-top-btn')?.addEventListener('click', () => scrollToTop());

    closeQuranBtn?.addEventListener('click', () => {
      resetContinuousPlayerState();
      if (quranModal && typeof quranModal.dismiss === 'function') {
        quranModal.dismiss();
      }
    });

    quranBackBtn?.addEventListener('click', () => {
      closeSurahReadingView();
    });

    quranPlayAllBtn?.addEventListener('click', () => {
      toggleContinuousPlay();
    });

    quranStopBtn?.addEventListener('click', () => {
      resetContinuousPlayerState();
      enableContinuousPlayerControls();
    });

    quranNextBtn?.addEventListener('click', () => {
      playNextAyah();
    });

    quranPrevBtn?.addEventListener('click', () => {
      playPrevAyah();
    });

    renderQuranBookGrid();

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
            window.location.href = "https://vildaesa.github.io/blog/";
        }
    }, 1000);
});