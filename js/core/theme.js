
export function initTheme() {
    const themeToggle = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    let currentTheme = localStorage.getItem('saas_theme') || 'light';
    
    htmlEl.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme, themeToggle);

    themeToggle.addEventListener('click', () => {
        currentTheme = currentTheme === 'light' ? 'dark' : 'light';
        htmlEl.setAttribute('data-theme', currentTheme);
        localStorage.setItem('saas_theme', currentTheme);
        updateThemeIcon(currentTheme, themeToggle);
        
        // Dispatch event so charts can re-render colors
        window.dispatchEvent(new Event('themeChanged'));
    });
}

function updateThemeIcon(theme, btn) {
    btn.innerHTML = theme === 'light' ? "<i class='bx bx-moon'></i>" : "<i class='bx bx-sun'></i>";
}
