let tableId = null;
let columnsList = [];

console.log('DISP - Démarrage du script');

// Initialisation du widget
grist.ready({
    requiredAccess: 'full'
});

console.log('DISP - Widget initialisé avec grist.ready()');

// Fonction pour charger directement la table
async function initializeWidget() {
    console.log('DISP - Début de initializeWidget');

    try {
        // Méthode 1: Essayer de récupérer la table sélectionnée
        console.log('DISP - Tentative fetchSelectedTable()');
        const tableData = await grist.fetchSelectedTable();
        console.log('DISP - fetchSelectedTable() réussi:', tableData);

        if (tableData) {
            // Le nom de la table est la première clé
            const tables = Object.keys(tableData);
            console.log('DISP - Tables trouvées:', tables);

            if (tables.length > 0) {
                tableId = tables[0];
                console.log('DISP - TableId défini:', tableId);

                const data = tableData[tableId];
                const allColumnNames = Object.keys(data).filter(col =>
                    col !== 'id' &&
                    !col.startsWith('gristHelper_') &&
                    !col.startsWith('manualSort')
                );
                console.log('DISP - Colonnes trouvées:', allColumnNames);

                await loadColumnsMetadata(allColumnNames);
            }
        }
    } catch (error) {
        console.log('DISP - Erreur avec fetchSelectedTable:', error);

        // Méthode 2: Essayer via getTable()
        try {
            console.log('DISP - Tentative getTable()');
            const table = await grist.getTable();
            console.log('DISP - getTable() résultat:', table);

            if (table && table.tableId) {
                tableId = table.tableId;
                console.log('DISP - TableId trouvé via getTable():', tableId);
                await loadTableDataAndColumns();
            }
        } catch (error2) {
            console.log('DISP - Erreur avec getTable:', error2);
            showMessage('Impossible de se connecter à la table. Assurez-vous que le widget a accès à la table.', 'error');
        }
    }
}

// Charge les données de la table quand on a le tableId
async function loadTableDataAndColumns() {
    console.log('DISP - loadTableDataAndColumns pour table:', tableId);

    try {
        const tableData = await grist.docApi.fetchTable(tableId);
        console.log('DISP - Données de la table:', tableData);

        if (tableData && tableData[tableId]) {
            const data = tableData[tableId];
            const allColumnNames = Object.keys(data).filter(col =>
                col !== 'id' &&
                !col.startsWith('gristHelper_') &&
                !col.startsWith('manualSort')
            );
            console.log('DISP - Colonnes trouvées:', allColumnNames);

            await loadColumnsMetadata(allColumnNames);
        }
    } catch (error) {
        console.log('DISP - Erreur dans loadTableDataAndColumns:', error);
        showMessage('Erreur lors du chargement des colonnes: ' + error.message, 'error');
    }
}

// Charge les métadonnées des colonnes
async function loadColumnsMetadata(columnNames) {
    console.log('DISP - loadColumnsMetadata pour colonnes:', columnNames);

    try {
        // Récupère les métadonnées des colonnes depuis _grist_Tables_column
        console.log('DISP - Récupération des métadonnées des colonnes');
        const columnsMetadata = await grist.docApi.fetchTable('_grist_Tables_column');
        const colData = columnsMetadata._grist_Tables_column;
        console.log('DISP - Métadonnées des colonnes:', colData);

        // Construit la liste des colonnes avec leurs types
        columnsList = columnNames.map(colName => {
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
        console.error('DISP - ERREUR dans loadColumnsMetadata:', error);
        showMessage('Erreur lors du chargement des métadonnées: ' + error.message, 'error');
    }
}

// Écoute des changements dans Grist
grist.onRecord(async (record, mappings) => {
    console.log('DISP - onRecord appelé');
    console.log('DISP - Record reçu:', record);
    console.log('DISP - Mappings reçus:', mappings);

    // Si on reçoit des données, on recharge
    if (!tableId) {
        await initializeWidget();
    }
});

// Lance l'initialisation au démarrage
grist.ready().then(() => {
    console.log('DISP - grist.ready() complété, lancement de initializeWidget');
    initializeWidget();
});

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