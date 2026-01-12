const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

// 1. 현재 시간 텍스트 생성 (오전/오후 0:00)
function getCurrentTimeText() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12 || 12;
    return `${ampm} ${hours}:${minutes}`;
}

// 2. 중앙 시간 구분선 (게임 시작 시 1회)
function addTimeDivider() {
    const chatWindow = document.getElementById('chat-window');
    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-time-divider';
    timeDiv.innerText = `오늘 ${getCurrentTimeText()}`;
    chatWindow.appendChild(timeDiv);
}

// 3. 메시지 추가 (말풍선 옆에 시간 붙이기)
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    
    // 래퍼 생성 (메시지 + 시간 한 줄)
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender === 'me' ? 'me-wrapper' : 'bot-wrapper'}`;

    // 말풍선 생성
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerText = text;

    // 시간 태그 생성
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.innerText = getCurrentTimeText().split(' ')[1]; // "2:41" 형식만 추출

    // 배치 순서 (카톡 스타일)
    if (sender === 'me') {
        wrapper.appendChild(timeSpan); // 나는 시간 - 말풍선 순서
        wrapper.appendChild(msgDiv);
    } else {
        wrapper.appendChild(msgDiv); // 상대방은 말풍선 - 시간 순서
        wrapper.appendChild(timeSpan);
    }

    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. 타이핑 표시
function showTypingIndicator() {
    const chatWindow = document.getElementById('chat-window');
    const wrapper = document.createElement('div');
    wrapper.className = 'message-wrapper bot-wrapper';
    wrapper.id = 'typing-indicator-wrapper';

    const typingDiv = document.createElement('div');
    typingDiv.className = 'message-bubble';
    typingDiv.style.display = 'inline-flex';
    typingDiv.style.gap = '4px';
    typingDiv.style.alignItems = 'center';
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    
    wrapper.appendChild(typingDiv);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return wrapper;
}

// 5. 선택지 표시 및 로직
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
                    
                    if (storyData[nextSceneId]) {
                        addMessage(storyData[nextSceneId].text, 'bot');
                        show
