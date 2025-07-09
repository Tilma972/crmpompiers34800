// Configuration des webhooks n8n
export const N8N_WEBHOOKS = {
    AGENT_CRM: 'https://n8n.dsolution-ia.fr/webhook/crm_agent',
    RECHERCHE_ENTREPRISE: 'https://n8n.dsolution-ia.fr/webhook/recherche_entreprise',
    GATEWAY_ENTITIES: 'https://n8n.dsolution-ia.fr/webhook/gateway_entities'     
};

// Configuration des éléments UI
export const UI_ELEMENTS = {
    MAIN_MENU: 'mainMenu',
    SEARCH_INTERFACE: 'searchInterface',
    CONVERSATION_STATE: 'conversationState',
    SEARCH_INPUT: 'searchInput',
    SEARCH_RESULTS: 'searchResults',
    STATE_TITLE: 'stateTitle',
    STATE_CONTENT: 'stateContent',
    STATUS_TEXT: 'statusText',
    USER_NAME: 'userName',
    USER_AVATAR: 'userAvatar'
};

// Configuration des états de navigation
export const NAVIGATION_STATES = {
    MAIN_MENU: 'main_menu',
    SEARCH: 'search',
    ACTION_FACTURE: 'action_facture',
    ACTION_BON_COMMANDE: 'action_bon_commande',
    ACTION_FORMULAIRE: 'action_formulaire',
    ACTION_STATS: 'action_stats',
    ACTION_NOUVELLE_ENTREPRISE: 'action_nouvelle_entreprise',
    ACTION_QUALIFICATION: 'action_qualification',
    ACTION_ATTRIBUTION: 'action_attribution'
};

// Configuration des actions
export const ACTIONS = {
    FACTURE: 'facture',
    BON_COMMANDE: 'bon_commande',
    FORMULAIRE: 'formulaire',
    STATS: 'stats',
    NOUVELLE_ENTREPRISE: 'nouvelle_entreprise',
    QUALIFICATION: 'qualification',
    ATTRIBUTION: 'attribution',
    INTELLIGENCE: 'intelligence'
};

// Configuration des timeouts
export const TIMEOUTS = {
    SEARCH_DELAY: 300,
    API_TIMEOUT: 10000,
    RETRY_DELAY: 1000
};

// Configuration des paramètres par défaut
export const DEFAULT_CONFIG = {
    SEARCH_MIN_LENGTH: 2,
    MAX_SEARCH_RESULTS: 10,
    CACHE_TTL: 300000, // 5 minutes
    DEFAULT_USER: {
        first_name: 'Stève',
        id: 123456789
    }
};