let tableId = null;
let columnsList = [];

// Initialisation du widget
grist.ready({
    requiredAccess: 'full',
    columns: [
        { name: 'columns', optional: true }
    ]
});

// Écoute des changements dans Grist
grist.onRecord(async (record, mappings) => {
    if (mappings) {
        await loadTableMetadata(mappings);
    }
});

// Charge les métadonnées de la table
async function loadTableMetadata(mappings) {
    try {
        // Récupère le tableId depuis les mappings
        if (mappings && mappings.tableId) {
            tableId = mappings.tableId;
        } else {
            // Fallback: essaie de récupérer via getTable
            const table = await grist.getTable();
            if (table && table.tableId) {
                tableId = table.tableId;
            }
        }

        if (!tableId) {
            showMessage('Aucune table sélectionnée', 'error');
            return;
        }

        // Récupère les colonnes mappées depuis le widget
        let mappedColumns = [];
        if (mappings) {
            for (let key in mappings) {
                if (key !== 'tableId' && mappings[key]) {
                    mappedColumns.push(mappings[key]);
                }
            }
        }

        // Récupère la structure de la table via fetchTable
        let tableData;
        try {
            tableData = await grist.fetchSelectedTable();
        } catch (e) {
            console.log('fetchSelectedTable non disponible, essai avec fetchTable');
            tableData = await grist.docApi.fetchTable(tableId);
        }

        if (!tableData || !tableData[tableId]) {
            showMessage('Impossible de charger les données de la table', 'error');
            return;
        }

        // Extrait les noms de colonnes depuis les données
        const data = tableData[tableId];
        const allColumnNames = Object.keys(data).filter(col =>
            col !== 'id' &&
            !col.startsWith('gristHelper_') &&
            !col.startsWith('manualSort')
        );

        // Si on a des colonnes mappées, on les utilise, sinon on prend toutes les colonnes
        const columnsToUse = mappedColumns.length > 0 ? mappedColumns : allColumnNames;

        // Récupère les métadonnées des colonnes depuis _grist_Tables_column
        const columnsMetadata = await grist.docApi.fetchTable('_grist_Tables_column');
        const colData = columnsMetadata._grist_Tables_column;

        // Construit la liste des colonnes avec leurs types
        columnsList = columnsToUse
            .filter(colName => colName && colName !== 'id')
            .map(colName => {
                // Trouve l'index de cette colonne dans les métadonnées
                const colIndex = colData.colId.indexOf(colName);

                let colType = 'Text';
                let colLabel = colName;

                if (colIndex !== -1) {
                    colType = colData.type[colIndex] || 'Text';
                    colLabel = colData.label[colIndex] || colName;
                }

                return {
                    id: colName,
                    label: colLabel,
                    type: colType
                };
            });

        if (columnsList.length === 0) {
            showMessage('Aucune colonne disponible', 'error');
            return;
        }

        renderForm(columnsList);
        hideMessage();
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        showMessage('Erreur lors du chargement: ' + error.message, 'error');
    }
}

// Génère le formulaire
function renderForm(columns) {
    const formFields = document.getElementById('form-fields');
    formFields.innerHTML = '';

    columns.forEach(col => {
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
    if (!tableId) {
        showMessage('En attente de la sélection d\'une table...', 'error');
    }
}, 1000);