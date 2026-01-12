// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzP0LhD-PiPMDsu4elQJj80FqCZ2C6MGeZchxKOx-FVREgtriWyLAAc6KI3XQ_JsPTOZQ/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = []; // 과거 기록(-ID) 저장용
let currentCharName = "";

// 세이브 키 생성
function getSaveKey(charName) {
    return `game_save_${charName}`;
}

// 3. 메시지 추가 및 저장
function addMessage(text, sender, isLoadingSave = false) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerHTML = text.replace(/\\n/g, '<br>');
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // 세이브 로드 중이 아닐 때만 로컬 저장소에 추가
    if (!isLoadingSave && currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.messages.push({ text, sender });
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
    }
}

// 5. 대화 시작 (데이터 로드 + 과거 기록 + 세이브 복구)
function startChat(name, gid) {
    currentCharName = name;
    document.getElementById('header-name').innerText = name;
    document.getElementById('list-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    
    document.getElementById('chat-window').innerHTML = '';
    document.getElementById('options').innerHTML = '';
    
    loadStory(`${baseSheetUrl}${gid}`).then(() => {
        const saved = localStorage.getItem(getSaveKey(name));
        
        // 1. 시트의 -ID 과거 기록 먼저 출력
        historyData.forEach(h => addMessage(h.text, h.sender, true));

        if (saved) {
            const parsed = JSON.parse(saved);
            // 2. 세이브된 진행 내역 출력 (addMessage에 true 전달하여 중복 저장 방지)
            parsed.messages.forEach(m => addMessage(m.text, m.sender, true));
            
            // 3. [수정] 마지막 대화 중복 방지: 
            // 마지막 대화가 이미 화면에 그려졌으므로, playScene 대신 옵션만 표시합니다.
            showOptions(parsed.lastSceneId);
        } else {
            // 4. 처음 시작인 경우에만 1번 실행
            if (storyData["1"]) playScene("1");
        }
    });
}

// 6. 시트 데이터 로드 (과거 기록 복구 로직 포함)
async function loadStory(fullUrl) {
    storyData = {}; 
    historyData = []; // 초기화
    try {
        const response = await fetch(fullUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== "");
        
        lines.slice(1).forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            const id = parseInt(cols[0]);
            if (!isNaN(id)) {
                if (id < 0) {
                    // 과거 기록(-ID) 처리
                    historyData.push({ 
                        id: id, 
                        text: cols[1], 
                        sender: cols[2] === 'me' ? 'me' : 'bot' 
                    });
                } else {
                    // 일반 시나리오 처리
                    const scene = { 
                        text: cols[1], 
                        options: [], 
                        autoNext: cols[3],
                        triggerOpt: cols[12], 
                        chanceNext: cols[13]
                    };
                    for (let i = 4; i <= 9; i += 2) { 
                        if (cols[i]) {
                            scene.options.push({ index: ((i-4) / 2 + 1).toString(), label: cols[i], next: cols[i+1] }); 
                        }
                    }
                    storyData[id.toString()] = scene;
                }
            }
        });
        // -ID 순서대로 정렬 (예: -10, -9, -8...)
        historyData.sort((a, b) => a.id - b.id);
    } catch (e) { console.error("데이터 로드 실패:", e); }
}

// 2. 캐릭터 목록 로드
async function loadCharacterList() {
    const spinner = document.getElementById('loading-spinner');
    const listDiv = document.getElementById('character-list');

    try {
        console.log("목록 불러오는 중...");
        const response = await fetch(appsScriptUrl);
        const characters = await response.json();
        
        listDiv.innerHTML = '';
        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'character-item';
            const imgHtml = char.photo ? `<img src="${char.photo}" class="profile-img">` : `<div class="profile-placeholder"></div>`;
            
            item.innerHTML = `
                <div class="profile-group">
                    ${imgHtml}
                    <span>${char.name}</span>
                </div>
                <span class="arrow">〉</span>
            `;
            item.onclick = () => startChat(char.name, char.gid);
            listDiv.appendChild(item);
        });

        spinner.style.display = 'none';
        listDiv.style.display = 'block';
    } catch (e) {
        spinner.innerHTML = "<p>목록 로드 실패. 앱스 스크립트 설정을 확인하세요.</p>";
        console.error("캐릭터 목록 오류:", e);
    }
}

// 4. 장면 실행 및 세이브 포인트 저장
async function playScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    if (currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.lastSceneId = sceneId;
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
    }

    const typing = showTyping();
    setTimeout(() => {
        if(typing && typing.parentNode) typing.parentNode.removeChild(typing);
        addMessage(scene.text, 'bot');
        showOptions(sceneId);
    }, 1000);
}

// 7. UI 및 옵션 로직
function showTyping() {
    const chatWin = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWin.appendChild(typingDiv);
    chatWin.scrollTop = chatWin.scrollHeight;
    return typingDiv;
}

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';
    
    if (!scene || !scene.options || scene.options.length === 0) {
        if (scene.autoNext) setTimeout(() => playScene(scene.autoNext), 800);
        return;
    }

    scene.options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt.label;
        button.className = 'option-btn';
        button.onclick = () => {
            addMessage(opt.label, 'me');
            optionsElement.innerHTML = '';
            setTimeout(() => {
                const typing = showTyping();
                setTimeout(() => {
                    if(typing && typing.parentNode) typing.parentNode.removeChild(typing);
                    let nextId = opt.next;
                    if (scene.triggerOpt === opt.index && scene.chanceNext) {
                        nextId = getGachaResult(scene.chanceNext, opt.next);
                    }
                    if (storyData[nextId]) playScene(nextId);
                }, 1000);
            }, 500);
        };
        optionsElement.appendChild(button);
    });
}

function getGachaResult(chanceString, defaultNext) {
    if (!chanceString || !chanceString.includes(':')) return defaultNext;
    const pools = chanceString.split(',').map(p => p.trim());
    const dice = Math.random() * 100;
    let cumulativeProbability = 0;
    for (let pool of pools) {
        const [id, prob] = pool.split(':');
        cumulativeProbability += parseFloat(prob);
        if (dice <= cumulativeProbability) return id.trim();
    }
    return defaultNext;
}

// 8. 뒤로가기 버튼
document.getElementById('back-btn').onclick = () => {
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('list-page').style.display = 'block';
    currentCharName = "";
};

// 캐릭터 대화 초기화 (선택 사항)
function resetChat(name) {
    if (confirm(`${name}님과의 대화 기록을 삭제하고 처음부터 시작할까요?`)) {
        localStorage.removeItem(getSaveKey(name));
        startChat(name, currentGid); // 새로 시작
    }
}

// 시작
window.onload = loadCharacterList;



