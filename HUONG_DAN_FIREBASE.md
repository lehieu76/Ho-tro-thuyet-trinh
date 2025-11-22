# Hướng dẫn chi tiết: Lấy thông tin Firebase Config

## Bước 1: Tạo Firebase Project

1. Truy cập https://console.firebase.google.com/
2. Đăng nhập bằng tài khoản Google
3. Click **"Add project"** hoặc **"Tạo dự án"**
4. Nhập tên project (ví dụ: "teleprompter-app")
5. Click **"Continue"** / **"Tiếp tục"**
6. (Tùy chọn) Tắt Google Analytics nếu không cần
7. Click **"Create project"** / **"Tạo dự án"**
8. Đợi vài giây để Firebase tạo project
9. Click **"Continue"** / **"Tiếp tục"**

## Bước 2: Tạo Realtime Database

1. Trong Firebase Console, nhìn menu bên trái
2. Tìm và click **"Realtime Database"** (hoặc **"Build"** > **"Realtime Database"**)
3. Click nút **"Create Database"** / **"Tạo cơ sở dữ liệu"**
4. Chọn vị trí (location):
   - Nếu ở Việt Nam: chọn `asia-southeast1` (Singapore) hoặc `asia-southeast2` (Jakarta)
   - Hoặc chọn location gần bạn nhất
5. Chọn chế độ bảo mật:
   - **Start in test mode** (Bắt đầu ở chế độ thử nghiệm): Dễ dàng hơn, cho phép đọc/ghi trong 30 ngày
   - **Start in production mode**: Cần cấu hình rules phức tạp hơn
6. Click **"Enable"** / **"Bật"**

## Bước 3: Thêm Web App vào Firebase Project

1. Trong Firebase Console, click vào biểu tượng **⚙️ Settings** (bánh răng) ở góc trên bên trái
2. Chọn **"Project settings"** / **"Cài đặt dự án"**
3. Cuộn xuống phần **"Your apps"** / **"Ứng dụng của bạn"**
4. Nếu chưa có app web, bạn sẽ thấy các biểu tượng:
   - `< / >` cho Web
   - `< >` cho iOS
   - `< >` cho Android
5. Click vào biểu tượng **`</>`** (Web) để thêm app web
6. Điền thông tin:
   - **App nickname** (Tên app): Ví dụ "Teleprompter Web"
   - (Tùy chọn) Đánh dấu "Also set up Firebase Hosting" nếu muốn
7. Click **"Register app"** / **"Đăng ký ứng dụng"**

## Bước 4: Copy thông tin cấu hình

Sau khi đăng ký app, Firebase sẽ hiển thị một đoạn code JavaScript với cấu hình. Bạn sẽ thấy:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC1234567890abcdefghijklmnop",
  authDomain: "my-project.firebaseapp.com",
  databaseURL: "https://my-project-default-rtdb.firebaseio.com",
  projectId: "my-project",
  storageBucket: "my-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef1234567890"
};
```

**Copy từng giá trị:**

1. **apiKey**: Chuỗi dài bắt đầu bằng "AIzaSy..."
2. **authDomain**: Có dạng "xxx.firebaseapp.com"
3. **databaseURL**: 
   - Nếu bạn chọn region khác, URL sẽ khác
   - Ví dụ: `https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app`
   - Nếu không thấy trong config, vào **Realtime Database** > **Data**, URL sẽ hiển thị ở trên cùng
4. **projectId**: Tên project của bạn
5. **storageBucket**: Có dạng "xxx.appspot.com"
6. **messagingSenderId**: Một chuỗi số dài
7. **appId**: Có dạng "1:123456789:web:abc123..."

## Bước 5: Điền vào file config.js

1. Mở file `js/config.js` trong project của bạn
2. Tìm đoạn code:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};
```

3. Thay thế từng giá trị `YOUR_XXX` bằng giá trị bạn đã copy:

```javascript
const firebaseConfig = {
    apiKey: "AIzaSyC1234567890abcdefghijklmnop",  // ← Dán apiKey
    authDomain: "my-project.firebaseapp.com",  // ← Dán authDomain
    databaseURL: "https://my-project-default-rtdb.asia-southeast1.firebasedatabase.app",  // ← Dán databaseURL
    projectId: "my-project",  // ← Dán projectId
    storageBucket: "my-project.appspot.com",  // ← Dán storageBucket
    messagingSenderId: "123456789012",  // ← Dán messagingSenderId
    appId: "1:123456789012:web:abcdef1234567890"  // ← Dán appId
};
```

4. Lưu file

## Bước 6: Kiểm tra Realtime Database Rules

1. Vào **Realtime Database** > **Rules** (tab ở trên cùng)
2. Nếu bạn chọn "Test mode", rules sẽ như sau:

```json
{
  "rules": {
    ".read": "now < 1609459200000",  // Thời gian hết hạn (30 ngày)
    ".write": "now < 1609459200000"
  }
}
```

3. Nếu muốn cho phép đọc/ghi vĩnh viễn (chỉ dùng cho test, không dùng cho production):

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

**⚠️ Cảnh báo:** Rules này cho phép ai cũng đọc/ghi database. Chỉ dùng cho test hoặc nếu bạn không quan tâm bảo mật.

4. Click **"Publish"** / **"Xuất bản"**

## Xong! 

Bây giờ bạn có thể test ứng dụng. Nếu gặp lỗi, kiểm tra:

- Tất cả các giá trị đã được điền đúng chưa?
- Realtime Database đã được tạo chưa?
- Database Rules đã cho phép đọc/ghi chưa?
- Console của trình duyệt có lỗi gì không? (F12 để mở)

