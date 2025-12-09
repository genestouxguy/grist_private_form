document.addEventListener("DOMContentLoaded", function () {
    // Attendre que Grist soit prêt
    if (window.grist) {
        grist.ready({
            // Demander à Grist les colonnes de la table sélectionnée
            requiredAccess: "read table",
            columns: [
                { name: "id", title: "ID", optional: true },
            ],
        });

        // Une fois que Grist est prêt et que les colonnes sont disponibles
        grist.on("message", function (msg) {
            if (msg.type === "fetchSelectedTable") {
                const tableName = msg.tableId;
                grist.doc.fetchSelectedTable(tableName, function (err, table) {
                    if (err) {
                        console.error("Erreur lors de la récupération de la table :", err);
                        return;
                    }

                    // Récupérer les colonnes de la table
                    const colonnes = table.cols.map(col => col.id);
                    afficherFormulaireDynamique(colonnes);
                });
            }
        });

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
