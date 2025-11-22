# Teleprompter Web App

Ứng dụng web Teleprompter miễn phí với khả năng điều khiển từ xa, đọc nội dung từ Google Sheets và nhiều tùy chỉnh hiển thị.

## Tính năng

- 📊 **Đọc từ Google Sheets**: Tự động đọc nội dung từ Google Sheet công khai
- 📱 **2 chế độ**: Teleprompter (hiển thị) và Remote (điều khiển)
- 🎮 **Điều khiển từ xa**: Kết nối qua Firebase Realtime Database
- ⚡ **Cuộn tự động/thủ công**: Tự động cuộn với tốc độ điều chỉnh hoặc cuộn thủ công
- 🎨 **Tùy chỉnh đầy đủ**: Font size, khoảng cách dòng, màu sắc, thanh gạch ngang
- 📱 **Responsive**: Hoạt động tốt trên điện thoại, tablet và máy tính
- 🆓 **Miễn phí**: Sử dụng Firebase free tier và GitHub Pages

## Cài đặt

### 1. Tạo Firebase Project

1. Truy cập [Firebase Console](https://console.firebase.google.com/)
2. Đăng nhập bằng tài khoản Google của bạn
3. Click **"Add project"** (hoặc chọn project có sẵn)
4. Đặt tên project (ví dụ: "teleprompter-app")
5. (Tùy chọn) Tắt Google Analytics nếu không cần
6. Click **"Create project"** và đợi Firebase tạo project

### 2. Tạo Realtime Database

1. Trong Firebase Console, vào menu bên trái
2. Click **"Realtime Database"** (hoặc **"Build"** > **"Realtime Database"**)
3. Click **"Create Database"**
4. Chọn vị trí database (chọn gần bạn nhất, ví dụ: `asia-southeast1` cho Việt Nam)
5. Chọn chế độ bảo mật:
   - **Test mode**: Cho phép đọc/ghi trong 30 ngày (phù hợp để test)
   - **Production mode**: Cần cấu hình rules (phức tạp hơn)
6. Click **"Enable"**

### 3. Lấy thông tin cấu hình Firebase

1. Trong Firebase Console, click vào biểu tượng **⚙️ Settings** (bánh răng) ở góc trên bên trái
2. Chọn **"Project settings"**
3. Cuộn xuống phần **"Your apps"**
4. Nếu chưa có app web, click vào biểu tượng **`</>`** (Web) để thêm app web:
   - Đặt tên app (ví dụ: "Teleprompter Web")
   - (Tùy chọn) Đánh dấu "Also set up Firebase Hosting"
   - Click **"Register app"**
5. Bạn sẽ thấy một đoạn code cấu hình như sau:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC...",           // ← Copy giá trị này
  authDomain: "xxx.firebaseapp.com",  // ← Copy giá trị này
  databaseURL: "https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app", // ← Copy giá trị này
  projectId: "xxx",               // ← Copy giá trị này
  storageBucket: "xxx.appspot.com",  // ← Copy giá trị này
  messagingSenderId: "123456789", // ← Copy giá trị này
  appId: "1:123456789:web:abc123"  // ← Copy giá trị này
};
```

**Lưu ý quan trọng:**
- `databaseURL` có thể khác format, ví dụ: `https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app` (nếu bạn chọn region khác)
- Nếu không thấy `databaseURL` trong config, bạn có thể tìm nó ở trang **Realtime Database** > **Data** (URL hiển thị ở trên cùng)

### 4. Cấu hình vào file config.js

Mở file `js/config.js` và thay thế các giá trị `YOUR_XXX` bằng các giá trị bạn vừa copy:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC...",  // ← Dán apiKey vào đây
    authDomain: "xxx.firebaseapp.com",  // ← Dán authDomain vào đây
    databaseURL: "https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app",  // ← Dán databaseURL vào đây
    projectId: "xxx",  // ← Dán projectId vào đây
    storageBucket: "xxx.appspot.com",  // ← Dán storageBucket vào đây
    messagingSenderId: "123456789",  // ← Dán messagingSenderId vào đây
    appId: "1:123456789:web:abc123"  // ← Dán appId vào đây
};
```

**Ví dụ thực tế:**
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC1234567890abcdefghijklmnop",
    authDomain: "my-teleprompter.firebaseapp.com",
    databaseURL: "https://my-teleprompter-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "my-teleprompter",
    storageBucket: "my-teleprompter.appspot.com",
    messagingSenderId: "987654321",
    appId: "1:987654321:web:abcdef123456"
};
```

### 3. Chuẩn bị Google Sheet

1. Tạo Google Sheet mới
2. Nhập nội dung vào cột A (hoặc sheet đầu tiên)
3. Chia sẻ sheet ở chế độ **Công khai** (Anyone with the link can view)
4. Copy URL của sheet

### 4. Deploy lên GitHub Pages

1. Tạo repository mới trên GitHub
2. Upload tất cả các file lên repository
3. Vào **Settings** > **Pages**
4. Chọn branch `main` (hoặc `master`) và folder `/ (root)`
5. Click **Save**
6. Đợi vài phút, ứng dụng sẽ có sẵn tại `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## Sử dụng

### Chế độ Teleprompter (Màn hình hiển thị)

1. Mở trang chính (`index.html`)
2. Nhập URL Google Sheet
3. (Tùy chọn) Nhập Session ID nếu muốn kết nối với Remote
4. Click **Teleprompter**
5. Nội dung sẽ được tải và hiển thị

**Phím tắt:**
- `Space`: Play/Pause
- `↑/↓`: Cuộn thủ công
- `F`: Fullscreen
- `R`: Reset về đầu

### Chế độ Remote (Điều khiển từ xa)

1. Mở trang chính (`index.html`)
2. Nhập URL Google Sheet
3. Nhập Session ID (hoặc để trống để tạo mới)
4. Click **Remote**
5. Copy Session ID và chia sẻ với thiết bị Teleprompter
6. Sử dụng các điều khiển để điều khiển Teleprompter từ xa

**Lưu ý:** Cả Remote và Teleprompter phải sử dụng cùng một Session ID để kết nối.

## Cấu trúc file

```
/
├── index.html          # Trang chính - chọn chế độ
├── teleprompter.html   # Màn hình hiển thị Teleprompter
├── remote.html         # Màn hình điều khiển Remote
├── js/
│   ├── config.js       # Cấu hình Firebase
│   ├── sheets.js       # Xử lý đọc Google Sheet
│   ├── teleprompter.js # Logic hiển thị Teleprompter
│   └── remote.js       # Logic điều khiển Remote
├── css/
│   └── styles.css      # Styles
└── README.md           # File này
```

## Tính năng chi tiết

### Điều khiển cuộn
- **Play/Pause**: Bắt đầu/dừng cuộn tự động
- **Tốc độ**: Điều chỉnh từ 0.1x đến 5x
- **Vị trí**: Cuộn đến vị trí bất kỳ (0-100%)

### Cài đặt hiển thị
- **Font size**: 12px - 120px
- **Khoảng cách dòng**: 0.8 - 3.0
- **Màu nền**: Tùy chọn
- **Màu chữ**: Tùy chọn
- **Thanh gạch ngang**: Màu và độ dày tùy chỉnh (1-10px)

## Troubleshooting

### Lỗi không đọc được Google Sheet
- Kiểm tra sheet đã được chia sẻ công khai chưa
- Kiểm tra URL có đúng định dạng không
- Thử refresh lại trang

### Lỗi kết nối Firebase
- Kiểm tra cấu hình Firebase trong `config.js`
- Kiểm tra Realtime Database đã được tạo chưa
- Kiểm tra Rules của Realtime Database (nên cho phép read/write trong test mode)

### Remote không điều khiển được Teleprompter
- Kiểm tra cả 2 thiết bị đều sử dụng cùng Session ID
- Kiểm tra kết nối internet
- Kiểm tra Firebase đã được cấu hình đúng chưa

## Giấy phép

Miễn phí sử dụng cho mục đích cá nhân và thương mại.

## Đóng góp

Mọi đóng góp đều được chào đón! Vui lòng tạo issue hoặc pull request.

