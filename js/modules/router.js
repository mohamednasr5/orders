export function loadModule(moduleName) {
    const contentArea = document.getElementById('content-area');
    const lang = document.documentElement.lang;
    const loadingText = lang === 'ar' ? 'جاري التحميل...' : 'Loading...';
    
    contentArea.innerHTML = `<h2>${loadingText}</h2>`;
    
    // Simulate dynamic module loading
    setTimeout(() => {
        contentArea.innerHTML = `
            <h2>${moduleName.toUpperCase()} Module</h2>
            <p>${lang === 'ar' ? 'هذه هي واجهة وحدة ' + moduleName : 'This is the isolated view for the ' + moduleName + ' module.'}</p>
        `;
    }, 400);
}