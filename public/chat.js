let sessionId = null;
const chatWindow = document.getElementById('chat-window');
const chatBody = document.getElementById('chat-body');
const chatInput = document.getElementById('chat-input');

function toggleChat() {
    chatWindow.classList.toggle('hidden');
    if (!chatWindow.classList.contains('hidden') && !sessionId) {
        startChat();
    }
}

function openChat(e) {
    if(e) e.preventDefault();
    chatWindow.classList.remove('hidden');
    if (!sessionId) {
        startChat();
    }
}

function appendMessage(sender, text, buttons = []) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `msg ${sender}`;
    msgDiv.textContent = text;
    chatBody.appendChild(msgDiv);

    if (buttons && buttons.length > 0) {
        const btnsDiv = document.createElement('div');
        btnsDiv.className = 'chat-buttons assistant-btns';
        buttons.forEach(btnText => {
            const btn = document.createElement('button');
            btn.className = 'chat-btn';
            btn.textContent = btnText;
            btn.onclick = () => sendUserMessage(btnText);
            btnsDiv.appendChild(btn);
        });
        chatBody.appendChild(btnsDiv);
    }
    
    chatBody.scrollTop = chatBody.scrollHeight;
}

async function startChat() {
    try {
        const res = await fetch('/api/chat/start', { method: 'POST' });
        const data = await res.json();
        sessionId = data.sessionId;
        appendMessage('assistant', data.message, data.buttons);
    } catch (err) {
        console.error("Failed to start chat", err);
    }
}

async function sendUserMessage(text) {
    if (!text) return;
    appendMessage('user', text);
    chatInput.value = '';

    // Remove buttons from previous assistant message to prevent double clicking
    const existingBtns = document.querySelectorAll('.assistant-btns');
    existingBtns.forEach(btn => btn.remove());

    try {
        const res = await fetch('/api/chat/message', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId, message: text })
        });
        const data = await res.json();
        appendMessage('assistant', data.message, data.buttons);
    } catch (err) {
        appendMessage('assistant', "I'm having trouble connecting to the server.");
    }
}

function sendMessage() {
    const text = chatInput.value.trim();
    if (text) {
        sendUserMessage(text);
    }
}

function handleKeyPress(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}
