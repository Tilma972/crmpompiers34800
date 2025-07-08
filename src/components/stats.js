import { apiService } from '../services/api.js';
import { qualificationService } from '../services/qualificationService.js';
import { formatPrice, formatDate } from '../utils/formatters.js';
import { updateStatus } from '../utils/ui.js';

// Gestionnaire des statistiques de renouvellement
class StatsManager {
    constructor() {
        this.currentStats = null;
        this.chartInstance = null;
        this.refreshInterval = null;
    }

    // Crée l'interface des statistiques
    createStatsInterface() {
        return `
            <div class="stats-container">
                <div class="stats-header">
                    <h3>📊 Tableau de bord Renouvellement 2026</h3>
                    <div class="stats-actions">
                        <button class="btn btn-secondary btn-sm" onclick="window.statsManager.refreshStats()">
                            🔄 Actualiser
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="window.statsManager.exportStats()">
                            📥 Exporter
                        </button>
                    </div>
                </div>

                <div class="stats-overview">
                    <div class="stat-card">
                        <div class="stat-icon">🎯</div>
                        <div class="stat-content">
                            <div class="stat-value" id="totalProspects">-</div>
                            <div class="stat-label">Prospects totaux</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">✅</div>
                        <div class="stat-content">
                            <div class="stat-value" id="confirmedRenewals">-</div>
                            <div class="stat-label">Renouvellements confirmés</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">💰</div>
                        <div class="stat-content">
                            <div class="stat-value" id="totalRevenue">-</div>
                            <div class="stat-label">Chiffre d'affaires</div>
                        </div>
                    </div>
                    
                    <div class="stat-card">
                        <div class="stat-icon">📈</div>
                        <div class="stat-content">
                            <div class="stat-value" id="conversionRate">-</div>
                            <div class="stat-label">Taux de conversion</div>
                        </div>
                    </div>
                </div>

                <div class="stats-charts">
                    <div class="chart-container">
                        <canvas id="renewalChart" width="400" height="200"></canvas>
                    </div>
                    
                    <div class="chart-legend" id="chartLegend"></div>
                </div>

                <div class="stats-details">
                    <div class="stats-section">
                        <h4>📋 Répartition par statut</h4>
                        <div class="status-breakdown" id="statusBreakdown"></div>
                    </div>
                    
                    <div class="stats-section">
                        <h4>📅 Évolution mensuelle</h4>
                        <div class="monthly-evolution" id="monthlyEvolution"></div>
                    </div>
                    
                    <div class="stats-section">
                        <h4>🎯 Actions recommandées</h4>
                        <div class="recommended-actions" id="recommendedActions"></div>
                    </div>
                </div>

                <div class="stats-export" id="statsExport" style="display: none;">
                    <h4>📊 Données d'export</h4>
                    <textarea id="exportData" readonly rows="10" style="width: 100%; font-family: monospace;"></textarea>
                </div>
            </div>
        `;
    }

    // Charge les statistiques
    async loadStats() {
        try {
            updateStatus('📊 Chargement des statistiques...');
            
            // Récupère les statistiques depuis l'API
            const response = await qualificationService.getQualificationStats({
                year: 2026,
                type: 'renouvellement'
            });

            if (response.success) {
                this.currentStats = this.processStatsData(response.data);
                this.displayStats();
                updateStatus('✅ Statistiques chargées');
            } else {
                // Génère des données factices si l'API n'est pas disponible
                this.currentStats = this.generateMockStats();
                this.displayStats();
                updateStatus('📊 Statistiques simulées (mode démo)');
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
            this.currentStats = this.generateMockStats();
            this.displayStats();
            updateStatus('⚠️ Statistiques simulées (erreur API)');
        }
    }

    // Traite les données statistiques
    processStatsData(rawData) {
        return {
            totalProspects: rawData.total_prospects || 0,
            confirmedRenewals: rawData.confirmed_renewals || 0,
            pendingRenewals: rawData.pending_renewals || 0,
            cancelledRenewals: rawData.cancelled_renewals || 0,
            totalRevenue: rawData.total_revenue || 0,
            averageOrderValue: rawData.average_order_value || 0,
            conversionRate: rawData.conversion_rate || 0,
            monthlyData: rawData.monthly_data || [],
            statusBreakdown: rawData.status_breakdown || {},
            lastUpdated: new Date().toISOString()
        };
    }

    // Génère des données statistiques factices pour la démo
    generateMockStats() {
        const totalProspects = 245;
        const confirmedRenewals = 189;
        const pendingRenewals = 34;
        const cancelledRenewals = 22;

        return {
            totalProspects,
            confirmedRenewals,
            pendingRenewals,
            cancelledRenewals,
            totalRevenue: 45780,
            averageOrderValue: 242,
            conversionRate: (confirmedRenewals / totalProspects * 100).toFixed(1),
            monthlyData: this.generateMockMonthlyData(),
            statusBreakdown: {
                'Confirmé': confirmedRenewals,
                'En attente': pendingRenewals,
                'Annulé': cancelledRenewals,
                'Nouveau prospect': totalProspects - confirmedRenewals - pendingRenewals - cancelledRenewals
            },
            lastUpdated: new Date().toISOString()
        };
    }

    // Génère des données mensuelles factices
    generateMockMonthlyData() {
        const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
        return months.map(month => ({
            month,
            prospects: Math.floor(Math.random() * 50) + 20,
            confirmed: Math.floor(Math.random() * 40) + 15,
            revenue: Math.floor(Math.random() * 8000) + 5000
        }));
    }

    // Affiche les statistiques
    displayStats() {
        this.updateOverviewCards();
        this.generateChart();
        this.displayStatusBreakdown();
        this.displayMonthlyEvolution();
        this.displayRecommendedActions();
    }

    // Met à jour les cartes de vue d'ensemble
    updateOverviewCards() {
        const stats = this.currentStats;
        
        document.getElementById('totalProspects').textContent = stats.totalProspects;
        document.getElementById('confirmedRenewals').textContent = stats.confirmedRenewals;
        document.getElementById('totalRevenue').textContent = formatPrice(stats.totalRevenue);
        document.getElementById('conversionRate').textContent = `${stats.conversionRate}%`;
    }

    // Génère le graphique en secteurs
    generateChart() {
        const canvas = document.getElementById('renewalChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const stats = this.currentStats;
        
        // Données pour le graphique
        const data = [
            { label: 'Confirmés', value: stats.confirmedRenewals, color: '#4CAF50' },
            { label: 'En attente', value: stats.pendingRenewals, color: '#FF9800' },
            { label: 'Annulés', value: stats.cancelledRenewals, color: '#F44336' },
            { label: 'Nouveaux', value: stats.totalProspects - stats.confirmedRenewals - stats.pendingRenewals - stats.cancelledRenewals, color: '#2196F3' }
        ];

        this.drawPieChart(ctx, data, canvas.width, canvas.height);
        this.updateChartLegend(data);
    }

    // Dessine un graphique en secteurs
    drawPieChart(ctx, data, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) / 2 - 20;
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        let currentAngle = -Math.PI / 2; // Commence en haut

        // Efface le canvas
        ctx.clearRect(0, 0, width, height);

        // Dessine chaque secteur
        data.forEach(item => {
            const sliceAngle = (item.value / total) * 2 * Math.PI;
            
            // Dessine le secteur
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = item.color;
            ctx.fill();
            
            // Bordure
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // Texte au centre du secteur
            if (item.value > 0) {
                const textAngle = currentAngle + sliceAngle / 2;
                const textX = centerX + Math.cos(textAngle) * (radius * 0.7);
                const textY = centerY + Math.sin(textAngle) * (radius * 0.7);
                
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.value.toString(), textX, textY);
            }
            
            currentAngle += sliceAngle;
        });
    }

    // Met à jour la légende du graphique
    updateChartLegend(data) {
        const legend = document.getElementById('chartLegend');
        if (!legend) return;

        legend.innerHTML = data.map(item => `
            <div class="legend-item">
                <div class="legend-color" style="background-color: ${item.color}"></div>
                <span class="legend-label">${item.label}: ${item.value}</span>
            </div>
        `).join('');
    }

    // Affiche la répartition par statut
    displayStatusBreakdown() {
        const container = document.getElementById('statusBreakdown');
        if (!container) return;

        const breakdown = this.currentStats.statusBreakdown;
        const total = Object.values(breakdown).reduce((sum, val) => sum + val, 0);

        container.innerHTML = Object.entries(breakdown).map(([status, count]) => {
            const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
            return `
                <div class="status-item">
                    <div class="status-info">
                        <span class="status-name">${status}</span>
                        <span class="status-count">${count} (${percentage}%)</span>
                    </div>
                    <div class="status-bar">
                        <div class="status-progress" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    }

    // Affiche l'évolution mensuelle
    displayMonthlyEvolution() {
        const container = document.getElementById('monthlyEvolution');
        if (!container) return;

        const monthlyData = this.currentStats.monthlyData;

        container.innerHTML = `
            <div class="monthly-chart">
                ${monthlyData.map(month => `
                    <div class="month-column">
                        <div class="month-header">${month.month}</div>
                        <div class="month-bars">
                            <div class="bar prospects" style="height: ${(month.prospects / 50) * 100}%" title="Prospects: ${month.prospects}"></div>
                            <div class="bar confirmed" style="height: ${(month.confirmed / 50) * 100}%" title="Confirmés: ${month.confirmed}"></div>
                        </div>
                        <div class="month-revenue">${formatPrice(month.revenue)}</div>
                    </div>
                `).join('')}
            </div>
            <div class="monthly-legend">
                <span class="legend-item"><div class="legend-color prospects"></div> Prospects</span>
                <span class="legend-item"><div class="legend-color confirmed"></div> Confirmés</span>
            </div>
        `;
    }

    // Affiche les actions recommandées
    displayRecommendedActions() {
        const container = document.getElementById('recommendedActions');
        if (!container) return;

        const stats = this.currentStats;
        const actions = this.generateRecommendedActions(stats);

        container.innerHTML = actions.map(action => `
            <div class="action-item ${action.priority}">
                <div class="action-icon">${action.icon}</div>
                <div class="action-content">
                    <h5>${action.title}</h5>
                    <p>${action.description}</p>
                    ${action.buttonText ? `<button class="btn btn-sm btn-primary" onclick="${action.action}">${action.buttonText}</button>` : ''}
                </div>
            </div>
        `).join('');
    }

    // Génère les actions recommandées
    generateRecommendedActions(stats) {
        const actions = [];
        const conversionRate = parseFloat(stats.conversionRate);

        // Action si le taux de conversion est faible
        if (conversionRate < 70) {
            actions.push({
                icon: '📞',
                title: 'Relancer les prospects en attente',
                description: `${stats.pendingRenewals} prospects en attente nécessitent un suivi`,
                priority: 'high',
                buttonText: 'Voir la liste',
                action: 'window.statsManager.showPendingProspects()'
            });
        }

        // Action si beaucoup d'annulations
        if (stats.cancelledRenewals > stats.totalProspects * 0.15) {
            actions.push({
                icon: '💡',
                title: 'Analyser les raisons d\'annulation',
                description: 'Taux d\'annulation élevé, analyser les causes',
                priority: 'medium',
                buttonText: 'Analyser',
                action: 'window.statsManager.analyzeCancellations()'
            });
        }

        // Action pour les nouveaux prospects
        const newProspects = stats.totalProspects - stats.confirmedRenewals - stats.pendingRenewals - stats.cancelledRenewals;
        if (newProspects > 20) {
            actions.push({
                icon: '🎯',
                title: 'Qualifier les nouveaux prospects',
                description: `${newProspects} nouveaux prospects à qualifier`,
                priority: 'medium',
                buttonText: 'Commencer',
                action: 'window.navigationManager.showAction("qualification")'
            });
        }

        // Action de félicitations si bon taux
        if (conversionRate >= 80) {
            actions.push({
                icon: '🎉',
                title: 'Excellent travail !',
                description: `Taux de conversion de ${conversionRate}% - Continue comme ça !`,
                priority: 'success'
            });
        }

        return actions;
    }

    // Actualise les statistiques
    async refreshStats() {
        await this.loadStats();
    }

    // Exporte les statistiques
    exportStats() {
        const exportContainer = document.getElementById('statsExport');
        const exportData = document.getElementById('exportData');
        
        if (!exportContainer || !exportData) return;

        const csvData = this.generateCSVExport();
        exportData.value = csvData;
        exportContainer.style.display = 'block';
        
        // Scroll vers l'export
        exportContainer.scrollIntoView({ behavior: 'smooth' });
    }

    // Génère l'export CSV
    generateCSVExport() {
        const stats = this.currentStats;
        const lines = [];
        
        // En-tête
        lines.push('# Statistiques Renouvellement 2026');
        lines.push(`# Généré le: ${formatDate(new Date())}`);
        lines.push('');
        
        // Vue d'ensemble
        lines.push('Type,Valeur');
        lines.push(`Prospects totaux,${stats.totalProspects}`);
        lines.push(`Renouvellements confirmés,${stats.confirmedRenewals}`);
        lines.push(`En attente,${stats.pendingRenewals}`);
        lines.push(`Annulés,${stats.cancelledRenewals}`);
        lines.push(`Chiffre d'affaires,${stats.totalRevenue}`);
        lines.push(`Taux de conversion,${stats.conversionRate}%`);
        lines.push('');
        
        // Données mensuelles
        lines.push('Mois,Prospects,Confirmés,CA');
        stats.monthlyData.forEach(month => {
            lines.push(`${month.month},${month.prospects},${month.confirmed},${month.revenue}`);
        });
        
        return lines.join('\n');
    }

    // Affiche les prospects en attente
    showPendingProspects() {
        // Cette méthode sera implémentée pour afficher une liste détaillée
        alert('Fonctionnalité à implémenter: Liste des prospects en attente');
    }

    // Analyse les annulations
    analyzeCancellations() {
        // Cette méthode sera implémentée pour analyser les raisons d'annulation
        alert('Fonctionnalité à implémenter: Analyse des annulations');
    }

    // Configure l'actualisation automatique
    setupAutoRefresh(intervalMinutes = 30) {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        
        this.refreshInterval = setInterval(() => {
            this.refreshStats();
        }, intervalMinutes * 60 * 1000);
    }

    // Arrête l'actualisation automatique
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Obtient les statistiques actuelles
    getCurrentStats() {
        return this.currentStats;
    }

    // Initialise le gestionnaire de statistiques
    initialize() {
        this.loadStats();
        this.setupAutoRefresh();
    }

    // Nettoie les ressources
    cleanup() {
        this.stopAutoRefresh();
        if (this.chartInstance) {
            this.chartInstance = null;
        }
    }
}

// Instance singleton
export const statsManager = new StatsManager();

// Expose globalement pour les événements onclick
window.statsManager = statsManager;

// Utilitaires pour les statistiques
export const StatsUtils = {
    // Calcule un taux de croissance
    calculateGrowthRate(current, previous) {
        if (previous === 0) return current > 0 ? 100 : 0;
        return ((current - previous) / previous * 100).toFixed(1);
    },

    // Formate un pourcentage
    formatPercentage(value, decimals = 1) {
        return `${value.toFixed(decimals)}%`;
    },

    // Génère une couleur pour un graphique
    generateChartColor(index, total = 10) {
        const hue = (index * 360) / total;
        return `hsl(${hue}, 70%, 50%)`;
    },

    // Calcule des tendances
    calculateTrend(data, field = 'value') {
        if (data.length < 2) return 'stable';
        
        const recent = data.slice(-3);
        const avg = recent.reduce((sum, item) => sum + item[field], 0) / recent.length;
        const lastValue = data[data.length - 1][field];
        
        if (lastValue > avg * 1.1) return 'up';
        if (lastValue < avg * 0.9) return 'down';
        return 'stable';
    }
};

export default statsManager;