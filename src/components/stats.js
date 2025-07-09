// src/components/stats.js - Module statistiques renouvellement 2026 (CORRIGÉ)

import { apiService } from '../services/api.js';
import { updateStatus, showMessage } from '../utils/ui.js';
import { formatNumber, formatPercentage } from '../utils/formatters.js';

class StatsManager {
    constructor() {
        this.currentStats = null;
        this.chartInstance = null;
    }

    // Initialisation du gestionnaire
    initialize() {
        console.log('📊 StatsManager initialisé');
    }

    // Crée l'interface des statistiques
    createStatsInterface() {
        return `
            <div class="stats-section">
                <h3>📊 Tableau de bord Renouvellement 2026</h3>
                
                <!-- MÉTRIQUES PRINCIPALES -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-value" id="totalPartenaires2025">--</div>
                        <div class="metric-label">Partenaires 2025</div>
                    </div>
                    <div class="metric-card success">
                        <div class="metric-value" id="dejaRenouveles">--</div>
                        <div class="metric-label">Déjà renouvelés</div>
                    </div>
                    <div class="metric-card warning">
                        <div class="metric-value" id="enAttente">--</div>
                        <div class="metric-label">En attente</div>
                    </div>
                    <div class="metric-card info">
                        <div class="metric-value" id="tauxRenouvellement">--%</div>
                        <div class="metric-label">Taux renouvellement</div>
                    </div>
                </div>
                
                <!-- ACTIONS RAPIDES -->
                <div class="actions-section">
                    <h4>⚡ Actions rapides</h4>
                    <div class="action-buttons">
                        <button class="btn btn-primary" onclick="statsManager.lancerCampagneRenouvellement()">
                            📧 Lancer campagne renouvellement
                        </button>
                        <button class="btn btn-secondary" onclick="statsManager.exporterListeEnAttente()">
                            📋 Exporter liste en attente
                        </button>
                        <button class="btn btn-info" onclick="statsManager.voirDetailsRenouvellement()">
                            📊 Détails par statut
                        </button>
                    </div>
                </div>
                
                <!-- GRAPHIQUE RÉPARTITION -->
                <div class="chart-section">
                    <h4>📈 Répartition des statuts</h4>
                    <canvas id="chartRenouvellement" width="300" height="150"></canvas>
                </div>
                
                <!-- RÉPARTITION PAR COMMUNE -->
                <div class="commune-section">
                    <h4>🏘️ Répartition par commune</h4>
                    <div id="communeBreakdown">
                        <div class="loading">Chargement...</div>
                    </div>
                </div>
                
                <!-- LISTE DES PROCHAINES ACTIONS -->
                <div class="next-actions">
                    <h4>🎯 Prochaines actions recommandées</h4>
                    <div id="actionsRecommandees">
                        <div class="loading">Chargement...</div>
                    </div>
                </div>
            </div>
            
            <div class="form-buttons">
                <button class="btn btn-secondary" onclick="showMainMenu()">← Retour au menu</button>
            </div>
        `;
    }

    // Charge les statistiques depuis l'API
    async loadStats() {
        try {
            updateStatus('📊 Chargement statistiques renouvellement...');
            
            const response = await apiService.callWebhook('GATEWAY_ENTITIES', {
                action: 'stats_renouvellement_2026',
                data: { user_id: window.getTelegramUser().id }
            });
            
            console.log('📊 Réponse API complète:', response);
            
            if (!response.success) {
                throw new Error(response.error || 'Erreur lors du chargement des statistiques');
            }

            // 🔧 CORRECTION : Extraction correcte des données
            let statsData;
            
            if (Array.isArray(response.data) && response.data.length > 0) {
                // Cas où les données sont dans un tableau
                statsData = response.data[0].data || response.data[0];
                console.log('📊 Données extraites du tableau:', statsData);
            } else if (response.data && typeof response.data === 'object') {
                // Cas où les données sont directement dans data
                statsData = response.data;
                console.log('📊 Données directes:', statsData);
            } else {
                throw new Error('Format de données inattendu');
            }

            // 🔧 Validation des données critiques
            if (!statsData || typeof statsData !== 'object') {
                throw new Error('Données statistiques invalides');
            }

            // Stockage pour usage ultérieur
            this.currentStats = statsData;
            
            // Mise à jour de l'interface
            this.updateMetricsDisplay(statsData);
            this.generateChart(statsData);
            this.displayCommuneBreakdown(statsData);
            this.displayRecommendedActions(statsData);
            
            updateStatus('✅ Statistiques chargées avec succès');
            
        } catch (error) {
            console.error('❌ Erreur chargement stats:', error);
            updateStatus('❌ Erreur chargement statistiques');
            showMessage(`❌ Erreur: ${error.message}`);
            
            // Affichage des données d'erreur pour debug
            this.displayErrorFallback();
        }
    }

    // 🔧 CORRECTION : Mise à jour des métriques avec validation
    updateMetricsDisplay(stats) {
        console.log('📊 Mise à jour métriques avec:', stats);
        
        try {
            // Extraction sécurisée des valeurs
            const totalPartenaires = parseInt(stats.total_partenaires_2025) || 0;
            const dejaRenouveles = parseInt(stats.deja_renouveles) || 0;
            const enAttente = parseInt(stats.en_attente) || 0;
            const tauxRenouvellement = parseFloat(stats.taux_renouvellement) || 0;
            
            console.log('📊 Valeurs extraites:', {
                totalPartenaires, dejaRenouveles, enAttente, tauxRenouvellement
            });
            
            // Mise à jour sécurisée des éléments DOM
            this.updateElementSafely('totalPartenaires2025', totalPartenaires);
            this.updateElementSafely('dejaRenouveles', dejaRenouveles);
            this.updateElementSafely('enAttente', enAttente);
            this.updateElementSafely('tauxRenouvellement', `${tauxRenouvellement}%`);
            
        } catch (error) {
            console.error('❌ Erreur mise à jour métriques:', error);
        }
    }

    // 🔧 Fonction utilitaire pour mise à jour sécurisée du DOM
    updateElementSafely(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
            console.log(`✅ Mis à jour ${elementId}: ${value}`);
        } else {
            console.warn(`⚠️ Élément ${elementId} non trouvé`);
        }
    }

    // Génère le graphique des répartitions
    generateChart(stats) {
        const canvas = document.getElementById('chartRenouvellement');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        
        // Données pour le graphique en secteurs
        const breakdown = stats.breakdown_by_status || {};
        const data = Object.entries(breakdown).map(([label, value]) => {
            const colors = {
                'Renouvelé': '#10b981',
                'En attente': '#f59e0b', 
                'Non défini': '#6b7280',
                'Non intéressé': '#ef4444'
            };
            
            return {
                label: label,
                value: parseInt(value) || 0,
                color: colors[label] || '#9ca3af'
            };
        });
        
        // Dessiner le graphique simplifié
        this.drawPieChart(ctx, canvas, data);
    }

    // Dessine un graphique en secteurs simple
    drawPieChart(ctx, canvas, data) {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 60;
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        if (total === 0) return;
        
        let currentAngle = 0;
        
        // Effacer le canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        data.forEach(item => {
            if (item.value > 0) {
                const sliceAngle = (item.value / total) * 2 * Math.PI;
                
                ctx.beginPath();
                ctx.moveTo(centerX, centerY);
                ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
                ctx.closePath();
                ctx.fillStyle = item.color;
                ctx.fill();
                
                // Bordure
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.stroke();
                
                currentAngle += sliceAngle;
            }
        });
        
        // Légende simple
        this.drawLegend(ctx, canvas, data);
    }

    // Dessine une légende simple
    drawLegend(ctx, canvas, data) {
        const legendX = 10;
        let legendY = canvas.height - 60;
        
        ctx.font = '12px Arial';
        ctx.textAlign = 'left';
        
        data.forEach(item => {
            if (item.value > 0) {
                // Carré de couleur
                ctx.fillStyle = item.color;
                ctx.fillRect(legendX, legendY, 12, 12);
                
                // Texte
                ctx.fillStyle = '#333';
                ctx.fillText(`${item.label}: ${item.value}`, legendX + 20, legendY + 10);
                
                legendY += 18;
            }
        });
    }

    // Affiche la répartition par commune
    displayCommuneBreakdown(stats) {
        const container = document.getElementById('communeBreakdown');
        if (!container) return;
        
        const breakdown = stats.breakdown_by_commune || {};
        
        if (Object.keys(breakdown).length === 0) {
            container.innerHTML = '<div class="no-data">Aucune donnée de commune disponible</div>';
            return;
        }
        
        const communesHtml = Object.entries(breakdown)
            .sort(([,a], [,b]) => b - a) // Tri par nombre décroissant
            .map(([commune, count]) => `
                <div class="commune-item">
                    <span class="commune-name">${commune}</span>
                    <span class="commune-count">${count} entreprise(s)</span>
                </div>
            `).join('');
        
        container.innerHTML = communesHtml;
    }

    // Affiche les actions recommandées
    displayRecommendedActions(stats) {
        const container = document.getElementById('actionsRecommandees');
        if (!container) return;
        
        const actions = stats.actions_recommandees || [];
        
        if (actions.length === 0) {
            container.innerHTML = '<div class="action-item">✅ Aucune action urgente requise</div>';
            return;
        }
        
        const actionsHtml = actions.map(action => {
            const priorityIcons = {
                'high': '🔴',
                'medium': '🟡', 
                'low': '🟢'
            };
            
            const icon = priorityIcons[action.priority] || '📋';
            
            return `
                <div class="action-item priority-${action.priority}">
                    ${icon} ${action.message}
                </div>
            `;
        }).join('');
        
        container.innerHTML = actionsHtml;
    }

    // Affichage d'erreur de fallback
    displayErrorFallback() {
        this.updateElementSafely('totalPartenaires2025', 'Erreur');
        this.updateElementSafely('dejaRenouveles', 'Erreur');
        this.updateElementSafely('enAttente', 'Erreur');
        this.updateElementSafely('tauxRenouvellement', 'Erreur');
        
        const container = document.getElementById('actionsRecommandees');
        if (container) {
            container.innerHTML = '<div class="action-item error">❌ Erreur de chargement des données</div>';
        }
    }

    // Lancement de campagne de renouvellement
    async lancerCampagneRenouvellement() {
        const confirmation = confirm(
            'Voulez-vous lancer la campagne de renouvellement ?\n\n' +
            'Cela enverra un email à tous les partenaires 2025 ' +
            'qui n\'ont pas encore renouvelé leur participation.'
        );
        
        if (!confirmation) return;
        
        try {
            updateStatus('📧 Lancement campagne renouvellement...');
            
            const response = await apiService.callWebhook('EMAIL_WORKFLOW', {
                action: 'campagne_renouvellement_2026',
                data: {
                    user_id: window.getTelegramUser().id,
                    template_type: 'RENOUVELLEMENT_AVEC_RDV',
                    filters: {
                        Client_2025: 'Oui',
                        'Paiement 2026 Reçu ?': false,
                        Statut_Renouvellement_2026: 'En attente'
                    }
                }
            });
            
            if (!response.success) {
                throw new Error(response.error || 'Erreur lancement campagne');
            }
            
            showMessage(`✅ Campagne lancée !\n${response.data?.emails_sent || 'N/A'} emails envoyés`);
            
            // Recharger les stats après 2 secondes
            setTimeout(() => this.loadStats(), 2000);
            
        } catch (error) {
            console.error('❌ Erreur campagne:', error);
            showMessage('❌ Erreur lors du lancement de la campagne');
        }
    }

    // Export de la liste en attente
    async exporterListeEnAttente() {
        try {
            updateStatus('📋 Export liste en attente...');
            
            const response = await apiService.callWebhook('GATEWAY_ENTITIES', {
                action: 'export_liste_attente_2026',
                data: { user_id: window.getTelegramUser().id }
            });
            
            if (!response.success) {
                throw new Error(response.error || 'Erreur export');
            }
            
            showMessage(`✅ Liste exportée !\n${response.data?.count || 'N/A'} entreprises en attente`);
            
        } catch (error) {
            console.error('❌ Erreur export:', error);
            showMessage('❌ Erreur lors de l\'export');
        }
    }

    // Voir les détails de renouvellement
    async voirDetailsRenouvellement() {
        if (!this.currentStats) {
            showMessage('❌ Aucune donnée disponible. Rechargez les statistiques.');
            return;
        }
        
        const stats = this.currentStats;
        const breakdown = stats.breakdown_by_status || {};
        
        let detailsMessage = '📊 Détails renouvellement 2026:\n\n';
        
        Object.entries(breakdown).forEach(([status, count]) => {
            detailsMessage += `• ${status}: ${count} entreprise(s)\n`;
        });
        
        detailsMessage += `\n📅 Dernière mise à jour: ${stats.date_derniere_maj || 'N/A'}`;
        
        showMessage(detailsMessage);
    }
}

// Instance singleton
export const statsManager = new StatsManager();
export default statsManager;