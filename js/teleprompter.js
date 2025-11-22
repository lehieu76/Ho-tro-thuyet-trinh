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
const btnFullscreen = document.getElementById('btnFullscreen');

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

    // Listen for play/pause state
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
    btnPlayPause.addEventListener('click', togglePlayPause);

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
            updateFirebasePlayState(false);
        }
        // Debounce: chỉ update sau 100ms khi người dùng ngừng scroll
        clearTimeout(scrollUpdateTimeout);
        scrollUpdateTimeout = setTimeout(() => {
            throttledUpdateScrollPosition(getScrollPercentage());
        }, 100);
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
        updateFirebasePlayState(false);
    } else {
        startAutoScroll();
        updateFirebasePlayState(true);
    }
}

// Start auto scroll
function startAutoScroll() {
    if (scrollInterval) return;
    
    isPlaying = true;
    btnPlayPause.textContent = '⏸️ Pause';
    lastScrollUpdateTime = Date.now(); // Reset thời gian update
    
    scrollInterval = setInterval(() => {
        const scrollAmount = scrollSpeed * 2; // pixels per interval
        teleprompterContent.scrollTop += scrollAmount;
        
        // Check if reached bottom
        const maxScroll = teleprompterContent.scrollHeight - teleprompterContent.clientHeight;
        if (teleprompterContent.scrollTop >= maxScroll) {
            stopAutoScroll();
            updateFirebasePlayState(false);
        }
        
        // Throttle: chỉ update Firebase mỗi 200ms (thay vì mỗi 16ms)
        const now = Date.now();
        if (now - lastScrollUpdateTime >= 200) {
            throttledUpdateScrollPosition(getScrollPercentage());
            lastScrollUpdateTime = now;
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

// Firebase update functions
function updateFirebaseScrollPosition(position) {
    if (database && sessionId) {
        database.ref(`sessions/${sessionId}/scrollPosition`).set(position);
    }
}

// Throttled update cho scroll position - giảm số lần ghi lên Firebase
function throttledUpdateScrollPosition(position) {
    updateFirebaseScrollPosition(position);
}

function updateFirebasePlayState(playing) {
    if (database && sessionId) {
        database.ref(`sessions/${sessionId}/isPlaying`).set(playing);
    }
}

function updateFirebaseSpeed(speed) {
    if (database && sessionId) {
        database.ref(`sessions/${sessionId}/speed`).set(speed);
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

