let tableId = null;
let columnsList = [];

console.log('DISP - Démarrage du script');

// Classe pour récupérer les types de colonnes (inspirée du widget calendar officiel)
class ColTypesFetcher {
    constructor() {
        this._columnsCache = null;
    }

    async fetchTypes() {
        if (this._columnsCache) {
            return this._columnsCache;
        }

        console.log('DISP - Récupération des métadonnées des colonnes');
        const tableData = await grist.docApi.fetchTable('_grist_Tables_column');
        console.log('DISP - Données brutes reçues:', tableData);

        const result = {};
        for (let i = 0; i < tableData.id.length; i++) {
            const colId = tableData.colId[i];
            result[colId] = {
                type: tableData.type[i],
                label: tableData.label[i] || colId,
                parentId: tableData.parentId[i]
            };
        }

        console.log('DISP - Cache des colonnes construit:', Object.keys(result).length, 'colonnes');
        this._columnsCache = result;
        return result;
    }

    getType(colId) {
        if (!this._columnsCache || !this._columnsCache[colId]) {
            return 'Text';
        }
        return this._columnsCache[colId].type;
    }

    getLabel(colId) {
        if (!this._columnsCache || !this._columnsCache[colId]) {
            return colId;
        }
        return this._columnsCache[colId].label;
    }
}

const colTypesFetcher = new ColTypesFetcher();

// Initialisation du widget avec demande de configuration
grist.ready({
    requiredAccess: 'full',
    columns: [{
        name: 'Colonnes',
        title: 'Colonnes à afficher dans le formulaire',
        optional: true,
        type: 'Text',
        allowMultiple: true
    }]
});

console.log('DISP - Widget initialisé avec grist.ready()');

// Fonction appelée quand les données changent
grist.onRecords(async (records, mappings) => {
    console.log('DISP - onRecords appelé');
    console.log('DISP - Records:', records);
    console.log('DISP - Mappings:', mappings);

    if (mappings) {
        await loadFromMappings(mappings);
    }
});

// Charge le formulaire depuis les mappings
async function loadFromMappings(mappings) {
    console.log('DISP - Début de loadFromMappings');
    console.log('DISP - Mappings reçus:', mappings);

    try {
        // Récupère le tableId
        if (mappings.tableId) {
            tableId = mappings.tableId;
            console.log('DISP - TableId trouvé dans mappings:', tableId);
        } else {
            console.log('DISP - Pas de tableId dans mappings');
            // Essaie via selectedTable
            const table = grist.selectedTable;
            console.log('DISP - selectedTable résultat:', table);
            if (table) {
                tableId = table;
                console.log('DISP - TableId via selectedTable:', tableId);
            }
        }

        if (!tableId) {
            console.log('DISP - ERREUR: Aucun tableId');
            showMessage('Veuillez configurer la table dans les options du widget', 'error');
            return;
        }

        // Précharge les types de colonnes
        await colTypesFetcher.fetchTypes();

        // Récupère les colonnes mappées
        const mappedColumns = [];
        for (const key in mappings) {
            if (key !== 'tableId' && mappings[key]) {
                if (Array.isArray(mappings[key])) {
                    mappedColumns.push(...mappings[key]);
                } else {
                    mappedColumns.push(mappings[key]);
                }
                console.log('DISP - Colonne mappée:', key, '=', mappings[key]);
            }
        }

        console.log('DISP - Total colonnes mappées:', mappedColumns);

        if (mappedColumns.length === 0) {
            console.log('DISP - Aucune colonne mappée, récupération de toutes les colonnes');
            await loadAllColumns();
            return;
        }

        // Construit la liste des colonnes avec leurs métadonnées
        columnsList = mappedColumns.map(colName => {
            return {
                id: colName,
                label: colTypesFetcher.getLabel(colName),
                type: colTypesFetcher.getType(colName)
            };
        });

        console.log('DISP - Liste finale des colonnes:', columnsList);

        if (columnsList.length === 0) {
            console.log('DISP - ERREUR: Liste vide');
            showMessage('Aucune colonne à afficher', 'error');
            return;
        }

        renderForm(columnsList);
        showMessage('Formulaire chargé (' + columnsList.length + ' champs)', 'success');
        setTimeout(() => hideMessage(), 2000);

    } catch (error) {
        console.error('DISP - Erreur dans loadFromMappings:', error);
        showMessage('Erreur: ' + error.message, 'error');
    }
}

// Charge toutes les colonnes de la table
async function loadAllColumns() {
    console.log('DISP - loadAllColumns pour table:', tableId);

    try {
        // Récupère toutes les données de la table pour connaître ses colonnes
        const tableData = await grist.docApi.fetchTable(tableId);
        console.log('DISP - Données de la table:', tableData);

        if (!tableData) {
            console.log('DISP - ERREUR: Pas de données pour la table');
            showMessage('Impossible de charger les colonnes de la table', 'error');
            return;
        }

        // Les clés de l'objet sont les noms des colonnes
        const columnNames = Object.keys(tableData).filter(col =>
            col !== 'id' &&
            !col.startsWith('gristHelper_') &&
            !col.startsWith('manualSort')
        );

        console.log('DISP - Colonnes trouvées:', columnNames);

        if (columnNames.length === 0) {
            console.log('DISP - ERREUR: Aucune colonne');
            showMessage('Aucune colonne trouvée dans la table', 'error');
            return;
        }

        // Construit la liste des colonnes avec leurs métadonnées
        columnsList = columnNames.map(colName => {
            return {
                id: colName,
                label: colTypesFetcher.getLabel(colName),
                type: colTypesFetcher.getType(colName)
            };
        });

        console.log('DISP - Liste finale des colonnes:', columnsList);

        renderForm(columnsList);
        showMessage('Formulaire chargé (' + columnsList.length + ' champs)', 'success');
        setTimeout(() => hideMessage(), 2000);

    } catch (error) {
        console.error('DISP - Erreur dans loadAllColumns:', error);
        showMessage('Erreur: ' + error.message, 'error');
    }
}

// Génère le formulaire
function renderForm(columns) {
    console.log('DISP - renderForm avec', columns.length, 'colonnes');
    const formFields = document.getElementById('form-fields');

    if (!formFields) {
        console.log('DISP - ERREUR: form-fields non trouvé');
        return;
    }

    formFields.innerHTML = '';

    columns.forEach((col, index) => {
        console.log('DISP - Création champ', index + 1, ':', col.id, '(', col.label, ')');

        const formGroup = document.createElement('div');
        formGroup.className = 'form-group';

        const label = document.createElement('label');
        label.setAttribute('for', col.id);
        label.textContent = col.label;

        const input = createInputForType(col);
        input.id = col.id;
        input.name = col.id;

        formGroup.appendChild(label);
        formGroup.appendChild(input);
        formFields.appendChild(formGroup);
    });

    console.log('DISP - Formulaire rendu:', formFields.children.length, 'champs');
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
        console.log('DISP - ERREUR: Pas de tableId');
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

        console.log('DISP - Enregistrement:', record);

        await grist.docApi.applyUserActions([
            ['AddRecord', tableId, null, record]
        ]);

        console.log('DISP - Enregistrement ajouté');
        showMessage('Enregistrement ajouté avec succès !', 'success');
        e.target.reset();

        setTimeout(() => hideMessage(), 3000);
    } catch (error) {
        console.error('DISP - Erreur enregistrement:', error);
        showMessage('Erreur: ' + error.message, 'error');
    }
});

// Réinitialisation du formulaire
document.getElementById('reset-btn').addEventListener('click', () => {
    console.log('DISP - Réinitialisation');
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

console.log('DISP - Script chargé');