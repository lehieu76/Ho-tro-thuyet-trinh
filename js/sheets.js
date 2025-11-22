// Google Sheets Integration
// Hàm parse sheet ID từ URL Google Sheets
function parseSheetId(url) {
    // Hỗ trợ nhiều format URL:
    // https://docs.google.com/spreadsheets/d/{sheetId}/edit
    // https://docs.google.com/spreadsheets/d/{sheetId}
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

// Hàm đọc Google Sheet công khai (không cần API key)
async function fetchGoogleSheet(sheetUrl, range = 'Sheet1!A:A') {
    const sheetId = parseSheetId(sheetUrl);
    
    if (!sheetId) {
        throw new Error('Không thể parse Sheet ID từ URL. Vui lòng kiểm tra lại URL.');
    }
    
    // Sử dụng Google Sheets API công khai (không cần API key)
    // Format: https://docs.google.com/spreadsheets/d/{sheetId}/gviz/tq?tqx=out:json&sheet={sheetName}&range={range}
    const apiUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${range.split('!')[0]}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Lỗi khi tải sheet: ${response.statusText}`);
        }
        
        const text = await response.text();
        // Google trả về dữ liệu với prefix "google.visualization.Query.setResponse("
        // Cần loại bỏ prefix này
        const jsonText = text.replace(/^[^{]*/, '').replace(/[^}]*$/, '');
        const data = JSON.parse(jsonText);
        
        // Parse dữ liệu từ format Google Sheets
        const rows = data.table.rows;
        const content = [];
        
        rows.forEach(row => {
            if (row.c && row.c[0] && row.c[0].v) {
                content.push(row.c[0].v);
            }
        });
        
        return content.join('\n');
    } catch (error) {
        console.error('Lỗi khi đọc Google Sheet:', error);
        throw error;
    }
}

// Hàm đọc Google Sheet với API key (nếu có)
async function fetchGoogleSheetWithAPI(sheetUrl, apiKey, range = 'Sheet1!A:A') {
    const sheetId = parseSheetId(sheetUrl);
    
    if (!sheetId) {
        throw new Error('Không thể parse Sheet ID từ URL.');
    }
    
    const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
    
    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            throw new Error(`Lỗi khi tải sheet: ${response.statusText}`);
        }
        
        const data = await response.json();
        const rows = data.values || [];
        
        // Lấy cột đầu tiên
        const content = rows.map(row => row[0] || '').filter(cell => cell.trim() !== '');
        
        return content.join('\n');
    } catch (error) {
        console.error('Lỗi khi đọc Google Sheet:', error);
        throw error;
    }
}

// Hàm validate Google Sheet URL
function validateSheetUrl(url) {
    if (!url) return false;
    return url.includes('docs.google.com/spreadsheets');
}

