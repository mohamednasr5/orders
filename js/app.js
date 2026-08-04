import { initAuth } from './auth.js';
import { loadModule } from './modules/router.js';
import { initI18n } from './i18n.js';

document.addEventListener('DOMContentLoaded', () => {
    initI18n(); // Initialize Multi-language support
    initAuth(); // Initialize Firebase Auth
    
    // Router Initialization
    document.querySelectorAll('[data-route]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const route = e.target.getAttribute('data-route');
            loadModule(route);
        });
    });
});