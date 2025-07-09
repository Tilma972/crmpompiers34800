// Configuration des URLs des webhooks n8n
const N8N_WEBHOOKS = {       
    // Agent CRM - Création et validation d'entreprises
    AGENT_CRM: 'https://n8n.dsolution-ia.fr/webhook/crm_agent',
    
    // Recherche Entreprise - Toutes les opérations de recherche
    RECHERCHE_ENTREPRISE: 'https://n8n.dsolution-ia.fr/webhook/recherche_entreprise',
    
    // PDF Generator - Génération de factures et bons de commande
    PDF_GENERATOR: 'https://n8n.dsolution-ia.fr/webhook/pdf_generator',
    
    // Email Workflow - Envoi de formulaires et emails
    EMAIL_WORKFLOW: 'https://n8n.dsolution-ia.fr/webhook/email_workflow',
    
    // Gateway Entities - Toutes les actions CRUD déterministes
    GATEWAY_ENTITIES: 'https://n8n.dsolution-ia.fr/webhook/gateway_entities'
};

// Exporter la configuration
export default N8N_WEBHOOKS;
