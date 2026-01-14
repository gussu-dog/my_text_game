// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzP0LhD-PiPMDsu4elQJj80FqCZ2C6MGeZchxKOx-FVREgtriWyLAAc6KI3XQ_JsPTOZQ/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];
let currentCharName = "";
let currentGid = ""; // resetChat 기능을 위해 추가
let currentProfileImg = "";

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

    let displayTime = time || (!isLoadingSave ? getCurrentTime() : "");

    // 1. 구분선 처리
    if (text.trim().startsWith("---")) {
        let dividerText = text.replace("---", "").trim();
        // 만약 내용 없이 '---'만 있다면 오늘 날짜 생성
        if (dividerText === "") {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            dividerText = now.toLocaleDateString('ko-KR', options); // 예: 2024년 5월 20일 월요일
        }
        
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.innerHTML = `<span>${dividerText}</span>`;
        chatWindow.appendChild(divider);

        if (!isLoadingSave && currentCharName) {
            let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
            // 구분선은 sender를 'system' 혹은 'divider'로 표시해서 저장
            saveData.messages.push({ text: `---${dividerText}`, sender: 'system', time: displayTime });
            localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
        }

        setTimeout(() => { chatWindow.scrollTop = chatWindow.scrollHeight; }, 10);
        return;
    }
    // --- [2] 텍스트와 이미지가 모두 없으면 메시지 생성 안 함 (프로필 방지) ---
    if (!text && !imageUrl) return;

    const wrapper = document.createElement('div');
    wrapper.className = sender === 'me' ? 'message-wrapper me' : 'message-wrapper';
    
    // 3. 상대방일 때만 프로필 이미지 추가
    if (sender !== 'me') {
    const profileImg = document.createElement('img');
    profileImg.className = 'chat-profile-img';
    // currentProfileImg가 없을 때를 대비해 기본 이미지나 투명 이미지를 넣는 것이 안전합니다.
    profileImg.src = currentProfileImg ? currentProfileImg.replace(/^\*/, "") : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"; 
    wrapper.appendChild(profileImg);
} else {
    // 내 메시지일 때는 프로필 자리를 비워두거나 래퍼에 클래스를 추가해서 정렬을 돕습니다.
    wrapper.classList.add('me'); 
}

    // 4. 말풍선 컨테이너 생성
    const bubbleContainer = document.createElement('div');
bubbleContainer.className = 'bubble-container';

    // 이미지 메시지 처리 (O열 데이터)
    if (imageUrl) {
    console.log("🎨 현재 출력 시도하는 이미지 주소:", imageUrl); // 이 줄을 추가하세요!
    const imgElement = document.createElement('img');
    imgElement.src = imageUrl.trim(); // 양옆 공백 제거 추가
    imgElement.className = 'chat-image';
    
    // 이미지가 로드 실패했을 때 로그 찍기
    imgElement.onerror = () => console.error("❌ 이미지 로드 실패! 주소 확인:", imageUrl);
    
    bubbleContainer.appendChild(imgElement);
}

    // 텍스트 메시지 처리
    if (text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
        msgDiv.innerHTML = text.replace(/\\n/g, '<br>');
        bubbleContainer.appendChild(msgDiv);
    }

    // 시간 추가
    const timeSpan = document.createElement('span');
    timeSpan.className = 'message-time';
    timeSpan.innerText = displayTime;
    bubbleContainer.appendChild(timeSpan);

    wrapper.appendChild(bubbleContainer);
    chatWindow.appendChild(wrapper);

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
function startChat(name, gid, photo) {
    currentCharName = name;
    currentGid = gid;
    currentProfileImg = photo;
    
    const headerName = document.getElementById('header-name');
    const listPage = document.getElementById('list-page');
    const gamePage = document.getElementById('game-page');
    
    if(headerName) headerName.innerText = name;
    if(listPage) listPage.style.display = 'none';
    if(gamePage) gamePage.style.display = 'flex'; 
    
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = '';
    document.getElementById('options').innerHTML = '';
    
    loadStory(`${baseSheetUrl}${gid}`).then(() => {
        // 1. 고정 히스토리 로드 (ID < 0)
        if (historyData.length > 0) {
            historyData.forEach(h => {
                let hImg = h.imageUrl || "";
                if (hImg.startsWith('*')) hImg = ""; 
                addMessage(h.text, h.sender, true, h.time, hImg);
            });
        }

        // 2. 세이브 데이터 확인
        const saved = localStorage.getItem(getSaveKey(name));
        
        if (saved) {
            const parsed = JSON.parse(saved);
            // 저장된 메시지가 있으면 화면에 그리기
            if (parsed.messages && parsed.messages.length > 0) {
                parsed.messages.forEach(m => {
                    let mImg = m.imageUrl || "";
                    if (mImg.startsWith('*')) mImg = ""; // 별표 예외처리만 적용
                    addMessage(m.text, m.sender, true, m.time, mImg);
                });
                // 마지막 지점의 옵션 보여주기
                showOptions(parsed.lastSceneId);
            } else {
                // 세이브 데이터는 있는데 메시지가 비어있는 예외 상황
                if (storyData["1"]) playScene("1");
            }
        } else {
            // 3. 세이브가 아예 없는 '완전 처음'인 경우 -> 1번 장면 실행
            if (storyData["1"]) {
                playScene("1");
            } else {
                console.error("ID 1번 장면을 찾을 수 없습니다. 시트를 확인하세요.");
            }
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
            const imageUrl = (cols[14] || "").trim().replace(/^"|"$/g, ""); // 앞뒤 공백과 큰따옴표 제거
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
            let profilePic = char.photo ? char.photo.replace(/^\*/, "") : "";
            const imgHtml = profilePic ? `<img src="${profilePic}" class="profile-img">` : `<div class="profile-placeholder"></div>`;
            item.innerHTML = `<div class="profile-group">${imgHtml}<span>${char.name}</span></div><span class="arrow">〉</span>`;
            item.onclick = () => startChat(char.name, char.gid, char.photo);
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

    // --- [수정] 텍스트가 존재하고, 구분선(---)이 아닐 때만 '입력 중' 표시 ---
    const isDivider = scene.text && scene.text.trim().startsWith("---");

    if ((scene.text || scene.imageUrl) && !isDivider) {
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
} else {
        addMessage(scene.text || "", 'bot', false, scene.time, scene.imageUrl || "");
        // 텍스트/이미지가 아예 없으면 딜레이 없이 바로 선택지 노출
        showOptions(sceneId);
    }
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
                let nextId = opt.next;
                const nextScene = storyData[nextId];

                const isNextDivider = nextScene && nextScene.text && nextScene.text.trim().startsWith("---");

                if (nextScene && (nextScene.text || nextScene.imageUrl) && !isNextDivider) {
                    const typing = showTyping();
                    setTimeout(() => {
                        if(typing && typing.parentNode) typing.parentNode.removeChild(typing);
                        
                        // 확률 요소(가차) 체크
                        if (scene.triggerOpt === opt.index && scene.chanceNext) {
                            nextId = getGachaResult(scene.chanceNext, opt.next);
                        }
                        if (storyData[nextId]) playScene(nextId);
                    }, 1000);
                } else {
                    // 다음 장면이 텍스트/이미지 없는 선택지라면 바로 실행
                    if (storyData[nextId]) playScene(nextId);
                }
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





