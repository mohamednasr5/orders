
/**
 * Toast Notification System
 * Shows temporary notification messages to the user
 */
export function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if(!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icon based on type
    let icon = 'bx-info-circle';
    if(type === 'success') icon = 'bx-check-circle';
    else if(type === 'error') icon = 'bx-x-circle';
    else if(type === 'warning') icon = 'bx-error';
    
    toast.innerHTML = `
        <i class='bx ${icon}' style='font-size: 20px; flex-shrink: 0;'></i> 
        <span>${message}</span>
        <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;padding:0 0 0 10px;opacity:0.6;">
            <i class='bx bx-x'></i>
        </button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideInUp 0.3s ease reverse forwards';
        setTimeout(() => {
            if(toast.parentElement) toast.remove();
        }, 300);
    }, 4000);
}

/**
 * Show Confirmation Dialog
 */
export function showConfirm(title, message, onConfirm) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal" style="max-width:400px;">
            <div class="modal-header">
                <h3><i class='bx bx-error' style="color:var(--warning);"></i> ${title}</h3>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
                    <i class='bx bx-x'></i>
                </button>
            </div>
            <div class="modal-body">
                <p style="text-align:center;">${message}</p>
            </div>
            <div class="modal-footer" style="justify-content:center;">
                <button class="btn-outline btn-sm" onclick="this.closest('.modal-overlay').remove()">إلغاء</button>
                <button class="btn-danger btn-sm" id="confirm-btn">تأكيد</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('confirm-btn').addEventListener('click', () => {
        modal.remove();
        if(onConfirm) onConfirm();
    });
}

/**
 * Loading Overlay
 */
export function showLoading(message = 'جاري التحميل...') {
    removeLoading();
    
    const overlay = document.createElement('div');
    overlay.id = 'loading-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.5);
        backdrop-filter: blur(4px); z-index: 99999;
        display: flex; flex-direction: column;
        align-items: center; justify-content: center;
    `;
    overlay.innerHTML = `
        <div class="spinner"></div>
        <p style="color:white;margin-top:15px;font-size:16px;">${message}</p>
    `;
    document.body.appendChild(overlay);
}

export function removeLoading() {
    const overlay = document.getElementById('loading-overlay');
    if(overlay) overlay.remove();
}

/**
 * Format number with commas
 */
export function formatNumber(num) {
    return Number(num).toLocaleString('ar-EG');
}

/**
 * Format date
 */
export function formatDate(dateStr) {
    if(!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('ar-EG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format time
 */
export function formatTime(dateStr) {
    if(!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleTimeString('ar-EG', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Debounce function for search inputs
 */
export function debounce(func, wait = 300) {
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

/**
 * Generate unique ID
 */
export function generateId(prefix = '') {
    return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('تم النسخ إلى الحافظة', 'success');
    } catch (err) {
        // Fallback for older browsers
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        showToast('تم النسخ إلى الحافظة', 'success');
    }
}

/**
 * Truncate text
 */
export function truncateText(text, maxLength = 50) {
    if(!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}
