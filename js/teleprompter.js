// Teleprompter Logic
let sessionId;
let sheetUrl;
let content = '';
let isPlaying = false;
let scrollSpeed = 1;
let scrollInterval = null;
let lastScrollUpdateTime = 0; // Track thời gian update cuối cùng cho throttle
let scrollUpdateTimeout = null; // Timeout cho debounce manual scroll
let isUpdatingFromFirebase = false; // Flag để tránh loop khi nhận update từ Firebase
let isAutoScrolling = false; // Flag để phân biệt auto scroll và manual scroll
let currentSettings = {
    fontSize: 48,
    lineHeight: 1.6,
    backgroundColor: '#000000',
    textColor: '#ffffff',
    guideLineColor: '#ff0000',
    guideLineThickness: 2
};

// DOM Elements
const teleprompterContainer = document.getElementById('teleprompterContainer');
const teleprompterContent = document.getElementById('teleprompterContent');
const teleprompterText = document.getElementById('teleprompterText');
const guideLine = document.getElementById('guideLine');
const teleprompterControls = document.getElementById('teleprompterControls');
const btnPlayPause = document.getElementById('btnPlayPause');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const btnReset = document.getElementById('btnReset');
const btnSettings = document.getElementById('btnSettings');
const btnFullscreen = document.getElementById('btnFullscreen');
const settingsPanel = document.getElementById('settingsPanel');
const btnCloseSettings = document.getElementById('btnCloseSettings');
const settingsFontSizeSlider = document.getElementById('settingsFontSizeSlider');
const settingsFontSizeValue = document.getElementById('settingsFontSizeValue');
const settingsLineHeightSlider = document.getElementById('settingsLineHeightSlider');
const settingsLineHeightValue = document.getElementById('settingsLineHeightValue');
const settingsBackgroundColorPicker = document.getElementById('settingsBackgroundColorPicker');
const settingsTextColorPicker = document.getElementById('settingsTextColorPicker');
const settingsGuideLineColorPicker = document.getElementById('settingsGuideLineColorPicker');
const settingsGuideLineThicknessSlider = document.getElementById('settingsGuideLineThicknessSlider');
const settingsGuideLineThicknessValue = document.getElementById('settingsGuideLineThicknessValue');

// Khởi tạo
async function init() {
    console.log('🚀 Bắt đầu khởi tạo Teleprompter...');
    console.log('📋 Kiểm tra DOM elements:');
    console.log('   - btnPlayPause:', btnPlayPause);
    console.log('   - teleprompterContent:', teleprompterContent);
    console.log('   - teleprompterText:', teleprompterText);
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    sheetUrl = urlParams.get('sheet');
    sessionId = urlParams.get('session') || getSessionId();
    console.log('📄 URL params - sheetUrl:', sheetUrl, 'sessionId:', sessionId);

    if (!sheetUrl) {
        console.error('❌ Không tìm thấy URL Google Sheet');
        teleprompterText.textContent = 'Lỗi: Không tìm thấy URL Google Sheet';
        return;
    }

    // Khởi tạo Firebase
    if (typeof firebase !== 'undefined') {
        console.log('🔥 Khởi tạo Firebase...');
        initFirebase();
        if (isFirebaseInitialized) {
            setupFirebaseListeners();
        }
    } else {
        console.log('⚠️ Firebase SDK chưa được load');
    }

    // Load content từ Google Sheet
    console.log('📥 Đang load content từ Google Sheet...');
    await loadContent();

    // Setup controls
    console.log('⚙️ Setup controls...');
    setupControls();

    // Setup keyboard shortcuts
    console.log('⌨️ Setup keyboard shortcuts...');
    setupKeyboardShortcuts();

    // Apply initial settings
    console.log('🎨 Apply initial settings...');
    applySettings(currentSettings);
    
    // Load saved settings from localStorage
    console.log('💾 Load saved settings...');
    loadSavedSettings();

    // Auto-hide controls after 3 seconds
    setTimeout(() => {
        teleprompterControls.classList.remove('show');
    }, 3000);
    
    console.log('✅ Khởi tạo hoàn tất!');
}

// Load content từ Google Sheet
async function loadContent() {
    try {
        teleprompterText.textContent = 'Đang tải nội dung từ Google Sheet...';
        content = await fetchGoogleSheet(sheetUrl);
        teleprompterText.textContent = content;
    } catch (error) {
        teleprompterText.textContent = 'Lỗi: ' + error.message;
        console.error('Lỗi khi tải nội dung:', error);
    }
}

// Setup Firebase listeners
function setupFirebaseListeners() {
    if (!database) return;

    const sessionRef = database.ref(`sessions/${sessionId}`);

    // Listen for scroll position changes
    sessionRef.child('scrollPosition').on('value', (snapshot) => {
        const position = snapshot.val();
        if (position !== null && position !== undefined) {
            isUpdatingFromFirebase = true; // Đánh dấu đang update từ Firebase
            scrollToPosition(position);
            // Reset flag sau một khoảng thời gian ngắn
            setTimeout(() => {
                isUpdatingFromFirebase = false;
            }, 50);
        }
    });

    // Listen for play/pause state (chỉ khi có session từ Remote)
    // Nếu không có session trong URL, không lắng nghe để tránh conflict
    if (window.location.search.includes('session=')) {
        sessionRef.child('isPlaying').on('value', (snapshot) => {
            const playing = snapshot.val();
            if (playing !== null && playing !== undefined) {
                if (playing && !isPlaying) {
                    startAutoScroll();
                } else if (!playing && isPlaying) {
                    stopAutoScroll();
                }
            }
        });
    }

    // Listen for speed changes
    sessionRef.child('speed').on('value', (snapshot) => {
        const speed = snapshot.val();
        if (speed !== null && speed !== undefined) {
            scrollSpeed = speed;
            speedSlider.value = speed;
            speedValue.textContent = speed.toFixed(1) + 'x';
            if (isPlaying) {
                stopAutoScroll();
                startAutoScroll();
            }
        }
    });

    // Listen for settings changes
    sessionRef.child('settings').on('value', (snapshot) => {
        const settings = snapshot.val();
        if (settings) {
            currentSettings = { ...currentSettings, ...settings };
            applySettings(currentSettings);
        }
    });
}

// Setup controls
function setupControls() {
    console.log('🔧 Setup controls - btnPlayPause:', btnPlayPause);
    // Play/Pause button
    if (btnPlayPause) {
        btnPlayPause.addEventListener('click', (e) => {
            console.log('🖱️ Nút Play/Pause được click!', 'isPlaying:', isPlaying);
            e.preventDefault();
            togglePlayPause();
        });
        console.log('✅ Đã attach event listener cho nút Play/Pause');
    } else {
        console.error('❌ Không tìm thấy nút Play/Pause');
    }

    // Speed slider
    speedSlider.addEventListener('input', (e) => {
        scrollSpeed = parseFloat(e.target.value);
        speedValue.textContent = scrollSpeed.toFixed(1) + 'x';
        updateFirebaseSpeed(scrollSpeed);
        if (isPlaying) {
            stopAutoScroll();
            startAutoScroll();
        }
    });

    // Reset button
    btnReset.addEventListener('click', () => {
        scrollToPosition(0);
        stopAutoScroll();
        updateFirebaseScrollPosition(0);
        updateFirebasePlayState(false);
    });

    // Settings button
    btnSettings.addEventListener('click', () => {
        settingsPanel.classList.add('show');
        teleprompterControls.classList.remove('show');
    });

    // Close settings button
    btnCloseSettings.addEventListener('click', () => {
        settingsPanel.classList.remove('show');
    });

    // Settings controls
    settingsFontSizeSlider.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        settingsFontSizeValue.textContent = size + 'px';
        updateSetting('fontSize', size);
    });

    settingsLineHeightSlider.addEventListener('input', (e) => {
        const height = parseFloat(e.target.value);
        settingsLineHeightValue.textContent = height.toFixed(1);
        updateSetting('lineHeight', height);
    });

    settingsBackgroundColorPicker.addEventListener('input', (e) => {
        updateSetting('backgroundColor', e.target.value);
    });

    settingsTextColorPicker.addEventListener('input', (e) => {
        updateSetting('textColor', e.target.value);
    });

    settingsGuideLineColorPicker.addEventListener('input', (e) => {
        updateSetting('guideLineColor', e.target.value);
    });

    settingsGuideLineThicknessSlider.addEventListener('input', (e) => {
        const thickness = parseInt(e.target.value);
        settingsGuideLineThicknessValue.textContent = thickness + 'px';
        updateSetting('guideLineThickness', thickness);
    });

    // Close settings when clicking outside
    settingsPanel.addEventListener('click', (e) => {
        if (e.target === settingsPanel) {
            settingsPanel.classList.remove('show');
        }
    });

    // Fullscreen button
    btnFullscreen.addEventListener('click', toggleFullscreen);

    // Show controls on mouse move
    let controlsTimeout;
    document.addEventListener('mousemove', () => {
        teleprompterControls.classList.add('show');
        clearTimeout(controlsTimeout);
        controlsTimeout = setTimeout(() => {
            teleprompterControls.classList.remove('show');
        }, 3000);
    });

    // Manual scroll - debounce để tránh update quá nhiều
    // KHÔNG khai báo lại isAutoScrolling - dùng biến global
    teleprompterContent.addEventListener('scroll', () => {
        console.log('📜 Scroll event triggered - isAutoScrolling:', isAutoScrolling, 'isPlaying:', isPlaying);
        
        // Tránh update nếu đang nhận update từ Firebase (tránh loop)
        if (isUpdatingFromFirebase) {
            console.log('   ⏭️ Bỏ qua - đang update từ Firebase');
            return;
        }
        
        // Nếu đang auto scroll, không dừng - chỉ update position
        if (isAutoScrolling) {
            console.log('   ✅ Đang auto scroll - không dừng, chỉ update position');
            // Chỉ update Firebase nếu có session từ Remote
            if (window.location.search.includes('session=')) {
                clearTimeout(scrollUpdateTimeout);
                scrollUpdateTimeout = setTimeout(() => {
                    throttledUpdateScrollPosition(getScrollPercentage());
                }, 100);
            }
            return;
        }
        
        // Nếu là manual scroll (người dùng kéo), dừng auto scroll
        if (isPlaying) {
            console.log('   🛑 Manual scroll detected - dừng auto scroll');
            stopAutoScroll();
            if (database && sessionId && window.location.search.includes('session=')) {
                updateFirebasePlayState(false);
            }
        }
        // Debounce: chỉ update sau 100ms khi người dùng ngừng scroll
        // Chỉ update Firebase nếu có session từ Remote
        if (window.location.search.includes('session=')) {
            clearTimeout(scrollUpdateTimeout);
            scrollUpdateTimeout = setTimeout(() => {
                throttledUpdateScrollPosition(getScrollPercentage());
            }, 100);
        }
    });
}

// Setup keyboard shortcuts
function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        // Space bar: Play/Pause
        if (e.code === 'Space') {
            e.preventDefault();
            togglePlayPause();
        }
        // Arrow keys: Manual scroll
        else if (e.key === 'ArrowUp') {
            e.preventDefault();
            teleprompterContent.scrollBy({ top: -50, behavior: 'smooth' });
        }
        else if (e.key === 'ArrowDown') {
            e.preventDefault();
            teleprompterContent.scrollBy({ top: 50, behavior: 'smooth' });
        }
        // F: Fullscreen
        else if (e.key === 'f' || e.key === 'F') {
            e.preventDefault();
            toggleFullscreen();
        }
        // R: Reset
        else if (e.key === 'r' || e.key === 'R') {
            e.preventDefault();
            scrollToPosition(0);
            stopAutoScroll();
            updateFirebaseScrollPosition(0);
            updateFirebasePlayState(false);
        }
    });
}

// Toggle play/pause
function togglePlayPause() {
    console.log('🎮 togglePlayPause được gọi - isPlaying:', isPlaying, 'scrollInterval:', scrollInterval);
    if (isPlaying) {
        console.log('⏸️ Đang dừng scroll...');
        stopAutoScroll();
        // Chỉ update Firebase nếu có session từ Remote
        updateFirebasePlayState(false);
    } else {
        console.log('▶️ Đang bắt đầu scroll...');
        startAutoScroll();
        // Chỉ update Firebase nếu có session từ Remote
        updateFirebasePlayState(true);
    }
}

// Start auto scroll
function startAutoScroll() {
    console.log('🚀 startAutoScroll được gọi');
    console.log('   - scrollInterval hiện tại:', scrollInterval);
    console.log('   - teleprompterContent:', teleprompterContent);
    console.log('   - scrollSpeed:', scrollSpeed);
    
    if (scrollInterval) {
        // Nếu đã có interval, không tạo mới
        console.log('⚠️ Đã có scrollInterval, không tạo mới');
        return;
    }
    
    if (!teleprompterContent) {
        console.error('❌ teleprompterContent không tồn tại!');
        return;
    }
    
    // Kiểm tra xem có nội dung để scroll không
    const maxScroll = teleprompterContent.scrollHeight - teleprompterContent.clientHeight;
    console.log('📊 Thông tin scroll:');
    console.log('   - maxScroll:', maxScroll);
    console.log('   - scrollHeight:', teleprompterContent.scrollHeight);
    console.log('   - clientHeight:', teleprompterContent.clientHeight);
    console.log('   - scrollTop hiện tại:', teleprompterContent.scrollTop);
    
    if (maxScroll <= 0) {
        console.error('❌ Không có nội dung để scroll - maxScroll <= 0');
        return;
    }
    
    console.log('✅ Bắt đầu tạo interval...');
    isPlaying = true;
    if (btnPlayPause) {
        btnPlayPause.textContent = '⏸️ Pause';
    }
    lastScrollUpdateTime = Date.now(); // Reset thời gian update
    isAutoScrolling = true; // Đánh dấu đang auto scroll
    console.log('✅ Đã set isPlaying = true, isAutoScrolling = true');
    
    let frameCount = 0; // Đếm số frame để debug
    console.log('🔄 Tạo setInterval...');
    scrollInterval = setInterval(() => {
        frameCount++;
        
        // Log frame đầu tiên để xác nhận interval đang chạy
        if (frameCount === 1) {
            console.log('✅ Interval đã bắt đầu chạy! Frame 1');
        }
        
        // Tính toán lại maxScroll mỗi lần (phòng trường hợp content thay đổi)
        const currentMaxScroll = teleprompterContent.scrollHeight - teleprompterContent.clientHeight;
        
        // Nếu không có gì để scroll, dừng lại
        if (currentMaxScroll <= 0) {
            console.log('⛔ Dừng scroll - không có nội dung (frame', frameCount + ')');
            isAutoScrolling = false;
            stopAutoScroll();
            return;
        }
        
        // Tính scrollAmount dựa trên tốc độ
        const scrollAmount = scrollSpeed * 5;
        const oldScrollTop = teleprompterContent.scrollTop;
        
        // Scroll xuống - đảm bảo isAutoScrolling = true trước khi scroll
        isAutoScrolling = true;
        teleprompterContent.scrollTop += scrollAmount;
        const currentScroll = teleprompterContent.scrollTop;
        const actualDiff = currentScroll - oldScrollTop;
        
        // Debug log frame đầu tiên và mỗi 60 frame (khoảng 1 giây)
        if (frameCount === 1 || frameCount % 60 === 0) {
            console.log(`📈 Scroll frame ${frameCount}: old=${oldScrollTop.toFixed(1)}, new=${currentScroll.toFixed(1)}, max=${currentMaxScroll}, diff=${actualDiff.toFixed(1)}, speed=${scrollSpeed}, scrollAmount=${scrollAmount}`);
        }
        
        // Nếu scroll không thay đổi ngay từ đầu, có thể có vấn đề
        if (frameCount === 1 && actualDiff === 0) {
            console.warn('⚠️ CẢNH BÁO: Scroll không thay đổi ở frame đầu tiên!');
            console.warn('   - scrollAmount:', scrollAmount);
            console.warn('   - scrollTop trước:', oldScrollTop);
            console.warn('   - scrollTop sau:', currentScroll);
            console.warn('   - scrollHeight:', teleprompterContent.scrollHeight);
            console.warn('   - clientHeight:', teleprompterContent.clientHeight);
            console.warn('   - overflow:', window.getComputedStyle(teleprompterContent).overflow);
        }
        
        // Kiểm tra xem đã đến bottom chưa
        // Chỉ dừng khi thực sự đã đến bottom (với margin nhỏ)
        if (currentScroll >= currentMaxScroll - 2) {
            // Đã đến bottom, scroll đến đúng bottom và dừng
            teleprompterContent.scrollTop = currentMaxScroll;
            console.log('Đã đến bottom - dừng scroll tại:', currentMaxScroll);
            isAutoScrolling = false;
            stopAutoScroll();
            if (database && sessionId && window.location.search.includes('session=')) {
                updateFirebasePlayState(false);
            }
            return;
        }
        
        // Kiểm tra nếu scroll không thay đổi - chỉ check khi đã scroll được nhiều
        // Và chỉ khi thực sự gần bottom
        // QUAN TRỌNG: Không check ở frame đầu tiên vì có thể scroll chưa kịp thay đổi
        const scrollDiff = Math.abs(currentScroll - oldScrollTop);
        if (frameCount > 10 && oldScrollTop > 100 && scrollDiff < 0.1 && currentScroll >= currentMaxScroll - 20) {
            // Scroll không thay đổi và đã gần bottom, có thể đã đến bottom
            console.log('⛔ Scroll không thay đổi - có thể đã đến bottom. old:', oldScrollTop, 'new:', currentScroll, 'max:', currentMaxScroll, 'frame:', frameCount);
            isAutoScrolling = false;
            stopAutoScroll();
            if (database && sessionId && window.location.search.includes('session=')) {
                updateFirebasePlayState(false);
            }
            return;
        }
        
        // Nếu scroll không thay đổi sau nhiều frame, có thể có vấn đề
        if (frameCount > 5 && scrollDiff < 0.1 && oldScrollTop < currentMaxScroll - 100) {
            console.warn('⚠️ Scroll không thay đổi sau nhiều frame! Frame:', frameCount, 'diff:', scrollDiff);
        }
        
        // Throttle: chỉ update Firebase mỗi 200ms (thay vì mỗi 16ms)
        // Chỉ update nếu có session từ Remote
        if (window.location.search.includes('session=')) {
            const now = Date.now();
            if (now - lastScrollUpdateTime >= 200) {
                throttledUpdateScrollPosition(getScrollPercentage());
                lastScrollUpdateTime = now;
            }
        }
    }, 16); // ~60fps cho smooth scrolling, nhưng chỉ sync Firebase mỗi 200ms
}

// Stop auto scroll
function stopAutoScroll() {
    console.log('⏹️ stopAutoScroll được gọi - scrollInterval:', scrollInterval);
    if (scrollInterval) {
        console.log('🛑 Đang clear interval...');
        clearInterval(scrollInterval);
        scrollInterval = null;
        console.log('✅ Đã clear interval');
    } else {
        console.log('⚠️ Không có interval để clear');
    }
    isPlaying = false;
    isAutoScrolling = false; // Reset flag
    if (btnPlayPause) {
        btnPlayPause.textContent = '▶️ Play';
    }
    console.log('✅ Đã set isPlaying = false, isAutoScrolling = false');
}

// Get scroll percentage
function getScrollPercentage() {
    const maxScroll = teleprompterContent.scrollHeight - teleprompterContent.clientHeight;
    if (maxScroll <= 0) return 0;
    return (teleprompterContent.scrollTop / maxScroll) * 100;
}

// Scroll to position (0-100)
function scrollToPosition(percentage) {
    const maxScroll = teleprompterContent.scrollHeight - teleprompterContent.clientHeight;
    teleprompterContent.scrollTop = (percentage / 100) * maxScroll;
}

// Apply settings
function applySettings(settings) {
    teleprompterText.style.fontSize = settings.fontSize + 'px';
    teleprompterText.style.lineHeight = settings.lineHeight;
    teleprompterContainer.style.backgroundColor = settings.backgroundColor;
    teleprompterText.style.color = settings.textColor;
    guideLine.style.backgroundColor = settings.guideLineColor;
    guideLine.style.height = settings.guideLineThickness + 'px';
}

// Toggle fullscreen
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        teleprompterContainer.requestFullscreen().catch(err => {
            console.error('Lỗi khi vào fullscreen:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

// Firebase update functions - chỉ update khi có session từ Remote
function updateFirebaseScrollPosition(position) {
    // Chỉ update Firebase nếu có session từ Remote (có ?session= trong URL)
    if (database && sessionId && window.location.search.includes('session=')) {
        database.ref(`sessions/${sessionId}/scrollPosition`).set(position).catch((error) => {
            // Chỉ log lỗi, không hiển thị để tránh spam console
            if (error.code !== 'PERMISSION_DENIED') {
                console.error('Lỗi update scroll position:', error);
            }
        });
    }
}

// Throttled update cho scroll position - giảm số lần ghi lên Firebase
function throttledUpdateScrollPosition(position) {
    updateFirebaseScrollPosition(position);
}

function updateFirebasePlayState(playing) {
    // Chỉ update Firebase nếu có session từ Remote
    if (database && sessionId && window.location.search.includes('session=')) {
        database.ref(`sessions/${sessionId}/isPlaying`).set(playing).catch((error) => {
            if (error.code !== 'PERMISSION_DENIED') {
                console.error('Lỗi update play state:', error);
            }
        });
    }
}

function updateFirebaseSpeed(speed) {
    // Chỉ update Firebase nếu có session từ Remote
    if (database && sessionId && window.location.search.includes('session=')) {
        database.ref(`sessions/${sessionId}/speed`).set(speed).catch((error) => {
            if (error.code !== 'PERMISSION_DENIED') {
                console.error('Lỗi update speed:', error);
            }
        });
    }
}

// Load saved settings from localStorage
function loadSavedSettings() {
    const saved = localStorage.getItem('teleprompter_settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            currentSettings = { ...currentSettings, ...settings };
            applySettings(currentSettings);
            
            // Update UI sliders
            if (settingsFontSizeSlider) settingsFontSizeSlider.value = currentSettings.fontSize;
            if (settingsFontSizeValue) settingsFontSizeValue.textContent = currentSettings.fontSize + 'px';
            if (settingsLineHeightSlider) settingsLineHeightSlider.value = currentSettings.lineHeight;
            if (settingsLineHeightValue) settingsLineHeightValue.textContent = currentSettings.lineHeight.toFixed(1);
            if (settingsBackgroundColorPicker) settingsBackgroundColorPicker.value = currentSettings.backgroundColor;
            if (settingsTextColorPicker) settingsTextColorPicker.value = currentSettings.textColor;
            if (settingsGuideLineColorPicker) settingsGuideLineColorPicker.value = currentSettings.guideLineColor;
            if (settingsGuideLineThicknessSlider) settingsGuideLineThicknessSlider.value = currentSettings.guideLineThickness;
            if (settingsGuideLineThicknessValue) settingsGuideLineThicknessValue.textContent = currentSettings.guideLineThickness + 'px';
        } catch (e) {
            console.error('Lỗi khi load settings:', e);
        }
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('teleprompter_settings', JSON.stringify(currentSettings));
}

// Update setting function
function updateSetting(key, value) {
    currentSettings[key] = value;
    applySettings(currentSettings);
    saveSettings();
    
    // Sync to Firebase nếu có session từ Remote
    if (database && sessionId && window.location.search.includes('session=')) {
        database.ref(`sessions/${sessionId}/settings/${key}`).set(value);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

