// Configuration and constants
const CONFIG = {
    ADMIN_PASSWORD: 'admin123', // Change this in production
    STORAGE_KEYS: {
        PROJECTS: 'portfolioProjects',
        SETTINGS: 'portfolioSettings',
        PROFILE: 'portfolioProfile',
        AUTH: 'portfolioAuth'
    },
    DEFAULT_SETTINGS: {
        storageMethod: 'local',
        githubToken: '',
        githubUrl: '',
        defaultView: 'grid',
        displayMode: 'both',
        cardStyle: 'github',
        language: 'ar'
    },
    DEFAULT_PROFILE: {
        name: { ar: 'اسم المطور', en: 'Developer Name' },
        title: { ar: 'مطور ويب', en: 'Web Developer' },
        bio: { ar: 'مرحباً بك في بروفايلي الشخصي', en: 'Welcome to my personal portfolio' },
        imageUrl: '',
        heroTitle: { ar: 'معرض المشاريع', en: 'Projects Gallery' },
        heroDescription: { ar: 'مجموعة مختارة من أعمالي في تطوير الويب والبرمجة', en: 'A curated collection of my web development and programming work' },
        footerText: { ar: '© 2024 جميع الحقوق محفوظة', en: '© 2024 All rights reserved' },
        socialLinks: {
            github: '',
            twitter: '',
            linkedin: ''
        }
    }
};

// Utility functions
const Utils = {
    // Generate unique ID
    generateId: () => Date.now().toString(36) + Math.random().toString(36).substr(2),
    
    // Get current language
    getCurrentLanguage: () => {
        return document.documentElement.getAttribute('lang') || 'ar';
    },
    
    // Set language and direction
    setLanguage: (lang) => {
        document.documentElement.setAttribute('lang', lang);
        document.documentElement.setAttribute('dir', lang === 'ar' ? 'rtl' : 'ltr');
        
        // Update all translatable elements
        document.querySelectorAll('[data-ar][data-en]').forEach(element => {
            const text = element.getAttribute(`data-${lang}`);
            if (text) {
                if (element.tagName === 'INPUT' && element.type !== 'submit') {
                    element.placeholder = text;
                } else {
                    element.textContent = text;
                }
            }
        });
        
        // Update select options
        document.querySelectorAll('option[data-ar][data-en]').forEach(option => {
            const text = option.getAttribute(`data-${lang}`);
            if (text) option.textContent = text;
        });
    },
    
    // Show loading state
    showLoading: (container, message = null) => {
        const lang = Utils.getCurrentLanguage();
        const loadingMessage = message || (lang === 'ar' ? 'جاري التحميل...' : 'Loading...');
        
        container.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>${loadingMessage}</p>
            </div>
        `;
    },
    
    // Show error message
    showError: (container, message) => {
        container.innerHTML = `
            <div class="error-message">
                <p style="color: var(--error-color); text-align: center; padding: 2rem;">
                    ${message}
                </p>
            </div>
        `;
    },
    
    // Format date
    formatDate: (date) => {
        const lang = Utils.getCurrentLanguage();
        return new Date(date).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-US');
    },
    
    // Debounce function
    debounce: (func, wait) => {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Storage manager
class StorageManager {
    constructor() {
        this.settings = this.getSettings();
        this.profile = this.getProfile();
    }
    
    // Get settings
    getSettings() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.SETTINGS);
            return stored ? { ...CONFIG.DEFAULT_SETTINGS, ...JSON.parse(stored) } : CONFIG.DEFAULT_SETTINGS;
        } catch (error) {
            console.error('Error loading settings:', error);
            return CONFIG.DEFAULT_SETTINGS;
        }
    }
    
    // Save settings
    saveSettings(settings) {
        try {
            this.settings = { ...this.settings, ...settings };
            localStorage.setItem(CONFIG.STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }
    
    // Get profile
    getProfile() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.PROFILE);
            return stored ? { ...CONFIG.DEFAULT_PROFILE, ...JSON.parse(stored) } : CONFIG.DEFAULT_PROFILE;
        } catch (error) {
            console.error('Error loading profile:', error);
            return CONFIG.DEFAULT_PROFILE;
        }
    }
    
    // Save profile
    saveProfile(profile) {
        try {
            this.profile = { ...this.profile, ...profile };
            localStorage.setItem(CONFIG.STORAGE_KEYS.PROFILE, JSON.stringify(this.profile));
            return true;
        } catch (error) {
            console.error('Error saving profile:', error);
            return false;
        }
    }
    
    // Get projects from localStorage
    getLocalProjects() {
        try {
            const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.PROJECTS);
            return stored ? JSON.parse(stored) : [];
        } catch (error) {
            console.error('Error loading local projects:', error);
            return [];
        }
    }
    
    // Save projects to localStorage
    saveLocalProjects(projects) {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
            return true;
        } catch (error) {
            console.error('Error saving local projects:', error);
            return false;
        }
    }
    
    // Get projects from GitHub
    async getGithubProjects() {
        const { githubToken, githubUrl } = this.settings;
        
        if (!githubToken || !githubUrl) {
            throw new Error('GitHub configuration incomplete');
        }
        
        try {
            let apiUrl;
            
            // Check if it's a Gist ID or repo path
            if (githubUrl.includes('/')) {
                // Repository path format: username/repo/path/to/file
                apiUrl = `https://api.github.com/repos/${githubUrl}/contents`;
            } else {
                // Gist ID format
                apiUrl = `https://api.github.com/gists/${githubUrl}`;
            }
            
            const response = await fetch(apiUrl, {
                headers: {
                    'Authorization': `token ${githubToken}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            // Handle different response formats
            if (data.files) {
                // Gist response
                const projectsFile = data.files['projects.json'];
                if (projectsFile) {
                    return JSON.parse(projectsFile.content);
                }
            } else if (data.content) {
                // Repository file response
                const content = atob(data.content);
                return JSON.parse(content);
            }
            
            return [];
        } catch (error) {
            console.error('Error loading GitHub projects:', error);
            throw error;
        }
    }
    
    // Save projects to GitHub
    async saveGithubProjects(projects) {
        const { githubToken, githubUrl } = this.settings;
        
        if (!githubToken || !githubUrl) {
            throw new Error('GitHub configuration incomplete');
        }
        
        try {
            const content = JSON.stringify(projects, null, 2);
            
            if (githubUrl.includes('/')) {
                // Repository file update
                const [owner, repo, ...pathParts] = githubUrl.split('/');
                const path = pathParts.join('/');
                
                // Get current file SHA
                const getResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json'
                    }
                });
                
                const currentFile = getResponse.ok ? await getResponse.json() : null;
                
                const updateData = {
                    message: 'Update projects data',
                    content: btoa(content),
                    ...(currentFile && { sha: currentFile.sha })
                };
                
                const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updateData)
                });
                
                if (!response.ok) {
                    throw new Error(`GitHub API error: ${response.status}`);
                }
            } else {
                // Gist update
                const response = await fetch(`https://api.github.com/gists/${githubUrl}`, {
                    method: 'PATCH',
                    headers: {
                        'Authorization': `token ${githubToken}`,
                        'Accept': 'application/vnd.github.v3+json',
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        files: {
                            'projects.json': {
                                content: content
                            }
                        }
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`GitHub API error: ${response.status}`);
                }
            }
            
            return true;
        } catch (error) {
            console.error('Error saving GitHub projects:', error);
            throw error;
        }
    }
    
    // Get projects based on current storage method
    async getProjects() {
        if (this.settings.storageMethod === 'github') {
            return await this.getGithubProjects();
        } else {
            return this.getLocalProjects();
        }
    }
    
    // Save projects based on current storage method
    async saveProjects(projects) {
        if (this.settings.storageMethod === 'github') {
            await this.saveGithubProjects(projects);
        } else {
            this.saveLocalProjects(projects);
        }
        return true;
    }
}

// Theme manager
class ThemeManager {
    constructor() {
        this.init();
    }
    
    init() {
        // Get stored theme or use system preference
        const storedTheme = localStorage.getItem('theme');
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        const theme = storedTheme || systemTheme;
        
        this.setTheme(theme);
        
        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('theme')) {
                this.setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
}

// Project showcase class
class ProjectShowcase {
    constructor() {
        this.storage = new StorageManager();
        this.theme = new ThemeManager();
        this.projects = [];
        this.currentView = 'grid';
        this.currentLanguage = 'ar';
        
        // Bind methods
        this.handleViewChange = this.handleViewChange.bind(this);
        this.handleLanguageToggle = this.handleLanguageToggle.bind(this);
    }
    
    async init() {
        this.setupEventListeners();
        this.loadSettings();
        this.loadProfile();
        await this.loadProjects();
        this.renderProjects();
    }
    
    loadSettings() {
        const settings = this.storage.getSettings();
        this.currentView = settings.defaultView || 'grid';
        this.currentLanguage = settings.language || 'ar';
        
        // Apply language
        Utils.setLanguage(this.currentLanguage);
        
        // Update language toggle button
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            const langText = langToggle.querySelector('.lang-text');
            if (langText) {
                langText.textContent = this.currentLanguage === 'ar' ? 'EN' : 'AR';
            }
        }
        
        // Apply view
        this.setActiveView(this.currentView);
        
        // Apply card style
        this.applyCardStyle(settings.cardStyle || 'github');
    }
    
    loadProfile() {
        const profile = this.storage.getProfile();
        const lang = this.currentLanguage;
        
        // Update profile information
        const profileName = document.getElementById('profileName');
        const profileTitle = document.getElementById('profileTitle');
        const profileBio = document.getElementById('profileBio');
        const heroTitle = document.getElementById('heroTitle');
        const heroDescription = document.getElementById('heroDescription');
        const footerText = document.getElementById('footerText');
        const portfolioTitle = document.getElementById('portfolioTitle');
        
        if (profileName) profileName.textContent = profile.name[lang] || profile.name.ar;
        if (profileTitle) profileTitle.textContent = profile.title[lang] || profile.title.ar;
        if (profileBio) profileBio.textContent = profile.bio[lang] || profile.bio.ar;
        if (heroTitle) heroTitle.textContent = profile.heroTitle[lang] || profile.heroTitle.ar;
        if (heroDescription) heroDescription.textContent = profile.heroDescription[lang] || profile.heroDescription.ar;
        if (footerText) footerText.textContent = profile.footerText[lang] || profile.footerText.ar;
        if (portfolioTitle) portfolioTitle.textContent = profile.name[lang] || profile.name.ar;
        
        // Update profile image
        const profileImageContainer = document.getElementById('profileImageContainer');
        if (profileImageContainer && profile.imageUrl) {
            profileImageContainer.innerHTML = `<img src="${profile.imageUrl}" alt="${profile.name[lang]}" class="profile-image">`;
        }
        
        // Update social links
        this.updateSocialLinks(profile.socialLinks);
    }
    
    updateSocialLinks(socialLinks) {
        const socialLinksContainer = document.getElementById('socialLinks');
        if (!socialLinksContainer) return;
        
        let linksHTML = '';
        
        if (socialLinks.github) {
            linksHTML += `
                <a href="${socialLinks.github}" target="_blank" aria-label="GitHub">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                    </svg>
                </a>
            `;
        }
        
        if (socialLinks.twitter) {
            linksHTML += `
                <a href="${socialLinks.twitter}" target="_blank" aria-label="Twitter">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                    </svg>
                </a>
            `;
        }
        
        if (socialLinks.linkedin) {
            linksHTML += `
                <a href="${socialLinks.linkedin}" target="_blank" aria-label="LinkedIn">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                </a>
            `;
        }
        
        socialLinksContainer.innerHTML = linksHTML;
    }
    
    setupEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.theme.toggleTheme());
        }
        
        // Language toggle
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', this.handleLanguageToggle);
        }
        
        // View buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', this.handleViewChange);
        });
    }
    
    handleLanguageToggle() {
        this.currentLanguage = this.currentLanguage === 'ar' ? 'en' : 'ar';
        Utils.setLanguage(this.currentLanguage);
        
        // Update button text
        const langText = document.querySelector('#langToggle .lang-text');
        if (langText) {
            langText.textContent = this.currentLanguage === 'ar' ? 'EN' : 'AR';
        }
        
        // Save language preference
        this.storage.saveSettings({ language: this.currentLanguage });
        
        // Re-load profile and re-render projects to update language
        this.loadProfile();
        this.renderProjects();
    }
    
    handleViewChange(e) {
        const view = e.target.closest('.view-btn').dataset.view;
        if (view) {
            this.currentView = view;
            this.setActiveView(view);
            this.renderProjects();
        }
    }
    
    setActiveView(view) {
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-view="${view}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }
    
    applyCardStyle(style) {
        const projectsContainer = document.getElementById('projectsContainer');
        if (projectsContainer) {
            // Remove existing style classes
            projectsContainer.classList.remove('github', 'modern', 'minimal');
            // Add new style class
            projectsContainer.classList.add(style);
        }
    }
    
    async loadProjects() {
        const container = document.getElementById('projectsContainer');
        
        try {
            Utils.showLoading(container);
            this.projects = await this.storage.getProjects();
        } catch (error) {
            console.error('Error loading projects:', error);
            const lang = Utils.getCurrentLanguage();
            const errorMessage = lang === 'ar' 
                ? 'حدث خطأ في تحميل المشاريع' 
                : 'Error loading projects';
            Utils.showError(container, errorMessage);
        }
    }
    
    renderProjects() {
        const container = document.getElementById('projectsContainer');
        
        if (this.projects.length === 0) {
            const lang = Utils.getCurrentLanguage();
            const noProjectsMessage = lang === 'ar' 
                ? 'لا توجد مشاريع لعرضها' 
                : 'No projects to display';
            
            container.innerHTML = `
                <div class="no-projects">
                    <p style="text-align: center; color: var(--text-secondary); padding: 4rem 0;">
                        ${noProjectsMessage}
                    </p>
                </div>
            `;
            return;
        }
        
        const viewClass = this.currentView === 'grid' ? 'projects-grid' : 'projects-list';
        const cardStyle = this.storage.settings.cardStyle || 'github';
        const projectsHTML = this.projects.map(project => this.renderProjectCard(project)).join('');
        
        container.innerHTML = `<div class="${viewClass} ${cardStyle}">${projectsHTML}</div>`;
    }
    
    renderProjectCard(project) {
        const lang = this.currentLanguage;
        const title = project.title[lang] || project.title.ar || project.title.en;
        const description = project.description[lang] || project.description.ar || project.description.en;
        
        const imageSection = project.imageUrl && this.storage.settings.displayMode !== 'text'
            ? `<img src="${project.imageUrl}" alt="${title}" class="project-image" loading="lazy">`
            : '';
        
        const technologies = project.technologies 
            ? project.technologies.split(',').map(tech => 
                `<span class="tech-tag">${tech.trim()}</span>`
              ).join('')
            : '';
        
        const githubLink = project.githubUrl 
            ? `<a href="${project.githubUrl}" target="_blank" class="project-link">
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.91 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                ${lang === 'ar' ? 'الكود' : 'Code'}
            </a>`
            : '';
        
        const liveLink = project.liveUrl 
            ? `<a href="${project.liveUrl}" target="_blank" class="project-link">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                    <polyline points="15,3 21,3 21,9"/>
                    <line x1="10" y1="14" x2="21" y2="3"/>
                </svg>
                ${lang === 'ar' ? 'معاينة' : 'Demo'}
            </a>`
            : '';
        
        return `
            <article class="project-card">
                ${imageSection}
                <div class="project-content">
                    <div class="project-header">
                        <h3 class="project-title">${title}</h3>
                    </div>
                    ${this.storage.settings.displayMode !== 'image' ? `
                        <p class="project-description">${description}</p>
                        <div class="project-technologies">${technologies}</div>
                    ` : ''}
                    <div class="project-links">
                        ${githubLink}
                        ${liveLink}
                    </div>
                </div>
            </article>
        `;
    }
}

// Admin dashboard class
class AdminDashboard {
    constructor() {
        this.storage = new StorageManager();
        this.theme = new ThemeManager();
        this.projects = [];
        this.editingProject = null;
        this.isAuthenticated = false;
        
        // Bind methods
        this.handleLogin = this.handleLogin.bind(this);
        this.handleLogout = this.handleLogout.bind(this);
        this.handleAddProject = this.handleAddProject.bind(this);
        this.handleSaveProject = this.handleSaveProject.bind(this);
        this.handleEditProject = this.handleEditProject.bind(this);
        this.handleDeleteProject = this.handleDeleteProject.bind(this);
        this.handleSaveSettings = this.handleSaveSettings.bind(this);
        this.handleSaveProfileSettings = this.handleSaveProfileSettings.bind(this);
    }
    
    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        
        if (this.isAuthenticated) {
            this.showDashboard();
        } else {
            this.showLogin();
        }
    }
    
    checkAuthentication() {
        const authData = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH);
        this.isAuthenticated = authData === 'authenticated';
    }
    
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', this.handleLogin);
        }
        
        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', this.handleLogout);
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.theme.toggleTheme());
        }
        
        // Language toggle
        const langToggle = document.getElementById('langToggle');
        if (langToggle) {
            langToggle.addEventListener('click', this.handleLanguageToggle.bind(this));
        }
        
        // Profile settings
        const saveProfileSettingsBtn = document.getElementById('saveProfileSettings');
        if (saveProfileSettingsBtn) {
            saveProfileSettingsBtn.addEventListener('click', this.handleSaveProfileSettings);
        }
        
        // Settings
        const saveSettingsBtn = document.getElementById('saveSettings');
        if (saveSettingsBtn) {
            saveSettingsBtn.addEventListener('click', this.handleSaveSettings);
        }
        
        // Storage method change
        const storageMethod = document.getElementById('storageMethod');
        if (storageMethod) {
            storageMethod.addEventListener('change', this.handleStorageMethodChange.bind(this));
        }
        
        // Project form
        const addProjectBtn = document.getElementById('addProjectBtn');
        if (addProjectBtn) {
            addProjectBtn.addEventListener('click', this.handleAddProject);
        }
        
        const projectForm = document.getElementById('projectFormElement');
        if (projectForm) {
            projectForm.addEventListener('submit', this.handleSaveProject);
        }
        
        const closeFormBtn = document.getElementById('closeForm');
        if (closeFormBtn) {
            closeFormBtn.addEventListener('click', this.hideProjectForm);
        }
        
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', this.hideProjectForm);
        }
    }
    
    handleLogin(e) {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        
        if (password === CONFIG.ADMIN_PASSWORD) {
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH, 'authenticated');
            this.isAuthenticated = true;
            this.showDashboard();
        } else {
            errorDiv.style.display = 'block';
            errorDiv.textContent = Utils.getCurrentLanguage() === 'ar' 
                ? 'كلمة مرور غير صحيحة' 
                : 'Invalid password';
        }
    }
    
    handleLogout() {
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH);
        this.isAuthenticated = false;
        this.showLogin();
    }
    
    handleLanguageToggle() {
        const currentLang = Utils.getCurrentLanguage();
        const newLang = currentLang === 'ar' ? 'en' : 'ar';
        Utils.setLanguage(newLang);
        
        // Update button text
        const langText = document.querySelector('#langToggle .lang-text');
        if (langText) {
            langText.textContent = newLang === 'ar' ? 'EN' : 'AR';
        }
        
        // Save language preference
        this.storage.saveSettings({ language: newLang });
    }
    
    handleStorageMethodChange() {
        const method = document.getElementById('storageMethod').value;
        const githubSettings = document.getElementById('githubSettings');
        
        if (method === 'github') {
            githubSettings.style.display = 'block';
        } else {
            githubSettings.style.display = 'none';
        }
    }
    
    async handleSaveProfileSettings() {
        const profileData = {
            name: {
                ar: document.getElementById('profileNameAr').value,
                en: document.getElementById('profileNameEn').value
            },
            title: {
                ar: document.getElementById('profileTitleAr').value,
                en: document.getElementById('profileTitleEn').value
            },
            bio: {
                ar: document.getElementById('profileBioAr').value,
                en: document.getElementById('profileBioEn').value
            },
            imageUrl: document.getElementById('profileImageUrl').value,
            heroTitle: {
                ar: document.getElementById('heroTitleAr').value,
                en: document.getElementById('heroTitleEn').value
            },
            heroDescription: {
                ar: document.getElementById('heroDescriptionAr').value,
                en: document.getElementById('heroDescriptionEn').value
            },
            footerText: {
                ar: document.getElementById('footerTextAr').value,
                en: document.getElementById('footerTextEn').value
            },
            socialLinks: {
                github: document.getElementById('githubSocialUrl').value,
                twitter: document.getElementById('twitterUrl').value,
                linkedin: document.getElementById('linkedinUrl').value
            }
        };
        
        try {
            this.storage.saveProfile(profileData);
            this.showNotification(
                Utils.getCurrentLanguage() === 'ar' 
                    ? 'تم حفظ إعدادات البروفايل بنجاح' 
                    : 'Profile settings saved successfully',
                'success'
            );
        } catch (error) {
            this.showNotification(
                Utils.getCurrentLanguage() === 'ar' 
                    ? 'خطأ في حفظ إعدادات البروفايل' 
                    : 'Error saving profile settings',
                'error'
            );
        }
    }
    
    async handleSaveSettings() {
        const settings = {
            storageMethod: document.getElementById('storageMethod').value,
            githubToken: document.getElementById('githubToken').value,
            githubUrl: document.getElementById('githubUrl').value,
            defaultView: document.getElementById('defaultView').value,
            displayMode: document.getElementById('displayMode').value,
            cardStyle: document.getElementById('cardStyle').value
        };
        
        try {
            this.storage.saveSettings(settings);
            this.showNotification(
                Utils.getCurrentLanguage() === 'ar' 
                    ? 'تم حفظ الإعدادات بنجاح' 
                    : 'Settings saved successfully',
                'success'
            );
        } catch (error) {
            this.showNotification(
                Utils.getCurrentLanguage() === 'ar' 
                    ? 'خطأ في حفظ الإعدادات' 
                    : 'Error saving settings',
                'error'
            );
        }
    }
    
    showLogin() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('adminDashboard').style.display = 'none';
        
        // Apply current language
        const settings = this.storage.getSettings();
        Utils.setLanguage(settings.language || 'ar');
    }
    
    async showDashboard() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('adminDashboard').style.display = 'block';
        
        // Apply current language
        const settings = this.storage.getSettings();
        Utils.setLanguage(settings.language || 'ar');
        
        // Update language toggle
        const langText = document.querySelector('#langToggle .lang-text');
        if (langText) {
            langText.textContent = settings.language === 'ar' ? 'EN' : 'AR';
        }
        
        await this.loadDashboardData();
    }
    
    async loadDashboardData() {
        // Load profile settings
        this.loadProfileSettings();
        
        // Load settings
        this.loadSettings();
        
        // Load projects
        await this.loadProjects();
    }
    
    loadProfileSettings() {
        const profile = this.storage.getProfile();
        
        // Update profile form fields
        document.getElementById('profileNameAr').value = profile.name.ar || '';
        document.getElementById('profileNameEn').value = profile.name.en || '';
        document.getElementById('profileTitleAr').value = profile.title.ar || '';
        document.getElementById('profileTitleEn').value = profile.title.en || '';
        document.getElementById('profileBioAr').value = profile.bio.ar || '';
        document.getElementById('profileBioEn').value = profile.bio.en || '';
        document.getElementById('profileImageUrl').value = profile.imageUrl || '';
        document.getElementById('heroTitleAr').value = profile.heroTitle.ar || '';
        document.getElementById('heroTitleEn').value = profile.heroTitle.en || '';
        document.getElementById('heroDescriptionAr').value = profile.heroDescription.ar || '';
        document.getElementById('heroDescriptionEn').value = profile.heroDescription.en || '';
        document.getElementById('footerTextAr').value = profile.footerText.ar || '';
        document.getElementById('footerTextEn').value = profile.footerText.en || '';
        document.getElementById('githubSocialUrl').value = profile.socialLinks.github || '';
        document.getElementById('twitterUrl').value = profile.socialLinks.twitter || '';
        document.getElementById('linkedinUrl').value = profile.socialLinks.linkedin || '';
    }
    
    loadSettings() {
        const settings = this.storage.getSettings();
        
        // Update form fields
        document.getElementById('storageMethod').value = settings.storageMethod;
        document.getElementById('githubToken').value = settings.githubToken || '';
        document.getElementById('githubUrl').value = settings.githubUrl || '';
        document.getElementById('defaultView').value = settings.defaultView;
        document.getElementById('displayMode').value = settings.displayMode;
        document.getElementById('cardStyle').value = settings.cardStyle || 'github';
        
        // Show/hide GitHub settings
        this.handleStorageMethodChange();
    }
    
    async loadProjects() {
        const container = document.getElementById('projectsList');
        
        try {
            Utils.showLoading(container);
            this.projects = await this.storage.getProjects();
            this.renderProjectsList();
        } catch (error) {
            console.error('Error loading projects:', error);
            const lang = Utils.getCurrentLanguage();
            const errorMessage = lang === 'ar' 
                ? 'حدث خطأ في تحميل المشاريع' 
                : 'Error loading projects';
            Utils.showError(container, errorMessage);
        }
    }
    
    renderProjectsList() {
        const container = document.getElementById('projectsList');
        const lang = Utils.getCurrentLanguage();
        
        if (this.projects.length === 0) {
            const noProjectsMessage = lang === 'ar' 
                ? 'لا توجد مشاريع. ابدأ بإضافة مشروع جديد!' 
                : 'No projects found. Start by adding a new project!';
            
            container.innerHTML = `
                <div class="no-projects">
                    <p style="text-align: center; color: var(--text-secondary); padding: 2rem 0;">
                        ${noProjectsMessage}
                    </p>
                </div>
            `;
            return;
        }
        
        const projectsHTML = this.projects.map(project => {
            const title = project.title[lang] || project.title.ar || project.title.en;
            const editText = lang === 'ar' ? 'تحرير' : 'Edit';
            const deleteText = lang === 'ar' ? 'حذف' : 'Delete';
            
            return `
                <div class="project-item">
                    <div class="project-item-content">
                        <h4 class="project-item-title">${title}</h4>
                        <div class="project-item-meta">
                            <span>${Utils.formatDate(project.createdAt || Date.now())}</span>
                        </div>
                    </div>
                    <div class="project-item-actions">
                        <button class="btn btn-outline btn-sm" onclick="adminDashboard.handleEditProject('${project.id}')">
                            ${editText}
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="adminDashboard.handleDeleteProject('${project.id}')">
                            ${deleteText}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        container.innerHTML = projectsHTML;
    }
    
    handleAddProject() {
        this.editingProject = null;
        this.showProjectForm();
        this.resetProjectForm();
        
        // Update form title
        const formTitle = document.querySelector('.form-title');
        if (formTitle) {
            const lang = Utils.getCurrentLanguage();
            formTitle.textContent = lang === 'ar' ? 'إضافة مشروع جديد' : 'Add New Project';
        }
    }
    
    handleEditProject(projectId) {
        this.editingProject = this.projects.find(p => p.id === projectId);
        if (this.editingProject) {
            this.showProjectForm();
            this.populateProjectForm(this.editingProject);
            
            // Update form title
            const formTitle = document.querySelector('.form-title');
            if (formTitle) {
                const lang = Utils.getCurrentLanguage();
                formTitle.textContent = lang === 'ar' ? 'تحرير المشروع' : 'Edit Project';
            }
        }
    }
    
    async handleDeleteProject(projectId) {
        const lang = Utils.getCurrentLanguage();
        const confirmMessage = lang === 'ar' 
            ? 'هل أنت متأكد من حذف هذا المشروع؟' 
            : 'Are you sure you want to delete this project?';
        
        if (confirm(confirmMessage)) {
            try {
                this.projects = this.projects.filter(p => p.id !== projectId);
                await this.storage.saveProjects(this.projects);
                this.renderProjectsList();
                
                this.showNotification(
                    lang === 'ar' ? 'تم حذف المشروع بنجاح' : 'Project deleted successfully',
                    'success'
                );
            } catch (error) {
                console.error('Error deleting project:', error);
                this.showNotification(
                    lang === 'ar' ? 'خطأ في حذف المشروع' : 'Error deleting project',
                    'error'
                );
            }
        }
    }
    
    async handleSaveProject(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const projectData = {
            id: this.editingProject ? this.editingProject.id : Utils.generateId(),
            title: {
                ar: formData.get('titleAr'),
                en: formData.get('titleEn')
            },
            description: {
                ar: formData.get('descriptionAr'),
                en: formData.get('descriptionEn')
            },
            githubUrl: formData.get('githubUrl'),
            liveUrl: formData.get('liveUrl'),
            imageUrl: formData.get('imageUrl'),
            technologies: formData.get('technologies'),
            createdAt: this.editingProject ? this.editingProject.createdAt : Date.now(),
            updatedAt: Date.now()
        };
        
        try {
            if (this.editingProject) {
                // Update existing project
                const index = this.projects.findIndex(p => p.id === this.editingProject.id);
                if (index !== -1) {
                    this.projects[index] = projectData;
                }
            } else {
                // Add new project
                this.projects.push(projectData);
            }
            
            await this.storage.saveProjects(this.projects);
            this.hideProjectForm();
            this.renderProjectsList();
            
            const lang = Utils.getCurrentLanguage();
            this.showNotification(
                lang === 'ar' ? 'تم حفظ المشروع بنجاح' : 'Project saved successfully',
                'success'
            );
        } catch (error) {
            console.error('Error saving project:', error);
            const lang = Utils.getCurrentLanguage();
            this.showNotification(
                lang === 'ar' ? 'خطأ في حفظ المشروع' : 'Error saving project',
                'error'
            );
        }
    }
    
    showProjectForm() {
        document.getElementById('projectForm').style.display = 'block';
    }
    
    hideProjectForm() {
        document.getElementById('projectForm').style.display = 'none';
        this.editingProject = null;
    }
    
    resetProjectForm() {
        const form = document.getElementById('projectFormElement');
        if (form) {
            form.reset();
        }
    }
    
    populateProjectForm(project) {
        document.getElementById('projectId').value = project.id;
        document.getElementById('titleAr').value = project.title.ar || '';
        document.getElementById('titleEn').value = project.title.en || '';
        document.getElementById('descriptionAr').value = project.description.ar || '';
        document.getElementById('descriptionEn').value = project.description.en || '';
        document.getElementById('githubUrl').value = project.githubUrl || '';
        document.getElementById('liveUrl').value = project.liveUrl || '';
        document.getElementById('imageUrl').value = project.imageUrl || '';
        document.getElementById('technologies').value = project.technologies || '';
    }
    
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 1rem 1.5rem;
            background-color: var(--bg-primary);
            border: 1px solid var(--border-color);
            border-radius: var(--radius);
            box-shadow: var(--shadow-hover);
            z-index: 1000;
            max-width: 300px;
            animation: slideIn 0.3s ease;
        `;
        
        if (type === 'success') {
            notification.style.borderLeftColor = 'var(--success-color)';
            notification.style.borderLeftWidth = '4px';
        } else if (type === 'error') {
            notification.style.borderLeftColor = 'var(--error-color)';
            notification.style.borderLeftWidth = '4px';
        }
        
        notification.textContent = message;
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// Make AdminDashboard globally accessible for onclick handlers
let adminDashboard;

// Initialize based on current page
document.addEventListener('DOMContentLoaded', () => {
    // Add slide animation styles
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
    
    // Initialize appropriate class based on page
    if (window.location.pathname.includes('admin.html')) {
        adminDashboard = new AdminDashboard();
        adminDashboard.init();
    } else {
        const showcase = new ProjectShowcase();
        showcase.init();
    }
});