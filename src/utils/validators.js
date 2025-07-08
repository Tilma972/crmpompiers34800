// Analyse le type de client (nouveau/renouvellement) avec données historiques
export function analyzeClientType(enterprise) {
    if (!enterprise) return { type: 'inconnu', confidence: 0 };
    
    const commentaires = enterprise.commentaires || '';
    const anneeCreation = enterprise.date_creation ? new Date(enterprise.date_creation).getFullYear() : null;
    const currentYear = new Date().getFullYear();
    
    // Indicateurs de renouvellement
    const renouvellementIndicators = [
        /renouvellement/i,
        /reconduction/i,
        /fidèle/i,
        /régulier/i,
        /habituel/i,
        /client depuis/i,
        /2023|2024|2025/g
    ];
    
    // Indicateurs de nouveau client
    const nouveauClientIndicators = [
        /nouveau/i,
        /première/i,
        /premier/i,
        /découverte/i,
        /prospect/i,
        /nouvelle demande/i
    ];
    
    let renouvellementScore = 0;
    let nouveauScore = 0;
    
    // Analyse des commentaires
    renouvellementIndicators.forEach(regex => {
        if (regex.test(commentaires)) {
            renouvellementScore += 1;
        }
    });
    
    nouveauClientIndicators.forEach(regex => {
        if (regex.test(commentaires)) {
            nouveauScore += 1;
        }
    });
    
    // Analyse temporelle
    if (anneeCreation && currentYear - anneeCreation >= 1) {
        renouvellementScore += 2;
    } else if (anneeCreation && currentYear - anneeCreation === 0) {
        nouveauScore += 2;
    }
    
    // Analyse des données alternatives si disponibles
    if (enterprise.alternative_data) {
        const altData = enterprise.alternative_data;
        if (altData.commentaires) {
            renouvellementIndicators.forEach(regex => {
                if (regex.test(altData.commentaires)) {
                    renouvellementScore += 0.5;
                }
            });
        }
        
        if (altData.date_creation) {
            const altYear = new Date(altData.date_creation).getFullYear();
            if (currentYear - altYear >= 1) {
                renouvellementScore += 1;
            }
        }
    }
    
    // Détermination du type
    if (renouvellementScore > nouveauScore) {
        return {
            type: 'renouvellement',
            confidence: Math.min(renouvellementScore / 5, 1),
            details: {
                renouvellement_score: renouvellementScore,
                nouveau_score: nouveauScore,
                historical_years: anneeCreation ? currentYear - anneeCreation : 0
            }
        };
    } else if (nouveauScore > renouvellementScore) {
        return {
            type: 'nouveau',
            confidence: Math.min(nouveauScore / 3, 1),
            details: {
                renouvellement_score: renouvellementScore,
                nouveau_score: nouveauScore,
                historical_years: anneeCreation ? currentYear - anneeCreation : 0
            }
        };
    } else {
        return {
            type: 'indéterminé',
            confidence: 0.5,
            details: {
                renouvellement_score: renouvellementScore,
                nouveau_score: nouveauScore,
                historical_years: anneeCreation ? currentYear - anneeCreation : 0
            }
        };
    }
}

// Analyse l'historique d'un client pour déterminer sa fidélité
export function analyzeClientHistory(enterprise) {
    if (!enterprise) return { loyalty: 'unknown', yearsActive: 0 };
    
    const commentaires = enterprise.commentaires || '';
    const dateCreation = enterprise.date_creation ? new Date(enterprise.date_creation) : null;
    const currentYear = new Date().getFullYear();
    
    let yearsActive = 0;
    let loyaltyScore = 0;
    
    // Calcul des années d'activité
    if (dateCreation) {
        yearsActive = currentYear - dateCreation.getFullYear();
    }
    
    // Mots-clés de fidélité dans les commentaires
    const loyaltyKeywords = [
        { keyword: 'fidèle', score: 3 },
        { keyword: 'régulier', score: 2 },
        { keyword: 'habituel', score: 2 },
        { keyword: 'satisfait', score: 1 },
        { keyword: 'renouvelle', score: 2 },
        { keyword: 'reconduction', score: 2 }
    ];
    
    loyaltyKeywords.forEach(item => {
        if (commentaires.toLowerCase().includes(item.keyword)) {
            loyaltyScore += item.score;
        }
    });
    
    // Bonus pour ancienneté
    if (yearsActive >= 3) {
        loyaltyScore += 2;
    } else if (yearsActive >= 2) {
        loyaltyScore += 1;
    }
    
    // Détermination du niveau de fidélité
    let loyalty = 'unknown';
    if (loyaltyScore >= 5) {
        loyalty = 'high';
    } else if (loyaltyScore >= 3) {
        loyalty = 'medium';
    } else if (loyaltyScore >= 1) {
        loyalty = 'low';
    }
    
    return {
        loyalty,
        yearsActive,
        loyaltyScore,
        details: {
            dateCreation: dateCreation ? dateCreation.toISOString() : null,
            commentaires: commentaires
        }
    };
}

// Valide un email
export function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Valide un numéro de téléphone français
export function validatePhoneNumber(phone) {
    const phoneRegex = /^(?:(?:\+33|0)[1-9])(?:[0-9]{8})$/;
    const cleanPhone = phone.replace(/\s/g, '');
    return phoneRegex.test(cleanPhone);
}

// Valide un nom d'entreprise
export function validateEnterpriseName(name) {
    return name && name.trim().length >= 2;
}

// Valide un code postal français
export function validatePostalCode(postalCode) {
    const postalRegex = /^[0-9]{5}$/;
    return postalRegex.test(postalCode);
}

// Valide un prix
export function validatePrice(price) {
    return !isNaN(price) && price >= 0;
}

// Valide une date
export function validateDate(date) {
    const dateObj = new Date(date);
    return dateObj instanceof Date && !isNaN(dateObj);
}