const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};
// 시간을 가져오는 유틸리티 함수
function getCurrentTime() {
    const now = new Date();
    return `${now.getHours() > 12 ? '오후' : '오전'} ${now.getHours() % 12 || 12}:${now.getMinutes().toString().padStart(2, '0')}`;
}

async function loadStory() {
    try {
        const response = await fetch(sheetUrl);
        const data = await response.text();
        const lines = data.split("\n").filter(l => l.trim() !== ""); 

        lines.slice(1).forEach(line => {
            const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/"/g, ""));
            if(cols[0]) {
                const id = cols[0];
                const scene = {
                    text: cols[1],
                    options: [],
                    triggerOpt: cols[12], 
                    chanceNext: cols[13], 
                    chanceRate: parseFloat(cols[14]) || 0 
                };
                for (let i = 2; i <= 10; i += 2) {
                    if (cols[i]) {
                        scene.options.push({ index: (i / 2).toString(), label: cols[i], next: cols[i+1] });
                    }
                }
                storyData[id] = scene;
            }
        });

        // --- 여기서부터가 수정된 부분입니다 ---
        const chatWindow = document.getElementById('chat-window');
        chatWindow.innerHTML = ''; // "메시지를 불러오는 중..." 문구를 삭제합니다.

        // 첫 번째 장면(ID: 1)의 메시지를 띄웁니다.
        if (storyData["1"]) {
            addMessage(storyData["1"].text, 'bot');
            showOptions("1");
        }
        // --------------------------------------

    } catch (e) { 
        console.error("데이터 로딩 실패:", e);
        document.getElementById('chat-window').innerText = "데이터를 가져오지 못했습니다.";
    }
}

// 메시지를 채팅창에 추가하는 함수
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    
    // sender가 'me'면 노란색(오른쪽), 'bot'이면 회색(왼쪽)
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerText = text;
    
    chatWindow.appendChild(msgDiv);
    
    // 새 메시지가 오면 자동으로 스크롤을 아래로 이동
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 타이핑 애니메이션을 말풍선 형태로 생성
function showTypingIndicator() {
    const chatWindow = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble'; // 상대방 말풍선 스타일 활용
    typingDiv.style.display = 'inline-flex';
    typingDiv.style.gap = '4px';
    typingDiv.style.alignItems = 'center';
    typingDiv.style.minWidth = '40px';
    typingDiv.style.minHeight = '15px';
    
    // 점 3개 추가
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    
    chatWindow.appendChild(typingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return typingDiv;
}

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';

    scene.options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt.label;
        button.className = 'option-btn';
        button.onclick = () => {
            // 1. 내 메시지 전송
            addMessage(opt.label, 'me');
            optionsElement.innerHTML = '';

            // 2. 잠시 후 타이핑 표시 시작
            setTimeout(() => {
                const typingIndicator = showTypingIndicator();

                // 3. 타이핑 중인 척(1.5초) 하다가 진짜 메시지 출력
                setTimeout(() => {
                    typingIndicator.remove(); // 타이핑 표시 삭제
                    
                    const dice = Math.random() * 100;
                    if (scene.triggerOpt === opt.index && scene.chanceNext && dice < scene.chanceRate) {
                        addMessage(storyData[scene.chanceNext].text, 'bot');
                        showOptions(scene.chanceNext);
                    } else {
                        addMessage(storyData[opt.next].text, 'bot');
                        showOptions(opt.next);
                    }
                }, 1500); // 1.5초 동안 '...' 표시
            }, 400); // 내 메시지 전송 후 0.4초 뒤에 타이핑 시작
        };
        optionsElement.appendChild(button);
    });
}

// 1. 현재 시간을 "오후 2:41" 형식으로 만드는 함수
function getCurrentTimeText() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12 || 12; // 0시를 12시로 표시
    return `${ampm} ${hours}:${minutes}`;
}

// 2. 채팅창에 시간 구분선을 추가하는 함수
function addTimeDivider() {
    const chatWindow = document.getElementById('chat-window');
    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-time';
    timeDiv.innerText = `오늘 ${getCurrentTimeText()}`;
    chatWindow.appendChild(timeDiv);
}

// 3. loadStory 함수 마지막 부분 수정
async function loadStory() {
    // ... 기존 데이터 파싱 코드 ...
    
    // 첫 화면 세팅
    const chatWindow = document.getElementById('chat-window');
    chatWindow.innerHTML = ''; 

    // 게임 시작 시 첫 시간 표시
    addTimeDivider();

    if (storyData["1"]) {
        addMessage(storyData["1"].text, 'bot');
        showOptions("1");
    }
}

// 4. (선택사항) 메시지가 길어지면 중간에 시간을 한 번 더 뿌려주고 싶을 때
// showOptions 내부에서 addMessage('me') 호출 직전에 addTimeDivider()를 쓰면 됩니다.

loadStory();





