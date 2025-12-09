let visibleColumns = [];
let tableId = null;

// Initialisation du widget
grist.ready({
    requiredAccess: 'full'
});

// Écoute des changements dans Grist
grist.onRecord(async (record, mappings) => {
    await loadTableMetadata();
});

grist.onOptions(async (options) => {
    await loadTableMetadata();
});

// Charge les métadonnées de la table
async function loadTableMetadata() {
    try {
        const table = await grist.getTable();
        tableId = table?.tableId;

        if (!tableId) {
            showMessage('Aucune table sélectionnée', 'error');
            return;
        }

        // Récupère les options du widget pour les colonnes visibles
        const options = await grist.widgetApi.getOption('columns');

        // Récupère toutes les colonnes de la table
        const tables = await grist.docApi.fetchTable('_grist_Tables_column');
        const allColumns = tables._grist_Tables_column;

        // Trouve l'ID de la table actuelle
        const tablesData = await grist.docApi.fetchTable('_grist_Tables');
        const tableIndex = tablesData._grist_Tables.tableId.indexOf(tableId);
        const tableRecordId = tablesData._grist_Tables.id[tableIndex];

        // Filtre les colonnes de cette table
        const tableColumns = [];
        for (let i = 0; i < allColumns.id.length; i++) {
            if (allColumns.parentId[i] === tableRecordId) {
                const colId = allColumns.colId[i];
                if (colId !== 'id' && !colId.startsWith('gristHelper_')) {
                    tableColumns.push({
                        id: colId,
                        label: allColumns.label[i] || colId,
                        type: allColumns.type[i],
                        visible: true
                    });
                }
            }
        }

        if (tableColumns.length === 0) {
            showMessage('Aucune colonne trouvée', 'error');
            return;
        }

        renderForm(tableColumns);
    } catch (error) {
        console.error('Erreur lors du chargement:', error);
        showMessage('Erreur lors du chargement des données: ' + error.message, 'error');
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
    const type = column.type;
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

    try {
        const formData = new FormData(e.target);
        const record = {};

        for (const [key, value] of formData.entries()) {
            const input = document.getElementById(key);

            if (input.type === 'checkbox') {
                record[key] = input.checked;
            } else if (input.type === 'number') {
                record[key] = value ? parseFloat(value) : null;
            } else if (input.type === 'date' || input.type === 'datetime-local') {
                record[key] = value ? new Date(value).getTime() / 1000 : null;
            } else {
                record[key] = value || null;
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
}

// Initialisation au chargement
loadTableMetadata();