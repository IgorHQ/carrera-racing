let db = null;
let selectedStageId = null;

// Ініціалізація бази даних
async function initDB() {
    const localData = localStorage.getItem('carreraDB');
    if (localData) {
        db = JSON.parse(localData);
    } else {
        try {
            const response = await fetch('data.json');
            db = response.ok ? await response.json() : { stages: [], pilots_directory: [] };
        } catch (e) {
            db = { stages: [], pilots_directory: [] };
        }
    }
    if (!db.pilots_directory) db.pilots_directory = [];
    
    // Перевірка сторінки
    if (document.getElementById('leaderboard')) renderMainPage();
    if (document.getElementById('stageSelector')) updateAdminUI();
}

const saveData = () => localStorage.setItem('carreraDB', JSON.stringify(db));
const getStageById = (id) => db.stages.find(s => s.id == id);

// --- АВТОРИЗАЦІЯ (Логін: admin / Пароль: admin) ---
function checkAuth() {
    const u = document.getElementById('user').value;
    const p = document.getElementById('pass').value;
    if (u === 'admin' && p === 'admin') {
        document.getElementById('login-block').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        if (db.stages.length > 0) {
            selectedStageId = db.stages[db.stages.length - 1].id;
            updateAdminUI();
        }
    } else {
        alert('Невірний логін або пароль!');
    }
}

// --- ФУНКЦІЇ АДМІНКИ ---
function addVideoToStage() {
    const stage = getStageById(selectedStageId);
    const fileName = document.getElementById('videoUrl').value.trim();
    if (!fileName) return;
    if (!stage.videos) stage.videos = [];
    stage.videos.push(fileName);
    saveData();
    updateAdminUI();
    document.getElementById('videoUrl').value = '';
}

function removeVideo(index) {
    const stage = getStageById(selectedStageId);
    stage.videos.splice(index, 1);
    saveData();
    updateAdminUI();
}

function addPilotToDirectory() {
    const name = document.getElementById('dirPilotName').value.trim();
    const photo = document.getElementById('dirPilotImg').value.trim() || 'pilot.jpg';
    if (!name) return;
    db.pilots_directory.push({ name, photo });
    saveData();
    updateAdminUI();
}

function createNewStage() {
    const name = document.getElementById('newTrackName').value.trim();
    const img = document.getElementById('newTrackImg').value.trim() || 'track.jpg';
    if (!name) return;
    const newStage = { id: Date.now(), trackName: name, trackImg: img, pilots: [], racesCount: 0, videos: [] };
    db.stages.push(newStage);
    selectedStageId = newStage.id;
    saveData();
    updateAdminUI();
}

function handleStageChange() {
    selectedStageId = document.getElementById('stageSelector').value;
    updateAdminUI();
}

function addPilotToStageFromDir() {
    const stage = getStageById(selectedStageId);
    const name = document.getElementById('directorySelect').value;
    const dirPilot = db.pilots_directory.find(p => p.name === name);
    if (!stage || !dirPilot) return;
    stage.pilots.push({ name: dirPilot.name, photo: dirPilot.photo, totalPoints: 0, carPhotos: [], pointsHistory: [] });
    saveData();
    updateAdminUI();
}

function saveRace() {
    const stage = getStageById(selectedStageId);
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
    updateAdminUI();
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
            <div style="display:flex; gap:10px; margin-bottom:5px; background:#eee; padding:5px; border-radius:4px;">
                <span style="width:120px"><b>${p.name}</b></span>
                <input type="number" id="place-${i}" placeholder="Місце" style="width:60px">
                <input type="text" id="car-${i}" placeholder="car.jpg" style="flex:1">
            </div>`).join('');
        
        const videoList = document.getElementById('admin-video-list');
        if (videoList) {
            videoList.innerHTML = (stage.videos || []).map((v, i) => `
                <div style="display:flex; justify-content:space-between; margin-top:5px; background:#f9f9f9; padding:5px; border:1px solid #ddd;">
                    <span>${v}</span><button onclick="removeVideo(${i})" style="color:red; border:none; background:none; cursor:pointer;">✖</button>
                </div>`).join('');
        }
    }
}

// --- РЕНДЕР ГОЛОВНОЇ СТОРІНКИ ---
function renderMainPage() {
    const board = document.getElementById('leaderboard');
    if (!board) return;
    board.innerHTML = '';
    const totals = {};
    db.stages.forEach(s => s.pilots.forEach(p => totals[p.name] = (totals[p.name] || 0) + p.totalPoints));
    const sorted = Object.entries(totals).map(([name, points]) => ({ name, points })).sort((a,b) => b.points - a.points);
    document.getElementById('overall-leaderboard').innerHTML = sorted.map((p, i) => `
        <div class="standings-item ${i === 0 ? 'leader' : ''}"><span>${i+1}. ${p.name}</span><strong>${p.points}</strong></div>
    `).join('');

    [...db.stages].reverse().forEach(stage => {
        const carWins = {};
        stage.pilots.forEach(p => p.carPhotos.forEach((img, idx) => {
            if(img) {
                if(!carWins[img]) carWins[img] = 0;
                if(p.pointsHistory[idx] === 50) carWins[img]++;
            }
        }));
        const maxWins = Math.max(...Object.values(carWins), 0);

        const stageDiv = document.createElement('div');
        stageDiv.className = 'stage-container';
        stageDiv.innerHTML = `
            <h2>${stage.trackName}</h2>
            <div class="stage-info-row">
                <div class="track-block"><img src="img/${stage.trackImg}" class="stage-track-img"></div>
                <div class="stage-car-gallery">
                    <h3 style="color:var(--gold); font-size:0.8rem;">АВТОПАРК ЕТАПУ</h3>
                    <div class="car-gallery-grid">
                        ${Object.entries(carWins).map(([img, wins]) => {
                            const isAbs = wins > 0 && wins === stage.racesCount;
                            const isTop = wins > 0 && wins === maxWins && !isAbs;
                            return `
                            <div class="gallery-item ${isAbs ? 'absolute-champion' : (isTop ? 'top-car' : '')}">
                                ${wins > 0 ? `<div class="car-win-badge">🏆 ${wins}</div>` : ''}
                                <img src="img/${img}" class="gallery-car-img" onclick="openCarModal('${img}', 'Статистика', 'Перемог: ${wins}')">
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
                                <img src="img/${img}" class="car-mini" onclick="openCarModal('${img}', 'Пілот: ${p.name}', 'Заїзди №: ${races.join(', ')}')">
                            </div>`).join('')}
                    </div>
                </div>`;
            }).join('')}</div>
            
            ${stage.videos && stage.videos.length > 0 ? `
            <div style="margin-top:25px; border-top:1px solid #333; padding-top:15px;">
                <h3 style="color:var(--gold); font-size:0.9rem;">ВІДЕО ЕТАПУ</h3>
                <div style="display:flex; gap:15px; flex-wrap:wrap;">
                    ${stage.videos.map(v => `
                        <div style="width:320px; background:#000; border-radius:10px; overflow:hidden; border:2px solid #333;">
                            <video controls style="width:100%; display:block;"><source src="video/${v}" type="video/mp4"></video>
                        </div>`).join('')}
                </div>
            </div>` : ''}
        `;
        board.appendChild(stageDiv);
    });
}

function openCarModal(imgSrc, title, details) {
    const modal = document.getElementById("carModal");
    document.getElementById("bigCarImg").src = imgSrc.startsWith('img/') ? imgSrc : `img/${imgSrc}`;
    document.getElementById("modal-caption").innerHTML = `<b>${imgSrc.split('.')[0]}</b><br>${title}<br>${details}`;
    modal.style.display = "flex";
}
function closeModal() { document.getElementById("carModal").style.display = "none"; }
function exportDatabase() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.json';
    link.click();
}
function importDatabase(event) {
    const reader = new FileReader();
    reader.onload = (e) => { db = JSON.parse(e.target.result); saveData(); updateAdminUI(); alert('Дані імпортовано!'); };
    reader.readAsText(event.target.files[0]);
}
function resetEverything() { if(confirm('Видалити все?')) { localStorage.clear(); location.reload(); } }

initDB();