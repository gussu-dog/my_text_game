// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzP0LhD-PiPMDsu4elQJj80FqCZ2C6MGeZchxKOx-FVREgtriWyLAAc6KI3XQ_JsPTOZQ/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];
let currentCharName = "";
let currentGid = ""; // resetChat 기능을 위해 추가

// 현재 시간을 '오후 2:30' 형식으로 반환하는 함수
function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0시를 12시로 표시
    
    return `${ampm} ${hours}:${minutes}`;
}

// 세이브 키 생성
function getSaveKey(charName) {
    return `game_save_${charName}`;
}

// 3. 메시지 추가 및 저장
function addMessage(text, sender, isLoadingSave = false, time = "", imageUrl = "") {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;

    // [추가] 시간이 비어있고, 세이브 데이터를 불러오는 중이 아닐 때만 현재 시간을 생성
    let displayTime = time;
    if (!displayTime && !isLoadingSave) {
        displayTime = getCurrentTime();
    }

    if (text.trim().startsWith("---")) {
        // ... (기존 구분선 처리 로직 유지) ...
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        const dividerText = text.replace("---", "").trim() || "구분선";
        divider.innerHTML = `<span>${dividerText}</span>`; 
        chatWindow.appendChild(divider);
        setTimeout(() => { chatWindow.scrollTop = chatWindow.scrollHeight; }, 10);
        return; // 구분선은 이미지/텍스트 메시지와 분리
    } 
    
    // 이미지와 텍스트를 함께, 또는 이미지/텍스트 단독으로 보내는 로직
    const isImageOnly = imageUrl && !text; // 이미지 링크만 있는 경우
    const isTextOnly = text && !imageUrl; // 텍스트 링크만 있는 경우
    const isCombined = text && imageUrl; // 둘 다 있는 경우

    if (isImageOnly || isCombined || isTextOnly) { // 어떤 메시지든 이 블록에서 처리
        const wrapper = document.createElement('div');
        wrapper.className = sender === 'me' ? 'message-wrapper me' : 'message-wrapper';

        // 이미지 전용 메시지의 경우 align-items를 조절하기 위한 wrapper 클래스 추가
        if (imageUrl) {
            wrapper.classList.add('image-message-wrapper'); 
            if (sender === 'me') {
                wrapper.classList.add('me');
            }
        }

        // 이미지 엘리먼트 생성 및 추가
        if (imageUrl) {
            const imgElement = document.createElement('img');
            imgElement.src = imageUrl;
            imgElement.className = 'chat-image';
            wrapper.appendChild(imgElement);
        }

        // 텍스트 엘리먼트 생성 및 추가
        if (text) {
            const msgDiv = document.createElement('div');
            msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
            msgDiv.innerHTML = text.replace(/\\n/g, '<br>');
            wrapper.appendChild(msgDiv);
        }

        // 시간 엘리먼트 생성 및 추가
        const timeSpan = document.createElement('span');
        timeSpan.className = 'message-time';
        timeSpan.innerText = displayTime;
        wrapper.appendChild(timeSpan);
        
        chatWindow.appendChild(wrapper);
    }

    setTimeout(() => {
        chatWindow.scrollTop = chatWindow.scrollHeight;
    }, 10);

    // 세이브 데이터 저장 (imageUrl도 함께 저장)
    if (!isLoadingSave && currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.messages.push({ text, sender, time: displayTime, imageUrl: imageUrl }); 
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
    }
}

// 5. 대화 시작
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
        historyData.forEach(h => {
            let hImg = h.imageUrl || "";
            if (hImg.startsWith('*') || h.id === 1) hImg = ""; // 별표 예외 처리
            addMessage(h.text, h.sender, true, h.time, hImg);
        }); 

        const saved = localStorage.getItem(getSaveKey(name));
        if (saved) {
            const parsed = JSON.parse(saved);
            parsed.messages.forEach(m => {
                let mImg = m.imageUrl || "";
                if (mImg.startsWith('*') || (index === 0 && parsed.messages.length > 0)) { // 별표 예외 처리
                    if (mImg.startsWith('*')) mImg = "";
                    if (index === 0) mImg = "";
                }
                addMessage(m.text, m.sender, true, m.time, mImg);
            });
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
                const timeValue = cols[10] || "";
                // [추가] O열(15번째, 인덱스 14)에서 이미지 URL을 가져옵니다.
            const imageUrl = cols[14] || "";
                if (id < 0) {
                    historyData.push({ id: id, text: cols[1], sender: cols[2] === 'me' ? 'me' : 'bot', time: timeValue, imageUrl: imageUrl });
                } else {
                    const scene = { text: cols[1], options: [], autoNext: cols[3], time: timeValue, imageUrl: imageUrl, triggerOpt: cols[12], chanceNext: cols[13] };
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
        let displayImg = scene.imageUrl || "";
        if (displayImg.startsWith('*') || sceneId === "1") {
            displayImg = ""; 
        }
        addMessage(scene.text, 'bot', false, scene.time, displayImg);
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
            addMessage(opt.label, 'me', false, "", "");
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










