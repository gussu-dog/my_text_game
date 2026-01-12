// 1. 설정 영역 (본인의 정보로 수정해주세요)
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbweif1QukpSxPsGCnLbcoFg2Q22p-V3DztPnhZeBT_91InpO9QXT7c17Him9ylcH9Jw5g/exec"; // Apps Script URL
const baseSheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?output=csv&gid=";

let storyData = {};
let historyData = [];

function doGet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  
  // 제외하고 싶은 탭 이름들을 배열에 넣으세요
  const excludeNames = ["설정", "메모", "가이드", "테스트"]; 
  
  const sheetInfo = sheets
    .filter(sheet => !excludeNames.includes(sheet.getName())) // 제외 목록에 없는 탭만 통과
    .map(sheet => {
      return {
        name: sheet.getName(),
        gid: sheet.getSheetId().toString()
      };
    });
  
  return ContentService.createTextOutput(JSON.stringify(sheetInfo))
    .setMimeType(ContentService.MimeType.JSON);
}

// 캐릭터 목록 로드 (GID까지 자동으로 매칭)
async function loadCharacterList() {
    try {
        const response = await fetch(appsScriptUrl);
        const characters = await response.json(); // [{name: "가나다", gid: "0"}, ...]
        
        const listDiv = document.getElementById('character-list');
        listDiv.innerHTML = '';

        characters.forEach(char => {
            const item = document.createElement('div');
            item.className = 'character-item';
            item.innerText = char.name;
            
            // 클릭 시 해당 캐릭터의 GID를 바로 전달
            item.onclick = () => startChat(char.name, char.gid);
            listDiv.appendChild(item);
        });
    } catch (e) {
        console.error("캐릭터 목록 로드 중 오류:", e);
    }
}

// 대화 시작 (이제 gid를 인자로 직접 받음)
function startChat(name, gid) {
    document.getElementById('header-name').innerText = name;
    document.getElementById('list-page').style.display = 'none';
    document.getElementById('game-page').style.display = 'block';
    
    storyData = {};
    historyData = [];
    document.getElementById('chat-window').innerHTML = '';
    
    // 자동 매칭된 gid를 포함한 전체 URL 생성
    loadStory(`${baseSheetUrl}${gid}`);
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





