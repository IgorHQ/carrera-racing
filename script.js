let db = null;
let selectedStageId = null;

// ІНІЦІАЛІЗАЦІЯ
async function initDB() {
    const localData = localStorage.getItem('carreraDB');
    if (localData) {
        db = JSON.parse(localData);
        startApp();
    } else {
        showInitChoice();
    }
}

function showInitChoice() {
    const board = document.getElementById('leaderboard');
    if (!board) return;
    board.innerHTML = `
        <div style="text-align:center; padding:50px; background:rgba(255,255,255,0.05); border-radius:20px; border:2px dashed #444; margin: 20px;">
            <h2>База даних не знайдена</h2>
            <div style="display:flex; gap:20px; justify-content:center; margin-top:20px; flex-wrap:wrap;">
                <button onclick="setupNewDB()" style="padding:15px 25px; background:var(--carrera-red); color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">Почати новий сезон</button>
                <button onclick="loadFromGitHub()" style="padding:15px 25px; background:#444; color:white; border:none; border-radius:10px; cursor:pointer; font-weight:bold;">Завантажити з GitHub</button>
            </div>
        </div>`;
}

function startApp() {
    if (document.getElementById('leaderboard')) renderMainPage();
    if (document.getElementById('stageSelector')) updateAdminUI();
}

const saveData = () => localStorage.setItem('carreraDB', JSON.stringify(db));
const getStageById = (id) => db.stages.find(s => s.id == id);

function setupNewDB() {
    db = { 
        stages: [], 
        pilots_directory: [
            { name: "Danylo", photo: "driver1.jpg" },
            { name: "Igor", photo: "driver2.jpg" },
            { name: "Volodymyr", photo: "driver3.jpg" },
            { name: "Vasyl", photo: "driver4.jpg" }
        ] 
    };
    saveData();
    location.reload();
}

// async function loadFromGitHub() {
//     const url = 'https://raw.githubusercontent.com/IgorHQ/carrera-racing/refs/heads/main/data.json';
//     try {
//         const response = await fetch(url);
//         if (response.ok) {
//             db = await response.json();
//             saveData();
//             location.reload();
//         } else { alert("Помилка завантаження!"); }
//     } catch (e) { alert("Помилка мережі!"); }
// }

async function loadFromGitHub() {
    const url = 'https://raw.githubusercontent.com/IgorHQ/carrera-racing/refs/heads/main/data.json';
    try {
        const response = await fetch(url);
        if (response.ok) {
            const githubData = await response.json();
            
            // Перевірка, чи отримані дані мають правильну структуру
            if (githubData && githubData.stages) {
                db = githubData;
                saveData(); // Збереження в localStorage
                alert("Дані успішно завантажені з хмари!");
                location.reload();
            } else {
                alert("Формат файлу на GitHub невірний!");
            }
        } else { 
            alert("Помилка завантаження: " + response.status); 
        }
    } catch (e) { 
        console.error(e);
        alert("Помилка мережі або доступу до GitHub!"); 
    }
}

// --- АДМІНКА ---
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
    } else { alert('Невірний пароль!'); }
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
                <input type="number" id="place-${i}" placeholder="Місце" style="width:60px">
                <input type="text" id="car-${i}" placeholder="car.jpg" style="flex:1">
            </div>`).join('');
    }
}

function createNewStage() {
    const name = document.getElementById('newTrackName').value.trim();
    const img = document.getElementById('newTrackImg').value.trim() || 'track1.png';
    if (!name) return alert("Введіть назву траси!");
    
    const newStage = {
        id: Date.now(),
        trackName: name,
        trackImg: img,
        racesCount: 0,
        videos: [],
        pilots: db.pilots_directory.map(p => ({
            ...p, totalPoints: 0, carPhotos: [], pointsHistory: []
        }))
    };
    db.stages.push(newStage);
    saveData();
    location.reload();
}

function saveRace() {
    const stage = getStageById(selectedStageId);
    stage.pilots.forEach((p, i) => {
        const place = parseInt(document.getElementById(`place-${i}`).value);
        const car = document.getElementById(`car-${i}`).value.trim() || 'car.jpg';
        if (!isNaN(place)) {
            const pts = (place === 1) ? 50 : Math.max(0, 50 - (place - 1) * 5);
            p.totalPoints += pts; p.pointsHistory.push(pts); p.carPhotos.push(car);
        }
    });
    stage.racesCount++; saveData(); updateAdminUI(); alert("Збережено!");
}

function deleteCurrentStage() {
    if (confirm("Видалити цей етап?")) {
        db.stages = db.stages.filter(s => s.id != selectedStageId);
        saveData(); location.reload();
    }
}

function clearAllData() {
    if (confirm("СТЕРТИ ВСЕ? Дані буде видалено з браузера.")) {
        localStorage.removeItem('carreraDB');
        db = null;
        location.reload();
    }
}

function addVideoToStage() {
    const stage = getStageById(selectedStageId);
    const v = document.getElementById('videoUrl').value.trim();
    if (v) {
        if (!stage.videos) stage.videos = [];
        stage.videos.push(v);
        saveData(); updateAdminUI(); document.getElementById('videoUrl').value = '';
    }
}

function exportDatabase() {
    const blob = new Blob([JSON.stringify(db, null, 2)], { type: "application/json" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'data.json';
    link.click();
}

// РЕНДЕРИНГ (index.html)
// function renderMainPage() {
//     const board = document.getElementById('leaderboard');
//     if (!board) return;
//     board.innerHTML = '';

//     const totals = {};
//     db.stages.forEach(s => s.pilots.forEach(p => totals[p.name] = (totals[p.name] || 0) + p.totalPoints));
//     const sorted = Object.entries(totals).map(([name, points]) => ({ name, points })).sort((a,b) => b.points - a.points);
    
//     const ob = document.getElementById('overall-leaderboard');
//     if (ob) {
//         ob.innerHTML = sorted.map((p, i) => `
//             <div class="standings-item ${i === 0 ? 'leader' : ''}"><span>${i+1}. ${p.name}</span><strong>${p.points}</strong></div>
//         `).join('');
//     }

//     [...db.stages].reverse().forEach(stage => {
//         const stageDiv = document.createElement('div');
//         stageDiv.className = 'stage-container';
        
//         const carWins = {};
//         stage.pilots.forEach(p => p.carPhotos.forEach((img, idx) => {
//             if (p.pointsHistory[idx] === 50) carWins[img] = (carWins[img] || 0) + 1;
//         }));
//         const maxWins = Math.max(...Object.values(carWins), 0);

//         stageDiv.innerHTML = `
//             <h2>${stage.trackName}</h2>
//             <div class="stage-info-row">
//                 <div class="track-block"><img src="img/${stage.trackImg}" class="stage-track-img"></div>
//                 <div class="stage-car-gallery">
//                     <div class="car-gallery-grid">
//                         ${Object.keys(carWins).map(img => {
//                             const isAbs = carWins[img] === stage.racesCount && stage.racesCount > 0;
//                             return `
//                             <div class="gallery-item ${isAbs ? 'absolute-champion' : (carWins[img] === maxWins ? 'top-car' : '')}">
//                                 <div class="car-win-badge">🏆 ${carWins[img]}</div>
//                                 <img src="img/${img}" class="gallery-car-img" onclick="openCarModal('${img}', 'Перемог: ${carWins[img]}', '${stage.trackName}')">
//                                 ${isAbs ? '<div class="absolute-label">ABS CHAMPION</div>' : ''}
//                             </div>`;
//                         }).join('')}
//                     </div>
//                 </div>
//             </div>
//             <div class="pilots-grid">${[...stage.pilots].sort((a,b)=>b.totalPoints - a.totalPoints).map((p, i) => {
//                 const carGroups = {};
//                 p.carPhotos.forEach((img, idx) => {
//                     if(!carGroups[img]) carGroups[img] = [];
//                     carGroups[img].push(idx+1);
//                 });
//                 return `
//                 <div class="pilot-card">
//                     <div class="rank">#${i+1}</div>
//                     <img src="img/${p.photo}" class="pilot-photo">
//                     <h3>${p.name}</h3>
//                     <p class="points">${p.totalPoints} pts</p>
//                     <div class="cars">
//                         ${Object.entries(carGroups).map(([img, races]) => `
//                             <div class="car-wrapper">
//                                 ${races.length > 1 ? `<div class="car-count-badge">${races.length}</div>` : ''}
//                                 <img src="img/${img}" class="car-mini" onclick="openCarModal('${img}', 'Пілот: ${p.name}', 'Заїзди: ${races.join(',')}')">
//                             </div>`).join('')}
//                     </div>
//                 </div>`;
//             }).join('')}</div>
//             ${stage.videos && stage.videos.length > 0 ? `
//                 <div class="video-grid">
//                     ${stage.videos.map(v => `<div class="video-item"><video controls style="width:100%;"><source src="video/${v}" type="video/mp4"></video></div>`).join('')}
//                 </div>` : ''}
//         `;
//         board.appendChild(stageDiv);
//     });
// }

// function openCarModal(imgSrc, title, details) {
//     const modal = document.getElementById("carModal");
//     if (!modal) return;
//     document.getElementById("bigCarImg").src = imgSrc.startsWith('img/') ? imgSrc : `img/${imgSrc}`;
//     document.getElementById("modal-caption").innerHTML = `<b>${imgSrc}</b><br>${title}<br>${details}`;
//     modal.style.display = "flex";
// }

function renderMainPage() {
    const board = document.getElementById('leaderboard');
    if (!board) return;
    board.innerHTML = '';

    // 1. Рахуємо загальний залік по всіх етапах
    const totals = {};
    db.stages.forEach(s => {
        s.pilots.forEach(p => {
            totals[p.name] = (totals[p.name] || 0) + p.totalPoints;
        });
    });

    const sorted = Object.entries(totals)
        .map(([name, points]) => ({ name, points }))
        .sort((a, b) => b.points - a.points);
    
    const ob = document.getElementById('overall-leaderboard');
    if (ob) {
        ob.innerHTML = sorted.map((p, i) => `
            <div class="standings-item ${i === 0 ? 'leader' : ''}">
                <span>${i + 1}. ${p.name}</span>
                <strong>${p.points}</strong>
            </div>
        `).join('');
    }

    // 2. Рендеримо кожен етап (від нових до старих)
    [...db.stages].reverse().forEach(stage => {
        const stageDiv = document.createElement('div');
        stageDiv.className = 'stage-container';
        
        // Збираємо статистику по ВСІХ авто на цьому етапі
        const carStats = {};
        stage.pilots.forEach(p => {
            p.carPhotos.forEach((img, idx) => {
                if (!carStats[img]) {
                    carStats[img] = { wins: 0, totalRaces: 0 };
                }
                carStats[img].totalRaces++;
                if (p.pointsHistory[idx] === 50) {
                    carStats[img].wins++;
                }
            });
        });

        const maxWins = Math.max(...Object.values(carStats).map(s => s.wins), 0);

        stageDiv.innerHTML = `
            <h2>${stage.trackName}</h2>
            <div class="stage-info-row">
                <div class="track-block">
                    <img src="img/${stage.trackImg}" class="stage-track-img">
                </div>
                <div class="stage-car-gallery">
                    <div class="car-gallery-grid">
                        ${Object.keys(carStats).map(img => {
                            const stats = carStats[img];
                            const isAbs = stats.wins === stage.racesCount && stage.racesCount > 0;
                            const isTop = stats.wins === maxWins && maxWins > 0;
                            
                            return `
                            <div class="gallery-item ${isAbs ? 'absolute-champion' : (isTop ? 'top-car' : '')}">
                                ${stats.wins > 0 ? `<div class="car-win-badge">🏆 ${stats.wins}</div>` : ''}
                                <img src="img/${img}" class="gallery-car-img" 
                                     onclick="openCarModal('${img}', 'Перемог: ${stats.wins}', 'Заїздів на етапі: ${stats.totalRaces}')">
                                ${isAbs ? '<div class="absolute-label">ABS CHAMPION</div>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>
            </div>

            <div class="pilots-grid">
                ${[...stage.pilots].sort((a, b) => b.totalPoints - a.totalPoints).map((p, i) => {
                    const carGroups = {};
                    p.carPhotos.forEach((img, idx) => {
                        if (!carGroups[img]) carGroups[img] = [];
                        carGroups[img].push(idx + 1);
                    });

                    return `
                    <div class="pilot-card">
                        <div class="rank">#${i + 1}</div>
                        <img src="img/${p.photo}" class="pilot-photo">
                        <h3>${p.name}</h3>
                        <p class="points">${p.totalPoints} pts</p>
                        <div class="cars">
                            ${Object.entries(carGroups).map(([img, races]) => `
                                <div class="car-wrapper">
                                    ${races.length > 1 ? `<div class="car-count-badge">${races.length}</div>` : ''}
                                    <img src="img/${img}" class="car-mini" 
                                         onclick="openCarModal('${img}', 'Пілот: ${p.name}', 'Заїзди: ${races.join(',')}')">
                                </div>`).join('')}
                        </div>
                    </div>`;
                }).join('')}
            </div>

            ${stage.videos && stage.videos.length > 0 ? `
                <div class="video-grid">
                    ${stage.videos.map(v => `
                        <div class="video-item">
                            <video controls style="width:100%;">
                                <source src="video/${v}" type="video/mp4">
                            </video>
                        </div>`).join('')}
                </div>` : ''}
        `;
        board.appendChild(stageDiv);
    });
}

function closeModal() { document.getElementById("carModal").style.display = "none"; }

initDB();