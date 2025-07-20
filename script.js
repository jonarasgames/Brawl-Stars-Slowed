document.addEventListener("DOMContentLoaded", () => {
  const musicList = document.getElementById("music-list");
  const searchInput = document.getElementById("search");
  const playlistFilter = document.getElementById("playlistFilter");

  fetch("data/musicas.json")
    .then(res => res.json())
    .then(data => {
      document.getElementById("loading").style.display = "none";
      displayPlaylists(data);
      renderMusic(data);
      searchInput.addEventListener("input", () => renderMusic(data));
      playlistFilter.addEventListener("change", () => renderMusic(data));
    })
    .catch(err => {
      console.error("Erro ao carregar JSON:", err);
      musicList.innerHTML = "<p>Erro ao carregar as músicas.</p>";
    });

  function renderMusic(data) {
    const search = searchInput.value.toLowerCase();
    const selectedPlaylist = playlistFilter.value;
    musicList.innerHTML = "";

    data.forEach(music => {
      if ((music.title.toLowerCase().includes(search) || music.artist.toLowerCase().includes(search)) &&
          (selectedPlaylist === "all" || music.playlist === selectedPlaylist)) {
        const div = document.createElement("div");
        div.className = "music-item";
        div.innerHTML = `
          <div class="playlist-overlay"></div>
          <img src="img/${music.cover}" class="music-cover" />
          <h3>${music.title}</h3>
          <p>${music.artist}</p>
          <audio controls src="audio/${music.file}"></audio>
        `;
        musicList.appendChild(div);
      }
    });
  }

  function displayPlaylists(data) {
    const playlists = Array.from(new Set(data.map(m => m.playlist)));
    playlistFilter.innerHTML = `<option value="all">Todas as playlists</option>`;
    playlists.forEach(pl => {
      playlistFilter.innerHTML += `<option value="${pl}">${pl}</option>`;
    });
  }
});