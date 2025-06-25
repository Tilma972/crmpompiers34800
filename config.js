// Configuration des URLs des webhooks n8n
const N8N_WEBHOOKS = {
    // Webhook pour la génération de factures
    FACTURE: 'https://votre-domaine.n8n.cloud/webhook/facture',
    
    // Webhook pour les bons de commande
    BON_COMMANDE: 'https://votre-domaine.n8n.cloud/webhook/bon-commande',
    
    // Webhook pour l'envoi de formulaires
    FORMULAIRE: 'https://votre-domaine.n8n.cloud/webhook/formulaire',
    
    // Webhook pour la création d'entreprises
    NOUVELLE_ENTREPRISE: 'https://votre-domaine.n8n.cloud/webhook/nouvelle-entreprise',
    
    // Webhook pour les statistiques
    STATISTIQUES: 'https://votre-domaine.n8n.cloud/webhook/statistiques'
};

// Exporter la configuration
export default N8N_WEBHOOKS;
