// Variable globale pour stocker la table cible une fois le contexte chargé
let targetTableId = null;
let pendingChanges = {};

// ----------------------------------------------------
// 1. Initialiser et récupérer le contexte de la table cible
// ----------------------------------------------------
grist.ready({ requiredAccess: 'full' });

// Écoutez le contexte pour obtenir l'ID de la table
grist.onContext(context => {
    // Si le widget est lié à une table, son ID est dans le contexte.
    if (context.tableId) {
        targetTableId = context.tableId;
        // Une fois l'ID de la table récupéré, on peut charger les colonnes
        loadColumns(targetTableId);
    } else {
        document.getElementById('form-container').textContent =
            "Erreur : Le widget doit être lié à une table de données.";
    }
});

// ----------------------------------------------------
// 2. Charger les colonnes et rendre le formulaire
// ----------------------------------------------------
async function loadColumns(tableId) {
    try {
        // Récupère toutes les définitions de colonnes de la table
        const columns = await grist.getColumns(tableId);
        renderCreationForm(columns);
    } catch (error) {
        document.getElementById('form-container').textContent = "Erreur lors du chargement des colonnes: " + error.message;
    }
}

// ----------------------------------------------------
// 3. Rendu du formulaire de création
// ----------------------------------------------------
function renderCreationForm(columns) {
    const formContainer = document.getElementById('form-container');
    formContainer.innerHTML = '';

    columns.forEach(col => {
        // Exclure les colonnes système
        if (['id', 'manualSort', 'parent_id'].includes(col.id)) return;

        // Note: 'label' est l'intitulé que vous voyez dans Grist.
        const label = col.label;
        const colId = col.id;

        const div = document.createElement('div');
        // ... (création des labels et inputs comme dans la réponse précédente) ...

        // ...

        // Écouteur d'événement pour stocker le changement en attente
        inputEl.addEventListener('input', handleInput);

        div.appendChild(labelEl);
        div.appendChild(inputEl);
        formContainer.appendChild(div);
    });
    // S'assurer que le bouton est prêt
    updateSubmitButton();
}

// ----------------------------------------------------
// 4. Fonction d'envoi pour la CRÉATION d'enregistrement
// ----------------------------------------------------
function handleSubmit() {
    if (targetTableId && Object.keys(pendingChanges).length > 0) {
        // Utilisation de grist.addRecord pour la création
        grist.addRecord(targetTableId, pendingChanges)
            .then(() => {
                alert("Enregistrement créé avec succès !");
                // Optionnel : Effacer le formulaire après l'envoi
                document.getElementById('form-container').querySelectorAll('input').forEach(input => input.value = '');
                pendingChanges = {};
                updateSubmitButton();
            })
            .catch(error => {
                console.error("Erreur lors de la création de l'enregistrement:", error);
                alert("Erreur lors de la création.");
            });
    }
}
// ... (Les fonctions handleInput et updateSubmitButton sont conservées) ...

// 3. Gérer les changements dans les champs de saisie
function handleInput(event) {
    const input = event.target;
    const colId = input.dataset.colId;
    let newValue = input.value;

    // Stocker le changement en attente
    pendingChanges[colId] = newValue;

    // Activer le bouton d'envoi
    updateSubmitButton();
}

// 5. Mettre à jour l'état du bouton d'envoi
function updateSubmitButton() {
    const btn = document.getElementById('submit-btn');
    // Le bouton est actif s'il y a des changements en attente
    btn.disabled = Object.keys(pendingChanges).length === 0;
    // Assurez-vous que le gestionnaire d'événement est attaché (une seule fois)
    if (!btn.hasClickListener) {
        btn.addEventListener('click', handleSubmit);
        btn.hasClickListener = true;
    }
}

// 6. Rendre le formulaire dynamique
function renderForm(record, colIds, mappings) {
    const formContainer = document.getElementById('form-container');
    formContainer.innerHTML = '';

    if (!record) {
        formContainer.textContent = "Sélectionnez un enregistrement pour l'éditer.";
        return;
    }

    colIds.forEach(colId => {
        // Filtrer les IDs systèmes ('id', 'manualSort')
        if (colId === 'id' || colId === 'manualSort' || !mappings[colId]) return;

        const value = record[colId] !== undefined && record[colId] !== null ? record[colId] : '';
        const label = mappings[colId].label;

        const div = document.createElement('div');
        // ... (Création des labels et inputs) ...

        const labelEl = document.createElement('label');
        labelEl.textContent = label + ':';

        const inputEl = document.createElement('input');
        inputEl.type = 'text';
        inputEl.value = value;
        inputEl.dataset.colId = colId;

        // Utiliser l'événement 'input' pour une mise à jour immédiate de l'état
        inputEl.addEventListener('input', handleInput);

        div.appendChild(labelEl);
        div.appendChild(inputEl);
        formContainer.appendChild(div);
    });
    updateSubmitButton();
}