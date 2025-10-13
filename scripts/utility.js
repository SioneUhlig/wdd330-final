const Utility = {
    formatDate: function (dateString) {
        const date = new Date(dateString);
        const options = {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        return date.toLocaleDateString('en-US', options);
    },
    getRelativeTime: function (dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays < 7) return `In ${diffDays} days`;
        if (diffDays < 30) return `In ${Math.floor(diffDays / 7)} weeks`;
        return `In ${Math.floor(diffDays / 30)} months`;
    },

    truncateText: function (text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },

    isPastDate: function (dateString) {
        const date = new Date(dateString);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date < now;
    },

    getDayOfWeek: function (dateString) {
        const date = new Date(dateString);
        const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        return days[date.getDay()];
    },

    daysUntilEvent: function (dateString) {
        const eventDate = new Date(dateString);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        eventDate.setHours(0, 0, 0, 0);

        const diffTime = eventDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        return diffDays;
    },

    getCategoryEmoji: function (category) {
        const emojis = {
            music: '🎵',
            food: '🍔',
            arts: '🎨',
            sports: '⚽',
            community: '👥',
            business: '💼'
        };
        return emojis[category] || '📅';
    },

    getCategoryColor: function (category) {
        const colors = {
            music: '#9333EA',
            food: '#F59E0B',
            arts: '#EC4899',
            sports: '#10B981',
            community: '#3B82F6',
            business: '#6366F1'
        };
        return colors[category] || '#40E0D0';
    },

    showToast: function (message, type) {
        type = type || 'info';
        const toast = document.createElement('div');
        toast.className = 'toast toast-' + type;
        toast.textContent = message;

        toast.style.cssText =
            'position: fixed;' +
            'top: 20px;' +
            'right: 20px;' +
            'padding: 1rem 1.5rem;' +
            'background: ' + (type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#3B82F6') + ';' +
            'color: white;' +
            'border-radius: 8px;' +
            'box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);' +
            'z-index: 10000;';

        document.body.appendChild(toast);

        setTimeout(function () {
            document.body.removeChild(toast);
        }, 3000);
    },

    copyToClipboard: function (text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(function () {
                Utility.showToast('Copied to clipboard!', 'success');
            }).catch(function (err) {
                console.error('Failed to copy:', err);
                Utility.showToast('Failed to copy', 'error');
            });
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                Utility.showToast('Copied to clipboard!', 'success');
            } catch (err) {
                console.error('Failed to copy:', err);
                Utility.showToast('Failed to copy', 'error');
            }
            document.body.removeChild(textarea);
        }
    },

    getUrlParams: function () {
        const params = new URLSearchParams(window.location.search);
        const result = {};
        for (const pair of params.entries()) {
            result[pair[0]] = pair[1];
        }
        return result;
    },

    saveToLocalStorage: function (key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            return false;
        }
    },

    getFromLocalStorage: function (key, defaultValue) {
        defaultValue = defaultValue || null;
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('Error reading from localStorage:', error);
            return defaultValue;
        }
    }
};

window.Utility = Utility;