const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};
let historyData = []; // 과거 내역 저장용

function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    
    // 줄바꿈 \n 처리 및 (나) 태그 제거
    let cleanText = text.replace(/\\n/g, '<br>');
    msgDiv.innerHTML = cleanText;
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTyping() {
    const chatWindow = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing';
    typingDiv.className = 'message-bubble';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWindow.appendChild(typingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return typingDiv;
}

async function playScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    const typing = showTyping();
    setTimeout(() => {
        typing.remove();
        addMessage(scene.text, 'bot');
        showOptions(sceneId);
    }, 1000);
}

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';
    
    // 선택지가 없으면 자동으로 다음 ID로 넘어가는 기능 (연속 메시지용)
    if (!scene || !scene.options || scene.options.length === 0) {
        // 만약 Option 1의 Next ID가 있다면 거기로 자동 이동
        const autoNext = scene.autoNext;
        if (autoNext) {
            setTimeout(() => playScene(autoNext), 800);
        }
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
                const dice = Math.random() * 100;
                const nextId = (scene.triggerOpt === opt.index && scene.chanceNext && dice < scene.chanceRate) ? scene.chanceNext : opt.next;
                playScene(nextId);
            }, 500);
        };
        optionsElement.appendChild(button);
    });
}

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
                    triggerOpt: cols[12], 
                    chanceNext: cols[13], 
                    chanceRate: parseFloat(cols[14]) || 0,
                    autoNext: cols[3] // 선택지 없을 때 D열의 ID로 자동 이동
                };
                
                // 선택지 수집
                for (let i = 2; i <= 10; i += 2) { 
                    if (cols[i]) scene.options.push({ index: (i / 2).toString(), label: cols[i], next: cols[i+1] }); 
                }

                if (id < 0) {
                    // ID가 음수면 과거 내역으로 분류
                    // Label 1(cols[2])이 'me'면 내가 보낸 것으로 간주
                    historyData.push({ id, text: cols[1], sender: cols[2] === 'me' ? 'me' : 'bot' });
                } else {
                    storyData[id.toString()] = scene;
                }
            }
        });

        // 과거 내역 ID 순으로 정렬 후 출력
        historyData.sort((a, b) => a.id - b.id);
        historyData.forEach(h => addMessage(h.text, h.sender));

        // 게임 시작 (ID 1번)
        if (storyData["1"]) { 
            playScene("1"); 
        }
    } catch (e) { console.error("Error:", e); }
}

loadStory();
