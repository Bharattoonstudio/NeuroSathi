// ============================================================
// NEUROSARATHI V3 — modules/aac-board.js
// AAC (Augmentative & Alternative Communication) Boards (PHASE 1)
// ============================================================

window.NeuroSarathi = window.NeuroSarathi || {};

NeuroSarathi.AACBoard = {

    // Load all communication boards for active child
    load: async function() {
        try {
            const activeChild = NeuroSarathi.State.get('activeChild');
            if (!activeChild) return [];

            const { data, error } = await supabase
                .from('communication_boards')
                .select('*')
                .eq('child_id', activeChild.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            NeuroSarathi.State.set('aacBoards', data || []);
            return data || [];
        } catch (error) {
            console.error('Error loading AAC boards:', error);
            NeuroSarathi.UI.Toasts.show('Failed to load communication boards', 'error');
            return [];
        }
    },

    // Create new communication board
    create: async function(boardData) {
        try {
            const user = NeuroSarathi.State.get('user');
            const activeChild = NeuroSarathi.State.get('activeChild');

            if (!user || !activeChild) {
                NeuroSarathi.UI.Toasts.show('Please select a child first', 'warning');
                return null;
            }

            const payload = {
                child_id: activeChild.id,
                parent_id: user.id,
                name: boardData.name,
                description: boardData.description,
                board_type: boardData.board_type || 'custom',
                layout_type: boardData.layout_type || 'grid',
                grid_columns: boardData.grid_columns || 3,
                is_public: boardData.is_public || false,
                symbols: boardData.symbols || []
            };

            const { data, error } = await supabase
                .from('communication_boards')
                .insert([payload])
                .select();

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Communication board created', 'success');
            return data[0];
        } catch (error) {
            console.error('Error creating AAC board:', error);
            NeuroSarathi.UI.Toasts.show('Failed to create communication board', 'error');
            return null;
        }
    },

    // Add symbol to board
    addSymbol: async function(boardId, symbolData) {
        try {
            const { data, error } = await supabase
                .from('board_symbols')
                .insert([{
                    board_id: boardId,
                    symbol_name: symbolData.name,
                    symbol_image_url: symbolData.image_url,
                    symbol_category: symbolData.category,
                    audio_url: symbolData.audio_url,
                    position_order: symbolData.position_order || 0
                }])
                .select();

            if (error) throw error;
            
            NeuroSarathi.UI.Toasts.show('Symbol added to board', 'success');
            return data[0];
        } catch (error) {
            console.error('Error adding symbol:', error);
            NeuroSarathi.UI.Toasts.show('Failed to add symbol', 'error');
            return null;
        }
    },

    // Get symbols for board
    getSymbols: async function(boardId) {
        try {
            const { data, error } = await supabase
                .from('board_symbols')
                .select('*')
                .eq('board_id', boardId)
                .order('position_order', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching symbols:', error);
            return [];
        }
    },

    // Delete symbol from board
    deleteSymbol: async function(symbolId) {
        try {
            const { error } = await supabase
                .from('board_symbols')
                .delete()
                .eq('id', symbolId);

            if (error) throw error;
            
            NeuroSarathi.UI.Toasts.show('Symbol removed', 'success');
            return true;
        } catch (error) {
            console.error('Error deleting symbol:', error);
            NeuroSarathi.UI.Toasts.show('Failed to remove symbol', 'error');
            return false;
        }
    },

    // Update board
    update: async function(boardId, updates) {
        try {
            const { data, error } = await supabase
                .from('communication_boards')
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', boardId)
                .select();

            if (error) throw error;
            await this.load();
            NeuroSarathi.UI.Toasts.show('Board updated', 'success');
            return data[0];
        } catch (error) {
            console.error('Error updating board:', error);
            NeuroSarathi.UI.Toasts.show('Failed to update board', 'error');
            return null;
        }
    },

    // Delete board
    delete: async function(boardId) {
        try {
            const { error } = await supabase
                .from('communication_boards')
                .delete()
                .eq('id', boardId);

            if (error) throw error;
            
            await this.load();
            NeuroSarathi.UI.Toasts.show('Communication board deleted', 'success');
            return true;
        } catch (error) {
            console.error('Error deleting board:', error);
            NeuroSarathi.UI.Toasts.show('Failed to delete board', 'error');
            return false;
        }
    },

    // Get boards by type
    getByType: function(boardType) {
        const boards = NeuroSarathi.State.get('aacBoards') || [];
        return boards.filter(b => b.board_type === boardType);
    },

    // Speak symbol (text-to-speech)
    speakSymbol: async function(symbolText) {
        try {
            if ('speechSynthesis' in window) {
                const utterance = new SpeechSynthesisUtterance(symbolText);
                utterance.rate = 0.9;
                utterance.pitch = 1;
                window.speechSynthesis.speak(utterance);
            }
        } catch (error) {
            console.error('Error speaking symbol:', error);
        }
    },

    // Generate suggested symbols for board
    generateSuggestedSymbols: function(boardType) {
        const suggestions = {
            daily: [
                { name: 'Eat', category: 'daily' },
                { name: 'Drink', category: 'daily' },
                { name: 'Sleep', category: 'daily' },
                { name: 'Bath', category: 'daily' },
                { name: 'Play', category: 'daily' },
                { name: 'School', category: 'daily' },
                { name: 'Home', category: 'daily' },
                { name: 'Bathroom', category: 'daily' }
            ],
            emotions: [
                { name: 'Happy', category: 'emotions' },
                { name: 'Sad', category: 'emotions' },
                { name: 'Angry', category: 'emotions' },
                { name: 'Scared', category: 'emotions' },
                { name: 'Tired', category: 'emotions' },
                { name: 'Excited', category: 'emotions' },
                { name: 'Calm', category: 'emotions' },
                { name: 'Confused', category: 'emotions' }
            ],
            speech: [
                { name: 'Yes', category: 'speech' },
                { name: 'No', category: 'speech' },
                { name: 'Help', category: 'speech' },
                { name: 'Stop', category: 'speech' },
                { name: 'More', category: 'speech' },
                { name: 'Please', category: 'speech' },
                { name: 'Thank You', category: 'speech' },
                { name: 'I want', category: 'speech' }
            ],
            social: [
                { name: 'Hello', category: 'social' },
                { name: 'Goodbye', category: 'social' },
                { name: 'Sorry', category: 'social' },
                { name: 'Excuse Me', category: 'social' },
                { name: 'Friend', category: 'social' },
                { name: 'Mom', category: 'social' },
                { name: 'Dad', category: 'social' },
                { name: 'Teacher', category: 'social' }
            ]
        };

        return suggestions[boardType] || [];
    },

    // Show add board modal
    showAddModal: function() {
        const boardTypes = [
            'Custom', 'Daily Activities', 'Emotions',
            'Speech Basics', 'Social Interaction'
        ];

        const typeOptions = boardTypes.map(t => 
            `<option value="${t.toLowerCase().replace(/\s+/g, '_')}">${t}</option>`
        ).join('');

        NeuroSarathi.UI.Modals.create({
            id: 'addBoardModal',
            size: 'modal-lg',
            header: '💬 Create Communication Board',
            body: `
                <form id="addBoardForm">
                    <div class="form-group">
                        <label class="form-label">Board Name *</label>
                        <input type="text" class="form-control" id="boardNameInput" 
                               placeholder="e.g., Daily Communication" required />
                    </div>

                    <div class="form-group">
                        <label class="form-label">Description</label>
                        <textarea class="form-control" id="boardDescInput" 
                                  placeholder="What is this board for?" rows="2"></textarea>
                    </div>

                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label class="form-label">Board Type</label>
                            <select class="form-control form-select" id="boardTypeInput">
                                <option value="custom">Custom</option>
                                ${typeOptions}
                            </select>
                        </div>
                        <div class="form-group col-md-6">
                            <label class="form-label">Layout Type</label>
                            <select class="form-control form-select" id="layoutTypeInput">
                                <option value="grid">Grid (3 columns)</option>
                                <option value="linear">Linear (horizontal)</option>
                                <option value="circular">Circular</option>
                            </select>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-checkbox">
                            <input type="checkbox" id="boardPublicInput" />
                            <span>Make board public (others can view)</span>
                        </label>
                    </div>
                </form>
            `,
            footer: `
                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-primary" id="saveBoardBtn">Create Board</button>
            `,
            onShow: function() {
                document.getElementById('saveBoardBtn').addEventListener('click', async function() {
                    const formData = {
                        name: document.getElementById('boardNameInput').value,
                        description: document.getElementById('boardDescInput').value,
                        board_type: document.getElementById('boardTypeInput').value,
                        layout_type: document.getElementById('layoutTypeInput').value,
                        is_public: document.getElementById('boardPublicInput').checked
                    };

                    if (!formData.name) {
                        NeuroSarathi.UI.Toasts.show('Please enter a board name', 'warning');
                        return;
                    }

                    await NeuroSarathi.AACBoard.create(formData);
                    document.querySelector('[data-dismiss="modal"]').click();
                });
            }
        });
    }
};

window.NeuroSarathi = NeuroSarathi;
console.log('✅ AAC Board module loaded');