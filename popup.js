// Reading Focus Mode - Popup Script

class ReadingFocusPopup {
    constructor() {
        this.focusMode = false;
        this.currentTheme = 'light';
        this.systemTheme = false;
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupEventListeners();
        this.updateUI();
        this.detectSystemTheme();
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['focusMode', 'theme', 'systemTheme']);
            this.focusMode = result.focusMode || false;
            this.currentTheme = result.theme || 'light';
            this.systemTheme = result.systemTheme || false;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async saveSettings() {
        try {
            await chrome.storage.sync.set({
                focusMode: this.focusMode,
                theme: this.currentTheme,
                systemTheme: this.systemTheme
            });
        } catch (error) {
            console.error('Error saving settings:', error);
        }
    }

    setupEventListeners() {
        // Focus mode toggle
        const focusToggle = document.getElementById('focusToggle');
        focusToggle.addEventListener('click', () => this.toggleFocusMode());

        // Theme buttons
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setTheme(e.target.dataset.theme);
            });
        });

        // System theme checkbox
        const systemThemeCheckbox = document.getElementById('systemTheme');
        systemThemeCheckbox.addEventListener('change', (e) => {
            this.systemTheme = e.target.checked;
            this.saveSettings();
            if (this.systemTheme) {
                this.applySystemTheme();
            }
            this.updateUI();
        });
    }

    async toggleFocusMode() {
        this.focusMode = !this.focusMode;
        await this.saveSettings();
        await this.applyToCurrentTab();
        this.updateUI();
    }

    async setTheme(theme) {
        if (this.systemTheme) return; // Don't allow manual theme change when system theme is enabled
        
        this.currentTheme = theme;
        await this.saveSettings();
        await this.applyToCurrentTab();
        this.updateUI();
    }

    detectSystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            if (this.systemTheme) {
                this.currentTheme = 'dark';
            }
        } else {
            if (this.systemTheme) {
                this.currentTheme = 'light';
            }
        }

        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener((e) => {
                if (this.systemTheme) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    this.saveSettings();
                    this.applyToCurrentTab();
                    this.updateUI();
                }
            });
        }
    }

    applySystemTheme() {
        this.detectSystemTheme();
        this.applyToCurrentTab();
    }

    async applyToCurrentTab() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            console.log('Sending message to tab:', tab.id, 'with data:', {
                action: 'toggleFocusMode',
                enabled: this.focusMode,
                theme: this.currentTheme
            });
            await chrome.tabs.sendMessage(tab.id, {
                action: 'toggleFocusMode',
                enabled: this.focusMode,
                theme: this.currentTheme
            });
        } catch (error) {
            console.error('Error applying to current tab:', error);
        }
    }

    // Removed function injection; we now message the content script

    updateUI() {
        // Update focus toggle button
        const focusToggle = document.getElementById('focusToggle');
        const statusIndicator = document.getElementById('statusIndicator');
        
        if (this.focusMode) {
            focusToggle.innerHTML = '<span class="status-indicator active" id="statusIndicator"></span>Disable Focus Mode';
            focusToggle.classList.add('active');
            statusIndicator.classList.remove('inactive');
        } else {
            focusToggle.innerHTML = '<span class="status-indicator inactive" id="statusIndicator"></span>Enable Focus Mode';
            focusToggle.classList.remove('active');
        }

        // Update theme buttons
        const themeButtons = document.querySelectorAll('.theme-btn');
        themeButtons.forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === this.currentTheme) {
                btn.classList.add('active');
            }
            // Disable theme buttons when system theme is enabled
            btn.style.opacity = this.systemTheme ? '0.5' : '1';
            btn.style.pointerEvents = this.systemTheme ? 'none' : 'auto';
        });

        // Update system theme checkbox
        const systemThemeCheckbox = document.getElementById('systemTheme');
        systemThemeCheckbox.checked = this.systemTheme;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ReadingFocusPopup();
});