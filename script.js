// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbxQhVBD0X9e_A3pFZfZP8BH8e9fxZ09BnrwPyq-mcW_9qKRq_8KilP-fJLukOsuDWYPBA/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];

async function loadCharacterList() {
    const spinner = document.getElementById('loading-spinner');
    const listDiv = document.getElementById('character-list');

    try {
        const response = await fetch(appsScriptUrl);
        const characters = await response.json();
        
        listDiv.innerHTML = '';

        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'character-item';
            
            // 프로필 사진 추가
            const imgHtml = char.photo 
                ? `<img src="${char.photo}" class="profile-img">` 
                : `<div class="profile-placeholder"></div>`;
            
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

        // 로딩 숨기고 목록 표시
        spinner.style.display = 'none';
        listDiv.style.display = 'block';

    } catch (e) {
        spinner.innerHTML = "<p>목록을 불러오지 못했습니다.</p>";
        console.error(e);
    }
}

// 대화 시작
function startChat(name, gid) {
    document.getElementById('header-name').innerText = name;
    document.getElementById('list-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    
    storyData = {};
    historyData = [];
    document.getElementById('chat-window').innerHTML = '';
    document.getElementById('options').innerHTML = '';
    
    loadStory(`${baseSheetUrl}${gid}`);
}

// 시트 데이터 로드
async function loadStory(fullUrl) {
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
                if (id < 0) {
                    historyData.push({ id, text: cols[1], sender: cols[2] === 'me' ? 'me' : 'bot' });
                } else {
                    storyData[id.toString()] = scene;
                }
            }
        });

        historyData.sort((a, b) => a.id - b.id);
        historyData.forEach(h => addMessage(h.text, h.sender));
        if (storyData["1"]) playScene("1");
    } catch (e) { console.error("데이터 로드 실패:", e); }
}

// 메시지 추가
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerHTML = text.replace(/\\n/g, '<br>');
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 타이핑 중...
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

// 장면 실행
async function playScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    const typing = showTyping();
    setTimeout(() => {
        if(typing.parentNode) typing.parentNode.removeChild(typing);
        addMessage(scene.text, 'bot');
        showOptions(sceneId);
    }, 1000);
}

// 옵션 표시
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
                    if(typing.parentNode) typing.parentNode.removeChild(typing);
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

// 확률 계산
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

// 뒤로가기 버튼
document.getElementById('back-btn').onclick = () => {
    document.getElementById('game-page').style.display = 'none';
    document.getElementById('list-page').style.display = 'block';
};

// 시작 시 목록 로드
window.onload = loadCharacterList;


