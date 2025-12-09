document.addEventListener("DOMContentLoaded", function () {
    // Attendre que Grist soit prêt
    if (window.grist) {
        grist.ready({
            // Demander à Grist les colonnes de la table sélectionnée
            requiredAccess: "full",
            columns: [
                { name: "id", title: "ID", optional: true },
            ],
        });

        // Une fois que Grist est prêt et que les colonnes sont disponibles
        // 2. S'abonner aux données de l'enregistrement sélectionné
        // 'records' contient la ligne actuellement sélectionnée (records[0])
        // 'mappings' contient les IDs des colonnes configurées dans le widget (les colonnes "visibles").
        grist.onRecords((records, mappings) => {
            const record = records[0];
            const colIds = Object.keys(mappings);
            renderForm(record, colIds, mappings);
        });

        // Fonction pour gérer la sauvegarde des modifications
        function handleInput(event) {
            const input = event.target;
            const colId = input.dataset.colId;
            let newValue = input.value;

            // La méthode setRecord prend un objet des modifications
            // Le ID de l'enregistrement n'est pas nécessaire, Grist le déduit.
            grist.setRecord({ [colId]: newValue });
            // Pas de besoin de rafraîchir, Grist mettra à jour l'UI automatiquement.
        }

        // Fonction pour rendre le formulaire dynamiquement
        function renderForm(record, colIds, mappings) {
            const formContainer = document.getElementById('form-container');
            formContainer.innerHTML = ''; // Nettoyer le contenu précédent

            if (!record) {
                formContainer.textContent = "Sélectionnez un enregistrement pour l'éditer.";
                return;
            }

            colIds.forEach(colId => {
                // Filtrer les IDs systèmes
                if (colId === 'id' || colId === 'manualSort' || !mappings[colId]) return;

                const value = record[colId] !== undefined && record[colId] !== null ? record[colId] : '';
                const label = mappings[colId].label; // Utilise le label configuré dans Grist

                const div = document.createElement('div');
                div.className = 'form-group';

                const labelEl = document.createElement('label');
                labelEl.textContent = label;
                labelEl.htmlFor = `input-${colId}`;

                const inputEl = document.createElement('input');
                inputEl.type = 'text'; // Type générique pour simplifier
                inputEl.id = `input-${colId}`;
                inputEl.value = value;
                inputEl.dataset.colId = colId; // Stocke l'ID de colonne pour la sauvegarde

                // Écouteur d'événement pour sauvegarder les modifications
                inputEl.addEventListener('change', handleInput);

                div.appendChild(labelEl);
                div.appendChild(inputEl);
                formContainer.appendChild(div);
            });
        }

        // Fonction pour générer le formulaire en fonction des colonnes
        function afficherFormulaireDynamique(colonnes) {
            const container = document.getElementById("champs-formulaire");
            container.innerHTML = ""; // Vider le contenu précédent

            colonnes.forEach(colonne => {
                if (colonne !== "id" && colonne !== "manualSort") { // Exclure les colonnes techniques
                    const label = document.createElement("label");
                    label.textContent = colonne;
                    label.style.display = "block";
                    label.style.marginBottom = "5px";

                    const input = document.createElement("input");
                    input.type = "text";
                    input.id = colonne;
                    input.placeholder = `Entrez ${colonne}`;

                    container.appendChild(label);
                    container.appendChild(input);
                }
            });
        }

        // Gestion de l'envoi du formulaire
        document.getElementById("envoyer").addEventListener("click", function () {
            const tableName = grist.doc.selectedTable;
            const record = {};

            // Récupérer les valeurs des champs
            document.querySelectorAll("#champs-formulaire input").forEach(input => {
                record[input.id] = input.value;
            });

            // Ajouter une nouvelle ligne à la table Grist
            grist.doc.addRecord(tableName, record, function (err) {
                if (err) {
                    console.error("Erreur lors de l'ajout de la ligne :", err);
                    alert("Erreur lors de l'envoi.");
                } else {
                    alert("Données enregistrées avec succès !");
                    // Réinitialiser le formulaire
                    document.querySelectorAll("#champs-formulaire input").forEach(input => {
                        input.value = "";
                    });
                }
            });
        });
    } else {
        console.error("L'API Grist n'est pas disponible.");
    }
});
