(function(){
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

      removeTypingIndicator();

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

  async function sendUserMessage() {
    if (isWaitingResponse) {
      await showAlert('Tunggu Sebentar', 'Asisten AI sedang menyusun tanggapan... mohon tunggu sesaat.');
      return;
    }
    let rawText = messageInput.value?.trim();
    if (!rawText) return;
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
      <div class="menu-loading-container" style="grid-column: 1/-1; padding: 100px 0;">
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
            const num = card.getAttribute('data-surah-num');
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
        <div class="quran-welcome-state" style="grid-column: 1/-1; color: #e53e3e;">
          <ion-icon name="alert-circle-outline" class="quran-large-icon" style="color: #feb2b2;"></ion-icon>
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

    quranModalTitle.innerText = `Surah ${surahName}`;
    loadedSurahNumber = surahNumber;

    fetchAndRenderSurah(surahNumber);
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
      <div class="menu-loading-container" style="padding: 100px 0;">
        <ion-spinner name="crescent" class="custom-spinner"></ion-spinner>
        <p style="margin-top: 12px; color: #718096;">Memuat lantunan ayat suci...</p>
      </div>`;

    currentSurahVerses = [];

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

    try {
      const response = await fetch(`https://api.alquran.cloud/v1/surah/${surahNumber}/editions/quran-uthmani,id.kemenag`);
      const result = await response.json();

      if (result && result.code === 200 && Array.isArray(result.data) && result.data.length >= 2) {
        const arabicData = result.data[0].verses;
        const translationData = result.data[1].verses;

        if (Array.isArray(arabicData) && arabicData.length > 0) {
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
        <div class="quran-welcome-state" style="color: #e53e3e;">
          <ion-icon name="alert-circle-outline" class="quran-large-icon" style="color: #feb2b2;"></ion-icon>
          <h4>Pemuatan Gagal</h4>
          <p>Terjadi gangguan koneksi pada server penyedia ayat. Mohon periksa sinyal internet Anda dan ketuk tombol di bawah.</p>
          <ion-button fill="outline" size="small" id="retry-load-verses" style="margin-top: 16px; --color: #2b6cb0;">Coba Lagi</ion-button>
        </div>`;

      document.getElementById('retry-load-verses')?.addEventListener('click', () => fetchAndRenderSurah(surahNumber));
    }
  }

  function renderAyatToDOM(versesList, surahNumber) {
    let html = '<div class="quran-verses-container">';

    if (surahNumber !== '1' && surahNumber !== '9') {
      html += `
        <div style="text-align: center; padding: 12px 0 24px 0; border-bottom: 1px dashed rgba(0,0,0,0.04);">
          <p class="ayah-arabic" style="text-align: center; font-size: 1.7rem; color: #2b6cb0;">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</p>
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

      if (surahNumber !== '1' && surahNumber !== '9' && ayahNum === 1 && arabicText.startsWith("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ")) {
        arabicText = arabicText.replace("بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ", "").trim();
      }

      html += `
        <div class="ayah-card" id="ayah-${ayahNum}" data-ayah-index="${ayahNum - 1}">
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
        const ayahNum = parseInt(btnEl.getAttribute('data-ayah-num'));

        handleIndividualAyahPlay(audioSrc, ayahNum, btnEl);
      });
    });
  }


// ========================================================
// AUDIO ENGINE V2
// ========================================================

function destroyCurrentAudio() {
  if (!currentAudioPlayer) return;

  try {
    currentAudioPlayer.pause();

    currentAudioPlayer.onended = null;
    currentAudioPlayer.onerror = null;
    currentAudioPlayer.onwaiting = null;
    currentAudioPlayer.oncanplay = null;

    currentAudioPlayer.src = '';
    currentAudioPlayer.load();
  } catch (e) {
    console.error(e);
  }

  currentAudioPlayer = null;
}

function updatePlayIcon(iconName) {
  if (!playAllIcon) return;

  playAllIcon.setAttribute('name', iconName);
}

function updateAyahButtons(activeAyahNum = null) {
  document.querySelectorAll('.audio-play-btn').forEach(btn => {
    const ayahNum = Number(btn.dataset.ayahNum);

    btn.innerHTML = `
      <ion-icon
        name="${ayahNum === activeAyahNum ? 'pause-outline' : 'play-outline'}"
        slot="icon-only">
      </ion-icon>
    `;
  });
}

function setupMediaSession(ayahNum) {
  if (!('mediaSession' in navigator)) return;

  navigator.mediaSession.metadata = new MediaMetadata({
    title: `Ayat ${ayahNum}`,
    artist: 'Al Quran Digital',
    album: 'Murottal'
  });

  navigator.mediaSession.setActionHandler(
    'play',
    () => toggleContinuousPlay()
  );

  navigator.mediaSession.setActionHandler(
    'pause',
    () => toggleContinuousPlay()
  );

  navigator.mediaSession.setActionHandler(
    'nexttrack',
    () => playNextAyah()
  );

  navigator.mediaSession.setActionHandler(
    'previoustrack',
    () => playPrevAyah()
  );
}

function enableContinuousPlayerControls() {
  quranPlayAllBtn.style.display = 'block';

  updatePlayIcon('play-outline');

  playerCurrentAyahText.innerText =
    'Ketuk tombol putar untuk mendengarkan surah';
}

function resetContinuousPlayerState() {
  destroyCurrentAudio();

  isContinuousPlaying = false;
  currentPlayingIndex = -1;
  activeAudioBtn = null;

  quranStopBtn.style.display = 'none';

  updatePlayIcon('play-outline');

  playerCurrentAyahText.innerText =
    'Putar semua surah';

  updateAyahButtons();

  document.querySelectorAll('.ayah-card').forEach(card => {
    card.classList.remove('active-playing-ayah');
  });
}

function highlightAyah(ayahNum) {
  document.querySelectorAll('.ayah-card').forEach(card => {
    card.classList.remove('active-playing-ayah');
  });

  const activeCard =
    document.getElementById(`ayah-${ayahNum}`);

  if (!activeCard) return;

  activeCard.classList.add('active-playing-ayah');

  const rect = activeCard.getBoundingClientRect();

  if (
    rect.top < 0 ||
    rect.bottom > window.innerHeight
  ) {
    activeCard.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
  }
}

function playContinuousAyatByIndex(index) {
  if (
    index < 0 ||
    index >= currentSurahVerses.length
  ) {
    resetContinuousPlayerState();

    showAlert(
      'Selesai Membaca',
      'Lantunan satu surah telah selesai.'
    );

    return;
  }

  currentPlayingIndex = index;

  const ayah =
    currentSurahVerses[index];

  if (!ayah?.audioUrl) {
    playContinuousAyatByIndex(index + 1);
    return;
  }

  destroyCurrentAudio();

  const audio = new Audio(ayah.audioUrl);

  currentAudioPlayer = audio;

  highlightAyah(ayah.nomorAyat);

  updateAyahButtons(ayah.nomorAyat);

  playerCurrentAyahText.innerText =
    `Memuat Ayat ${ayah.nomorAyat}...`;

  updatePlayIcon('pause-outline');

  setupMediaSession(ayah.nomorAyat);

  audio.onwaiting = () => {
    playerCurrentAyahText.innerText =
      `Buffering Ayat ${ayah.nomorAyat}...`;
  };

  audio.oncanplay = () => {
    playerCurrentAyahText.innerText =
      `Melantunkan Ayat ${ayah.nomorAyat}...`;
  };

  audio.onerror = () => {
    console.warn(
      'Audio gagal:',
      ayah.nomorAyat
    );

    setTimeout(() => {
      playContinuousAyatByIndex(
        currentPlayingIndex + 1
      );
    }, 500);
  };

  audio.onended = () => {
    playContinuousAyatByIndex(
      currentPlayingIndex + 1
    );
  };

  audio.play().catch(err => {
    console.error(err);

    setTimeout(() => {
      playContinuousAyatByIndex(
        currentPlayingIndex + 1
      );
    }, 500);
  });
}

function toggleContinuousPlay() {
  if (!currentSurahVerses.length) return;

  if (!isContinuousPlaying) {
    isContinuousPlaying = true;

    quranStopBtn.style.display = 'block';

    currentPlayingIndex =
      currentPlayingIndex < 0
        ? 0
        : currentPlayingIndex;

    playContinuousAyatByIndex(
      currentPlayingIndex
    );

    return;
  }

  if (!currentAudioPlayer) return;

  if (currentAudioPlayer.paused) {
    currentAudioPlayer.play();

    updatePlayIcon('pause-outline');

    playerCurrentAyahText.innerText =
      `Melantunkan Ayat ${currentPlayingIndex + 1}...`;
  } else {
    currentAudioPlayer.pause();

    updatePlayIcon('play-outline');

    playerCurrentAyahText.innerText =
      `Murottal Ayat ${currentPlayingIndex + 1} dijeda`;
  }
}

function playNextAyah() {
  if (!currentSurahVerses.length) return;

  isContinuousPlaying = true;

  quranStopBtn.style.display = 'block';

  playContinuousAyatByIndex(
    currentPlayingIndex + 1
  );
}

function playPrevAyah() {
  if (!currentSurahVerses.length) return;

  isContinuousPlaying = true;

  quranStopBtn.style.display = 'block';

  playContinuousAyatByIndex(
    Math.max(0, currentPlayingIndex - 1)
  );
}

function handleIndividualAyahPlay(
  audioUrl,
  ayahNum,
  buttonElement
) {
  const index =
    currentSurahVerses.findIndex(
      v => v.nomorAyat === ayahNum
    );

  if (index === -1) return;

  if (
    currentPlayingIndex === index &&
    currentAudioPlayer &&
    !currentAudioPlayer.paused
  ) {
    toggleContinuousPlay();
    return;
  }

  isContinuousPlaying = true;

  quranStopBtn.style.display = 'block';

  playContinuousAyatByIndex(index);
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

    loadFromLocalStorage();

    // Render awal Chat
    renderSidebar();
    renderCurrentChat();
    const curConv = conversations.find(c => c.id === currentConversationId);
    if (curConv) chatTitleEl.innerText = curConv.title;

    // Event listeners Chat
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

    // Event listeners Navigation Al-Quran
    closeQuranBtn?.addEventListener('click', () => {
      resetContinuousPlayerState();
      quranModal.dismiss();
    });

    quranBackBtn?.addEventListener('click', () => {
      closeSurahReadingView();
    });

    // Event listeners Footer Playlist Kontinu Al-Quran
    quranPlayAllBtn?.addEventListener('click', () => {
      toggleContinuousPlay();
    });

    quranStopBtn?.addEventListener('click', () => {
      resetContinuousPlayerState();
      enableContinuousPlayerControls();
    });

    quranNextBtn?.addEventListener('click', () => {
      playNextAyat();
    });

    quranPrevBtn?.addEventListener('click', () => {
      playPrevAyat();
    });

    // Ambil katalog 114 surah berformat kartu buku saat halaman siap
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
            window.location.href = "https://mia-miaaw.github.io/blog/";
        }
    }, 1000);
});