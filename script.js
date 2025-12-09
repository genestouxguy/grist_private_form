let tableId = null;
let columnsList = [];

console.log('DISP - Démarrage du script');

// Initialisation du widget
grist.ready({
    requiredAccess: 'full',
    columns: [
        { name: 'columns', optional: true }
    ]
});

console.log('DISP - Widget initialisé avec grist.ready()');

// Écoute des changements dans Grist
grist.onRecord(async (record, mappings) => {
    console.log('DISP - onRecord appelé');
    console.log('DISP - Record reçu:', record);
    console.log('DISP - Mappings reçus:', mappings);

    if (mappings) {
        await loadTableMetadata(mappings);
    } else {
        console.log('DISP - Pas de mappings, tentative de chargement sans mappings');
        await loadTableMetadata(null);
    }
});

// Charge les métadonnées de la table
async function loadTableMetadata(mappings) {
    console.log('DISP - Début de loadTableMetadata');
    try {
        // Récupère le tableId depuis les mappings
        if (mappings && mappings.tableId) {
            tableId = mappings.tableId;
            console.log('DISP - TableId trouvé dans mappings:', tableId);
        } else {
            console.log('DISP - Pas de tableId dans mappings, tentative avec getTable()');
            // Fallback: essaie de récupérer via getTable
            const table = await grist.getTable();
            console.log('DISP - Résultat getTable():', table);
            if (table && table.tableId) {
                tableId = table.tableId;
                console.log('DISP - TableId trouvé via getTable():', tableId);
            }
        }

        if (!tableId) {
            console.log('DISP - ERREUR: Aucun tableId trouvé');
            showMessage('Aucune table sélectionnée', 'error');
            return;
        }

        console.log('DISP - TableId défini:', tableId);

        // Récupère les colonnes mappées depuis le widget
        let mappedColumns = [];
        if (mappings) {
            for (let key in mappings) {
                if (key !== 'tableId' && mappings[key]) {
                    mappedColumns.push(mappings[key]);
                    console.log('DISP - Colonne mappée trouvée:', key, '=', mappings[key]);
                }
            }
        }
        console.log('DISP - Total colonnes mappées:', mappedColumns.length);

        // Récupère la structure de la table via fetchTable
        console.log('DISP - Tentative de récupération des données de la table');
        let tableData;
        try {
            tableData = await grist.fetchSelectedTable();
            console.log('DISP - fetchSelectedTable() réussi');
        } catch (e) {
            console.log('DISP - fetchSelectedTable() échoué, essai avec fetchTable');
            tableData = await grist.docApi.fetchTable(tableId);
            console.log('DISP - fetchTable() réussi');
        }

        console.log('DISP - Données de table reçues:', tableData);

        if (!tableData || !tableData[tableId]) {
            console.log('DISP - ERREUR: Structure de données invalide');
            showMessage('Impossible de charger les données de la table', 'error');
            return;
        }

        // Extrait les noms de colonnes depuis les données
        const data = tableData[tableId];
        console.log('DISP - Données extraites:', data);
        const allColumnNames = Object.keys(data).filter(col =>
            col !== 'id' &&
            !col.startsWith('gristHelper_') &&
            !col.startsWith('manualSort')
        );
        console.log('DISP - Noms de colonnes trouvés:', allColumnNames);

        // Si on a des colonnes mappées, on les utilise, sinon on prend toutes les colonnes
        const columnsToUse = mappedColumns.length > 0 ? mappedColumns : allColumnNames;
        console.log('DISP - Colonnes à utiliser:', columnsToUse);

        // Récupère les métadonnées des colonnes depuis _grist_Tables_column
        console.log('DISP - Récupération des métadonnées des colonnes');
        const columnsMetadata = await grist.docApi.fetchTable('_grist_Tables_column');
        const colData = columnsMetadata._grist_Tables_column;
        console.log('DISP - Métadonnées des colonnes:', colData);

        // Construit la liste des colonnes avec leurs types
        columnsList = columnsToUse
            .filter(colName => colName && colName !== 'id')
            .map(colName => {
                // Trouve l'index de cette colonne dans les métadonnées
                const colIndex = colData.colId.indexOf(colName);
                console.log('DISP - Traitement colonne:', colName, 'index:', colIndex);

                let colType = 'Text';
                let colLabel = colName;

                if (colIndex !== -1) {
                    colType = colData.type[colIndex] || 'Text';
                    colLabel = colData.label[colIndex] || colName;
                    console.log('DISP - Métadonnées trouvées - Type:', colType, 'Label:', colLabel);
                } else {
                    console.log('DISP - Pas de métadonnées, utilisation des valeurs par défaut');
                }

                return {
                    id: colName,
                    label: colLabel,
                    type: colType
                };
            });

        console.log('DISP - Liste finale des colonnes:', columnsList);

        if (columnsList.length === 0) {
            console.log('DISP - ERREUR: Aucune colonne dans la liste finale');
            showMessage('Aucune colonne disponible', 'error');
            return;
        }

        console.log('DISP - Appel de renderForm avec', columnsList.length, 'colonnes');
        renderForm(columnsList);
        hideMessage();
        console.log('DISP - Formulaire rendu avec succès');
    } catch (error) {
        console.error('DISP - ERREUR CRITIQUE dans loadTableMetadata:', error);
        showMessage('Erreur lors du chargement: ' + error.message, 'error');
    }
}

// Génère le formulaire
function renderForm(columns) {
    console.log('DISP - Début de renderForm avec', columns.length, 'colonnes');
    const formFields = document.getElementById('form-fields');

    if (!formFields) {
        console.log('DISP - ERREUR: Element form-fields non trouvé');
        return;
    }

    formFields.innerHTML = '';
    console.log('DISP - Contenu de form-fields vidé');

    columns.forEach((col, index) => {
        console.log('DISP - Création du champ', index + 1, ':', col.id, '(', col.label, ')');

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.setAttribute('for', col.id);
        label.textContent = col.label;

        const input = createInputForType(col);
        input.id = col.id;
        input.name = col.id;

        console.log('DISP - Input créé pour', col.id, '- type:', input.tagName);

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        formFields.appendChild(formGroup);
    });

    console.log('DISP - Formulaire rendu complété - Nombre de champs:', formFields.children.length);
}

// Crée le bon type d'input selon le type de colonne
function createInputForType(column) {
    const type = column.type || 'Text';
    let input;

    if (type === 'Bool') {
        input = document.createElement('input');
        input.type = 'checkbox';
    } else if (type === 'Int' || type === 'Numeric') {
        input = document.createElement('input');
        input.type = 'number';
        if (type === 'Numeric') {
            input.step = '0.01';
        }
    } else if (type === 'Date' || type === 'DateTime') {
        input = document.createElement('input');
        input.type = type === 'Date' ? 'date' : 'datetime-local';
    } else if (type.startsWith('Text') || type === 'Text') {
        input = document.createElement('textarea');
    } else if (type.startsWith('Choice')) {
        input = document.createElement('select');
        const option = document.createElement('option');
        option.value = '';
        option.textContent = '-- Sélectionner --';
        input.appendChild(option);
    } else {
        input = document.createElement('input');
        input.type = 'text';
    }

    return input;
}

// Gestion de la soumission du formulaire
document.getElementById('grist-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!tableId) {
        showMessage('Aucune table sélectionnée', 'error');
        return;
    }

    try {
        const formData = new FormData(e.target);
        const record = {};

        for (const [key, value] of formData.entries()) {
            const input = document.getElementById(key);

            if (!input) continue;

            if (input.type === 'checkbox') {
                record[key] = input.checked;
            } else if (input.type === 'number') {
                record[key] = value ? parseFloat(value) : null;
            } else if (input.type === 'date' || input.type === 'datetime-local') {
                record[key] = value ? new Date(value).getTime() / 1000 : null;
            } else {
                record[key] = value || '';
            }
        }

        // Ajoute l'enregistrement à Grist
        await grist.docApi.applyUserActions([
            ['AddRecord', tableId, null, record]
        ]);

        showMessage('Enregistrement ajouté avec succès !', 'success');
        e.target.reset();

        setTimeout(() => {
            hideMessage();
        }, 3000);
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        showMessage('Erreur lors de l\'enregistrement: ' + error.message, 'error');
    }
});

// Réinitialisation du formulaire
document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('grist-form').reset();
    hideMessage();
});

// Affiche un message
function showMessage(text, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
}

// Cache le message
function hideMessage() {
    const messageDiv = document.getElementById('message');
    messageDiv.style.display = 'none';
    messageDiv.className = 'message';
}

// Initialisation au chargement - attend que Grist envoie les données
setTimeout(() => {
    console.log('DISP - Timeout atteint - Vérification du tableId');
    if (!tableId) {
        console.log('DISP - Toujours pas de tableId après 1 seconde');
        showMessage('En attente de la sélection d\'une table...', 'error');
    } else {
        console.log('DISP - TableId présent:', tableId);
    }
}, 1000);

console.log('DISP - Fin du chargement initial du script');