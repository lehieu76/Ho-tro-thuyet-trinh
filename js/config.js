// Firebase Configuration
// Người dùng cần thay thế các giá trị này bằng thông tin Firebase project của họ
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
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

