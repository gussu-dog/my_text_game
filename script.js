const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};
let historyData = [];

// 1. 메시지 추가 함수
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    let cleanText = text.replace(/\\n/g, '<br>');
    msgDiv.innerHTML = cleanText;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 2. 타이핑 표시
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

// 3. 가챠 로직 (ID:확률, ID:확률 파싱)
function getGachaResult(chanceString, defaultNext) {
    if (!chanceString || !chanceString.includes(':')) return defaultNext;
    
    const pools = chanceString.split(',').map(p => p.trim());
    const dice = Math.random() * 100;
    let cumulativeProbability = 0;

    for (let pool of pools) {
        const [nextId, probability] = pool.split(':');
        cumulativeProbability += parseFloat(probability);
        if (dice <= cumulativeProbability) {
            return nextId.trim();
        }
    }
    return defaultNext; // 당첨 안 되면 기본 다음 ID로
}

// 4. 장면 실행
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

// 5. 선택지 표시 및 가챠 트리거
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
                    // M열(chanceNext)에 가챠 설정이 있고, 트리거 번호가 맞을 때
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

// 6. 데이터 로드
async function loadStory() {
    try {
        const response = await fetch(sheetUrl);
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
                    triggerOpt: cols[12], // M열: 트리거할 선택지 번호 (1, 2...)
                    chanceNext: cols[13]  // N열: 가챠 데이터 (101:20, 102:80)
                };
                
                for (let i = 4; i <= 9; i += 2) { 
                    if (cols[i]) {
                        scene.options.push({ 
                            index: ((i-2) / 2).toString(), // 1, 2, 3...
                            label: cols[i], 
                            next: cols[i+1] 
                        }); 
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
    } catch (e) { console.error("Error:", e); }
}

loadStory();
