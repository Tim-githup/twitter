let socket;
let username;

function connectWebSocket() {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const wsPort = process.env.WS_PORT || 3001;
    socket = new WebSocket(`${wsProtocol}${window.location.hostname}:${wsPort}`);
    
    socket.onopen = () => {
        if (username) {
            socket.send(JSON.stringify({
                type: 'join',
                username: username
            }));
        }
    };

    socket.onclose = () => {
        console.log('Verbindung unterbrochen. Versuche neu zu verbinden...');
        setTimeout(connectWebSocket, 3000);
    };

    socket.onerror = (error) => {
        console.error('WebSocket Fehler:', error);
    };
}

function joinGame() {
    username = document.getElementById('username').value;
    if (!username) return alert('Bitte gib einen Benutzernamen ein');
    connectWebSocket();
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
}

function handleGameEvents(data) {
    switch(data.type) {
        case 'question':
            showQuestion(data.question);
            break;
        case 'scores':
            updateScoreboard(data.scores);
            break;
        case 'error':
            alert(data.message);
            break;
    }
}

function showQuestion(questionData) {
    document.getElementById('question').textContent = questionData.text;
    const answersDiv = document.getElementById('answers');
    answersDiv.innerHTML = '';
    
    questionData.answers.forEach((answer, index) => {
        const button = document.createElement('button');
        button.className = 'answer-button';
        button.textContent = answer;
        button.onclick = () => submitAnswer(index);
        answersDiv.appendChild(button);
    });
}

function submitAnswer(answerIndex) {
    socket.send(JSON.stringify({
        type: 'answer',
        answer: answerIndex
    }));
}

function updateScoreboard(scores) {
    const list = document.getElementById('players-list');
    list.innerHTML = '';
    scores.forEach(score => {
        const li = document.createElement('li');
        li.textContent = `${score.username}: ${score.points}`;
        list.appendChild(li);
    });
}
