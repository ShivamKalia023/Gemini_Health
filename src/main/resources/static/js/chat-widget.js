class FitnessChatWidget {
    constructor() {
        this.isOpen = false;
        this.isTyping = false;
        this.messageHistory = [];
        this.maxHistory = 10;
        
        this.suggestedPrompts = [
            "How much water should I drink today?",
            "Am I overtraining?",
            "Summarize my activities this week.",
            "Which challenge am I closest to completing?",
            "Suggest a 5K training plan.",
            "Give me a weekly fitness summary.",
            "Compare my performance to last week.",
            "Should I take a recovery day?",
            "What should I eat after today's workout?"
        ];
        
        this.init();
    }

    init() {
        this.injectCSS();
        this.injectUI();
        this.bindEvents();
    }

    injectCSS() {
        if (!document.getElementById('cw-widget-css')) {
            const link = document.createElement('link');
            link.id = 'cw-widget-css';
            link.rel = 'stylesheet';
            link.href = '/css/chat-widget.css';
            document.head.appendChild(link);
        }
    }

    injectUI() {
        // Create Floating Button
        this.btn = document.createElement('button');
        this.btn.id = 'cw-widget-btn';
        this.btn.title = 'Ask AI Health Assistant';
        this.btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>`;
        document.body.appendChild(this.btn);

        // Create Modal
        this.modal = document.createElement('div');
        this.modal.id = 'cw-box-modal';
        this.modal.innerHTML = `
            <div class="cw-box-header">
                <h3>
                    <svg class="cw-icon-small" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
                    AI Health Assistant
                </h3>
                <div class="cw-head-actions">
                    <button id="cw-clear-btn" class="cw-icon-btn" title="Clear Chat">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                    </button>
                    <button id="cw-close-btn" class="cw-icon-btn" title="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                    </button>
                </div>
            </div>
            <div class="cw-box-body" id="cw-box-body">
                <div class="cw-msg assistant" id="cw-greet-msg">
                    Hello! I'm your AI Health Assistant. I can analyze your Strava activities and challenge progress to give personalized fitness advice. How can I help you today?
                </div>
                <div class="cw-suggest-prompts" id="cw-suggest-prompts"></div>
            </div>
            <div class="cw-box-input-container">
                <div class="cw-box-input-wrapper">
                    <textarea id="cw-box-input" class="cw-box-input" placeholder="Ask a question..." rows="1"></textarea>
                </div>
                <button id="cw-send-btn" class="cw-send-btn" disabled>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>
                </button>
            </div>
        `;
        document.body.appendChild(this.modal);

        this.chatBody = document.getElementById('cw-box-body');
        this.chatInput = document.getElementById('cw-box-input');
        this.sendBtn = document.getElementById('cw-send-btn');
        this.promptsContainer = document.getElementById('cw-suggest-prompts');

        if (!window.currentUser) {
            document.getElementById('cw-greet-msg').innerHTML = "Hello! I'm your AI Health Assistant. Please <strong><a href='/api/auth/strava' style='color: #e95420;'>Connect with Strava</a></strong> to ask me questions and get personalized fitness advice.";
            this.chatInput.disabled = true;
            this.chatInput.placeholder = "Log in to chat...";
            this.promptsContainer.style.display = 'none';
        } else {
            this.renderSuggestedPrompts();
        }
    }

    renderSuggestedPrompts() {
        this.promptsContainer.innerHTML = '';
        const shuffled = [...this.suggestedPrompts].sort(() => 0.5 - Math.random());
        const selected = shuffled.slice(0, 3);
        
        selected.forEach(promptText => {
            const btn = document.createElement('button');
            btn.className = 'cw-prompt-btn';
            btn.textContent = promptText;
            btn.onclick = () => {
                this.chatInput.value = promptText;
                this.sendMessage();
                this.promptsContainer.style.display = 'none';
            };
            this.promptsContainer.appendChild(btn);
        });
    }

    bindEvents() {
        this.btn.addEventListener('click', () => this.toggleModal());
        document.getElementById('cw-close-btn').addEventListener('click', () => this.toggleModal());
        document.getElementById('cw-clear-btn').addEventListener('click', () => this.clearChat());

        this.chatInput.addEventListener('input', () => {
            this.sendBtn.disabled = this.chatInput.value.trim().length === 0;
            this.chatInput.style.height = 'auto';
            this.chatInput.style.height = (this.chatInput.scrollHeight) + 'px';
        });

        this.chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!this.sendBtn.disabled) this.sendMessage();
            }
        });

        this.sendBtn.addEventListener('click', () => this.sendMessage());
    }

    toggleModal() {
        this.isOpen = !this.isOpen;
        if (this.isOpen) {
            this.modal.classList.add('open');
            setTimeout(() => this.chatInput.focus(), 300);
        } else {
            this.modal.classList.remove('open');
        }
    }

    clearChat() {
        this.chatBody.innerHTML = `
            <div class="cw-msg assistant">
                Chat cleared. How can I help you today?
            </div>
            <div class="cw-suggest-prompts" id="cw-suggest-prompts"></div>
        `;
        this.promptsContainer = document.getElementById('cw-suggest-prompts');
        if (window.currentUser) {
            this.renderSuggestedPrompts();
        } else {
            this.chatBody.innerHTML = `
                <div class="cw-msg assistant">
                    Please <strong><a href='/api/auth/strava' style='color: #e95420;'>Connect with Strava</a></strong> to ask me questions.
                </div>
            `;
        }
        this.messageHistory = [];
    }

    appendMessage(content, role) {
        const div = document.createElement('div');
        div.className = \`cw-msg \${role}\`;
        
        // Very basic markdown formatting for bold and newlines
        let formatted = content
            .replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>')
            .replace(/\\n/g, '<br>');
            
        div.innerHTML = formatted;
        
        if (this.promptsContainer && this.promptsContainer.parentNode === this.chatBody) {
            this.chatBody.insertBefore(div, this.promptsContainer);
            this.promptsContainer.style.display = 'none';
        } else {
            this.chatBody.appendChild(div);
        }
        
        this.scrollToBottom();
        
        if (role !== 'error') {
            this.messageHistory.push({ role, content });
            if (this.messageHistory.length > this.maxHistory) {
                this.messageHistory.shift();
            }
        }
    }

    showTyping() {
        const div = document.createElement('div');
        div.className = 'cw-typing-indicator';
        div.id = 'cw-typing';
        div.innerHTML = '<div class="cw-dot"></div><div class="cw-dot"></div><div class="cw-dot"></div>';
        this.chatBody.appendChild(div);
        this.scrollToBottom();
        this.isTyping = true;
        this.sendBtn.disabled = true;
        this.chatInput.disabled = true;
    }

    hideTyping() {
        const typing = document.getElementById('cw-typing');
        if (typing) typing.remove();
        this.isTyping = false;
        this.chatInput.disabled = false;
        this.chatInput.focus();
        this.sendBtn.disabled = this.chatInput.value.trim().length === 0;
    }

    scrollToBottom() {
        this.chatBody.scrollTop = this.chatBody.scrollHeight;
    }

    async sendMessage() {
        if (this.isTyping) return;
        
        let message = this.chatInput.value.trim();
        if (!message) return;

        this.chatInput.value = '';
        this.chatInput.style.height = 'auto';
        this.sendBtn.disabled = true;

        this.appendMessage(message, 'user');
        this.showTyping();
        
        // Optionally prepend previous context for a "history" feel.
        // Actually, just sending the current message is fine since the backend uses a stateless approach right now.
        // If we want history, we should send the last 10 messages. Let's send just the recent user message to keep it simple and fulfill "session based only", actually the prompt says "maintain the last 10 messages during the user's session".
        // I will just send the current message since the backend AIController only expects `{ "message": "..." }`. I can append the history into the message string if needed, but it's fine. Wait, let's prepend the history into the message so the model understands.
        
        let fullPrompt = message;
        if (this.messageHistory.length > 1) { // 1 because we just appended the current message
             fullPrompt = "Conversation history:\\n";
             this.messageHistory.forEach(msg => {
                 if (msg.role !== 'error') {
                     fullPrompt += \`\${msg.role === 'user' ? 'User' : 'Assistant'}: \${msg.content}\\n\`;
                 }
             });
             fullPrompt += "\\nCurrent User message:\\n" + message;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for AI

            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: fullPrompt }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                this.hideTyping();
                this.appendMessage(data.response, 'assistant');
            } else {
                this.hideTyping();
                let errMsg = "An error occurred. Please try again.";
                try {
                    const errorData = await response.json();
                    if (errorData.error) errMsg = errorData.error;
                } catch(e){}
                this.appendMessage(errMsg, 'error');
            }
        } catch (error) {
            this.hideTyping();
            let errMsg = "Network error. Please check your connection.";
            if (error.name === 'AbortError') errMsg = "Request timed out. The AI is taking too long to respond.";
            this.appendMessage(errMsg, 'error');
        }
    }
}

// Global exposure for injection
window.FitnessChatWidget = FitnessChatWidget;
