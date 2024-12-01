
document.getElementById('questionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const question = {
        text: document.getElementById('questionText').value,
        answers: Array.from(document.getElementById('answers').getElementsByTagName('input')).map(input => input.value),
        correctAnswer: parseInt(document.getElementById('correctAnswer').value),
        timeLimit: parseInt(document.getElementById('timeLimit').value)
    };

    try {
        const response = await fetch('/api/questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(question)
        });

        if (response.ok) {
            alert('Frage erfolgreich gespeichert!');
            document.getElementById('questionForm').reset();
            loadQuestions();
        } else {
            alert('Fehler beim Speichern der Frage');
        }
    } catch (err) {
        console.error('Error:', err);
        alert('Fehler beim Speichern');
    }
});

async function loadQuestions() {
    try {
        const response = await fetch('/api/questions');
        const questions = await response.json();
        
        const questionsList = document.getElementById('questionsList');
        questionsList.innerHTML = '<h2>Vorhandene Fragen:</h2>';
        
        questions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-item';
            div.innerHTML = `
                <p><strong>${q.text}</strong></p>
                <p>Antworten: ${q.answers.join(', ')}</p>
                <p>Richtige Antwort: ${q.answers[q.correctAnswer]}</p>
                <p>Zeitlimit: ${q.timeLimit}s</p>
                <button onclick="deleteQuestion('${q._id}')">Löschen</button>
            `;
            questionsList.appendChild(div);
        });
    } catch (err) {
        console.error('Error:', err);
    }
}

async function deleteQuestion(id) {
    if (!confirm('Frage wirklich löschen?')) return;
    
    try {
        const response = await fetch(`/api/questions/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            loadQuestions();
        }
    } catch (err) {
        console.error('Error:', err);
    }
}

loadQuestions();