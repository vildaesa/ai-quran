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
  let isPreviousUserLoggedOut = true; // Penanda untuk memicu Toast Welcome hanya saat login baru

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
            // Sembunyikan floating banner login jika sedang aktif
            removeLoginFloatingBanner();

            // Tampilkan Toast Welcome jika user baru saja Sign-In
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
      // Fallback Custom Toast jika Ionic Controller belum siap
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
          <a href="./user-profile.html" class="user-profile-info" style="text-decoration: none; color: inherit; cursor: pointer;">
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
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
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
    removeLoginFloatingBanner(); // Pastikan tidak ada banner ganda

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

    // Inject animasi CSS ringan
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
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
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
  let conversations = [];        
  let currentConversationId = null;
  let isWaitingResponse = false; 
  let currentTypingIndicatorElement = null;
  let aiMessageElement = null;   

  // Audio state Al-Quran
  let currentAudioPlayer = null; 
  let activeAudioBtn = null;     

  // STATE: Playlist Murottal Kontinu
  let isContinuousPlaying = false; 
  let currentSurahVerses = [];    
  let currentPlayingIndex = -1;   
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

  // DOM Al-Quran Continuous Player Controls
  let quranPlayAllBtn;
  let quranStopBtn;
  let quranPrevBtn;
  let quranNextBtn;
  let playerCurrentAyahText;
  let playAllIcon;

  function generateId() {
    return Date.now() + '-' + Math.random().toString(36).substr(2, 6);
  }

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

  async function confirmDialog(header, message) {
    return new Promise((resolve) => {
      const alert = document.createElement('ion-alert');
      alert.header = header;
      alert.message = message;
      alert.cssClass = 'minimalist-alert';
      alert.buttons = [
        { text: 'Batal', role: 'cancel', handler: () => resolve(false) },
        { text: 'Ya, Hapus', role: 'confirm', handler: () => resolve(true) }
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
      conversations = [{ id: defaultId, title: 'Percakapan Baru', messages: [] }];
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

    // WELCOME SCREEN TETAP TERHUBUNG SECARA ALAMI PADA CHAT KOSONG
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

  const API_BASE_URL = 'https://ai-quran-backend.vildaesa.workers.dev';

  async function getAIResponse(userMessage) {
    if (isWaitingResponse) return;

    // 1. VALIDASI FRONTEND: JIKA BELUM LOGIN, TAMPILKAN FLOATING BANNER (TANPA MENGOTORI RIWAYAT)
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

      saveToLocalStorage();
      aiMessageElement = null;
    } catch (error) {
      console.error('Error:', error);
      removeTypingIndicator();
      addMessageToCurrent('ai', `⚠️ ${error.message || error}`);
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

    // CEK LOGIN SEBELUM MEMASUKKAN PESAN USER KE RIWAYAT
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

  // ---------- INITIALIZE APP ----------
  function init() {
    messagesContainer = document.getElementById('messages-container');
    emptyPlaceholder = document.getElementById('empty-chat-placeholder');
    conversationListEl = document.getElementById('conversation-list');
    messageInput = document.getElementById('message-input');
    sendBtn = document.getElementById('send-message-btn');
    scrollTopFab = document.getElementById('scroll-top-fab');
    chatTitleEl = document.getElementById('chat-title');

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

    initScrollListener();

    setTimeout(() => {
      scrollToBottom();
    }, 300);
  }

  window.addEventListener('DOMContentLoaded', () => {
    init();
  });
})();