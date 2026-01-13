// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzP0LhD-PiPMDsu4elQJj80FqCZ2C6MGeZchxKOx-FVREgtriWyLAAc6KI3XQ_JsPTOZQ/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];
let currentCharName = "";
let currentGid = ""; // resetChat 기능을 위해 추가

// 세이브 키 생성
function getSaveKey(charName) {
    return `game_save_${charName}`;
}

// 3. 메시지 추가 및 저장
function addMessage(text, sender, isLoadingSave = false, time = "") {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;

    // 1. 구분선 처리 (text가 --- 로 시작하는 경우)
    if (text.trim() === "---") {
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.innerHTML = `<span>구분선/날짜</span>`; // 필요시 시트의 다음 컬럼 값을 넣어도 좋습니다.
        chatWindow.appendChild(divider);
    } else {

    const wrapper = document.createElement('div');
        wrapper.className = sender === 'me' ? 'message-wrapper me' : 'message-wrapper';
        
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerHTML = text.replace(/\\n/g, '<br>');

        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.innerText = time; // 시트에서 가져온 시간 표시

        wrapper.appendChild(msgDiv);
        wrapper.appendChild(timeSpan);
        chatWindow.appendChild(wrapper);
    
    // 브라우저가 화면을 갱신할 시간을 아주 잠깐(10ms) 준 뒤 스크롤
    setTimeout(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 10);
    // -----------------------

// 세이브 데이터 저장 (시간 정보도 함께 저장하도록 수정)
    if (!isLoadingSave && currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.messages.push({ text, sender, time }); 
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
    }
}

// 5. 대화 시작 (수정 버전)
function startChat(name, gid) {
    currentCharName = name;
    currentGid = gid; 
    
    const headerName = document.getElementById('header-name');
    const listPage = document.getElementById('list-page');
    const gamePage = document.getElementById('game-page');
    
    if(headerName) headerName.innerText = name;
    if(listPage) listPage.style.display = 'none';
    if(gamePage) gamePage.style.display = 'flex'; 
    
    document.getElementById('chat-window').innerHTML = '';
    document.getElementById('options').innerHTML = '';
    
    loadStory(`${baseSheetUrl}${gid}`).then(() => {
        // 기존 저장된 메시지 불러오기 (historyData 포함)
        historyData.forEach(h => addMessage(h.text, h.sender, true, h.time));

        const saved = localStorage.getItem(getSaveKey(name));
        if (saved) {
            const parsed = JSON.parse(saved);
            parsed.messages.forEach(m => addMessage(m.text, m.sender, true, m.time));
            showOptions(parsed.lastSceneId);
        } else {
            if (storyData["1"]) playScene("1");
        }
    }).catch(err => {
        console.error("스토리 로드 중 에러 발생:", err);
    });
}

// 6. 시트 데이터 로드
async function loadStory(fullUrl) {
    storyData = {}; 
    historyData = [];
    try {
        const response = await fetch(fullUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== "");
        
        lines.slice(1).forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            const id = parseInt(cols[0]);
            if (!isNaN(id)) {
                if (id < 0) {
                    historyData.push({ id: id, text: cols[1], sender: cols[2] === 'me' ? 'me' : 'bot', time: timeValue });
                } else {
                    const scene = { text: cols[1], options: [], autoNext: cols[3], time: timeValue, triggerOpt: cols[12], chanceNext: cols[13] };
                    for (let i = 4; i <= 9; i += 2) { 
                        if (cols[i]) {
                            scene.options.push({ index: ((i-4) / 2 + 1).toString(), label: cols[i], next: cols[i+1] }); 
                        }
                    }
                    storyData[id.toString()] = scene;
                }
            }
        });
        historyData.sort((a, b) => a.id - b.id);
    } catch (e) { 
        console.error("데이터 로드 실패:", e);
        alert("데이터를 가져오는 데 실패했습니다.");
    }
}

// 2. 캐릭터 목록 로드
async function loadCharacterList() {
    const spinner = document.getElementById('loading-spinner');
    const listDiv = document.getElementById('character-list');
    const listPage = document.getElementById('list-page');

    try {
        const response = await fetch(appsScriptUrl);
        if (!response.ok) throw new Error('네트워크 응답이 좋지 않습니다.');
        const characters = await response.json();
        
        listDiv.innerHTML = '';
        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'character-item';
            const imgHtml = char.photo ? `<img src="${char.photo}" class="profile-img">` : `<div class="profile-placeholder"></div>`;
            item.innerHTML = `<div class="profile-group">${imgHtml}<span>${char.name}</span></div><span class="arrow">〉</span>`;
            item.onclick = () => startChat(char.name, char.gid);
            listDiv.appendChild(item);
        });

        if(spinner) spinner.style.display = 'none';
        if(listPage) {
            listPage.style.setProperty('display', 'flex', 'important');
        }
    } catch (e) {
        if(spinner) spinner.innerHTML = "<p style='color:white;'>목록 로드 실패. 앱스 스크립트 설정을 확인하세요.</p>";
        console.error("캐릭터 목록 오류:", e);
    }
}

// 4. 장면 실행
async function playScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    if (currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.lastSceneId = sceneId;
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
    }

    const typing = showTyping();
    // 0.8초 ~ 1.8초 사이의 랜덤한 대기 시간 설정 (입력 중... 표시 시간)
    const randomDelay = Math.floor(Math.random() * 1000) + 800;
    setTimeout(() => {
        if(typing && typing.parentNode) typing.parentNode.removeChild(typing);
        addMessage(scene.text, 'bot', false, scene.time);
        showOptions(sceneId);
    }, randomDelay);
}

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
    if(!optionsElement) return;
    optionsElement.innerHTML = '';
    
    if (!scene || !scene.options || scene.options.length === 0) {
        if (scene && scene.autoNext) setTimeout(() => playScene(scene.autoNext), 800);
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
const backBtn = document.getElementById('back-btn');
if(backBtn) {
    backBtn.onclick = () => {
        document.getElementById('game-page').style.display = 'none';
        document.getElementById('list-page').style.display = 'flex';
        currentCharName = "";
    };
}

// 모든 세이브 데이터 삭제 함수
function clearAllSaves() {
    if (confirm("정말로 모든 캐릭터와의 대화 기록을 삭제할까요?")) {
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('game_save_')) {
                localStorage.removeItem(key);
            }
        });
        alert("모든 기록이 초기화되었습니다.");
        location.reload();
    }
}

// [수정] DOMContentLoaded를 사용하여 HTML이 다 읽힌 후 실행되도록 보장
document.addEventListener('DOMContentLoaded', () => {
    loadCharacterList();
});








