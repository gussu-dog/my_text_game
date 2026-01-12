const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};
let historyData = [];

function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    
    let cleanText = text.replace(/\\n/g, '<br>');
    msgDiv.innerHTML = cleanText;
    
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTyping() {
    const chatWindow = document.getElementById('typing-indicator') ? document.getElementById('typing-indicator') : null;
    if (chatWindow) return chatWindow;

    const chatWin = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWin.appendChild(typingDiv);
    chatWin.scrollTop = chatWin.scrollHeight;
    return typingDiv;
}

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

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';
    
    // 선택지가 하나도 없으면 자동 다음 단계로 (D열의 ID 사용)
    if (!scene || !scene.options || scene.options.length === 0) {
        if (scene.autoNext) {
            setTimeout(() => playScene(scene.autoNext), 800);
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
                    autoNext: cols[3],    // D열: 자동 이동할 ID
                    triggerOpt: cols[12], 
                    chanceNext: cols[13], 
                    chanceRate: parseFloat(cols[14]) || 0
                };
                
                // ★ 수정된 부분: 선택지는 E열(인덱스 4)부터 가져옵니다 ★
                // E(4)-F(5), G(6)-H(7), I(8)-J(9) 순서
                for (let i = 4; i <= 9; i += 2) { 
                    if (cols[i]) {
                        scene.options.push({ 
                            index: ((i-2) / 2).toString(), 
                            label: cols[i], 
                            next: cols[i+1] 
                        }); 
                    }
                }

                if (id < 0) {
                    // C열(인덱스 2)이 me면 내가 보낸 것
                    historyData.push({ id, text: cols[1], sender: cols[2] === 'me' ? 'me' : 'bot' });
                } else {
                    storyData[id.toString()] = scene;
                }
            }
        });

        historyData.sort((a, b) => a.id - b.id);
        historyData.forEach(h => addMessage(h.text, h.sender));

        if (storyData["1"]) { playScene("1"); }
    } catch (e) { console.error("Error:", e); }
}

loadStory();
