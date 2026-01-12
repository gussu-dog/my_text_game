const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

function getCurrentTimeText() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12 || 12;
    return `${ampm} ${hours}:${minutes}`;
}

function addTimeDivider() {
    const chatWindow = document.getElementById('chat-window');
    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-time';
    timeDiv.innerText = `오늘 ${getCurrentTimeText()}`;
    chatWindow.appendChild(timeDiv);
}

function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerText = text;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
    const chatWindow = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble';
    typingDiv.style.display = 'inline-flex';
    typingDiv.style.gap = '4px';
    typingDiv.style.alignItems = 'center';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    chatWindow.appendChild(typingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return typingDiv;
}

function showOptions(sceneId) {
    const scene = storyData[sceneId];
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';
    if (!scene || !scene.options) return;

    scene.options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt.label;
        button.className = 'option-btn';
        button.onclick = () => {
            addMessage(opt.label, 'me');
            optionsElement.innerHTML = '';
            setTimeout(() => {
                const typingIndicator = showTypingIndicator();
                setTimeout(() => {
                    typingIndicator.remove();
                    const dice = Math.random() * 100;
                    const nextSceneId = (scene.triggerOpt === opt.index && scene.chanceNext && dice < scene.chanceRate) 
                                        ? scene.chanceNext : opt.next;
                    addMessage(storyData[nextSceneId].text, 'bot');
                    showOptions(nextSceneId);
                }, 1200);
            }, 400);
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
                    if (cols[i]) scene.options.push({ index: (i / 2).toString(), label: cols[i], next: cols[i+1] });
                }
                storyData[id] = scene;
            }
        });

        document.getElementById('chat-window').innerHTML = ''; 
        addTimeDivider();
        if (storyData["1"]) {
            addMessage(storyData["1"].text, 'bot');
            showOptions("1");
        }
    } catch (e) {
        console.error("데이터 로드 실패:", e);
    }
}

loadStory();
