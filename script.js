// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzP0LhD-PiPMDsu4elQJj80FqCZ2C6MGeZchxKOx-FVREgtriWyLAAc6KI3XQ_JsPTOZQ/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];
let currentCharName = ""; // 현재 대화 캐릭터 이름

// 세이브 키 생성
function getSaveKey(charName) {
    return `game_save_${charName}`;
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

// 3. 메시지 추가 및 저장
function addMessage(text, sender, isLoadingSave = false) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerHTML = text.replace(/\\n/g, '<br>');
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    if (!isLoadingSave && currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.messages.push({ text, sender });
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
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

// 5. 대화 시작 (데이터 로드 + 세이브 복구)
function startChat(name, gid) {
    currentCharName = name;
    document.getElementById('header-name').innerText = name;
    document.getElementById('list-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    
    document.getElementById('chat-window').innerHTML = '';
    document.getElementById('options').innerHTML = '';
    
    loadStory(`${baseSheetUrl}${gid}`).then(() => {
        const saved = localStorage.getItem(getSaveKey(name));
        if (saved) {
            const parsed = JSON.parse(saved);
            parsed.messages.forEach(m => addMessage(m.text, m.sender, true));
            playScene(parsed.lastSceneId);
        } else {
            if (storyData["1"]) playScene("1");
        }
    });
}

// 6. 시트 데이터 로드
async function loadStory(fullUrl) {
    storyData = {}; 
    try {
        const response = await fetch(fullUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== "");
        
        lines.slice(1).forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            const id = parseInt(cols[0]);
            if (!isNaN(id)) {
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
        });
    } catch (e) { console.error("데이터 로드 실패:", e); }
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

// 시작
window.onload = loadCharacterList;

