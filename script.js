const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

// 1. 현재 시간 포맷 함수
function getCurrentTimeText() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12 || 12;
    return `${ampm} ${hours}:${minutes}`;
}

// 2. 시간 구분선 추가 함수
function addTimeDivider() {
    const chatWindow = document.getElementById('chat-window');
    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-time';
    timeDiv.innerText = `오늘 ${getCurrentTimeText()}`;
    chatWindow.appendChild(timeDiv);
}

// 3. 메시지 추가 함수
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerText = text;
    chatWindow.appendChild(msgDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. 타이핑 표시 함수
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

// 5. 선택지 표시 함수
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
            addMessage(opt.label, 'me'); // 내 메시지 추가
            optionsElement.innerHTML = ''; // 버튼 제거

            setTimeout(() => {
                const typingIndicator = showTypingIndicator();
                setTimeout(() => {
                    typingIndicator.remove();
                    const dice = Math.random() * 100;
                    if (scene.triggerOpt === opt.index && scene.chanceNext && dice < scene.chanceRate) {
                        addMessage
