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
                    // M열(12)과 N열(13)로 확률 데이터 이동
                    chanceNext: cols[12], 
                    chanceRate: parseFloat(cols[13]) || 0 
                };

                // C, E, G, I, K 열을 돌며 선택지 텍스트가 있는지 확인 (최대 5개)
                for (let i = 2; i <= 10; i += 2) {
                    if (cols[i] && cols[i].length > 0) {
                        scene.options.push({
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
            
            // 어떤 버튼을 누르든 설정된 확률에 따라 돌발 이벤트 발생 가능
            if (scene.chanceNext && dice < scene.chanceRate) {
                showScene(scene.chanceNext);
            } else {
                showScene(opt.next);
            }
        };
        optionsElement.appendChild(button);
    });
}

loadStory();
