let tableId = null;
let columnsList = [];
let referenceTables = {}; // Cache pour les données des tables référencées
let isRendering = false; // Flag pour éviter les rendus simultanés
let customLabels = {}; // Labels personnalisés
let userAccess = null; // Niveau d'accès de l'utilisateur

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

// Vérifie le niveau d'accès de l'utilisateur
async function checkUserAccess() {
    console.log('DISP - Vérification du niveau d\'accès utilisateur');

    try {
        const access = await grist.docApi.getAccessToken();
        console.log('DISP - Access token:', access);

        // Essaie de récupérer les infos utilisateur via une requête
        const user = await grist.getUser();
        console.log('DISP - User info:', user);

        // Détermine le niveau d'accès
        // Les viewers ne peuvent généralement pas modifier les options du widget
        userAccess = user.Access || 'viewers';
        console.log('DISP - Niveau d\'accès détecté:', userAccess);

        // Masque le bouton d'édition pour les viewers
        const editButton = document.getElementById('edit-labels-btn');
        if (editButton) {
            if (userAccess === 'viewers' || userAccess === 'readers') {
                editButton.style.display = 'none';
                console.log('DISP - Bouton d\'édition masqué pour viewer/reader');
            } else {
                editButton.style.display = 'inline-block';
                console.log('DISP - Bouton d\'édition visible pour éditeur/propriétaire');
            }
        }
    } catch (error) {
        console.log('DISP - Impossible de déterminer le niveau d\'accès:', error);
        // Par défaut, on affiche le bouton (l'utilisateur aura une erreur s'il essaie de sauvegarder)
        userAccess = 'unknown';
    }
}

// Initialisation du widget avec demande de configuration
grist.ready({
    requiredAccess: 'full',
    columns: [{
        name: 'Colonnes',
        title: 'Colonnes à afficher dans le formulaire',
        optional: true,
        allowMultiple: true
    }]
});

console.log('DISP - Widget initialisé avec grist.ready()');

// Fonction appelée quand les données changent
grist.onRecords(async (records, mappings) => {
    console.log('DISP - onRecords appelé, isRendering:', isRendering);
    console.log('DISP - Records:', records);
    console.log('DISP - Mappings:', mappings);

    // Évite les appels simultanés
    if (isRendering) {
        console.log('DISP - Rendu déjà en cours, ignoré');
        return;
    }

    // Récupère le niveau d'accès de l'utilisateur
    await checkUserAccess();

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
            tableId = String(mappings.tableId);
            console.log('DISP - TableId trouvé dans mappings:', tableId);
        } else {
            console.log('DISP - Pas de tableId dans mappings');
            // Pour une page de widget, on récupère le nom de la table depuis les données
            const tables = await grist.docApi.fetchTable('_grist_Tables');
            console.log('DISP - Tables disponibles:', tables.tableId);

            // Si on n'a qu'une seule table utilisateur, on la prend
            const userTables = tables.tableId.filter(id => !id.startsWith('_grist_'));
            console.log('DISP - Tables utilisateur:', userTables);

            if (userTables.length > 0) {
                // Cherche la table "Clients" ou prend la première
                tableId = userTables.includes('Clients') ? 'Clients' : userTables[0];
                console.log('DISP - TableId sélectionné:', tableId);
            }
        }

        if (!tableId) {
            console.log('DISP - ERREUR: Aucun tableId');
            showMessage('Veuillez configurer la table dans les options du widget', 'error');
            return;
        }

        console.log('DISP - TableId final (type):', typeof tableId, tableId);

        // Récupère les labels personnalisés depuis les options
        try {
            const options = await grist.widgetApi.getOptions();
            console.log('DISP - Options récupérées:', options);
            if (options && options.customLabels) {
                customLabels = JSON.parse(options.customLabels);
                console.log('DISP - Labels personnalisés chargés:', customLabels);
            }
        } catch (e) {
            console.log('DISP - Pas de labels personnalisés:', e);
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
            const baseLabel = colTypesFetcher.getLabel(colName);
            const finalLabel = customLabels[colName] || baseLabel;

            return {
                id: colName,
                label: finalLabel,
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

    // S'assure que tableId est une string
    if (typeof tableId !== 'string') {
        console.log('DISP - ATTENTION: tableId n\'est pas une string:', typeof tableId, tableId);
        showMessage('Erreur: tableId invalide', 'error');
        return;
    }

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
async function renderForm(columns) {
    console.log('DISP - renderForm avec', columns.length, 'colonnes, isRendering:', isRendering);

    if (isRendering) {
        console.log('DISP - ATTENTION: renderForm déjà en cours, abandon');
        return;
    }

    isRendering = true;

    try {
        const formFields = document.getElementById('form-fields');

        if (!formFields) {
            console.log('DISP - ERREUR: form-fields non trouvé');
            return;
        }

        // Vide complètement le formulaire
        formFields.innerHTML = '';
        console.log('DISP - Formulaire vidé');

        for (let i = 0; i < columns.length; i++) {
            const col = columns[i];
            console.log('DISP - Création champ', i + 1, '/', columns.length, ':', col.id, '(', col.label, ') type:', col.type);

            const formGroup = document.createElement('div');
            formGroup.className = 'form-group';

            const label = document.createElement('label');
            label.setAttribute('for', col.id);
            label.textContent = col.label;

            const input = await createInputForType(col);
            input.id = col.id;
            input.name = col.id;

            formGroup.appendChild(label);
            formGroup.appendChild(input);
            formFields.appendChild(formGroup);
        }

        console.log('DISP - Formulaire rendu:', formFields.children.length, 'champs');
    } finally {
        isRendering = false;
        console.log('DISP - isRendering remis à false');
    }
}

// Crée le bon type d'input selon le type de colonne
async function createInputForType(column) {
    const type = column.type || 'Text';
    let input;

    console.log('DISP - createInputForType pour', column.id, 'type:', type);

    // Gestion des colonnes de référence (Ref:TableName)
    if (type.startsWith('Ref:')) {
        const refTableName = type.substring(4); // Extrait le nom de la table après "Ref:"
        console.log('DISP - Colonne de référence détectée, table:', refTableName);

        input = document.createElement('select');

        // Option vide par défaut
        const emptyOption = document.createElement('option');
        emptyOption.value = '';
        emptyOption.textContent = '-- Sélectionner --';
        input.appendChild(emptyOption);

        // Charge les données de la table référencée
        try {
            let refData;
            if (referenceTables[refTableName]) {
                console.log('DISP - Utilisation du cache pour', refTableName);
                refData = referenceTables[refTableName];
            } else {
                console.log('DISP - Chargement des données de', refTableName);
                refData = await grist.docApi.fetchTable(refTableName);
                referenceTables[refTableName] = refData;
                console.log('DISP - Données chargées:', Object.keys(refData));
            }

            // Trouve la colonne à afficher (cherche 'Nom', 'Name', 'Libelle', ou prend la première colonne non-id)
            let displayColumn = null;
            const columnNames = Object.keys(refData);
            console.log('DISP - Colonnes disponibles dans', refTableName, ':', columnNames);

            for (const possibleName of ['Nom', 'Name', 'Libelle', 'Label', 'Titre', 'Title']) {
                if (columnNames.includes(possibleName)) {
                    displayColumn = possibleName;
                    break;
                }
            }

            // Si aucune colonne standard trouvée, prend la première colonne non-id
            if (!displayColumn) {
                displayColumn = columnNames.find(col => col !== 'id' && !col.startsWith('gristHelper_'));
            }

            console.log('DISP - Colonne d\'affichage choisie:', displayColumn);

            if (displayColumn && refData.id && refData[displayColumn]) {
                // Crée les options du select
                for (let i = 0; i < refData.id.length; i++) {
                    const option = document.createElement('option');
                    option.value = refData.id[i];
                    option.textContent = refData[displayColumn][i] || `ID: ${refData.id[i]}`;
                    input.appendChild(option);
                }
                console.log('DISP - Nombre d\'options créées:', refData.id.length);
            } else {
                console.log('DISP - ATTENTION: Impossible de créer les options');
            }
        } catch (error) {
            console.error('DISP - Erreur lors du chargement de la table de référence:', error);
            // Garde le select avec juste l'option vide
        }

        return input;
    }

    // Types standards
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
    console.log('DISP - tableId:', tableId);
    console.log('DISP - columnsList:', columnsList);

    if (!tableId) {
        console.log('DISP - ERREUR: Pas de tableId');
        showMessage('Aucune table sélectionnée', 'error');
        return;
    }

    try {
        const record = {};

        // Parcourt tous les champs du formulaire
        for (let i = 0; i < columnsList.length; i++) {
            const colId = String(columnsList[i].id);
            const colType = columnsList[i].type;
            const input = document.getElementById(colId);

            if (!input) {
                console.log('DISP - Input non trouvé pour:', colId);
                continue;
            }

            console.log('DISP - Traitement champ:', colId, 'type colonne:', colType, 'type input:', input.type, 'value:', input.value);

            let value;

            if (input.type === 'checkbox') {
                value = Boolean(input.checked);
            } else if (input.type === 'number') {
                value = input.value !== '' ? Number(input.value) : null;
            } else if (input.type === 'date' || input.type === 'datetime-local') {
                if (input.value) {
                    const date = new Date(input.value);
                    value = Math.floor(date.getTime() / 1000);
                } else {
                    value = null;
                }
            } else if (input.tagName === 'SELECT' && colType && colType.startsWith('Ref:')) {
                // Pour les colonnes de référence, envoie l'ID sélectionné (déjà un nombre)
                value = input.value !== '' ? Number(input.value) : null;
                console.log('DISP - Colonne de référence, ID sélectionné:', value);
            } else {
                value = String(input.value || '');
            }

            record[colId] = value;
            console.log('DISP - Valeur assignée:', colId, '=', value, '(type:', typeof value, ')');
        }

        console.log('DISP - Record final:', record);

        // Sérialise pour vérifier
        try {
            const serialized = JSON.stringify(record);
            console.log('DISP - Record sérialisé:', serialized);
        } catch (e) {
            console.error('DISP - ERREUR de sérialisation:', e);
            showMessage('Erreur: impossible de sérialiser les données', 'error');
            return;
        }

        console.log('DISP - Appel applyUserActions...');

        const result = await grist.docApi.applyUserActions([
            ['AddRecord', String(tableId), null, record]
        ]);

        console.log('DISP - Résultat:', result);
        console.log('DISP - Enregistrement ajouté avec succès');
        showMessage('Enregistrement ajouté avec succès !', 'success');
        document.getElementById('grist-form').reset();

        setTimeout(() => hideMessage(), 3000);
    } catch (error) {
        console.error('DISP - Erreur enregistrement:', error);
        console.error('DISP - Message:', error.message);
        console.error('DISP - Type error:', typeof error);
        console.error('DISP - Error keys:', Object.keys(error));
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

// Gestion du bouton d'édition des libellés
document.getElementById('edit-labels-btn').addEventListener('click', () => {
    console.log('DISP - Affichage éditeur de libellés');

    // Vérification supplémentaire du niveau d'accès
    if (userAccess === 'viewers' || userAccess === 'readers') {
        showMessage('Vous n\'avez pas les permissions pour éditer les libellés', 'error');
        setTimeout(() => hideMessage(), 3000);
        return;
    }

    if (columnsList.length === 0) {
        showMessage('Aucune colonne configurée', 'error');
        return;
    }

    const editor = document.getElementById('labels-editor');
    const labelsList = document.getElementById('labels-list');

    // Génère la liste des champs à éditer
    labelsList.innerHTML = '';
    columnsList.forEach(col => {
        const item = document.createElement('div');
        item.className = 'label-edit-item';

        const label = document.createElement('label');
        label.textContent = col.id;

        const input = document.createElement('input');
        input.type = 'text';
        input.value = col.label;
        input.id = `edit-label-${col.id}`;

        item.appendChild(label);
        item.appendChild(input);
        labelsList.appendChild(item);
    });

    editor.style.display = 'block';
    document.getElementById('grist-form').style.display = 'none';
});

// Annuler l'édition des libellés
document.getElementById('cancel-labels-btn').addEventListener('click', () => {
    console.log('DISP - Annulation édition libellés');
    document.getElementById('labels-editor').style.display = 'none';
    document.getElementById('grist-form').style.display = 'block';
});

// Sauvegarder les libellés
document.getElementById('save-labels-btn').addEventListener('click', async () => {
    console.log('DISP - Sauvegarde des libellés');

    // Vérification du niveau d'accès
    if (userAccess === 'viewers' || userAccess === 'readers') {
        showMessage('Vous n\'avez pas les permissions pour sauvegarder', 'error');
        setTimeout(() => hideMessage(), 3000);
        return;
    }

    try {
        const newLabels = {};

        columnsList.forEach(col => {
            const input = document.getElementById(`edit-label-${col.id}`);
            if (input && input.value) {
                newLabels[col.id] = input.value;
            }
        });

        console.log('DISP - Nouveaux libellés:', newLabels);
        customLabels = newLabels;

        // Sauvegarde dans les options du widget
        await grist.widgetApi.setOptions({
            customLabels: JSON.stringify(newLabels)
        });

        console.log('DISP - Libellés sauvegardés dans les options');

        // Met à jour columnsList avec les nouveaux labels
        columnsList = columnsList.map(col => ({
            ...col,
            label: newLabels[col.id] || col.label
        }));

        // Recharge le formulaire
        await renderForm(columnsList);

        document.getElementById('labels-editor').style.display = 'none';
        document.getElementById('grist-form').style.display = 'block';

        showMessage('Libellés mis à jour avec succès', 'success');
        setTimeout(() => hideMessage(), 3000);
    } catch (error) {
        console.error('DISP - Erreur sauvegarde libellés:', error);
        showMessage('Erreur lors de la sauvegarde: ' + error.message, 'error');
    }
});

console.log('DISP - Script chargé');