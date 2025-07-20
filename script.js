document.addEventListener("DOMContentLoaded", () => {
    const loader = document.getElementById("loader");
    const app = document.getElementById("app");
    const search = document.getElementById("search");
    const container = document.getElementById("playlist-container");
    const audio = document.getElementById("audio");
    const cover = document.getElementById("cover");
    const title = document.getElementById("title");

    fetch("data/musicas.json")
        .then((res) => res.json())
        .then((musicas) => {
            loader.style.display = "none";
            app.style.display = "block";

            const showMusics = (filter = "") => {
                container.innerHTML = "";
                musicas.filter(m => m.titulo.toLowerCase().includes(filter.toLowerCase())).forEach(musica => {
                    const div = document.createElement("div");
                    div.className = "playlist";
                    div.textContent = musica.titulo;
                    div.onclick = () => {
                        audio.src = musica.audio;
                        cover.src = musica.capa;
                        title.textContent = musica.titulo;
                        audio.play();
                    };
                    container.appendChild(div);
                });
            };

            search.addEventListener("input", () => {
                showMusics(search.value);
            });

            showMusics();
        })
        .catch(err => {
            console.error("Erro ao carregar JSON:", err);
        });
});