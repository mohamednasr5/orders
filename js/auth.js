export function initAuth() {
    const loginBtn = document.getElementById('btn-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            console.log('Initiating Google Sign-in via Firebase...');
            alert("سيتم تنفيذ تسجيل الدخول بجوجل هنا (Firebase Config)");
        });
    }
}