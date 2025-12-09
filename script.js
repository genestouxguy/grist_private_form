// Variable globale pour stocker la table cible une fois le contexte chargé
let targetTableId = null;
let pendingChanges = {};
console.log("WIDGET DÉMARRÉ : Initialisation de Grist API."); // DÉBUT

// ----------------------------------------------------
// 1. Initialiser et récupérer le contexte de la table cible
// ----------------------------------------------------
grist.ready({ requiredAccess: 'full' });

// Écoutez le contexte pour obtenir l'ID de la table
grist.onContext(context => {
    console.log("CONTEXTE REÇU:", context); // 1. CONTEXTE DE BASE
    if (context.tableId) {
        targetTableId = context.tableId;
        console.log("Table cible identifiée:", targetTableId);
        loadColumns(targetTableId);
    } else {
        console.error("ERREUR : Aucune table cible identifiée dans le contexte.");
        document.getElementById('form-container').textContent =
            "Erreur : Le widget doit être lié à une table de données.";
    }
});

// ----------------------------------------------------
// 2. Charger les colonnes et rendre le formulaire
// ----------------------------------------------------
async function loadColumns(tableId) {
    console.log(`Tentative de chargement des colonnes pour la table : ${tableId}`);
    try {
        const columns = await grist.getColumns(tableId);
        console.log("Colonnes RÉCUPÉRÉES. Nombre de colonnes (brut) :", columns.length);
        renderCreationForm(columns);
    } catch (error) {
        console.error("ERREUR lors de l'appel grist.getColumns:", error);
        document.getElementById('form-container').textContent = "Erreur lors du chargement des colonnes.";
    }
}

// ----------------------------------------------------
// 3. Rendu du formulaire de création
// ----------------------------------------------------
function renderCreationForm(columns) {
    const formContainer = document.getElementById('form-container');
    formContainer.innerHTML = '';
    let visibleColumnsCount = 0;

    columns.forEach(col => {
        // Exclure les colonnes système
        if (['id', 'manualSort', 'parent_id', 'group_id'].includes(col.id)) {
            console.log(`Colonne ignorée (Système) : ${col.id}`);
            return;
        }

        const label = col.label;
        const colId = col.id;

        // ... (Création des éléments HTML) ...
        // ... (Création des labels et inputs) ...

        console.log(`Champ créé pour : ${colId} (Label : ${label})`);
        visibleColumnsCount++;

        // ... (Ajout au DOM) ...
    });
    console.log("RENDU DU FORMULAIRE TERMINÉ. Nombre de champs affichés :", visibleColumnsCount);
    updateSubmitButton();
}

// ----------------------------------------------------
// 4. Gérer les changements dans les champs de saisie
// ----------------------------------------------------
function handleInput(event) {
    const input = event.target;
    const colId = input.dataset.colId;
    let newValue = input.value;

    // Stocker le changement en attente
    pendingChanges[colId] = newValue;

    console.log(`CHANGEMENT DÉTECTÉ : ${colId} => ${newValue}`);
    console.log("Changements en attente :", pendingChanges);

    updateSubmitButton();
}

// ----------------------------------------------------
// 5. Fonction d'envoi pour la CRÉATION d'enregistrement
// ----------------------------------------------------
function handleSubmit() {
    if (targetTableId && Object.keys(pendingChanges).length > 0) {
        console.log("ACTION ENVOI DÉCLENCHÉE. Données envoyées à Grist :", pendingChanges);

        grist.addRecord(targetTableId, pendingChanges)
            .then(() => {
                console.log("ENREGISTREMENT RÉUSSI. Réinitialisation du formulaire.");
                alert("Enregistrement créé avec succès !");

                // Réinitialisation du formulaire
                document.getElementById('form-container').querySelectorAll('input').forEach(input => input.value = '');
                pendingChanges = {};
                updateSubmitButton();
            })
            .catch(error => {
                console.error("ERREUR LORS DE L'ENVOI (grist.addRecord) :", error);
                alert("Erreur lors de la création. Consultez la console.");
            });
    } else {
        console.warn("ENVOI BLOQUÉ : Aucune donnée à envoyer ou Table ID manquante.");
    }
}
// ... (Les fonctions updateSubmitButton sont conservées, assurez-vous de l'attacher au bouton) ...

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