let db = null;
let selectedStageId = null;

// Функція завантаження (Замініть посилання на своє!)
async function loadFromGitHub() {
    const url = ʼhttps://raw.githubusercontent.com/IgorHQ/carrera-racing/refs/heads/main/data.jsonʼ
        const response = await fetch(url);
        if (response.ok) {
            db = await response.json();
            saveData();
            location.reload();
        } else {
            alert("Файл на GitHub не знайдено");
        }
    } catch (e) {
        alert("Блокування мережі. Перевірте інтернет або режим Приватного доступу.");
    }
}

// Ініціалізація
async function initDB() {
    try {
        const localData = localStorage.getItem('carreraDB');
        if (localData) {
            db = JSON.parse(localData);
            startApp();
        } else {
            showInitChoice();
        }
    } catch (e) {
        // Якщо localStorage заблокований (iPhone Private), просто показуємо вибір
        showInitChoice();
    }
}

function showInitChoice() {
    const board = document.getElementById('leaderboard');
    if (!board) return;
    board.innerHTML = `
        <div style="text-align:center; padding:40px 20px; background:rgba(255,255,255,0.05); border-radius:20px; border:2px dashed #444; margin: 10px;">
            <h2 style="color:white; font-size:1.3rem; margin-bottom:10px;">База даних не знайдена</h2>
            <p style="color:#aaa; margin-bottom:25px;">Натисніть кнопку нижче для завантаження даних</p>
            <div style="display:flex; flex-direction:column; gap:15px; align-items:center;">
                <button onclick="loadFromGitHub()" style="width:100%; max-width:280px; padding:18px; background:#444; color:white; border:none; border-radius:12px; cursor:pointer; font-weight:bold; font-size:16px; -webkit-appearance:none;">
                    ☁️ ЗАВАНТАЖИТИ З GITHUB
                </button>
                <button onclick="setupNewDB()" style="width:100%; max-width:280px; padding:18px; background:var(--carrera-red); color:white; border:none; border-radius:12px; cursor:pointer; font-weight:bold; font-size:16px; -webkit-appearance:none;">
                    🆕 НОВИЙ СЕЗОН
                </button>
            </div>
        </div>`;
}

function saveData() {
    if (!db) return;
    try {
        localStorage.setItem('carreraDB', JSON.stringify(db));
    } catch (e) {
        console.warn("Збереження неможливе (Private Mode)");
    }
}

// РЕШТА ФУНКЦІЙ (renderMainPage, openCarModal тощо) ЗАЛИШАЄТЬСЯ ЯК У ВАС
function startApp() {
    if (document.getElementById('leaderboard')) renderMainPage();
    if (document.getElementById('stageSelector')) updateAdminUI();
}

function setupNewDB() {
    db = { stages: [], pilots_directory: [
        { name: "Danylo", photo: "driver1.jpg" },
        { name: "Igor", photo: "driver2.jpg" },
        { name: "Volodymyr", photo: "driver3.jpg" },
        { name: "Vasyl", photo: "driver4.jpg" }
    ]};
    saveData();
    location.reload();
}

// Запуск
initDB();
