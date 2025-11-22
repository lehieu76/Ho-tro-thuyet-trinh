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
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    sheetUrl = urlParams.get('sheet');
    sessionId = urlParams.get('session') || getSessionId();

    if (!sheetUrl) {
        teleprompterText.textContent = 'Lỗi: Không tìm thấy URL Google Sheet';
        return;
    }

    // Khởi tạo Firebase
    if (typeof firebase !== 'undefined') {
        initFirebase();
        if (isFirebaseInitialized) {
            setupFirebaseListeners();
        }
    }

    // Load content từ Google Sheet
    await loadContent();

    // Setup controls
    setupControls();

    // Setup keyboard shortcuts
    setupKeyboardShortcuts();

    // Apply initial settings
    applySettings(currentSettings);

    // Auto-hide controls after 3 seconds
    setTimeout(() => {
        teleprompterControls.classList.remove('show');
    }, 3000);
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
    // Play/Pause button
    if (btnPlayPause) {
        btnPlayPause.addEventListener('click', togglePlayPause);
    } else {
        console.error('Không tìm thấy nút Play/Pause');
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
    teleprompterContent.addEventListener('scroll', () => {
        // Tránh update nếu đang nhận update từ Firebase (tránh loop)
        if (isUpdatingFromFirebase) return;
        
        if (isPlaying) {
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
    if (isPlaying) {
        stopAutoScroll();
        // Chỉ update Firebase nếu có session từ Remote
        updateFirebasePlayState(false);
    } else {
        startAutoScroll();
        // Chỉ update Firebase nếu có session từ Remote
        updateFirebasePlayState(true);
    }
}

// Start auto scroll
function startAutoScroll() {
    if (scrollInterval) {
        // Nếu đã có interval, không tạo mới
        return;
    }
    
    // Kiểm tra xem có nội dung để scroll không
    const maxScroll = teleprompterContent.scrollHeight - teleprompterContent.clientHeight;
    if (maxScroll <= 0) {
        console.log('Không có nội dung để scroll');
        return;
    }
    
    isPlaying = true;
    btnPlayPause.textContent = '⏸️ Pause';
    lastScrollUpdateTime = Date.now(); // Reset thời gian update
    
    scrollInterval = setInterval(() => {
        const scrollAmount = scrollSpeed * 2; // pixels per interval
        const oldScrollTop = teleprompterContent.scrollTop;
        
        // Tính toán lại maxScroll mỗi lần (phòng trường hợp content thay đổi)
        const currentMaxScroll = teleprompterContent.scrollHeight - teleprompterContent.clientHeight;
        
        // Nếu không có gì để scroll, dừng lại
        if (currentMaxScroll <= 0) {
            stopAutoScroll();
            return;
        }
        
        // Scroll xuống
        teleprompterContent.scrollTop += scrollAmount;
        const currentScroll = teleprompterContent.scrollTop;
        
        // Kiểm tra xem đã đến bottom chưa (với margin 5px để tránh dừng sớm)
        // Chỉ dừng nếu scrollTop không thay đổi sau khi cố gắng scroll (đã đến bottom)
        if (currentScroll >= currentMaxScroll - 5) {
            // Đã đến gần bottom, scroll đến đúng bottom và dừng
            teleprompterContent.scrollTop = currentMaxScroll;
            stopAutoScroll();
            if (database && sessionId && window.location.search.includes('session=')) {
                updateFirebasePlayState(false);
            }
            return;
        }
        
        // Kiểm tra nếu scroll không thay đổi (có thể do đã đến bottom hoặc lỗi)
        if (Math.abs(currentScroll - oldScrollTop) < 0.1 && currentScroll > 0) {
            // Scroll không thay đổi nhưng không phải ở đầu, có thể đã đến bottom
            if (currentScroll >= currentMaxScroll - 10) {
                stopAutoScroll();
                if (database && sessionId && window.location.search.includes('session=')) {
                    updateFirebasePlayState(false);
                }
                return;
            }
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
    if (scrollInterval) {
        clearInterval(scrollInterval);
        scrollInterval = null;
    }
    isPlaying = false;
    btnPlayPause.textContent = '▶️ Play';
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

