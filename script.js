window.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  const app = document.getElementById("app");
  const playlistsView = document.getElementById("playlists-view");
  const musicsView = document.getElementById("musics-view");
  const backBtn = document.getElementById("back-btn");
  const playlistCover = document.getElementById("playlist-cover");
  const playlistIcon = document.getElementById("playlist-icon");
  const playlistName = document.getElementById("playlist-name");
  const musicList = document.getElementById("music-list");
  const audio = document.getElementById("audio");

  let currentPlaylistIndex = null;

  function clearMusicList() {
    musicList.innerHTML = "";
  }

  function renderPlaylists(data) {
    playlistsView.innerHTML = "";
    data.playlists.forEach((playlist, i) => {
      const card = document.createElement("div");
      card.classList.add("playlist-card");

      const coverImg = document.createElement("img");
      coverImg.src = playlist.capa;
      coverImg.alt = playlist.nome;
      coverImg.classList.add("playlist-cover");

      const iconBtn = document.createElement("img");
      iconBtn.src =
        "https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9ucnU0UVNQVlVkVEhvVERxMVpxdS5wbmcifQ:supercell:KyOaqu_1gL2vFJpzEd0AABww3GAZzF688azTXXapoEs?width=2400";
      iconBtn.classList.add("playlist-icon-btn");
      iconBtn.alt = "Playlists";

      card.appendChild(coverImg);
      card.appendChild(iconBtn);

      const name = document.createElement("div");
      name.textContent = playlist.nome;
      name.classList.add("playlist-name");
      card.appendChild(name);

      card.addEventListener("click", () => {
        openPlaylist(i);
      });

      playlistsView.appendChild(card);
    });
  }

  function openPlaylist(index) {
    currentPlaylistIndex = index;
    const playlist = data.playlists[index];

    playlistsView.classList.add("hidden");
    musicsView.classList.remove("hidden");

    playlistCover.src = playlist.capa;
    playlistName.textContent = playlist.nome;
    playlistIcon.style.opacity = "0.8";

    musicsView.style.backgroundImage = `url(${playlist.capa})`;

    clearMusicList();

    playlist.musicas.forEach((musica, i) => {
      const li = document.createElement("li");
      li.textContent = musica.titulo;
      li.addEventListener("click", () => {
        playMusic(i);
        setActiveMusic(i);
      });
      musicList.appendChild(li);
    });

    playMusic(0);
    setActiveMusic(0);
  }

  function playMusic(musicIndex) {
    const playlist = data.playlists[currentPlaylistIndex];
    audio.src = playlist.musicas[musicIndex].arquivo;
    audio.play();
  }

  function setActiveMusic(musicIndex) {
    [...musicList.children].forEach((li, i) => {
      li.classList.toggle("active", i === musicIndex);
    });
  }

  backBtn.addEventListener("click", () => {
    musicsView.classList.add("hidden");
    playlistsView.classList.remove("hidden");
    musicsView.style.backgroundImage = "";
    audio.pause();
    audio.src = "";
  });

  let data;
  fetch("data/musicas.json")
    .then((res) => res.json())
    .then((json) => {
      data = json;
      renderPlaylists(data);
      loader.style.opacity = "0";
      setTimeout(() => {
        loader.style.display = "none";
        app.classList.remove("hidden");
      }, 500);
    })
    .catch((e) => {
      console.error("Erro ao carregar JSON:", e);
      alert("Erro ao carregar as músicas.");
    });
});
