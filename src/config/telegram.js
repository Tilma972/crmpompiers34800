import { DEFAULT_CONFIG } from './constants.js';

// Configuration Telegram WebApp
export let tg = window.Telegram.WebApp;

// Initialisation Telegram WebApp
export function initTelegramWebApp() {
    tg.ready();
    tg.expand();
}

// Récupération des données utilisateur depuis Telegram
export function getTelegramUser() {
    return tg.initDataUnsafe?.user || DEFAULT_CONFIG.DEFAULT_USER;
}

// Alternative pour tg.showAlert compatible avec toutes les versions Telegram
export function showTelegramMessage(message, callback = null) {
    if (tg.showAlert && typeof tg.showAlert === 'function') {
        try {
            tg.showAlert(message, callback);
            return true;
        } catch (error) {
            console.warn('tg.showAlert non supporté:', error);
            return false;
        }
    }
    return false;
}

// Configuration du bouton principal Telegram
export function configureTelegramMainButton(text, callback) {
    if (tg.MainButton) {
        tg.MainButton.text = text;
        tg.MainButton.show();
        tg.MainButton.onClick(callback);
    }
}

// Masquer le bouton principal
export function hideTelegramMainButton() {
    if (tg.MainButton) {
        tg.MainButton.hide();
    }
}

// Fermer la WebApp
export function closeTelegramWebApp() {
    if (tg.close) {
        tg.close();
    }
}

// Envoyer des données à Telegram
export function sendTelegramData(data) {
    if (tg.sendData) {
        tg.sendData(JSON.stringify(data));
    }
}

// Vérifier si on est dans Telegram
export function isTelegramEnvironment() {
    return window.Telegram && window.Telegram.WebApp;
}