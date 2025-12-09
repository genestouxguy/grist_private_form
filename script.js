document.addEventListener("DOMContentLoaded", function () {
    document.getElementById("envoyer").addEventListener("click", function () {
        const nom = document.getElementById("nom").value;
        const reponse = document.getElementById("reponse").value;

        // Envoie les données à la table Grist
        if (window.grist) {
            grist.doc.addRecord("NomDeTaTable", { Nom: nom, Réponse: reponse });
            alert("Réponse enregistrée dans Grist !");
        } else {
            console.error("L'API Grist n'est pas disponible.");
        }
    });
});
