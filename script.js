// 1. 설정 영역 (본인의 정보로 수정해주세요)
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbweif1QukpSxPsGCnLbcoFg2Q22p-V3DztPnhZeBT_91InpO9QXT7c17Him9ylcH9Jw5g/exec"; // Apps Script URL
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

// 탭 이름과 GID 매핑 (시트 하단 탭을 눌렀을 때 주소창 끝에 나오는 gid 번호)
const characterConfigs = {
    "로라": "1156416394", 
    "캐릭터이름2": "247421618",
    "캐릭터이름3": "97907572"
};

let storyData = {};
let historyData = [];

// 2. 캐릭터 목록 가져오기 (게임 시작 시 실행)
async function loadCharacterList() {
    try {
        const response = await fetch(appsScriptUrl);
        const names = await response.json();
        
        const listDiv = document.getElementById('character-list');
        listDiv.innerHTML = ''; // 기존 목록 비우기

        names.forEach(name => {
            const item = document.createElement('div');
            item.className = 'character-item'; // CSS에서 스타일을 지정해주세요
            item.innerText = name;
            item.onclick = () => startChat(name);
            listDiv.appendChild(item);
        });
    } catch (e) {
        console.error("목록 로드 실패:", e);
        // 만약 Apps Script가 안될 경우를 대비해 수동 목록이라도 띄우기
        renderManualList();
    }
}

// 3. 대화 시작 함수
function startChat(name) {
    const gid = characterConfigs[name];
    if (!gid) {
        alert("해당 캐릭터의 시트 ID(GID) 설정이 없습니다.");
        return;
    }

    // 화면 전환
    document.getElementById('header-name').innerText = name;
    document.getElementById('list-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    
    // 기존 데이터 초기화 후 시트 로드
    storyData = {};
    historyData = [];
    document.getElementById('chat-window').innerHTML = '';
    
    loadStory(`${baseSheetUrl}${gid}`);
}

// 4. 시트 데이터 로드 로직 (기존 로직 통합)
async function loadStory(fullUrl) {
    try {
        const response = await fetch(fullUrl);
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
                    triggerOpt: cols[12], 
                    chanceNext: cols[13]
                };
                for (let i = 4; i <= 9; i += 2) { 
                    if (cols[i]) {
                        scene.options.push({ index: ((i-2) / 2).toString(), label: cols[i], next: cols[i+1] }); 
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
    } catch (e) { console.error("데이터 로드 실패:", e); }
}

//


