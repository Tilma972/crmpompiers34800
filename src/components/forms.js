import { validateEmail, validatePhoneNumber, validateEnterpriseName, validatePostalCode, validatePrice } from '../utils/validators.js';
import { formatPrice, formatPhoneNumber } from '../utils/formatters.js';
import { getBasePriceByFormat, calculateTotalPrice } from '../utils/helpers.js';
import { createElement, clearElement } from '../utils/dom.js';

// Gestionnaire de formulaires
class FormManager {
    constructor() {
        this.activeForm = null;
        this.formData = {};
        this.validationRules = {};
        this.onSubmitCallback = null;
    }

    // Crée un formulaire d'entreprise
    createEnterpriseForm(enterprise = null, mode = 'create') {
        const isEdit = mode === 'edit' && enterprise;
        const title = isEdit ? 'Modifier l\'entreprise' : 'Nouvelle entreprise';
        
        return `
            <div class="form-container">
                <div class="form-header">
                    <h3>${title}</h3>
                </div>
                <form id="enterpriseForm" class="enterprise-form">
                    <div class="form-group">
                        <label for="nom">Nom de l'entreprise *</label>
                        <input type="text" id="nom" name="nom" required 
                               value="${enterprise?.nom || ''}"
                               placeholder="Nom de l'entreprise">
                        <div class="field-error" id="nom-error"></div>
                    </div>
                    
                    <div class="form-group">
                        <label for="adresse">Adresse</label>
                        <input type="text" id="adresse" name="adresse"
                               value="${enterprise?.adresse || ''}"
                               placeholder="Adresse complète">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="code_postal">Code postal</label>
                            <input type="text" id="code_postal" name="code_postal"
                                   value="${enterprise?.code_postal || ''}"
                                   placeholder="34000">
                            <div class="field-error" id="code_postal-error"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="ville">Ville</label>
                            <input type="text" id="ville" name="ville"
                                   value="${enterprise?.ville || ''}"
                                   placeholder="Montpellier">
                        </div>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label for="telephone">Téléphone</label>
                            <input type="tel" id="telephone" name="telephone"
                                   value="${enterprise?.telephone || ''}"
                                   placeholder="04 67 XX XX XX">
                            <div class="field-error" id="telephone-error"></div>
                        </div>
                        
                        <div class="form-group">
                            <label for="email">Email</label>
                            <input type="email" id="email" name="email"
                                   value="${enterprise?.email || ''}"
                                   placeholder="contact@entreprise.com">
                            <div class="field-error" id="email-error"></div>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="secteur_activite">Secteur d'activité</label>
                        <select id="secteur_activite" name="secteur_activite">
                            <option value="">Sélectionnez un secteur</option>
                            <option value="commerce" ${enterprise?.secteur_activite === 'commerce' ? 'selected' : ''}>Commerce</option>
                            <option value="industrie" ${enterprise?.secteur_activite === 'industrie' ? 'selected' : ''}>Industrie</option>
                            <option value="services" ${enterprise?.secteur_activite === 'services' ? 'selected' : ''}>Services</option>
                            <option value="artisanat" ${enterprise?.secteur_activite === 'artisanat' ? 'selected' : ''}>Artisanat</option>
                            <option value="agriculture" ${enterprise?.secteur_activite === 'agriculture' ? 'selected' : ''}>Agriculture</option>
                            <option value="sante" ${enterprise?.secteur_activite === 'sante' ? 'selected' : ''}>Santé</option>
                            <option value="education" ${enterprise?.secteur_activite === 'education' ? 'selected' : ''}>Éducation</option>
                            <option value="autres" ${enterprise?.secteur_activite === 'autres' ? 'selected' : ''}>Autres</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="commentaires">Commentaires</label>
                        <textarea id="commentaires" name="commentaires" rows="3"
                                  placeholder="Notes, historique, remarques...">${enterprise?.commentaires || ''}</textarea>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            ${isEdit ? '💾 Mettre à jour' : '➕ Créer l\'entreprise'}
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="window.navigationManager.goBack()">
                            ← Annuler
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // Crée un formulaire de qualification
    createQualificationForm(enterprise, action = 'qualification') {
        return `
            <div class="form-container">
                <div class="form-header">
                    <h3>🎯 Qualification: ${enterprise.nom}</h3>
                    <div class="enterprise-info">
                        <span>📍 ${enterprise.ville || 'Ville non spécifiée'}</span>
                        <span>📞 ${enterprise.telephone || 'Téléphone non spécifié'}</span>
                    </div>
                </div>
                
                <form id="qualificationForm" class="qualification-form">
                    <input type="hidden" name="enterprise_id" value="${enterprise.id}">
                    <input type="hidden" name="action_type" value="${action}">
                    
                    <div class="form-section">
                        <h4>📋 Publications sélectionnées</h4>
                        <div id="publicationsContainer">
                            ${this.createPublicationBlock(0)}
                        </div>
                        <button type="button" class="btn btn-secondary btn-add" onclick="window.formManager.addPublication()">
                            ➕ Ajouter une publication
                        </button>
                    </div>
                    
                    <div class="form-section">
                        <h4>💰 Récapitulatif financier</h4>
                        <div class="price-summary">
                            <div class="price-line">
                                <span>Total HT:</span>
                                <span id="totalPrice">0,00 €</span>
                            </div>
                            <div class="price-line">
                                <span>TVA (20%):</span>
                                <span id="totalTVA">0,00 €</span>
                            </div>
                            <div class="price-line total">
                                <span>Total TTC:</span>
                                <span id="totalTTC">0,00 €</span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-section">
                        <h4>💬 Informations complémentaires</h4>
                        <div class="form-group">
                            <label for="qualification_comments">Commentaires de qualification</label>
                            <textarea id="qualification_comments" name="qualification_comments" rows="3"
                                      placeholder="Notes sur la qualification, besoins spécifiques, négociation..."></textarea>
                        </div>
                        
                        <div class="form-group">
                            <label for="prospect_status">Statut du prospect</label>
                            <select id="prospect_status" name="prospect_status">
                                <option value="interested">Intéressé</option>
                                <option value="very_interested">Très intéressé</option>
                                <option value="hesitant">Hésitant</option>
                                <option value="follow_up">À recontacter</option>
                                <option value="not_interested">Pas intéressé</option>
                            </select>
                        </div>
                        
                        <div class="form-group">
                            <label for="next_action">Prochaine action</label>
                            <select id="next_action" name="next_action">
                                <option value="send_quote">Envoyer un devis</option>
                                <option value="schedule_meeting">Programmer un RDV</option>
                                <option value="send_info">Envoyer des informations</option>
                                <option value="follow_up_call">Appel de suivi</option>
                                <option value="wait">Attendre retour client</option>
                            </select>
                        </div>
                    </div>
                    
                    <div class="form-actions">
                        <button type="submit" class="btn btn-primary">
                            🎯 Valider la qualification
                        </button>
                        <button type="button" class="btn btn-secondary" onclick="window.navigationManager.goBack()">
                            ← Annuler
                        </button>
                    </div>
                </form>
            </div>
        `;
    }

    // Crée un bloc de publication
    createPublicationBlock(index) {
        const formats = [
            '1/6 page',
            '1/4 page',
            '1/3 page',
            '1/2 page',
            '1 page',
            'Dos de couverture',
            'Couverture'
        ];
        
        const months = [
            'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
            'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
        ];

        return `
            <div class="publication-block" data-index="${index}">
                <div class="publication-header">
                    <h5>Publication ${index + 1}</h5>
                    ${index > 0 ? `<button type="button" class="btn-remove" onclick="window.formManager.removePublication(${index})">❌</button>` : ''}
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="format_${index}">Format</label>
                        <select id="format_${index}" name="publications[${index}][format]" 
                                onchange="window.formManager.updatePublicationPrice(${index})" required>
                            <option value="">Sélectionnez un format</option>
                            ${formats.map(format => `<option value="${format}">${format}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="mois_${index}">Mois</label>
                        <select id="mois_${index}" name="publications[${index}][mois]" required>
                            <option value="">Sélectionnez un mois</option>
                            ${months.map(month => `<option value="${month}">${month}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="prix_${index}">Prix (€)</label>
                        <input type="number" id="prix_${index}" name="publications[${index}][prix]"
                               min="0" step="0.01" readonly
                               placeholder="0,00">
                    </div>
                </div>
            </div>
        `;
    }

    // Ajoute une publication
    addPublication() {
        const container = document.getElementById('publicationsContainer');
        const currentBlocks = container.querySelectorAll('.publication-block');
        const newIndex = currentBlocks.length;
        
        const newBlock = createElement('div', { innerHTML: this.createPublicationBlock(newIndex) });
        container.appendChild(newBlock.firstElementChild);
        
        this.updateTotalPrice();
    }

    // Supprime une publication
    removePublication(index) {
        const block = document.querySelector(`[data-index="${index}"]`);
        if (block) {
            block.remove();
            this.reindexPublications();
            this.updateTotalPrice();
        }
    }

    // Réindexe les publications après suppression
    reindexPublications() {
        const blocks = document.querySelectorAll('.publication-block');
        blocks.forEach((block, newIndex) => {
            block.setAttribute('data-index', newIndex);
            
            // Met à jour les IDs et noms
            const inputs = block.querySelectorAll('input, select');
            inputs.forEach(input => {
                const name = input.getAttribute('name');
                if (name && name.includes('[')) {
                    const newName = name.replace(/\[\d+\]/, `[${newIndex}]`);
                    input.setAttribute('name', newName);
                }
                
                const id = input.getAttribute('id');
                if (id && id.includes('_')) {
                    const parts = id.split('_');
                    if (!isNaN(parts[parts.length - 1])) {
                        parts[parts.length - 1] = newIndex;
                        input.setAttribute('id', parts.join('_'));
                    }
                }
            });
            
            // Met à jour les labels
            const labels = block.querySelectorAll('label');
            labels.forEach(label => {
                const forAttr = label.getAttribute('for');
                if (forAttr && forAttr.includes('_')) {
                    const parts = forAttr.split('_');
                    if (!isNaN(parts[parts.length - 1])) {
                        parts[parts.length - 1] = newIndex;
                        label.setAttribute('for', parts.join('_'));
                    }
                }
            });
            
            // Met à jour le titre
            const header = block.querySelector('.publication-header h5');
            if (header) {
                header.textContent = `Publication ${newIndex + 1}`;
            }
        });
    }

    // Met à jour le prix d'une publication
    updatePublicationPrice(index) {
        const formatSelect = document.getElementById(`format_${index}`);
        const priceInput = document.getElementById(`prix_${index}`);
        
        if (formatSelect && priceInput) {
            const format = formatSelect.value;
            if (format) {
                const price = getBasePriceByFormat(format);
                priceInput.value = price;
            } else {
                priceInput.value = '';
            }
        }
        
        this.updateTotalPrice();
    }

    // Met à jour le prix total
    updateTotalPrice() {
        const priceInputs = document.querySelectorAll('input[name*="[prix]"]');
        let total = 0;
        
        priceInputs.forEach(input => {
            const price = parseFloat(input.value) || 0;
            total += price;
        });
        
        const totalTVA = total * 0.20;
        const totalTTC = total + totalTVA;
        
        // Met à jour l'affichage
        const totalPriceElement = document.getElementById('totalPrice');
        const totalTVAElement = document.getElementById('totalTVA');
        const totalTTCElement = document.getElementById('totalTTC');
        
        if (totalPriceElement) totalPriceElement.textContent = formatPrice(total);
        if (totalTVAElement) totalTVAElement.textContent = formatPrice(totalTVA);
        if (totalTTCElement) totalTTCElement.textContent = formatPrice(totalTTC);
    }

    // Valide un formulaire
    validateForm(formId) {
        const form = document.getElementById(formId);
        if (!form) return { valid: false, errors: ['Formulaire non trouvé'] };
        
        const errors = [];
        const data = new FormData(form);
        
        // Validation selon le type de formulaire
        if (formId === 'enterpriseForm') {
            return this.validateEnterpriseForm(data);
        } else if (formId === 'qualificationForm') {
            return this.validateQualificationForm(data);
        }
        
        return { valid: true, errors: [] };
    }

    // Valide le formulaire d'entreprise
    validateEnterpriseForm(formData) {
        const errors = [];
        
        const nom = formData.get('nom');
        if (!nom || !validateEnterpriseName(nom)) {
            errors.push('Nom d\'entreprise invalide');
            this.showFieldError('nom', 'Nom requis (minimum 2 caractères)');
        }
        
        const email = formData.get('email');
        if (email && !validateEmail(email)) {
            errors.push('Email invalide');
            this.showFieldError('email', 'Format email invalide');
        }
        
        const telephone = formData.get('telephone');
        if (telephone && !validatePhoneNumber(telephone)) {
            errors.push('Téléphone invalide');
            this.showFieldError('telephone', 'Format téléphone invalide');
        }
        
        const codePostal = formData.get('code_postal');
        if (codePostal && !validatePostalCode(codePostal)) {
            errors.push('Code postal invalide');
            this.showFieldError('code_postal', 'Code postal invalide (5 chiffres)');
        }
        
        return { valid: errors.length === 0, errors };
    }

    // Valide le formulaire de qualification
    validateQualificationForm(formData) {
        const errors = [];
        
        // Valide qu'il y a au moins une publication
        const publications = this.collectPublicationsData();
        if (publications.length === 0) {
            errors.push('Au moins une publication est requise');
        }
        
        // Valide chaque publication
        publications.forEach((pub, index) => {
            if (!pub.format) {
                errors.push(`Format requis pour la publication ${index + 1}`);
            }
            if (!pub.mois) {
                errors.push(`Mois requis pour la publication ${index + 1}`);
            }
            if (!pub.prix || !validatePrice(pub.prix)) {
                errors.push(`Prix invalide pour la publication ${index + 1}`);
            }
        });
        
        return { valid: errors.length === 0, errors };
    }

    // Collecte les données des publications
    collectPublicationsData() {
        const publications = [];
        const blocks = document.querySelectorAll('.publication-block');
        
        blocks.forEach((block, index) => {
            const format = document.getElementById(`format_${index}`)?.value;
            const mois = document.getElementById(`mois_${index}`)?.value;
            const prix = parseFloat(document.getElementById(`prix_${index}`)?.value) || 0;
            
            if (format && mois && prix > 0) {
                publications.push({ format, mois, prix });
            }
        });
        
        return publications;
    }

    // Affiche une erreur de champ
    showFieldError(fieldName, message) {
        const errorElement = document.getElementById(`${fieldName}-error`);
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
        
        const field = document.getElementById(fieldName);
        if (field) {
            field.classList.add('error');
        }
    }

    // Efface les erreurs
    clearErrors() {
        const errorElements = document.querySelectorAll('.field-error');
        errorElements.forEach(element => {
            element.textContent = '';
            element.style.display = 'none';
        });
        
        const errorFields = document.querySelectorAll('.error');
        errorFields.forEach(field => {
            field.classList.remove('error');
        });
    }

    // Initialise les événements du formulaire
    initializeForm(formId, onSubmit) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        this.activeForm = formId;
        this.onSubmitCallback = onSubmit;
        
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleSubmit(formId);
        });
        
        // Auto-save pour les formulaires longs
        if (formId === 'qualificationForm') {
            this.setupAutoSave(formId);
        }
    }

    // Gère la soumission du formulaire
    async handleSubmit(formId) {
        this.clearErrors();
        
        const validation = this.validateForm(formId);
        if (!validation.valid) {
            console.error('Erreurs de validation:', validation.errors);
            return;
        }
        
        const formData = new FormData(document.getElementById(formId));
        const data = Object.fromEntries(formData.entries());
        
        // Ajoute les publications pour le formulaire de qualification
        if (formId === 'qualificationForm') {
            data.publications = this.collectPublicationsData();
            data.total_price = calculateTotalPrice(data.publications);
        }
        
        if (this.onSubmitCallback) {
            await this.onSubmitCallback(data);
        }
    }

    // Configure la sauvegarde automatique
    setupAutoSave(formId) {
        const form = document.getElementById(formId);
        if (!form) return;
        
        const inputs = form.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                this.autoSave(formId);
            });
        });
    }

    // Sauvegarde automatique
    autoSave(formId) {
        try {
            const form = document.getElementById(formId);
            if (!form) return;
            
            const formData = new FormData(form);
            const data = Object.fromEntries(formData.entries());
            
            localStorage.setItem(`autosave_${formId}`, JSON.stringify(data));
        } catch (error) {
            console.error('Erreur lors de la sauvegarde automatique:', error);
        }
    }

    // Restaure les données sauvegardées
    restoreAutoSave(formId) {
        try {
            const saved = localStorage.getItem(`autosave_${formId}`);
            if (!saved) return;
            
            const data = JSON.parse(saved);
            const form = document.getElementById(formId);
            if (!form) return;
            
            Object.entries(data).forEach(([name, value]) => {
                const field = form.querySelector(`[name="${name}"]`);
                if (field) {
                    field.value = value;
                }
            });
        } catch (error) {
            console.error('Erreur lors de la restauration:', error);
        }
    }
}

// Instance singleton
export const formManager = new FormManager();

// Expose globalement pour les événements onclick
window.formManager = formManager;

export default formManager;