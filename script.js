let db = null;
let selectedStageId = null;

async function initDB() {
    const localData = localStorage.getItem('carreraDB');
    if (localData) {
        db = JSON.parse(localData);
    } else {
        try {
            const response = await fetch('data.json');
            db = response.ok ? await response.json() : { stages: [], pilots_directory: [] };
        } catch (e) { db = { stages: [], pilots_directory: [] }; }
    }
    if (!db.pilots_directory) db.pilots_directory = [];
    if (document.getElementById('leaderboard')) renderMainPage();
    if (document.getElementById('stageSelector')) updateAdminUI();
}

const saveData = () => localStorage.setItem('carreraDB', JSON.stringify(db));
const getStageById = (id) => db.stages.find(s => s.id == id);

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
    } else { alert('Невірний логін або пароль!'); }
}

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
            <div class="video-section">
                <h3 style="color:var(--gold); font-size:0.9rem;">ВІДЕО ЕТАПУ</h3>
                <div class="video-grid">
                    ${stage.videos.map(v => `<div class="video-item"><video controls style="width:100%;"><source src="video/${v}" type="video/mp4"></video></div>`).join('')}
                </div>
            </div>` : ''}
        `;
        board.appendChild(stageDiv);
    });
}

function clearAllData() {
    if (confirm("ВИ ВПЕВНЕНІ? Це видалить всі етапи та результати!")) {
        db.stages = [];
        saveData();
        location.reload();
    }
}

// Адмін функції
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
                <span style="width:120px; color:#333;"><b>${p.name}</b></span>
                <input type="number" id="place-${i}" placeholder="Місце" style="width:60px">
                <input type="text" id="car-${i}" placeholder="car.jpg" style="flex:1">
            </div>`).join('');
        
        const videoList = document.getElementById('admin-video-list');
        if (videoList) {
            videoList.innerHTML = (stage.videos || []).map((v, i) => `
                <div style="display:flex; justify-content:space-between; margin-top:5px; background:#f9f9f9; padding:5px; border:1px solid #ddd; color:#333;">
                    <span>${v}</span><button onclick="removeVideo(${i})" style="color:red; border:none; background:none;">✖</button>
                </div>`).join('');
        }
    }
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

function openCarModal(imgSrc, title, details) {
    const modal = document.getElementById("carModal");
    document.getElementById("bigCarImg").src = imgSrc.startsWith('img/') ? imgSrc : `img/${imgSrc}`;
    document.getElementById("modal-caption").innerHTML = `<b>${imgSrc.split('.')[0]}</b><br>${title}<br>${details}`;
    modal.style.display = "flex";
}
function closeModal() { document.getElementById("carModal").style.display = "none"; }

initDB();