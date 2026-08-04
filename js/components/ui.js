
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    let icon = type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-x-circle' : 'bx-info-circle';
    toast.innerHTML = `<i class='bx ${icon}' style='font-size: 20px;'></i> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.animation = 'slideInUp 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
