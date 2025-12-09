let pendingChanges = {};

// 1. Initialiser l'API Grist
grist.ready({
    requiredAccess: 'full'
});

// 2. S'abonner aux données de l'enregistrement sélectionné
grist.onRecords((records, mappings) => {
    const record = records[0];
    // ------------------------------------------------------------------
    // VÉRIFICATION 1 : Vérifier la présence de l'enregistrement sélectionné
    if (!record) {
        document.getElementById('form-container').textContent = "Veuillez sélectionner une ligne.";
        // On pourrait vouloir afficher le bouton 'Envoyer' comme désactivé ici aussi.
        return;
    }
    // ------------------------------------------------------------------

    // ------------------------------------------------------------------
    // VÉRIFICATION 2 : Vérifier que les mappages sont disponibles
    if (!mappings || Object.keys(mappings).length === 0) {
        // Cela signifie que vous n'avez pas sélectionné de colonnes dans les options du widget.
        document.getElementById('form-container').textContent =
            "Veuillez configurer les colonnes dans les paramètres du widget.";
        return;
    }
    // ------------------------------------------------------------------
    const colIds = Object.keys(mappings);
    renderForm(record, colIds, mappings);

    // Réinitialiser les changements et le bouton lorsque le record change
    pendingChanges = {};
    updateSubmitButton();
});

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

// 4. Gérer l'action d'envoi (clic sur le bouton)
function handleSubmit() {
    if (Object.keys(pendingChanges).length > 0) {
        // Envoyer toutes les modifications stockées à Grist
        grist.setRecord(pendingChanges)
            .then(() => {
                // Réinitialiser après l'envoi réussi
                pendingChanges = {};
                updateSubmitButton();
            })
            .catch(error => {
                console.error("Erreur lors de l'enregistrement:", error);
                alert("Erreur lors de l'enregistrement. Consultez la console.");
            });
    }
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