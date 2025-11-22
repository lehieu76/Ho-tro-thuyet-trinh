// Firebase Configuration
// Người dùng cần thay thế các giá trị này bằng thông tin Firebase project của họ
const firebaseConfig = {
    apiKey: "AIzaSyC7yaU3QNS333qcQV7H9b2plx2N1nO2ESc",
    authDomain: "ho-tro-thuyet-trinh.firebaseapp.com",
    databaseURL: "https://ho-tro-thuyet-trinh-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "ho-tro-thuyet-trinh",
    storageBucket: "ho-tro-thuyet-trinh.firebasestorage.app",
    messagingSenderId: "370932469766",
    appId: "1:370932469766:web:ff108429894c811f0bb387"
};

// Khởi tạo Firebase (sẽ được gọi sau khi Firebase SDK được load)
let database;
let isFirebaseInitialized = false;

function initFirebase() {
    if (typeof firebase !== 'undefined' && !isFirebaseInitialized) {
        firebase.initializeApp(firebaseConfig);
        database = firebase.database();
        isFirebaseInitialized = true;
        return true;
    }
    return isFirebaseInitialized;
}

// Helper function để tạo session ID
function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

// Helper function để lấy session ID từ URL hoặc tạo mới
function getSessionId() {
    const urlParams = new URLSearchParams(window.location.search);
    let sessionId = urlParams.get('session');
    
    if (!sessionId) {
        sessionId = generateSessionId();
        // Lưu vào localStorage để dùng lại
        localStorage.setItem('teleprompter_session', sessionId);
    } else {
        localStorage.setItem('teleprompter_session', sessionId);
    }
    
    return sessionId;
}

