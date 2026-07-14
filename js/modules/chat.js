// ============================================================
// NEUROSARATHI V3 — modules/chat.js
// AI Sarathi Chat with Rich Context
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.Chat = {
    _state: {
        isOpen: false,
        isTyping: false,
        history: []
    },

    toggle: function() {
        const chatWindow = document.getElementById('chatWindow');
        if (!chatWindow) return;

        this._state.isOpen = !this._state.isOpen;
        chatWindow.classList.toggle('open');

        if (this._state.isOpen) {
            document.getElementById('chatInput')?.focus();
        }
    },

    sendMessage: async function() {
        const input = document.getElementById('chatInput');
        if (!input) return;

        const message = input.value.trim();
        if (!message) return;

        this._addMessage(message, 'user');
        input.value = '';

        const context = this._buildContext();
        const typingId = this._showTyping();

        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: message,
                    childId: NeuroSarathi.State.get('activeChild.id'),
                    context: context,
                    history: this._state.history.slice(-5)
                })
            });

            const data = await response.json();
            this._removeTyping(typingId);
            this._addMessage(data.response || 'I\'m here to help!', 'ai');

            this._state.history.push({ message, response: data.response, timestamp: new Date().toISOString() });

        } catch (error) {
            this._removeTyping(typingId);
            this._addMessage('Sorry, I\'m having trouble connecting. Please try again.', 'ai');
            console.error('Chat error:', error);
        }
    },

    _buildContext: function() {
        const state = NeuroSarathi.State.get();
        const child = state.activeChild;
        const stats = state.dashboard?.stats || {};
        const routines = state.dashboard?.routines || [];
        const journal = state.dashboard?.journal || [];

        return {
            child: child ? {
                name: child.name,
                age: getAge(child.date_of_birth),
                gender: child.gender,
                school: child.school,
                class: child.class,
                learning_focus: child.learning_focus || [],
                goals: child.goals || []
            } : null,
            stats: {
                activities: stats.activities || 0,
                observations: stats.observations || 0,
                documents: stats.documents || 0,
                streak: stats.streak || 0
            },
            routines: routines.map(r => ({ name: r.name, time: r.time, completed: r.completed })),
            recentObservations: journal.slice(0, 3).map(j => ({
                content: j.content, mood: j.mood, date: j.created_at
            })),
            documents: [],
            preferredLanguage: state.profile?.language || 'en',
            subscriptionTier: 'free'
        };
    },

    _addMessage: function(text, sender) {
        const messages = document.getElementById('chatMessages');
        if (!messages) return;
        const message = document.createElement('div');
        message.className = `chat-message ${sender}`;
        message.textContent = text;
        messages.appendChild(message);
        messages.scrollTop = messages.scrollHeight;
    },

    _showTyping: function() {
        const messages = document.getElementById('chatMessages');
        if (!messages) return null;
        const id = 'typing-' + Date.now();
        const typing = document.createElement('div');
        typing.id = id;
        typing.className = 'chat-message ai typing-indicator';
        typing.innerHTML = `<div class="typing-dots"><span></span><span></span><span></span></div>`;
        messages.appendChild(typing);
        messages.scrollTop = messages.scrollHeight;
        return id;
    },

    _removeTyping: function(id) {
        if (!id) return;
        const el = document.getElementById(id);
        if (el) el.remove();
    },

    handleChip: function(prompt) {
        const input = document.getElementById('chatInput');
        if (input) {
            input.value = prompt;
            this.sendMessage();
        }
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ Chat module loaded');
