// Reading Focus Mode - Content Script

class ReadingFocusContent {
    constructor() {
        this.focusMode = false;
        this.currentTheme = 'light';
        this.systemTheme = false;
        this.init();
    }

    async init() {
        await this.loadSettings();
        this.setupMessageListener();
        this.setupSystemThemeListener();
        this.setupStorageListener();
        
        // Apply settings on page load
        if (this.focusMode) {
            this.applyFocusMode();
        }
    }

    async loadSettings() {
        try {
            const result = await chrome.storage.sync.get(['focusMode', 'theme', 'systemTheme']);
            this.focusMode = result.focusMode || false;
            this.currentTheme = result.theme || 'light';
            this.systemTheme = result.systemTheme || false;
            
            if (this.systemTheme) {
                this.detectAndApplySystemTheme();
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupMessageListener() {
        // Listen for messages from popup
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            console.log('Content script received message:', message);
            if (message.action === 'toggleFocusMode') {
                this.focusMode = message.enabled;
                this.currentTheme = message.theme;
                console.log('Applying focus mode:', this.focusMode, 'with theme:', this.currentTheme);
                this.applyFocusMode();
                sendResponse({ success: true });
            }
        });
    }

    setupSystemThemeListener() {
        // Listen for system theme changes
        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addListener((e) => {
                if (this.systemTheme) {
                    this.currentTheme = e.matches ? 'dark' : 'light';
                    if (this.focusMode) {
                        this.applyFocusMode();
                    }
                }
            });
        }
    }

    setupStorageListener() {
        // Listen for storage changes
        chrome.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'sync') {
                if (changes.focusMode) {
                    this.focusMode = changes.focusMode.newValue;
                    this.applyFocusMode();
                }
                if (changes.theme) {
                    this.currentTheme = changes.theme.newValue;
                    if (this.focusMode) {
                        this.applyFocusMode();
                    }
                }
                if (changes.systemTheme) {
                    this.systemTheme = changes.systemTheme.newValue;
                    if (this.systemTheme) {
                        this.detectAndApplySystemTheme();
                    }
                }
            }
        });
    }

    detectAndApplySystemTheme() {
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            this.currentTheme = 'dark';
        } else {
            this.currentTheme = 'light';
        }
    }

    applyFocusMode() {
        const EXTENSION_ID = 'reading-focus-mode';
        
        // Remove existing focus mode elements
        const existingContainer = document.getElementById(EXTENSION_ID);
        if (existingContainer) {
            existingContainer.remove();
        }

        if (!this.focusMode) {
            // Also remove any injected styles
            const styleElement = document.getElementById(EXTENSION_ID + '-styles');
            if (styleElement) {
                styleElement.remove();
            }
            return;
        }

        // Block ads and distractions using CSS
        this.injectAdBlockingCSS();

        // Create focus mode overlay
        this.createFocusOverlay();
    }

    injectAdBlockingCSS() {
        const STYLE_ID = 'reading-focus-mode-styles';
        
        // Remove existing styles
        const existingStyles = document.getElementById(STYLE_ID);
        if (existingStyles) {
            existingStyles.remove();
        }

        const adBlockingCSS = `
            /* Hide common ad selectors */
            .ad, .ads, .advertisement, .advertising,
            [class*="ad-"], [class*="ads-"], [class*="advert"],
            [id*="ad-"], [id*="ads-"], [id*="advert"],
            .banner, .popup, .modal, .overlay,
            .sidebar, .navigation, .nav, .menu,
            .header, .footer, .social, .share,
            .comment, .comments, .related, .recommended,
            iframe[src*="doubleclick"],
            iframe[src*="googlesyndication"],
            iframe[src*="amazon-adsystem"],
            div[id*="google_ads"],
            div[class*="google-ads"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                height: 0 !important;
                width: 0 !important;
                margin: 0 !important;
                padding: 0 !important;
            }

            /* Hide video ads */
            video[src*="ad"], video[src*="advertisement"] {
                display: none !important;
            }

            /* Clean up the page layout */
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
                line-height: 1.6 !important;
                max-width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
            }
        `;

        const styleElement = document.createElement('style');
        styleElement.id = STYLE_ID;
        styleElement.textContent = adBlockingCSS;
        document.head.appendChild(styleElement);
    }

    createFocusOverlay() {
        const EXTENSION_ID = 'reading-focus-mode';
        
        // Create focus mode container
        const container = document.createElement('div');
        container.id = EXTENSION_ID;
        container.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            z-index: 999999 !important;
            overflow-y: auto !important;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
            animation: fadeIn 0.3s ease-in-out !important;
        `;

        // Apply theme styles
        const themes = {
            light: {
                background: '#ffffff',
                color: '#333333',
                linkColor: '#0066cc'
            },
            dark: {
                background: '#1a1a1a',
                color: '#e0e0e0',
                linkColor: '#66b3ff'
            },
            paper: {
                background: '#f5f5dc',
                color: '#2f2f2f',
                linkColor: '#8b4513'
            }
        };

        const currentTheme = themes[this.currentTheme] || themes.light;
        container.style.backgroundColor = currentTheme.background;
        container.style.color = currentTheme.color;

        // Extract main content
        const content = this.extractMainContent();
        
        if (content) {
            const contentDiv = document.createElement('div');
            contentDiv.style.cssText = `
                max-width: 800px !important;
                margin: 0 auto !important;
                padding: 40px 20px !important;
                line-height: 1.6 !important;
                font-size: 18px !important;
            `;

            // Style all elements within content
            contentDiv.innerHTML = content;
            this.styleContentElements(contentDiv, currentTheme);
            
            container.appendChild(contentDiv);
        } else {
            container.innerHTML = '<div style="text-align: center; padding: 50px; font-size: 18px;">No readable content found on this page.</div>';
        }

        // Add close button
        const closeBtn = document.createElement('button');
        closeBtn.innerHTML = '✕';
        closeBtn.style.cssText = `
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: ${currentTheme.color} !important;
            color: ${currentTheme.background} !important;
            border: none !important;
            width: 40px !important;
            height: 40px !important;
            border-radius: 50% !important;
            font-size: 18px !important;
            cursor: pointer !important;
            z-index: 1000000 !important;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3) !important;
            transition: all 0.3s ease !important;
        `;
        
        closeBtn.onmouseover = () => {
            closeBtn.style.transform = 'scale(1.1)';
        };
        closeBtn.onmouseout = () => {
            closeBtn.style.transform = 'scale(1)';
        };
        
        closeBtn.onclick = () => {
            container.remove();
            this.focusMode = false;
            chrome.storage.sync.set({ focusMode: false });
        };

        // Add keyboard shortcut to close (ESC key)
        const handleKeydown = (e) => {
            if (e.key === 'Escape' && document.getElementById(EXTENSION_ID)) {
                container.remove();
                this.focusMode = false;
                chrome.storage.sync.set({ focusMode: false });
                document.removeEventListener('keydown', handleKeydown);
            }
        };
        document.addEventListener('keydown', handleKeydown);

        container.appendChild(closeBtn);
        document.body.appendChild(container);

        // Add fadeIn animation
        const style = document.createElement('style');
        style.textContent = `
            @keyframes fadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }

    extractMainContent() {
        // Try different selectors for main content
        const selectors = [
            'article',
            'main',
            '[role="main"]',
            '.content',
            '.post-content',
            '.article-content',
            '.entry-content',
            '.post-body',
            '.article-body',
            'p'
        ];

        for (const selector of selectors) {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                let content = '';
                elements.forEach(el => {
                    // Skip if element contains ads or is likely an ad
                    if (this.isAdElement(el) || el.textContent.length < 100) {
                        return;
                    }
                    content += el.outerHTML;
                });
                if (content.length > 200) return content;
            }
        }

        // Fallback: get all paragraph text
        const paragraphs = document.querySelectorAll('p');
        let content = '';
        paragraphs.forEach(p => {
            if (!this.isAdElement(p) && p.textContent.length > 50) {
                content += p.outerHTML;
            }
        });
        return content;
    }

    isAdElement(element) {
        const adKeywords = ['ad', 'advertisement', 'banner', 'promo', 'sponsor'];
        const className = element.className ? element.className.toLowerCase() : '';
        const id = element.id ? element.id.toLowerCase() : '';
        
        return adKeywords.some(keyword => 
            className.includes(keyword) || id.includes(keyword)
        );
    }

    styleContentElements(container, theme) {
        // Style headings
        const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6');
        headings.forEach(h => {
            h.style.color = theme.color;
            h.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            h.style.marginTop = '30px';
            h.style.marginBottom = '15px';
            h.style.fontWeight = 'bold';
        });

        // Style paragraphs
        const paragraphs = container.querySelectorAll('p');
        paragraphs.forEach(p => {
            p.style.color = theme.color;
            p.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            p.style.lineHeight = '1.6';
            p.style.marginBottom = '15px';
            p.style.fontSize = '18px';
        });

        // Style links
        const links = container.querySelectorAll('a');
        links.forEach(a => {
            a.style.color = theme.linkColor;
            a.style.textDecoration = 'underline';
        });

        // Style lists
        const lists = container.querySelectorAll('ul, ol');
        lists.forEach(list => {
            list.style.color = theme.color;
            list.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            list.style.marginBottom = '15px';
        });

        // Style blockquotes
        const blockquotes = container.querySelectorAll('blockquote');
        blockquotes.forEach(bq => {
            bq.style.color = theme.color;
            bq.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            bq.style.borderLeft = `4px solid ${theme.linkColor}`;
            bq.style.paddingLeft = '20px';
            bq.style.fontStyle = 'italic';
            bq.style.marginBottom = '15px';
        });

        // Remove or hide images and ads
        const mediaElements = container.querySelectorAll('img, iframe, video, embed, object');
        mediaElements.forEach(media => {
            if (this.isAdElement(media) || (media.src && (
                media.src.includes('doubleclick') ||
                media.src.includes('googlesyndication') ||
                media.src.includes('amazon-adsystem')
            ))) {
                media.remove();
            } else {
                // Keep non-ad images but style them
                media.style.maxWidth = '100%';
                media.style.height = 'auto';
                media.style.display = 'block';
                media.style.margin = '20px auto';
                media.style.borderRadius = '5px';
            }
        });

        // Style tables
        const tables = container.querySelectorAll('table');
        tables.forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.margin = '15px 0';
            table.style.fontFamily = "'Helvetica Neue', Helvetica, Arial, sans-serif";
            
            const cells = table.querySelectorAll('th, td');
            cells.forEach(cell => {
                cell.style.padding = '12px';
                cell.style.textAlign = 'left';
                cell.style.borderBottom = `1px solid ${theme.color}40`;
                cell.style.color = theme.color;
            });
            
            const headers = table.querySelectorAll('th');
            headers.forEach(header => {
                header.style.fontWeight = 'bold';
                header.style.backgroundColor = `${theme.color}10`;
            });
        });

        // Style code blocks
        const codeBlocks = container.querySelectorAll('code, pre');
        codeBlocks.forEach(code => {
            code.style.fontFamily = "'Courier New', Courier, monospace";
            code.style.backgroundColor = `${theme.color}10`;
            code.style.color = theme.color;
            code.style.padding = '2px 4px';
            code.style.borderRadius = '3px';
        });
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new ReadingFocusContent();
    });
} else {
    new ReadingFocusContent();
}