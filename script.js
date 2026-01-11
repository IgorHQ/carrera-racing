let db = null;
let selectedStageId = null;

// 1. Ініціалізація: Перевіряємо ТІЛЬКИ localStorage
async function initDB() {
    const localData = localStorage.getItem('carreraDB');
    if (localData) {
        try {
            db = JSON.parse(localData);
            startApp();
        } catch (e) {
            console.error("Помилка парсингу бази, очищуємо...");
            localStorage.removeItem('carreraDB');
            showInitChoice();
        }
    } else {
        // Якщо в браузері пусто — показуємо вибір (Новий або GitHub)
        showInitChoice();
    }
}

// Початковий екран вибору
function showInitChoice() {
    const board = document.getElementById('leaderboard');
    if (!board) return;
    board.innerHTML = `
        <div style="text-align:center; padding:50px; background:rgba(255,255,255,0.05); border-radius:20px; border:2px dashed #444; margin: 20px;">
            <h2 style="color:white;">База даних не знайдена</h2>
            <p style="color:#ccc;">Як ви хочете почати?</p>
            <div style="display:flex; gap:20px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
                <button onclick="setupNewDB()" style="padding:15px 25px; background:var(--carrera-red); color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">Почати новий сезон (Локально)</button>
                <button onclick="loadFromGitHub()" style="padding:15px 25px; background:#444; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">Завантажити з GitHub</button>
            </div>
        </div>`;
}

// Створення нової бази
function setupNewDB() {
    db = { stages: [], pilots_directory: [] };
    saveData();
    location.reload();
}

// Завантаження з GitHub (Тільки після натискання кнопки!)
async function loadFromGitHub() {
    // const userRepo = "ВАШ_ЛОГІН/РЕПОЗИТОРІЙ"; // Замініть на свій
    // const url = `https://raw.githubusercontent.com/${userRepo}/carrera-racing/refs/heads/main/data.json`;
    
    const url = `https://raw.githubusercontent.com/IgorHQ/carrera-racing/refs/heads/main/data.json`;
    

    
    
    try {
        const response = await fetch(url);
        if (response.ok) {
            db = await response.json();
            saveData();
            alert("Дані з GitHub успішно завантажені!");
            location.reload();
        } else {
            alert("Не вдалося знайти файл на GitHub. Перевірте посилання в коді.");
        }
    } catch (e) {
        alert("Помилка мережі при спробі завантажити з GitHub.");
    }
}

function startApp() {
    if (document.getElementById('leaderboard')) renderMainPage();
    if (document.getElementById('stageSelector')) updateAdminUI();
}

const saveData = () => localStorage.setItem('carreraDB', JSON.stringify(db));
const getStageById = (id) => db.stages.find(s => s.id == id);

// --- АДМІН ПАНЕЛЬ ---

function checkAuth() {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    if (u === 'admin' && p === 'admin') {
        document.getElementById('login-block').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        if (db.stages && db.stages.length > 0) {
            selectedStageId = db.stages[db.stages.length - 1].id;
            updateAdminUI();
        }
    } else { alert('Невірний логін або пароль!'); }
}

function updateAdminUI() {
    const selector = document.getElementById('stageSelector');
    if (!selector) return;
    
    selector.innerHTML = db.stages.map(s => `<option value="${s.id}" ${s.id == selectedStageId ? 'selected' : ''}>${s.trackName}</option>`).join('');
    
    const stage = getStageById(selectedStageId);
    if (stage) {
        document.getElementById('active-stage-controls').style.display = 'block';
        document.getElementById('current-st-name').innerText = "Траса: " + stage.trackName;
        document.getElementById('pilots-list-for-results').innerHTML = stage.pilots.map((p, i) => `
            <div style="display:flex; gap:10px; margin-bottom:8px; background:#f8f9fa; padding:10px; border-radius:6px; align-items:center;">
                <span style="width:120px; color:#333; font-weight:bold;">${p.name}</span>
                <input type="number" id="place-${i}" placeholder="Місце" style="width:60px; padding:5px;">
                <input type="text" id="car-${i}" placeholder="bmw.jpg" style="flex:1; padding:5px;">
            </div>`).join('');
            
        const vList = document.getElementById('admin-video-list');
        if (vList) {
            vList.innerHTML = (stage.videos || []).map((v, idx) => `
                <div style="font-size:12px; margin-top:5px;">🎬 ${v} <button onclick="removeVideo(${idx})" style="color:red; background:none; border:none; cursor:pointer;">[x]</button></div>
            `).join('');
        }
    }
}

// ПОВНЕ ВИДАЛЕННЯ (RESET)
// function clearAllData() {
//     if (confirm("ВИ ВПЕВНЕНІ? Це видалить ВСІ дані з браузера і поверне меню вибору!")) {
//         localStorage.removeItem('carreraDB'); // ВИДАЛЯЄМО КЛЮЧ ПОВНІСТЮ
//         db = null;
//         alert("Пам'ять очищена.");
//         location.reload(); // Після перезавантаження спрацює showInitChoice()
//     }
// }

function clearAllData() {
    if (confirm("УВАГА! Ви впевнені, що хочете ПОВНІСТЮ СТЕРТИ всі дані?")) {
        // Очищуємо сховище повністю
        localStorage.removeItem('carreraDB');
        
        // Обнуляємо змінну в пам'яті
        db = null;
        
        // Перезавантажуємо сторінку
        location.reload();
    }
}

function deleteCurrentStage() {
    if (!selectedStageId) return;
    if (confirm("Видалити цей етап?")) {
        db.stages = db.stages.filter(s => s.id != selectedStageId);
        saveData();
        location.reload();
    }
}

function saveRace() {
    const stage = getStageById(selectedStageId);
    if (!stage) return;
    stage.pilots.forEach((p, i) => {
        const place = parseInt(document.getElementById(`place-${i}`).value);
        const car = document.getElementById(`car-${i}`).value.trim() || 'car.jpg';
        if (!isNaN(place)) {
            const pts = (place === 1) ? 50 : Math.max(0, 50 - (place - 1) * 5);
            p.totalPoints += pts;
            p.pointsHistory.push(pts);
            p.carPhotos.push(car);
        }
    });
    stage.racesCount++;
    saveData();
    alert("Збережено!");
    updateAdminUI();
}

function addVideoToStage() {
    const stage = getStageById(selectedStageId);
    const val = document.getElementById('videoUrl').value.trim();
    if (val) {
        if (!stage.videos) stage.videos = [];
        stage.videos.push(val);
        saveData();
        document.getElementById('videoUrl').value = '';
        updateAdminUI();
    }
}

function removeVideo(idx) {
    const stage = getStageById(selectedStageId);
    stage.videos.splice(idx, 1);
    saveData();
    updateAdminUI();
}

// --- РЕНДЕРИНГ ГОЛОВНОЇ ---
function renderMainPage() {
    const board = document.getElementById('leaderboard');
    if (!board) return;
    board.innerHTML = '';
    
    // Якщо немає етапів, показуємо заглушку
    if (!db.stages || db.stages.length === 0) {
        board.innerHTML = `<h2 style="text-align:center; color:gray; margin-top:50px;">Етапів ще не створено. Зайдіть в адмінку.</h2>`;
        return;
    }

    // Розрахунок загального заліку
    const totals = {};
    db.stages.forEach(s => s.pilots.forEach(p => totals[p.name] = (totals[p.name] || 0) + p.totalPoints));
    const sorted = Object.entries(totals).map(([name, points]) => ({ name, points })).sort((a,b) => b.points - a.points);
    
    const ob = document.getElementById('overall-leaderboard');
    if (ob) {
        ob.innerHTML = sorted.map((p, i) => `
            <div class="standings-item ${i === 0 ? 'leader' : ''}"><span>${i+1}. ${p.name}</span><strong>${p.points}</strong></div>
        `).join('');
    }

    // Рендер етапів (від нових до старих)
    [...db.stages].reverse().forEach(stage => {
        const stageDiv = document.createElement('div');
        stageDiv.className = 'stage-container';
        
        // Логіка перемог машин
        const carWins = {};
        stage.pilots.forEach(p => p.carPhotos.forEach((img, idx) => {
            if(img) {
                if(!carWins[img]) carWins[img] = 0;
                if(p.pointsHistory[idx] === 50) carWins[img]++;
            }
        }));
        const maxWins = Math.max(...Object.values(carWins), 0);

        stageDiv.innerHTML = `
            <h2>${stage.trackName}</h2>
            <div class="stage-info-row">
                <div class="track-block"><img src="img/${stage.trackImg}" class="stage-track-img"></div>
                <div class="stage-car-gallery">
                    <div class="car-gallery-grid">
                        ${Object.entries(carWins).map(([img, wins]) => {
                            const isAbs = wins > 0 && wins === stage.racesCount;
                            return `
                            <div class="gallery-item ${isAbs ? 'absolute-champion' : (wins === maxWins && wins > 0 ? 'top-car' : '')}">
                                ${wins > 0 ? `<div class="car-win-badge">🏆 ${wins}</div>` : ''}
                                <img src="img/${img}" class="gallery-car-img" onclick="openCarModal('${img}', 'Перемог: ${wins}', '${stage.trackName}')">
                                ${isAbs ? '<div class="absolute-label">ABS CHAMPION</div>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="pilots-grid">${[...stage.pilots].sort((a,b)=>b.totalPoints - a.totalPoints).map((p, i) => {
                const carGroups = {};
                p.carPhotos.forEach((img, idx) => { if(img) { if(!carGroups[img]) carGroups[img] = []; carGroups[img].push(idx+1); }});
                return `
                <div class="pilot-card">
                    <div class="rank">#${i+1}</div>
                    <img src="img/${p.photo}" class="pilot-photo">
                    <h3>${p.name}</h3>
                    <p class="points">${p.totalPoints} pts</p>
                    <div class="cars">
                        ${Object.entries(carGroups).map(([img, races]) => `
                            <div class="car-wrapper">
                                ${races.length > 1 ? `<div class="car-count-badge">${races.length}</div>` : ''}
                                <img src="img/${img}" class="car-mini" onclick="openCarModal('${img}', 'Пілот: ${p.name}', 'Заїзди: ${races.join(',')}')">
                            </div>`).join('')}
                    </div>
                </div>`;
            }).join('')}</div>
            ${stage.videos && stage.videos.length > 0 ? `
                <div class="video-grid" style="display:flex; gap:10px; margin-top:20px; flex-wrap:wrap;">
                    ${stage.videos.map(v => `<div style="width:300px;"><video controls style="width:100%; border-radius:10px;"><source src="video/${v}" type="video/mp4"></video></div>`).join('')}
                </div>` : ''}
        `;
        board.appendChild(stageDiv);
    });
}

function openCarModal(imgSrc, title, details) {
    const modal = document.getElementById("carModal");
    if (!modal) return;
    document.getElementById("bigCarImg").src = imgSrc.startsWith('img/') ? imgSrc : `img/${imgSrc}`;
    document.getElementById("modal-caption").innerHTML = `<b>${imgSrc}</b><br>${title}<br>${details}`;
    modal.style.display = "flex";
}
function closeModal() { document.getElementById("carModal").style.display = "none"; }

initDB();