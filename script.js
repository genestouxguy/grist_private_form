let tableId = null;
let columnsList = [];

console.log('DISP - Démarrage du script');

// Initialisation du widget
grist.ready({
    requiredAccess: 'full'
});

console.log('DISP - Widget initialisé avec grist.ready()');

// Fonction principale d'initialisation
async function initializeWidget() {
    console.log('DISP - Début de initializeWidget');

    try {
        // Récupère les informations de la section (vue) du widget
        console.log('DISP - Récupération des informations de la section');
        const section = await grist.sectionApi.getSection();
        console.log('DISP - Section récupérée:', section);

        if (section && section.tableId) {
            tableId = section.tableId;
            console.log('DISP - TableId trouvé dans section:', tableId);
        } else {
            console.log('DISP - Pas de tableId dans section, essai avec getTable()');
            const table = await grist.getTable();
            console.log('DISP - Résultat getTable():', table);

            if (table && table.tableId) {
                tableId = table.tableId;
                console.log('DISP - TableId trouvé via getTable():', tableId);
            }
        }

        if (!tableId) {
            console.log('DISP - ERREUR: Aucun tableId trouvé');
            showMessage('Impossible de déterminer la table associée au widget', 'error');
            return;
        }

        console.log('DISP - TableId confirmé:', tableId);
        await loadTableColumns();

    } catch (error) {
        console.error('DISP - Erreur dans initializeWidget:', error);
        showMessage('Erreur lors de l\'initialisation: ' + error.message, 'error');
    }
}

// Charge les colonnes de la table
async function loadTableColumns() {
    console.log('DISP - loadTableColumns pour table:', tableId);

    if (!tableId) {
        console.log('DISP - ERREUR: Pas de tableId');
        return;
    }

    try {
        // Récupère les colonnes visibles de la section
        console.log('DISP - Récupération des colonnes visibles');
        const section = await grist.sectionApi.getSection();
        console.log('DISP - Section pour colonnes:', section);

        let visibleColumns = [];

        if (section && section.fields) {
            console.log('DISP - Fields trouvés dans section:', section.fields);
            visibleColumns = section.fields
                .filter(field => !field.hidden)
                .map(field => field.colId);
            console.log('DISP - Colonnes visibles extraites:', visibleColumns);
        }

        // Si pas de colonnes visibles, récupère toutes les colonnes de la table
        if (visibleColumns.length === 0) {
            console.log('DISP - Pas de colonnes visibles, récupération de toutes les colonnes');
            const tableData = await grist.docApi.fetchTable(tableId);
            console.log('DISP - Données de table:', tableData);

            if (tableData && tableData[tableId]) {
                const data = tableData[tableId];
                visibleColumns = Object.keys(data).filter(col =>
                    col !== 'id' &&
                    !col.startsWith('gristHelper_') &&
                    !col.startsWith('manualSort')
                );
                console.log('DISP - Toutes les colonnes:', visibleColumns);
            }
        }

        if (visibleColumns.length === 0) {
            console.log('DISP - ERREUR: Aucune colonne trouvée');
            showMessage('Aucune colonne trouvée dans la table ' + tableId, 'error');
            return;
        }

        await loadColumnsMetadata(visibleColumns);

    } catch (error) {
        console.error('DISP - Erreur dans loadTableColumns:', error);
        showMessage('Erreur lors du chargement des colonnes: ' + error.message, 'error');
    }
}

// Charge les métadonnées des colonnes
async function loadColumnsMetadata(columnNames) {
    console.log('DISP - loadColumnsMetadata pour colonnes:', columnNames);

    try {
        // Récupère les métadonnées des colonnes
        console.log('DISP - Récupération des métadonnées');
        const columnsMetadata = await grist.docApi.fetchTable('_grist_Tables_column');
        const colData = columnsMetadata._grist_Tables_column;
        console.log('DISP - Métadonnées reçues, nombre total de colonnes:', colData.id.length);

        // Construit la liste des colonnes avec leurs types
        columnsList = columnNames.map(colName => {
            const colIndex = colData.colId.indexOf(colName);
            console.log('DISP - Traitement colonne:', colName, 'index:', colIndex);

            let colType = 'Text';
            let colLabel = colName;

            if (colIndex !== -1) {
                colType = colData.type[colIndex] || 'Text';
                colLabel = colData.label[colIndex] || colName;
                console.log('DISP - Type:', colType, 'Label:', colLabel);
            } else {
                console.log('DISP - Pas de métadonnées trouvées, valeurs par défaut');
            }

            return {
                id: colName,
                label: colLabel,
                type: colType
            };
        });

        console.log('DISP - Liste finale des colonnes:', columnsList);

        if (columnsList.length === 0) {
            console.log('DISP - ERREUR: Liste de colonnes vide');
            showMessage('Aucune colonne disponible', 'error');
            return;
        }

        console.log('DISP - Appel de renderForm avec', columnsList.length, 'colonnes');
        renderForm(columnsList);
        showMessage('Formulaire chargé pour la table: ' + tableId, 'success');
        setTimeout(() => hideMessage(), 2000);
        console.log('DISP - Formulaire rendu avec succès');

    } catch (error) {
        console.error('DISP - ERREUR dans loadColumnsMetadata:', error);
        showMessage('Erreur lors du chargement des métadonnées: ' + error.message, 'error');
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

    console.log('DISP - Formulaire rendu - Nombre de champs:', formFields.children.length);
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
    } else if (type.startsWith && type.startsWith('Text')) {
        input = document.createElement('textarea');
    } else if (type.startsWith && type.startsWith('Choice')) {
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

    console.log('DISP - Soumission du formulaire');

    if (!tableId) {
        console.log('DISP - ERREUR: Pas de tableId lors de la soumission');
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

        console.log('DISP - Enregistrement à ajouter:', record);

        // Ajoute l'enregistrement à Grist
        await grist.docApi.applyUserActions([
            ['AddRecord', tableId, null, record]
        ]);

        console.log('DISP - Enregistrement ajouté avec succès');
        showMessage('Enregistrement ajouté avec succès !', 'success');
        e.target.reset();

        setTimeout(() => {
            hideMessage();
        }, 3000);
    } catch (error) {
        console.error('DISP - Erreur lors de l\'enregistrement:', error);
        showMessage('Erreur lors de l\'enregistrement: ' + error.message, 'error');
    }
});

// Réinitialisation du formulaire
document.getElementById('reset-btn').addEventListener('click', () => {
    console.log('DISP - Réinitialisation du formulaire');
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

// Écoute des changements
grist.onRecord(async (record, mappings) => {
    console.log('DISP - onRecord appelé');
    console.log('DISP - Record:', record);
    console.log('DISP - Mappings:', mappings);

    // Recharge si le widget change de table
    if (!tableId) {
        await initializeWidget();
    }
});

// Lance l'initialisation au démarrage
console.log('DISP - Lancement de grist.ready().then()');
grist.ready().then(() => {
    console.log('DISP - grist.ready() complété, lancement de initializeWidget');
    initializeWidget();
});

console.log('DISP - Fin du chargement initial du script');