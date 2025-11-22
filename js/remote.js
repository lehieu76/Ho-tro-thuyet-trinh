// Remote Control Logic
let sessionId;
let isConnected = false;

// Current state
let currentState = {
    scrollPosition: 0,
    isPlaying: false,
    speed: 1,
    settings: {
        fontSize: 48,
        lineHeight: 1.6,
        backgroundColor: '#000000',
        textColor: '#ffffff',
        guideLineColor: '#ff0000',
        guideLineThickness: 2
    }
};

// DOM Elements
const sessionDisplay = document.getElementById('sessionDisplay');
const statusIndicator = document.getElementById('statusIndicator');
const statusText = document.getElementById('statusText');
const btnPlay = document.getElementById('btnPlay');
const btnPause = document.getElementById('btnPause');
const btnReset = document.getElementById('btnReset');
const speedSlider = document.getElementById('speedSlider');
const speedValue = document.getElementById('speedValue');
const scrollSlider = document.getElementById('scrollSlider');
const scrollValue = document.getElementById('scrollValue');
const fontSizeSlider = document.getElementById('fontSizeSlider');
const fontSizeValue = document.getElementById('fontSizeValue');
const lineHeightSlider = document.getElementById('lineHeightSlider');
const lineHeightValue = document.getElementById('lineHeightValue');
const backgroundColorPicker = document.getElementById('backgroundColorPicker');
const textColorPicker = document.getElementById('textColorPicker');
const guideLineColorPicker = document.getElementById('guideLineColorPicker');
const guideLineThicknessSlider = document.getElementById('guideLineThicknessSlider');
const guideLineThicknessValue = document.getElementById('guideLineThicknessValue');

// Khởi tạo
function init() {
    console.log('🚀 Khởi tạo Remote Control...');
    
    // Parse URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    sessionId = urlParams.get('session') || getSessionId();

    // Display session ID
    sessionDisplay.textContent = sessionId;
    console.log('📋 Session ID:', sessionId);

    // Khởi tạo Firebase - đợi Firebase SDK load xong
    if (typeof firebase !== 'undefined') {
        const initResult = initFirebase();
        if (initResult && database) {
            setupFirebase();
        } else {
            // Thử lại sau 1 giây nếu Firebase chưa sẵn sàng
            setTimeout(() => {
                const retryResult = initFirebase();
                if (retryResult && database) {
                    setupFirebase();
                } else {
                    showError('Không thể khởi tạo Firebase. Vui lòng kiểm tra cấu hình trong config.js');
                }
            }, 1000);
        }
    } else {
        // Đợi Firebase SDK load
        let checkCount = 0;
        const checkFirebase = setInterval(() => {
            checkCount++;
            if (typeof firebase !== 'undefined') {
                clearInterval(checkFirebase);
                const initResult = initFirebase();
                if (initResult && database) {
                    setupFirebase();
                } else {
                    showError('Không thể khởi tạo Firebase. Vui lòng kiểm tra cấu hình.');
                }
            } else if (checkCount > 10) {
                clearInterval(checkFirebase);
                showError('Firebase SDK không thể load. Vui lòng kiểm tra kết nối internet.');
            }
        }, 500);
    }

    // Setup controls
    setupControls();

    // Load saved settings from localStorage
    loadSavedSettings();
}

// Setup Firebase
function setupFirebase() {
    if (!database) {
        showError('Database không khả dụng. Kiểm tra config.js');
        return;
    }

    const sessionRef = database.ref(`sessions/${sessionId}`);

    // Kiểm tra kết nối trước
    database.ref('.info/connected').once('value').then((snapshot) => {
        const connected = snapshot.val();
        if (connected) {
            // Initialize session data
            sessionRef.set(currentState).then(() => {
                isConnected = true;
                updateConnectionStatus(true);
                console.log('✅ Đã kết nối Firebase và khởi tạo session');
            }).catch((error) => {
                console.error('Lỗi khi khởi tạo session:', error);
                // Kiểm tra lỗi cụ thể
                if (error.code === 'PERMISSION_DENIED') {
                    showError('Lỗi quyền truy cập. Vui lòng cấu hình Database Rules trong Firebase Console. Xem hướng dẫn trong HUONG_DAN_FIREBASE.md');
                } else {
                    showError('Lỗi khi kết nối Firebase: ' + error.message);
                }
            });
        } else {
            showError('Chưa kết nối được với Firebase. Kiểm tra internet và config.js');
        }
    }).catch((error) => {
        console.error('Lỗi khi kiểm tra kết nối:', error);
        if (error.code === 'PERMISSION_DENIED') {
            showError('Lỗi quyền truy cập. Vui lòng cấu hình Database Rules trong Firebase Console.');
        } else {
            showError('Lỗi kết nối Firebase. Kiểm tra config.js và Database Rules.');
        }
    });

    // Listen for changes from teleprompter (two-way sync)
    sessionRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            // Update local state (but don't trigger updates to avoid loops)
            currentState = data;
            updateUIFromState(data);
        }
    });

    // Listen for connection status
    database.ref('.info/connected').on('value', (snapshot) => {
        const connected = snapshot.val();
        isConnected = connected;
        updateConnectionStatus(connected);
    });
}

// Setup controls
function setupControls() {
    // Play button
    btnPlay.addEventListener('click', () => {
        updatePlayState(true);
    });

    // Pause button
    btnPause.addEventListener('click', () => {
        updatePlayState(false);
    });

    // Reset button
    btnReset.addEventListener('click', () => {
        updateScrollPosition(0);
        updatePlayState(false);
    });

    // Speed slider - throttle để tránh update quá nhiều
    speedSlider.addEventListener('input', (e) => {
        const speed = parseFloat(e.target.value);
        speedValue.textContent = speed.toFixed(1) + 'x';
        // Throttle: chỉ update Firebase sau 150ms
        clearTimeout(speedUpdateTimeout);
        speedUpdateTimeout = setTimeout(() => {
            updateSpeed(speed);
        }, 150);
    });

    // Scroll slider - throttle để tránh update quá nhiều khi kéo
    scrollSlider.addEventListener('input', (e) => {
        const position = parseFloat(e.target.value);
        scrollValue.textContent = position.toFixed(0) + '%';
        // Throttle: chỉ update Firebase sau 100ms
        clearTimeout(scrollUpdateTimeout);
        scrollUpdateTimeout = setTimeout(() => {
            updateScrollPosition(position);
        }, 100);
    });

    // Font size slider
    fontSizeSlider.addEventListener('input', (e) => {
        const size = parseInt(e.target.value);
        fontSizeValue.textContent = size + 'px';
        updateSetting('fontSize', size);
    });

    // Line height slider
    lineHeightSlider.addEventListener('input', (e) => {
        const height = parseFloat(e.target.value);
        lineHeightValue.textContent = height.toFixed(1);
        updateSetting('lineHeight', height);
    });

    // Background color picker
    backgroundColorPicker.addEventListener('input', (e) => {
        updateSetting('backgroundColor', e.target.value);
    });

    // Text color picker
    textColorPicker.addEventListener('input', (e) => {
        updateSetting('textColor', e.target.value);
    });

    // Guide line color picker
    guideLineColorPicker.addEventListener('input', (e) => {
        updateSetting('guideLineColor', e.target.value);
    });

    // Guide line thickness slider
    guideLineThicknessSlider.addEventListener('input', (e) => {
        const thickness = parseInt(e.target.value);
        guideLineThicknessValue.textContent = thickness + 'px';
        updateSetting('guideLineThickness', thickness);
    });
}

// Variables for throttling
let scrollUpdateTimeout = null;
let speedUpdateTimeout = null;

// Update UI from state (without triggering Firebase updates)
function updateUIFromState(state) {
    // Update scroll position
    if (state.scrollPosition !== undefined) {
        scrollSlider.value = state.scrollPosition;
        scrollValue.textContent = state.scrollPosition.toFixed(0) + '%';
    }

    // Update play state
    if (state.isPlaying !== undefined) {
        // UI will reflect state but buttons remain functional
    }

    // Update speed
    if (state.speed !== undefined) {
        speedSlider.value = state.speed;
        speedValue.textContent = state.speed.toFixed(1) + 'x';
    }

    // Update settings
    if (state.settings) {
        const settings = state.settings;
        if (settings.fontSize !== undefined) {
            fontSizeSlider.value = settings.fontSize;
            fontSizeValue.textContent = settings.fontSize + 'px';
        }
        if (settings.lineHeight !== undefined) {
            lineHeightSlider.value = settings.lineHeight;
            lineHeightValue.textContent = settings.lineHeight.toFixed(1);
        }
        if (settings.backgroundColor !== undefined) {
            backgroundColorPicker.value = settings.backgroundColor;
        }
        if (settings.textColor !== undefined) {
            textColorPicker.value = settings.textColor;
        }
        if (settings.guideLineColor !== undefined) {
            guideLineColorPicker.value = settings.guideLineColor;
        }
        if (settings.guideLineThickness !== undefined) {
            guideLineThicknessSlider.value = settings.guideLineThickness;
            guideLineThicknessValue.textContent = settings.guideLineThickness + 'px';
        }
    }
}

// Firebase update functions with error handling
function updatePlayState(playing) {
    if (database && sessionId) {
        database.ref(`sessions/${sessionId}/isPlaying`).set(playing).catch((error) => {
            if (error.code === 'PERMISSION_DENIED') {
                console.error('❌ Lỗi quyền truy cập khi update isPlaying. Vui lòng cấu hình Database Rules.');
                showError('Lỗi quyền truy cập. Kiểm tra Database Rules trong Firebase Console.');
            } else {
                console.error('Lỗi update play state:', error);
            }
        });
    }
}

function updateSpeed(speed) {
    if (database && sessionId) {
        database.ref(`sessions/${sessionId}/speed`).set(speed).catch((error) => {
            if (error.code === 'PERMISSION_DENIED') {
                console.error('❌ Lỗi quyền truy cập khi update speed.');
            } else {
                console.error('Lỗi update speed:', error);
            }
        });
    }
}

function updateScrollPosition(position) {
    if (database && sessionId) {
        database.ref(`sessions/${sessionId}/scrollPosition`).set(position).catch((error) => {
            if (error.code === 'PERMISSION_DENIED') {
                console.error('❌ Lỗi quyền truy cập khi update scrollPosition.');
            } else {
                console.error('Lỗi update scroll position:', error);
            }
        });
    }
}

function updateSetting(key, value) {
    if (database && sessionId) {
        database.ref(`sessions/${sessionId}/settings/${key}`).set(value).catch((error) => {
            if (error.code === 'PERMISSION_DENIED') {
                console.error('❌ Lỗi quyền truy cập khi update setting:', key);
            } else {
                console.error('Lỗi update setting:', error);
            }
        });
    }
    // Save to localStorage
    saveSettings();
}

// Update connection status
function updateConnectionStatus(connected) {
    if (connected) {
        statusIndicator.className = 'status-indicator status-connected';
        statusText.textContent = '✓ Đã kết nối';
    } else {
        statusIndicator.className = 'status-indicator status-disconnected';
        statusText.textContent = '✗ Mất kết nối';
    }
}

// Show error
function showError(message) {
    statusIndicator.className = 'status-indicator status-disconnected';
    statusText.textContent = '✗ ' + message;
}

// Save settings to localStorage
function saveSettings() {
    if (currentState.settings) {
        localStorage.setItem('teleprompter_settings', JSON.stringify(currentState.settings));
    }
}

// Load saved settings from localStorage
function loadSavedSettings() {
    const saved = localStorage.getItem('teleprompter_settings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            currentState.settings = { ...currentState.settings, ...settings };
            updateUIFromState(currentState);
            // Apply saved settings to Firebase
            if (database && sessionId) {
                database.ref(`sessions/${sessionId}/settings`).set(currentState.settings).catch((error) => {
                    if (error.code !== 'PERMISSION_DENIED') {
                        console.error('Lỗi khi load settings:', error);
                    }
                });
            }
        } catch (e) {
            console.error('Lỗi khi load settings:', e);
        }
    }
}

// Copy session ID to clipboard
sessionDisplay.addEventListener('click', () => {
    navigator.clipboard.writeText(sessionId).then(() => {
        const originalText = sessionDisplay.textContent;
        sessionDisplay.textContent = '✓ Đã copy!';
        setTimeout(() => {
            sessionDisplay.textContent = originalText;
        }, 2000);
    });
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

