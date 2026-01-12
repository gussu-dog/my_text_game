// 구글 시트 CSV 주소
const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

// 1. 현재 시간을 "오후 2:41" 형식으로 만드는 함수
function getCurrentTimeText() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    hours = hours % 12 || 12;
    return `${ampm} ${hours}:${minutes}`;
}

// 시간 구분선 함수 이름 변경 (중앙 표시용)
function addTimeDivider() {
    const chatWindow = document.getElementById('chat-window');
    const timeDiv = document.createElement('div');
    timeDiv.className = 'chat-time-divider'; // 클래스명 변경
    timeDiv.innerText = `오늘 ${getCurrentTimeText()}`;
    chatWindow.appendChild(timeDiv);
}

// 3. 메시지 추가 함수 (나/상대방 구분)
function addMessage(text, sender) {
    const chatWindow = document.getElementById('chat-window');
    
    // 전체를 감싸는 래퍼 생성
    const wrapper = document.createElement('div');
    wrapper.className = `message-wrapper ${sender === 'me' ? 'me-wrapper' : 'bot-wrapper'}`;

    // 메시지 풍선 생성
    const msgDiv = document.createElement('div');
    msgDiv.className = sender === 'me' ? 'my-message' : 'message-bubble';
    msgDiv.innerText = text;

    // 개별 시간 생성
    const timeSpan = document.createElement('span');
    timeSpan.className = 'msg-time';
    timeSpan.innerText = getCurrentTimeText().split(' ')[1]; // "오후 2:41"에서 시간만 추출하거나 전체 사용

    // 배치 순서: 상대방은 [풍선 - 시간], 나는 [시간 - 풍선]
    if (sender === 'me') {
        wrapper.appendChild(timeSpan);
        wrapper.appendChild(msgDiv);
    } else {
        wrapper.appendChild(msgDiv);
        wrapper.appendChild(timeSpan);
    }

    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

// 4. 상대방이 타이핑 중임을 나타내는 점 애니메이션 생성 함수
function showTypingIndicator() {
    const chatWindow = document.getElementById('chat-window');
    const typingDiv = document.createElement('div');
    typingDiv.id = 'typing-indicator';
    typingDiv.className = 'message-bubble';
    typingDiv.style.display = 'inline-flex';
    typingDiv.style.gap = '4px';
    typingDiv.style.alignItems = 'center';
    // CSS에 정의한 .dot 클래스 사용
    typingDiv.innerHTML = '<div class="dot"></div><div class="dot"></div><div class="dot"></div>';
    
    chatWindow.appendChild(typingDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
    return typingDiv;
}

// 5. 선택지 표시 및 대화 로직 제어
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
            // 사용자가 선택지를 누르면 내 메시지로 추가
            addMessage(opt.label, 'me');
            optionsElement.innerHTML = ''; // 선택지 숨기기

            // 0.4초 뒤 상대방 타이핑 시작

