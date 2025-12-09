let gristAPI;
let visibleColumns = [];
let tableId = null;

// Initialisation du widget
grist.ready({
    requiredAccess: 'full',
    columns: []
});

// Écoute des changements dans Grist
grist.onRecords(async (records, mappings) => {
    await loadTableMetadata();
});

grist.onOptions(async (options, interaction) => {
    await loadTableMetadata();
});

// Charge les métadonnées de la table
async function loadTableMetadata() {
    try {
        const table = await grist.getTable();
        tableId = table?.tableId || await grist.selectedTable?.getTableId();

        if (!tableId) {
            showMessage('Aucune table sélectionnée', 'error');
            return;
        }

        // Récupère les colonnes visibles
        visibleColumns = await grist.viewApi.fetch(['fields']);

        if (!visibleColumns || !visibleColumns.fields) {
            showMessage('Impossible de charger les colonnes', 'error');
            return;
        }

        // Récupère les informations détaillées des colonnes
        const columnsInfo = await Promise.all(
            visibleColumns.fields.map(async (field) => {
                try {
                    const colId = field.colRef;
                    const tables = await grist.docApi.fetchTable('_grist_Tables_column');
                    const colData = tables._grist_Tables_column;

                    const colIndex = colData.id.findIndex(id => id === colId);

                    if (colIndex === -1) return null;

                    return {
                        id: colData.colId[colIndex],
                        label: colData.label[colIndex] || colData.colId[colIndex],
                        type: colData.type[colIndex],
                        visible: !field.hidden
                    };
                } catch (e) {
                    return null;
                }
            })
        );

        // Filtre les colonnes valides et visibles
        const validColumns = columnsInfo.filter(col => col && col.visible && col.id !== 'id');

        if (validColumns.length === 0) {
            showMessage('Aucune colonne visible trouvée', 'error');
            return;
        }

        renderForm(validColumns);
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