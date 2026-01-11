const sheetUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQd7MAwHPNY8jyOF2Fi5qFgtwnDHjjA1IzkEbN91axz8qNHIDum5T2X-zH8yZ2kqdZQC4Lj1jMYD00R/pub?gid=1156416394&single=true&output=csv";

let storyData = {};

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
                    triggerOpt: cols[12], // M열: 확률이 발동할 선택지 번호 (1~5)
                    chanceNext: cols[13], // N열: 돌발 이벤트 ID
                    chanceRate: parseFloat(cols[14]) || 0 // O열: 확률
                };

                // 선택지들을 배열에 담기
                for (let i = 2; i <= 10; i += 2) {
                    if (cols[i] && cols[i].length > 0) {
                        scene.options.push({
                            index: (i / 2).toString(), // 선택지 번호 (1, 2, 3...)
                            label: cols[i],
                            next: cols[i+1]
                        });
                    }
                }
                storyData[id] = scene;
            }
        });
        showScene("1");
    } catch (e) { console.error("로딩 실패:", e); }
}

function showScene(sceneId) {
    const scene = storyData[sceneId];
    if (!scene) return;

    document.getElementById('text').innerText = scene.text;
    const optionsElement = document.getElementById('options');
    optionsElement.innerHTML = '';

    scene.options.forEach(opt => {
        const button = document.createElement('button');
        button.innerText = opt.label;
        button.className = 'option-btn';
        button.onclick = () => {
            const dice = Math.random() * 100;
            
            // 현재 누른 버튼의 번호가 시트의 triggerOpt와 일치할 때만 확률 계산
            if (scene.triggerOpt === opt.index && scene.chanceNext && dice < scene.chanceRate) {
                console.log(`${opt.index}번 선택지 확률 발동!`);
                showScene(scene.chanceNext);
            } else {
                showScene(opt.next);
            }
        };
        optionsElement.appendChild(button);
    });
}

loadStory();
