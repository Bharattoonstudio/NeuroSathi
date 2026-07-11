// ============================================================
// NEUROSARATHI V2 — sarathi.js
// AI Sarathi Module
// ============================================================

// ─── STATE ─────────────────────────────────────────────────────

const sarathiState = {
    chatHistory: [],
    isOpen: false,
    isTyping: false,
    context: { childName: null, childAge: null, learningFocus: [] }
};

// ─── CHAT FUNCTIONS ──────────────────────────────────────────

function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    sarathiState.isOpen = !sarathiState.isOpen;
    chatWindow.classList.toggle('open');

    if (sarathiState.isOpen) {
        document.getElementById('chatInput').focus();
        updateChatContext();
    }
}

function updateChatContext() {
    if (state.activeChild) {
        sarathiState.context.childName = state.activeChild.name;
        sarathiState.context.childAge = getAge(state.activeChild.date_of_birth);
        sarathiState.context.learningFocus = state.activeChild.learning_focus || [];
    }
}

async function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    addChatMessage(message, 'user');
    input.value = '';
    input.disabled = true;

    const typingId = showTypingIndicator();

    try {
        const response = await getAIResponse(message);
        removeTypingIndicator(typingId);
        addChatMessage(response, 'ai');

        sarathiState.chatHistory.push({
            message, response, timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Chat error:', error);
        removeTypingIndicator(typingId);
        addChatMessage('Sorry, I\'m having trouble connecting. Please try again.', 'ai');
    } finally {
        input.disabled = false;
        input.focus();
    }
}

async function getAIResponse(message) {
    try {
        const response = await fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                childId: state.activeChild?.id,
                context: sarathiState.context,
                history: sarathiState.chatHistory.slice(-5)
            })
        });

        const data = await response.json();
        return data.response || generateLocalResponse(message);

    } catch (error) {
        console.error('API error, using local response:', error);
        return generateLocalResponse(message);
    }
}

/**
 * Local fallback response.
 * Per the NeuroSarathi Trust Charter, this stays generic and non-diagnostic —
 * it never fabricates statistics or claims specific to the active child.
 */
function generateLocalResponse(message) {
    const lower = message.toLowerCase();

    if (lower.includes('routine') || lower.includes('schedule') || lower.includes('plan')) {
        const childName = sarathiState.context.childName || 'your child';
        return `I can help think through a daily routine for ${childName}. A simple starting structure:\n\n🌅 Morning — wake up & morning routine\n🏫 Mid-morning — a focused learning activity\n🎨 Late morning — creative play\n🍽️ Midday — lunch break\n📚 Afternoon — reading time\n🎮 Evening — play & movement\n🌙 Night — wind down & bedtime\n\nWant me to help adjust this for ${childName}?`;
    }

    if (lower.includes('activity') || lower.includes('game') || lower.includes('play')) {
        return "Here are some general activity ideas:\n\n🎨 Picture Talk - Build vocabulary\n📖 Story Time - Read and ask questions\n🧩 Puzzle Play - Solve puzzles together\n🎵 Music & Movement - Dance and sing\n🎭 Role Play - Act out scenarios\n\nWhich one would you like to try?";
    }

    if (lower.includes('autism') || lower.includes('asd')) {
        return "Autism is a developmental difference that affects communication and interaction — this is general information, not specific to any one child.\n\n💡 Strategies some families find helpful:\n• Visual schedules\n• Breaking tasks into small steps\n• Simple, direct language\n• Celebrating small wins\n\nWould you like activity suggestions along these lines?";
    }

    if (lower.includes('adhd') || lower.includes('attention')) {
        return "ADHD can make focus or impulse control harder for some children — general information, not an assessment of your child specifically.\n\n💡 Strategies some families find helpful:\n• A quiet workspace\n• Timers for focus periods\n• Built-in movement breaks\n• Clear instructions\n\nWould you like activity ideas that support attention-building?";
    }

    if (lower.includes('school') || lower.includes('education') || lower.includes('teacher')) {
        return "For school support, some general starting points:\n\n📚 Work with teachers on an individual learning plan\n🗣️ Practice communication daily\n📝 Use visual aids and schedules\n🎯 Celebrate progress, however small\n\nWould you like help preparing for a school meeting?";
    }

    if (lower.includes('scheme') || lower.includes('government') || lower.includes('help')) {
        return "Government schemes worth looking into (availability varies by state — please verify locally):\n\n🏛️ Disability benefits\n🎓 Inclusive education programs\n🩺 Health insurance options\n📚 Free learning resources\n\nYour local District Disability Rehabilitation Centre can confirm current eligibility.";
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        return `Hello! 👋 I'm AI Sarathi. I'm here to help you think through ${sarathiState.context.childName || 'your child'}'s learning journey. What would you like to know?`;
    }

    return "I'm here to help with:\n\n📅 Thinking through daily routines\n💡 Suggesting learning activities\n🧩 Explaining developmental differences\n🏫 School support strategies\n📚 Learning resources\n\nWhat would you like to know? ✨";
}

function addChatMessage(text, sender) {
    const messages = document.getElementById('chatMessages');
    const message = document.createElement('div');
    message.className = `chat-message ${sender}`;
    message.textContent = text;
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
}

function showTypingIndicator() {
    const messages = document.getElementById('chatMessages');
    const id = 'typing-' + Date.now();
    const typing = document.createElement('div');
    typing.id = id;
    typing.className = 'chat-message ai typing-indicator';
    typing.innerHTML = `
        <div class="typing-dots">
            <span></span><span></span><span></span>
        </div>
    `;
    messages.appendChild(typing);
    messages.scrollTop = messages.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function handleChatChip(prompt) {
    document.getElementById('chatInput').value = prompt;
    sendChatMessage();
}

function handleSuggestionChip(prompt) {
    if (!document.getElementById('chatWindow').classList.contains('open')) {
        toggleChat();
    }
    setTimeout(() => {
        document.getElementById('chatInput').value = prompt;
        sendChatMessage();
    }, 300);
}

// ─── FLOATING AVATAR ──────────────────────────────────────────

function initFloatingAvatar() {
    const avatar = document.getElementById('aiAvatarFloat');
    if (!avatar) return;

    avatar.addEventListener('click', toggleChat);

    // Long press for quick menu (mouse)
    let pressTimer = null;
    avatar.addEventListener('mousedown', () => {
        pressTimer = setTimeout(() => showQuickMenu(), 500);
    });
    avatar.addEventListener('mouseup', () => clearTimeout(pressTimer));
    avatar.addEventListener('mouseleave', () => clearTimeout(pressTimer));

    // Long press for quick menu (touch — iPhone/Android)
    let touchTimer = null;
    avatar.addEventListener('touchstart', (e) => {
        touchTimer = setTimeout(() => {
            e.preventDefault();
            showQuickMenu();
        }, 500);
    });
    avatar.addEventListener('touchend', () => clearTimeout(touchTimer));
    avatar.addEventListener('touchmove', () => clearTimeout(touchTimer));
}

function showQuickMenu() {
    document.querySelector('.quick-menu')?.remove();

    const menu = document.createElement('div');
    menu.className = 'quick-menu fade-in';
    menu.innerHTML = `
        <button class="quick-menu-item" onclick="handleQuickMenuAction('ask')">
            <i class="fas fa-question-circle"></i> Ask Question
        </button>
        <button class="quick-menu-item" onclick="handleQuickMenuAction('plan')">
            <i class="fas fa-calendar-day"></i> Today's Plan
        </button>
        <button class="quick-menu-item" onclick="handleQuickMenuAction('activities')">
            <i class="fas fa-puzzle-piece"></i> Activity Ideas
        </button>
        <button class="quick-menu-item" onclick="handleQuickMenuAction('library')">
            <i class="fas fa-book"></i> Learning Library
        </button>
        <button class="quick-menu-item" onclick="handleQuickMenuAction('close')">
            <i class="fas fa-times"></i> Close
        </button>
    `;

    document.body.appendChild(menu);

    const autoCloseTimer = setTimeout(() => menu.remove(), 4000);
    menu.addEventListener('click', () => {
        clearTimeout(autoCloseTimer);
        menu.remove();
    });
}

function handleQuickMenuAction(action) {
    switch (action) {
        case 'ask':
            if (!document.getElementById('chatWindow').classList.contains('open')) {
                toggleChat();
            }
            document.getElementById('chatInput').focus();
            break;
        case 'plan':
            document.getElementById('chatInput').value = 'Create today\'s routine';
            sendChatMessage();
            break;
        case 'activities':
            document.getElementById('chatInput').value = 'Suggest learning activities';
            sendChatMessage();
            break;
        case 'library':
            if (typeof navigateTo === 'function') navigateTo('learning');
            break;
        case 'close':
            break;
    }
}

// ─── KEYBOARD SHORTCUTS ──────────────────────────────────────

document.addEventListener('keydown', function (e) {
    const chatWindow = document.getElementById('chatWindow');
    if (!chatWindow) return;

    if (e.key === 'Escape' && chatWindow.classList.contains('open')) {
        toggleChat();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (!chatWindow.classList.contains('open')) {
            toggleChat();
        }
        document.getElementById('chatInput').focus();
    }
});

// ─── INIT ──────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initFloatingAvatar);

// ─── EXPOSE GLOBAL FUNCTIONS ────────────────────────────────

window.toggleChat = toggleChat;
window.sendChatMessage = sendChatMessage;
window.handleChatChip = handleChatChip;
window.handleSuggestionChip = handleSuggestionChip;
window.handleQuickMenuAction = handleQuickMenuAction;
window.initFloatingAvatar = initFloatingAvatar;

console.log('🧠 NeuroSarathi V2 — AI Sarathi Module Loaded');
