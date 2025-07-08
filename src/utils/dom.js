// Ajoute un indicateur visuel pour les champs en lecture seule
export function addReadOnlyIndicator(field, message) {
    if (!field) return;
    
    // Supprime l'indicateur existant
    const existingIndicator = field.parentNode.querySelector('.readonly-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }
    
    // Crée le nouvel indicateur
    const indicator = document.createElement('div');
    indicator.className = 'readonly-indicator';
    indicator.innerHTML = `
        <span class="readonly-icon">🔒</span>
        <span class="readonly-text">${message}</span>
    `;
    
    // Style de l'indicateur
    indicator.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: #f0f8ff;
        border: 1px solid #4a90e2;
        border-radius: 6px;
        font-size: 14px;
        color: #2c5282;
        margin-top: 8px;
    `;
    
    field.parentNode.appendChild(indicator);
    field.readOnly = true;
}

// Met en surbrillance les champs pré-sélectionnés
export function highlightPreSelected(field, message) {
    if (!field) return;
    
    // Supprime le highlight existant
    const existingHighlight = field.parentNode.querySelector('.preselected-highlight');
    if (existingHighlight) {
        existingHighlight.remove();
    }
    
    // Crée le highlight
    const highlight = document.createElement('div');
    highlight.className = 'preselected-highlight';
    highlight.innerHTML = `
        <span class="preselected-icon">✨</span>
        <span class="preselected-text">${message}</span>
    `;
    
    // Style du highlight
    highlight.style.cssText = `
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 10px;
        background: #fff8e1;
        border: 1px solid #ffc107;
        border-radius: 4px;
        font-size: 12px;
        color: #e65100;
        margin-top: 4px;
    `;
    
    field.parentNode.appendChild(highlight);
    field.style.borderColor = '#ffc107';
    field.style.backgroundColor = '#fffbf0';
}

// Trouve un élément parent avec une classe spécifique
export function findParentWithClass(element, className) {
    let parent = element.parentElement;
    while (parent && !parent.classList.contains(className)) {
        parent = parent.parentElement;
    }
    return parent;
}

// Crée un élément avec des attributs
export function createElement(tag, attributes = {}, content = '') {
    const element = document.createElement(tag);
    
    Object.entries(attributes).forEach(([key, value]) => {
        if (key === 'className') {
            element.className = value;
        } else if (key === 'innerHTML') {
            element.innerHTML = value;
        } else if (key === 'textContent') {
            element.textContent = value;
        } else {
            element.setAttribute(key, value);
        }
    });
    
    if (content) {
        element.innerHTML = content;
    }
    
    return element;
}

// Supprime tous les enfants d'un élément
export function clearElement(element) {
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }
}

// Ajoute une classe avec animation
export function addClass(element, className, duration = 300) {
    element.classList.add(className);
    
    if (duration > 0) {
        element.style.transition = `all ${duration}ms ease`;
        
        setTimeout(() => {
            element.style.transition = '';
        }, duration);
    }
}

// Supprime une classe avec animation
export function removeClass(element, className, duration = 300) {
    if (duration > 0) {
        element.style.transition = `all ${duration}ms ease`;
        
        setTimeout(() => {
            element.classList.remove(className);
            element.style.transition = '';
        }, duration);
    } else {
        element.classList.remove(className);
    }
}

// Bascule la visibilité d'un élément
export function toggleVisibility(element, show = null) {
    if (show === null) {
        show = element.style.display === 'none';
    }
    
    if (show) {
        element.style.display = 'block';
        element.style.opacity = '1';
    } else {
        element.style.opacity = '0';
        setTimeout(() => {
            element.style.display = 'none';
        }, 300);
    }
}

// Scroll vers un élément
export function scrollToElement(element, offset = 0) {
    const elementPosition = element.offsetTop;
    const offsetPosition = elementPosition - offset;
    
    window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
    });
}

// Vérifie si un élément est visible à l'écran
export function isElementInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
        rect.top >= 0 &&
        rect.left >= 0 &&
        rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
        rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
}