// Dados das músicas e playlists
let musicas = [];
let playlists = [];
let currentSongIndex = 0;
let isPlaying = false;
let audioPlayer = new Audio();
let upcomingRelease = null;

// Elementos DOM
const domElements = {
    audioPlayer: document.getElementById('audio-player'),
    playBtn: document.getElementById('play-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    volumeBtn: document.getElementById('volume-btn'),
    volumeControl: document.getElementById('volume-control'),
    progressBar: document.getElementById('progress-bar'),
    currentTime: document.getElementById('current-time'),
    duration: document.getElementById('duration'),
    currentSongTitle: document.getElementById('current-song-title'),
    currentSongArtist: document.getElementById('current-song-artist'),
    currentSongCover: document.getElementById('current-song-cover'),
    songsContainer: document.getElementById('songs-container'),
    playlistsContainer: document.getElementById('playlists-container'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    playlistFilter: document.getElementById('playlist-filter'),
    upcomingTitle: document.getElementById('upcoming-title'),
    upcomingCover: document.getElementById('upcoming-cover'),
    upcomingDate: document.getElementById('upcoming-date'),
    days: document.getElementById('days'),
    hours: document.getElementById('hours'),
    minutes: document.getElementById('minutes'),
    seconds: document.getElementById('seconds')
};

// Carregar dados do JSON
async function loadData() {
    try {
        const response = await fetch('musicas.json');
        const data = await response.json();
        
        musicas = data.musicas;
        playlists = data.playlists;
        upcomingRelease = data.upcomingRelease;
        
        renderPlaylists();
        renderSongs();
        setupUpcomingRelease();
        
        // Configurar o player com a primeira música disponível
        const firstAvailableSong = musicas.find(song => !song.upcoming);
        if (firstAvailableSong) {
            currentSongIndex = musicas.indexOf(firstAvailableSong);
            loadSong(currentSongIndex);
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Renderizar playlists
function renderPlaylists() {
    domElements.playlistsContainer.innerHTML = '';
    domElements.playlistFilter.innerHTML = '<option value="all">Todas as playlists</option>';
    
    playlists.forEach(playlist => {
        // Adicionar ao filtro
        const option = document.createElement('option');
        option.value = playlist.id;
        option.textContent = playlist.nome;
        domElements.playlistFilter.appendChild(option);
        
        // Adicionar card da playlist
        const playlistCard = document.createElement('div');
        playlistCard.className = 'playlist-card';
        playlistCard.innerHTML = `
            <img src="https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9ucnU0UVNQVlVkVEhvVERxMVpxdS5wbmcifQ:supercell:KyOaqu_1gL2vFJpzEd0AABww3GAZzF688azTXXapoEs?width=2400" 
                 alt="${playlist.nome}" class="playlist-icon">
            <img src="https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9tc0FZbjFLZG9Zbmg3THg5cE1ody5wbmcifQ:supercell:AjL67My6-d2z9WLXX-MO-U_mMxiKf6iefpj5wQHkMJ8?width=2400" 
                 alt="" class="playlist-folder">
            <h3 class="playlist-name">${playlist.nome}</h3>
            <span class="playlist-count">${playlist.musicas.length} músicas</span>
        `;
        
        playlistCard.addEventListener('click', () => {
            filterByPlaylist(playlist.id);
        });
        
        domElements.playlistsContainer.appendChild(playlistCard);
    });
}

// Renderizar músicas
function renderSongs(filteredSongs = null) {
    domElements.songsContainer.innerHTML = '';
    
    const songsToRender = filteredSongs || musicas;
    
    songsToRender.forEach((song, index) => {
        const songCard = document.createElement('div');
        songCard.className = `song-card ${song.upcoming ? 'upcoming' : ''}`;
        
        const playlistInfo = playlists.find(p => p.musicas.includes(song.id));
        
        songCard.innerHTML = `
            <img src="${song.capa}" alt="${song.titulo}" class="song-cover">
            <div class="song-info-container">
                <h3 class="song-title">${song.titulo}</h3>
                <p class="song-artist">${song.artista}</p>
                <p class="song-duration">${formatTime(song.duracao)}</p>
            </div>
            ${playlistInfo ? `<span class="song-playlist">${playlistInfo.nome}</span>` : ''}
            ${song.upcoming ? '<span class="upcoming-badge">EM BREVE</span>' : ''}
        `;
        
        if (!song.upcoming) {
            songCard.addEventListener('click', () => {
                currentSongIndex = musicas.findIndex(s => s.id === song.id);
                loadSong(currentSongIndex);
                playSong();
            });
        }
        
        domElements.songsContainer.appendChild(songCard);
    });
}

// Configurar o próximo lançamento
function setupUpcomingRelease() {
    if (!upcomingRelease) return;
    
    const upcomingSong = musicas.find(song => song.id === upcomingRelease.songId);
    if (!upcomingSong) return;
    
    domElements.upcomingTitle.textContent = upcomingSong.titulo;
    domElements.upcomingCover.src = upcomingSong.capa;
    domElements.upcomingDate.textContent = `Lançamento: ${new Date(upcomingRelease.releaseDate).toLocaleDateString()} às ${new Date(upcomingRelease.releaseDate).toLocaleTimeString()}`;
    
    // Iniciar contagem regressiva
    startCountdown();
}

// Iniciar contagem regressiva
function startCountdown() {
    if (!upcomingRelease) return;
    
    const countdown = setInterval(() => {
        const now = new Date().getTime();
        const releaseDate = new Date(upcomingRelease.releaseDate).getTime();
        const distance = releaseDate - now;
        
        if (distance < 0) {
            clearInterval(countdown);
            domElements.countdownSection.innerHTML = '<h2>Lançamento disponível agora!</h2>';
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        domElements.days.textContent = days.toString().padStart(2, '0');
        domElements.hours.textContent = hours.toString().padStart(2, '0');
        domElements.minutes.textContent = minutes.toString().padStart(2, '0');
        domElements.seconds.textContent = seconds.toString().padStart(2, '0');
    }, 1000);
}

// Filtrar por playlist
function filterByPlaylist(playlistId) {
    if (playlistId === 'all') {
        renderSongs();
        return;
    }
    
    const playlist = playlists.find(p => p.id === playlistId);
    if (!playlist) return;
    
    const filteredSongs = musicas.filter(song => playlist.musicas.includes(song.id));
    renderSongs(filteredSongs);
}

// Carregar música
function loadSong(index) {
    const song = musicas[index];
    
    domElements.currentSongTitle.textContent = song.titulo;
    domElements.currentSongArtist.textContent = song.artista;
    domElements.currentSongCover.src = song.capa;
    domElements.audioPlayer.src = song.audio;
    domElements.duration.textContent = formatTime(song.duracao);
    
    // Atualizar barra de progresso quando os metadados estiverem carregados
    domElements.audioPlayer.addEventListener('loadedmetadata', () => {
        domElements.duration.textContent = formatTime(domElements.audioPlayer.duration);
    });
    
    // Adicionar efeito de spray
    addSprayEffect();
}

// Tocar música
function playSong() {
    domElements.audioPlayer.play();
    isPlaying = true;
    domElements.playBtn.textContent = '⏸';
    domElements.playBtn.classList.add('pulse');
}

// Pausar música
function pauseSong() {
    domElements.audioPlayer.pause();
    isPlaying = false;
    domElements.playBtn.textContent = '▶';
    domElements.playBtn.classList.remove('pulse');
}

// Próxima música
function nextSong() {
    currentSongIndex = (currentSongIndex + 1) % musicas.length;
    
    // Pular músicas que ainda não foram lançadas
    while (musicas[currentSongIndex].upcoming) {
        currentSongIndex = (currentSongIndex + 1) % musicas.length;
    }
    
    loadSong(currentSongIndex);
    if (isPlaying) playSong();
}

// Música anterior
function prevSong() {
    currentSongIndex = (currentSongIndex - 1 + musicas.length) % musicas.length;
    
    // Pular músicas que ainda não foram lançadas
    while (musicas[currentSongIndex].upcoming) {
        currentSongIndex = (currentSongIndex - 1 + musicas.length) % musicas.length;
    }
    
    loadSong(currentSongIndex);
    if (isPlaying) playSong();
}

// Atualizar barra de progresso
function updateProgressBar() {
    const { currentTime, duration } = domElements.audioPlayer;
    const progressPercent = (currentTime / duration) * 100;
    domElements.progressBar.value = progressPercent;
    domElements.currentTime.textContent = formatTime(currentTime);
}

// Formatar tempo (mm:ss)
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Adicionar efeito de spray
function addSprayEffect() {
    const spray = document.createElement('div');
    spray.className = 'spray-animation';
    spray.style.left = `${Math.random() * 80 + 10}%`;
    spray.style.top = `${Math.random() * 80 + 10}%`;
    document.body.appendChild(spray);
    
    setTimeout(() => {
        spray.remove();
    }, 1000);
}

// Pesquisar músicas
function searchSongs() {
    const searchTerm = domElements.searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        renderSongs();
        return;
    }
    
    const filteredSongs = musicas.filter(song => 
        song.titulo.toLowerCase().includes(searchTerm) || 
        song.artista.toLowerCase().includes(searchTerm)
    );
    
    renderSongs(filteredSongs);
}

// Event listeners
function setupEventListeners() {
    // Controles do player
    domElements.playBtn.addEventListener('click', () => {
        if (isPlaying) {
            pauseSong();
        } else {
            playSong();
        }
    });
    
    domElements.nextBtn.addEventListener('click', nextSong);
    domElements.prevBtn.addEventListener('click', prevSong);
    
    // Barra de progresso
    domElements.audioPlayer.addEventListener('timeupdate', updateProgressBar);
    
    domElements.progressBar.addEventListener('input', () => {
        const seekTime = (domElements.progressBar.value / 100) * domElements.audioPlayer.duration;
        domElements.audioPlayer.currentTime = seekTime;
    });
    
    // Volume
    domElements.volumeControl.addEventListener('input', () => {
        domElements.audioPlayer.volume = domElements.volumeControl.value;
    });
    
    domElements.volumeBtn.addEventListener('click', () => {
        if (domElements.audioPlayer.volume > 0) {
            domElements.audioPlayer.volume = 0;
            domElements.volumeControl.value = 0;
            domElements.volumeBtn.textContent = '🔇';
        } else {
            domElements.audioPlayer.volume = 0.7;
            domElements.volumeControl.value = 0.7;
            domElements.volumeBtn.textContent = '🔊';
        }
    });
    
    // Quando a música termina
    domElements.audioPlayer.addEventListener('ended', nextSong);
    
    // Pesquisa
    domElements.searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') {
            searchSongs();
        }
    });
    
    domElements.searchBtn.addEventListener('click', searchSongs);
    
    // Filtro por playlist
    domElements.playlistFilter.addEventListener('change', () => {
        filterByPlaylist(domElements.playlistFilter.value);
    });
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});
