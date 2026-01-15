// 1. 설정 영역
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzP0LhD-PiPMDsu4elQJj80FqCZ2C6MGeZchxKOx-FVREgtriWyLAAc6KI3XQ_JsPTOZQ/exec"; 
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];
let currentCharName = "";
let currentGid = ""; 
let currentProfileImg = "";
let lastSender = "";
let lastTime = "";
let typingTimeout = null; // 실행 대기 중인 타이팅/메시지 출력을 담을 변수

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${ampm} ${hours}:${minutes}`;
}

function getSaveKey(charName) {
    return `game_save_${charName}`;
}

// [1] 타자기 효과용 함수
function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = "";
    return new Promise((resolve) => {
        function type() {
            if (i < text.length) {
                // 한 글자씩 추가 (줄바꿈 처리 포함)
                if (text.substr(i, 2) === "\\n") {
                    element.innerHTML += "<br>";
                    i += 2;
                } else {
                    element.innerHTML += text.charAt(i);
                    i++;
                }
                setTimeout(type, speed);
            } else {
                resolve();
            }
        }
        type();
    });
}

// 3. 메시지 추가 및 저장 (중복 및 괄호 오류 수정됨)
async function addMessage(text, sender, isLoadingSave = false, time = "", imageUrl = "", effect = "") {
    const chatWindow = document.getElementById('chat-window');
    if (!chatWindow) return;

    let displayTime = time || (!isLoadingSave ? getCurrentTime() : "");
    const isContinuation = (lastSender === sender && lastTime === displayTime && !text.startsWith("---"));

    // 1. 구분선 처리
    if (text.trim().startsWith("---")) {
        lastSender = "";
        lastTime = "";
        let dividerText = text.replace("---", "").trim();
        if (dividerText === "") {
            const now = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
            dividerText = now.toLocaleDateString('ko-KR', options);
        }
        
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.innerHTML = `<span>${dividerText}</span>`;
        chatWindow.appendChild(divider);

        if (!isLoadingSave && currentCharName) {
            let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
            saveData.messages.push({ text: `---${dividerText}`, sender: 'system', time: displayTime });
            localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
        }
        setTimeout(() => { chatWindow.scrollTop = chatWindow.scrollHeight; }, 10);
        return;
    }

    if (!text && !imageUrl) return;

    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender === 'me' ? 'me' : ''} ${isContinuation ? 'continuation' : ''}`;
    
    if (sender !== 'me' && !isContinuation) {
        const profileImg = document.createElement('img');
        profileImg.className = 'chat-profile-img';
        profileImg.src = currentProfileImg ? currentProfileImg.replace(/^\*/, "") : "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        wrapper.appendChild(profileImg);
    }

    const bubbleContainer = document.createElement('div');
    bubbleContainer.className = 'bubble-container';

    // 이미지 처리
    if (imageUrl) {
        let cleanImgUrl = imageUrl.trim();
        // 주소가 '*'로 시작하면 이미지를 아예 생성하지 않음 (깨짐 방지)
        if (cleanImgUrl !== "" && !cleanImgUrl.startsWith('*')) {
        const imgElement = document.createElement('img');
        imgElement.src = cleanImgUrl;
        imgElement.className = 'chat-image';
        bubbleContainer.appendChild(imgElement);
    }
    }

    // 텍스트 처리
    if (text) {
        const msgDiv = document.createElement('div');
        msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
        
        if (effect === 'horror') msgDiv.classList.add('horror-text');
        if (effect === 'shake') msgDiv.classList.add('shake-text');
        if (effect === 'glitch') {
        msgDiv.classList.add('glitch-text');
        msgDiv.setAttribute('data-text', text.replace(/\\n/g, ' '));
    }
        bubbleContainer.appendChild(msgDiv);
        
        // ✨ 타자기 효과 적용 (L열에 'type'이라고 적거나 horror일 때 자동 적용)
        if (!isLoadingSave && (effect === 'type' || effect === 'horror')) {
            await typeWriter(msgDiv, text, effect === 'horror' ? 150 : 50);
        } else {
            msgDiv.innerHTML = text.replace(/\\n/g, '<br>');
        }
    }

    const timeSpan = document.createElement('span');
timeSpan.className = 'message-time';
timeSpan.innerText = displayTime;
bubbleContainer.appendChild(timeSpan);

wrapper.appendChild(bubbleContainer);

    chatWindow.appendChild(wrapper);
    
    if (isContinuation) {
        const allWrappers = chatWindow.querySelectorAll('.message-wrapper');
        // 이제 allWrappers.length - 1 이 방금 추가한 '나'입니다.
        // i = allWrappers.length - 2 부터 위로 훑으며 숨깁니다.
        for (let i = allWrappers.length - 2; i >= 0; i--) {
            const prevWrapper = allWrappers[i];
            const isSameSender = prevWrapper.classList.contains('me') === (sender === 'me');
            const prevTimeElement = prevWrapper.querySelector('.message-time');
            
            if (isSameSender && prevTimeElement && prevTimeElement.innerText === displayTime) {
                prevTimeElement.style.setProperty('display', 'none', 'important');
            } else {
                break; 
            }}
    }
    
    // 현재 정보를 마지막 정보로 업데이트
    lastSender = sender;
    lastTime = displayTime;

    setTimeout(() => { chatWindow.scrollTop = chatWindow.scrollHeight; }, 10);

    if (!isLoadingSave && currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.messages.push({ 
        text, 
        sender, 
        time: displayTime, 
        imageUrl: imageUrl,
        effect: effect // 이 부분이 핵심!
    });
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
    }
}

// 5. 대화 시작
function startChat(name, gid, photo) {
    lastSender = ""; // 초기화
    lastTime = "";   // 초기화
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
    
    loadStory(`${baseSheetUrl}${gid}`).then(async () => {
        if (historyData.length > 0) {
            for (const h of historyData) {
                let hImg = h.imageUrl || "";
                if (hImg.startsWith('*')) hImg = ""; 
                await addMessage(h.text, h.sender, true, h.time, hImg, h.effect || "");
            });
        }

        const saved = localStorage.getItem(getSaveKey(name));
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.messages && parsed.messages.length > 0) {
                for (const m of parsed.messages) {
                    let mImg = m.imageUrl || "";
                    if (mImg.startsWith('*')) mImg = ""; 
                    await addMessage(m.text, m.sender, true, m.time, mImg, m.effect || "");
                });
                showOptions(parsed.lastSceneId);
            } else {
                if (storyData["1"]) playScene("1");
            }
        } else {
            if (storyData["1"]) playScene("1");
        }
    }).catch(err => {
        console.error("스토리 로드 중 에러 발생:", err);
    });
}

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
                const effectValue = (cols[11] || "").trim().toLowerCase();
                const imageUrl = (cols[14] || "").trim();
                if (id < 0) {
                    // ✨ 과거 기록 데이터 저장
                    historyData.push({ 
                        id: id, 
                        text: cols[1], 
                        sender: cols[2] === 'me' ? 'me' : 'bot', 
                        time: timeValue, 
                        imageUrl: imageUrl,
                        effect: effectValue 
                    });
                } else {
                    const scene = { 
            text: cols[1], 
            options: [], 
            autoNext: cols[3], 
            time: timeValue, 
            effect: effectValue, // ✨ 이펙트 저장
            imageUrl: imageUrl, 
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
        historyData.sort((a, b) => a.id - b.id);
    } catch (e) { 
        console.error("데이터 로드 실패:", e);
    }
}

async function loadCharacterList() {
    const spinner = document.getElementById('loading-spinner');
    const listDiv = document.getElementById('character-list');
    const listPage = document.getElementById('list-page');
    try {
        const response = await fetch(appsScriptUrl);
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
        console.error("캐릭터 목록 오류:", e);
        if(spinner) spinner.innerHTML = "<p style='color:white;'>목록 로드 실패.</p>";
    }
}

async function playScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    if (scene.effect === 'flash') {
        const frame = document.querySelector('.phone-frame');
        frame.classList.add('flash-effect');
        setTimeout(() => frame.classList.remove('flash-effect'), 500);
    }

    if (currentCharName) {
        let saveData = JSON.parse(localStorage.getItem(getSaveKey(currentCharName))) || { messages: [], lastSceneId: "1" };
        saveData.lastSceneId = sceneId;
        localStorage.setItem(getSaveKey(currentCharName), JSON.stringify(saveData));
    }

    const isDivider = scene.text && scene.text.trim().startsWith("---");

    // 공통 이미지 가공 함수
    const getCleanImg = (url, id) => {
        if (!url) return "";
        let trimmed = url.trim();
        if (trimmed.startsWith('*') || id === "1") return "";
        return trimmed;
    };

    if ((scene.text || scene.imageUrl) && !isDivider) {
        const typing = showTyping();
        const randomDelay = Math.floor(Math.random() * 1000) + 800;

        if (typingTimeout) clearTimeout(typingTimeout);
        
        typingTimeout = setTimeout(() => {
            if(typing && typing.parentNode) typing.parentNode.removeChild(typing);
            let displayImg = scene.imageUrl || "";
            displayImg = displayImg.trim();
            if (displayImg.startsWith('*') || sceneId === "1") {
        displayImg = ""; 
    }
            addMessage(scene.text || "", 'bot', false, scene.time, displayImg, scene.effect);
            showOptions(sceneId);
            typingTimeout = null;
        }, randomDelay);
    } else {
        let displayImg = getCleanImg(scene.imageUrl, sceneId);
        addMessage(scene.text || "", 'bot', false, scene.time, displayImg, scene.effect);
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
    
// [1] 선택지가 없는 장면 (자동 진행)
    if (!scene || !scene.options || scene.options.length === 0) {
        if (scene && (scene.autoNext || scene.chanceNext)) {
            let nextId = scene.autoNext;
            
            // 트리거가 '0'이면 사용자가 모르게 뒤에서 주사위를 굴림
            if (scene.triggerOpt === "0" && scene.chanceNext) {
                nextId = getGachaResult(scene.chanceNext, scene.autoNext);
            }
            
            if (nextId) setTimeout(() => playScene(nextId), 800);
        }
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

                // 선택지 기반 확률 트리거 체크 (사용자가 누른 번호와 트리거 번호가 같을 때)
                if (scene.triggerOpt === opt.index && scene.chanceNext) {
                    nextId = getGachaResult(scene.chanceNext, opt.next);
                }

                const nextScene = storyData[nextId];
                if (!nextScene) return;
                const isNextDivider = nextScene && nextScene.text && nextScene.text.trim().startsWith("---");

                if (nextScene && (nextScene.text || nextScene.imageUrl) && !isNextDivider) {
                    const typing = showTyping();
                    setTimeout(() => {
                        if(typing && typing.parentNode) typing.parentNode.removeChild(typing);
                            playScene(nextId);
                    }, 1000);
                } else {
                    playScene(nextId);
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

const backBtn = document.getElementById('back-btn');
if(backBtn) {
    backBtn.onclick = () => {
        // ✨ 1. 현재 예약된 채팅 출력 취소
        if (typingTimeout) {
            clearTimeout(typingTimeout);
            typingTimeout = null;
        }

        // ✨ 2. 화면에 떠있는 '입력 중...' 말풍선 강제 삭제
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
        document.getElementById('game-page').style.display = 'none';
        document.getElementById('list-page').style.display = 'flex';
        currentCharName = "";
    };
}

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

document.addEventListener('DOMContentLoaded', () => {
    loadCharacterList();
});







