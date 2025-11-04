// Dados das músicas e playlists
let musicas = [];
let playlists = [];
let upcomingReleases = [];
let currentSongIndex = 0;
let isPlaying = false;
let isShuffleOn = false;
let isRepeatOn = false;
let audioPlayer = new Audio();
let shuffleHistory = [];
let imageObserver = null;

// Elementos DOM
const domElements = {
    audioPlayer: document.getElementById('audio-player'),
    playBtn: document.getElementById('play-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    repeatBtn: document.getElementById('repeat-btn'),
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
    upcomingContainer: document.getElementById('upcoming-container'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    playlistFilter: document.getElementById('playlist-filter')
};

// Sistema de carregamento de imagens com Intersection Observer
function initImageLoading() {
    if ('IntersectionObserver' in window) {
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.dataset.src;
                    img.classList.remove('lazy');
                    imageObserver.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px 0px',
            threshold: 0.1
        });
    }
}

// Função para observar uma imagem
function observeImage(img) {
    if (imageObserver && img.dataset.src) {
        imageObserver.observe(img);
    } else if (img.dataset.src) {
        // Fallback para navegadores sem suporte a IntersectionObserver
        img.src = img.dataset.src;
        img.classList.remove('lazy');
    }
}

// Preload de imagens críticas
function preloadCriticalImages() {
    const criticalImages = [
        'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9ucnU0UVNQVlVkVEhvVERxMVpxdS5wbmcifQ:supercell:KyOaqu_1gL2vFJpzEd0AABww3GAZzF688azTXXapoEs?width=2400',
        'https://files.catbox.moe/lw3upq.png',
        'https://files.catbox.moe/7mnub3.png',
        'https://files.catbox.moe/1cx0ek.png'
    ];
    
    criticalImages.forEach(src => {
        const img = new Image();
        img.src = src;
    });
}

// Carregar dados do JSON
async function loadData() {
    try {
        const response = await fetch('musicas.json');
        const data = await response.json();
        
        musicas = data.musicas || [];
        playlists = (data.playlists || []).map(playlist => ({
            ...playlist,
            imagem: playlist.imagem || "https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9ucnU0UVNQVlVkVEhvVERxMVpxdS5wbmcifQ:supercell:KyOaqu_1gL2vFJpzEd0AABww3GAZzF688azTXXapoEs?width=2400"
        }));
        upcomingReleases = data.upcomingReleases || [];
        
        // Inicializar sistema de carregamento de imagens
        initImageLoading();
        preloadCriticalImages();
        
        checkAndUnlockReleases();
        renderPlaylists();
        renderSongs();
        renderUpcomingReleases();
        
        const firstAvailableSong = musicas.find(song => !isUpcoming(song.id));
        if (firstAvailableSong) {
            currentSongIndex = musicas.indexOf(firstAvailableSong);
            loadSong(currentSongIndex);
        }
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

// Verificar e desbloquear lançamentos passados
function checkAndUnlockReleases() {
    const now = new Date();
    upcomingReleases = upcomingReleases.filter(release => {
        const releaseDate = new Date(release.releaseDate);
        return releaseDate > now;
    });
}

// Verificar se uma música é upcoming
function isUpcoming(songId) {
    return upcomingReleases.some(release => release.songId === songId);
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
            <img data-src="${playlist.imagem}" 
                 alt="${playlist.nome}" class="playlist-icon lazy">
            <img data-src="https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9tc0FZbjFLZG9Zbmg3THg5cE1ody5wbmcifQ:supercell:AjL67My6-d2z9WLXX-MO-U_mMxiKf6iefpj5wQHkMJ8?width=2400" 
                 alt="" class="playlist-folder lazy">
            <h3 class="playlist-name">${playlist.nome}</h3>
            <span class="playlist-count">${playlist.musicas.length} músicas</span>
        `;
        
        playlistCard.addEventListener('click', () => {
            filterByPlaylist(playlist.id);
        });
        
        domElements.playlistsContainer.appendChild(playlistCard);
        
        // Observar imagens para carregamento lazy
        const images = playlistCard.querySelectorAll('img.lazy');
        images.forEach(img => observeImage(img));
    });
}

// Renderizar músicas
function renderSongs(filteredSongs = null) {
    domElements.songsContainer.innerHTML = '';
    
    const songsToRender = filteredSongs || musicas;
    
    // Ordenar músicas (as mais recentes primeiro)
    const sortedSongs = [...songsToRender].sort((a, b) => b.id.localeCompare(a.id));
    
    sortedSongs.forEach((song, index) => {
        const songCard = document.createElement('div');
        songCard.className = `song-card ${isUpcoming(song.id) ? 'upcoming' : ''}`;
        
        const playlistInfo = playlists.find(p => p.musicas.includes(song.id));
        
        songCard.innerHTML = `
            <img data-src="${song.capa}" alt="${song.titulo}" class="song-cover lazy">
            <div class="song-info-container">
                <h3 class="song-title">${song.titulo}</h3>
                <p class="song-artist">${song.artista}</p>
                <p class="song-duration">${formatTime(song.duracao)}</p>
            </div>
            ${playlistInfo ? `<span class="song-playlist">${playlistInfo.nome}</span>` : ''}
            ${isUpcoming(song.id) ? '<span class="upcoming-badge">EM BREVE</span>' : ''}
        `;
        
        if (!isUpcoming(song.id)) {
            songCard.addEventListener('click', () => {
                currentSongIndex = musicas.findIndex(s => s.id === song.id);
                loadSong(currentSongIndex);
                playSong();
                
                // Resetar histórico de shuffle se não estiver ativo
                if (!isShuffleOn) {
                    shuffleHistory = [];
                }
            });
        }
        
        domElements.songsContainer.appendChild(songCard);
        
        // Observar imagem para carregamento lazy
        const img = songCard.querySelector('img.lazy');
        if (img) observeImage(img);
    });
}

// Renderizar próximos lançamentos
function renderUpcomingReleases() {
    domElements.upcomingContainer.innerHTML = '';
    
    if (upcomingReleases.length === 0) {
        domElements.upcomingContainer.innerHTML = '<p>Nenhum lançamento programado</p>';
        return;
    }
    
    // Ordenar por data mais próxima
    const sortedReleases = [...upcomingReleases].sort((a, b) => 
        new Date(a.releaseDate) - new Date(b.releaseDate)
    );
    
    sortedReleases.forEach(release => {
        const song = musicas.find(s => s.id === release.songId);
        if (!song) return;
        
        const releaseDate = new Date(release.releaseDate);
        const now = new Date();
        const timeDiff = releaseDate - now;
        
        // Criar elemento de lançamento
        const upcomingItem = document.createElement('div');
        upcomingItem.className = 'upcoming-item';
        
        upcomingItem.innerHTML = `
            <div class="upcoming-header">
                <img data-src="${song.capa}" alt="${song.titulo}" class="upcoming-cover lazy">
                <div class="upcoming-info">
                    <h3>${song.titulo}</h3>
                    <p>${song.artista}</p>
                </div>
            </div>
            <p>Lançamento: ${releaseDate.toLocaleDateString()} às ${releaseDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
            ${timeDiff > 0 ? `
            <div class="countdown-timer">
                <div class="countdown-item">
                    <span class="days">00</span>
                    <span class="countdown-label">DIAS</span>
                </div>
                <span class="countdown-separator">:</span>
                <div class="countdown-item">
                    <span class="hours">00</span>
                    <span class="countdown-label">HORAS</span>
                </div>
                <span class="countdown-separator">:</span>
                <div class="countdown-item">
                    <span class="minutes">00</span>
                    <span class="countdown-label">MIN</span>
                </div>
                <span class="countdown-separator">:</span>
                <div class="countdown-item">
                    <span class="seconds">00</span>
                    <span class="countdown-label">SEG</span>
                </div>
            </div>
            ` : `
            <div class="upcoming-available">DISPONÍVEL AGORA</div>
            <button class="unlock-btn" data-id="${song.id}">DESBLOQUEAR MÚSICA</button>
            `}
        `;
        
        domElements.upcomingContainer.appendChild(upcomingItem);
        
        // Observar imagem para carregamento lazy
        const img = upcomingItem.querySelector('img.lazy');
        if (img) observeImage(img);
        
        // Iniciar contagem regressiva se ainda não lançou
        if (timeDiff > 0) {
            startCountdown(upcomingItem, releaseDate);
        } else {
            // Adicionar evento ao botão de desbloquear
            upcomingItem.querySelector('.unlock-btn').addEventListener('click', () => {
                unlockSong(song.id);
            });
        }
    });
}

// Desbloquear música
function unlockSong(songId) {
    upcomingReleases = upcomingReleases.filter(release => release.songId !== songId);
    renderUpcomingReleases();
    renderSongs();
    
    // Se não houver música tocando, tocar a recém-desbloqueada
    if (!isPlaying) {
        const unlockedIndex = musicas.findIndex(s => s.id === songId);
        if (unlockedIndex !== -1) {
            currentSongIndex = unlockedIndex;
            loadSong(currentSongIndex);
        }
    }
}

// Iniciar contagem regressiva
function startCountdown(element, releaseDate) {
    const countdown = setInterval(() => {
        const now = new Date().getTime();
        const distance = releaseDate - now;
        
        if (distance < 0) {
            clearInterval(countdown);
            element.querySelector('.countdown-timer').outerHTML = `
                <div class="upcoming-available">DISPONÍVEL AGORA</div>
                <button class="unlock-btn" data-id="${element.querySelector('.unlock-btn')?.dataset.id || ''}">DESBLOQUEAR MÚSICA</button>
            `;
            
            // Adicionar evento ao novo botão
            element.querySelector('.unlock-btn')?.addEventListener('click', () => {
                unlockSong(element.querySelector('.unlock-btn').dataset.id);
            });
            
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        element.querySelector('.days').textContent = days.toString().padStart(2, '0');
        element.querySelector('.hours').textContent = hours.toString().padStart(2, '0');
        element.querySelector('.minutes').textContent = minutes.toString().padStart(2, '0');
        element.querySelector('.seconds').textContent = seconds.toString().padStart(2, '0');
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
    
    // Carregar imagem do player imediatamente (sem lazy loading)
    domElements.currentSongCover.src = song.capa;
    domElements.currentSongCover.onerror = function() {
        this.src = 'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9ucnU0UVNQVlVkVEhvVERxMVpxdS5wbmcifQ:supercell:KyOaqu_1gL2vFJpzEd0AABww3GAZzF688azTXXapoEs?width=2400';
    };
    
    domElements.audioPlayer.src = song.audio;
    domElements.duration.textContent = formatTime(song.duracao);
    
    // Atualizar barra de progresso quando os metadados estiverem carregados
    domElements.audioPlayer.addEventListener('loadedmetadata', () => {
        domElements.duration.textContent = formatTime(domElements.audioPlayer.duration);
    });
    
    // Adicionar efeito de spray
    addSprayEffect();
    
    // Adicionar ao histórico de shuffle se estiver ativo
    if (isShuffleOn && !shuffleHistory.includes(index)) {
        shuffleHistory.push(index);
    }
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

// Alternar shuffle
function toggleShuffle() {
    isShuffleOn = !isShuffleOn;
    domElements.shuffleBtn.classList.toggle('active', isShuffleOn);
    
    if (isShuffleOn) {
        // Iniciar histórico de shuffle com a música atual
        shuffleHistory = [currentSongIndex];
    } else {
        shuffleHistory = [];
    }
}

// Alternar repeat
function toggleRepeat() {
    isRepeatOn = !isRepeatOn;
    domElements.repeatBtn.classList.toggle('active', isRepeatOn);
}

// Obter próxima música com base no modo atual
function getNextSongIndex() {
    if (isRepeatOn) {
        return currentSongIndex;
    }
    
    if (isShuffleOn) {
        // Obter músicas disponíveis (não upcoming)
        const availableSongs = musicas.filter((_, index) => !isUpcoming(musicas[index].id));
        
        // Se já ouviu todas, reiniciar o histórico
        if (shuffleHistory.length === availableSongs.length) {
            shuffleHistory = [];
        }
        
        // Filtrar músicas não tocadas ainda
        const untrackedSongs = availableSongs.filter((_, index) => 
            !shuffleHistory.includes(musicas.indexOf(availableSongs[index]))
        );
        
        // Se houver músicas não tocadas, escolher uma aleatória
        if (untrackedSongs.length > 0) {
            const randomIndex = Math.floor(Math.random() * untrackedSongs.length);
            return musicas.indexOf(untrackedSongs[randomIndex]);
        }
        
        // Se todas foram tocadas, escolher qualquer uma aleatoriamente
        const randomIndex = Math.floor(Math.random() * availableSongs.length);
        return musicas.indexOf(availableSongs[randomIndex]);
    }
    
    // Modo normal - próxima música na ordem
    let nextIndex = (currentSongIndex + 1) % musicas.length;
    
    // Pular músicas que ainda não foram lançadas
    while (isUpcoming(musicas[nextIndex].id)) {
        nextIndex = (nextIndex + 1) % musicas.length;
        
        // Se todas as músicas forem upcoming, não faça nada
        if (nextIndex === currentSongIndex) return currentSongIndex;
    }
    
    return nextIndex;
}

// Obter música anterior com base no modo atual
function getPrevSongIndex() {
    if (isRepeatOn) {
        return currentSongIndex;
    }
    
    if (isShuffleOn && shuffleHistory.length > 1) {
        // Voltar no histórico de shuffle
        shuffleHistory.pop(); // Remove a atual
        return shuffleHistory[shuffleHistory.length - 1];
    }
    
    // Modo normal - música anterior na ordem
    let prevIndex = (currentSongIndex - 1 + musicas.length) % musicas.length;
    
    // Pular músicas que ainda não foram lançadas
    while (isUpcoming(musicas[prevIndex].id)) {
        prevIndex = (prevIndex - 1 + musicas.length) % musicas.length;
        
        // Se todas as músicas forem upcoming, não faça nada
        if (prevIndex === currentSongIndex) return currentSongIndex;
    }
    
    return prevIndex;
}

// Próxima música
function nextSong() {
    currentSongIndex = getNextSongIndex();
    loadSong(currentSongIndex);
    if (isPlaying) playSong();
}

// Música anterior
function prevSong() {
    currentSongIndex = getPrevSongIndex();
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

// Forçar carregamento de todas as imagens visíveis
function forceLoadVisibleImages() {
    const lazyImages = document.querySelectorAll('img.lazy');
    lazyImages.forEach(img => {
        const rect = img.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom >= 0) {
            observeImage(img);
        }
    });
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
    
    // Shuffle e Repeat
    domElements.shuffleBtn.addEventListener('click', toggleShuffle);
    domElements.repeatBtn.addEventListener('click', toggleRepeat);
    
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
    
    // Carregar imagens visíveis durante o scroll
    window.addEventListener('scroll', forceLoadVisibleImages);
    window.addEventListener('resize', forceLoadVisibleImages);
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
});
