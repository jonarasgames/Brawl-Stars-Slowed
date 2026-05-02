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
let currentFilterPlaylistId = 'all';
let currentSearchTerm = '';
let currentAudioRetry = null;

const RETRY_CONFIG = {
    fetch: { attempts: 4, delayMs: 900 },
    image: { attempts: 5, delayMs: 450 },
    audio: { attempts: 5, delayMs: 900 }
};

// PERFIL (EDIÇÃO FÁCIL): altere somente estas listas para mudar opções para todos
let PROFILE_IMAGE_PRESETS = [
    { label: 'Shelly', url: 'https://files.catbox.moe/ye5x4f.png' },
    { label: 'Jae', url: 'https://files.catbox.moe/0re3yk.png' },
    { label: 'Kenji', url: 'https://files.catbox.moe/lctl0j.png' },
    { label: 'Alli', url: 'https://files.catbox.moe/3trfeg.png' },
    { label: 'Kaze', url: 'https://files.catbox.moe/157ka6.png' }
];

let PROFILE_TITLE_PRESETS = [
    { type: 'normal', title: 'Mortis, o Magnífico', image: 'https://files.catbox.moe/strc5w.png' },
    { type: 'normal', title: 'Caçador de Troféus', image: 'https://files.catbox.moe/r6znfn.png' },
    { type: 'prestigio', title: 'Lenda de Starr Park', image: 'https://files.catbox.moe/lctl0j.png' },
    { type: 'prestigio', title: 'Mestre do Showdown', image: 'https://files.catbox.moe/157ka6.png' },
    { type: 'brawlpass', title: 'Estrela do Brawl Pass', image: 'https://files.catbox.moe/0re3yk.png' },
    { type: 'brawlpass', title: 'Dono da Temporada', image: 'https://files.catbox.moe/3trfeg.png' }
];

async function loadProfilePresets() {
    try {
        const profileData = await fetchJsonWithRetry('profile_presets.json', RETRY_CONFIG.fetch.attempts, RETRY_CONFIG.fetch.delayMs);

        if (Array.isArray(profileData.images) && profileData.images.length) {
            PROFILE_IMAGE_PRESETS = profileData.images;
        }
        if (Array.isArray(profileData.titles) && profileData.titles.length) {
            PROFILE_TITLE_PRESETS = profileData.titles;
        }
    } catch (error) {
        console.warn('Usando presets padrão de perfil (falha ao carregar profile_presets.json).', error);
    }
}

// Elementos DOM
const domElements = {
    audioPlayer: document.getElementById('audio-player'),
    playBtn: document.getElementById('play-btn'),
    prevBtn: document.getElementById('prev-btn'),
    nextBtn: document.getElementById('next-btn'),
    surpriseBtn: document.getElementById('surprise-btn'),
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
    playlistFilter: document.getElementById('playlist-filter'),
    copySongBtn: document.getElementById('copy-song-btn'),
    scrollCurrentBtn: document.getElementById('scroll-current-btn'),
    networkStatus: document.getElementById('network-status'),
    brandLogo: document.getElementById('brand-logo'),
    profileTopBtn: document.getElementById('profile-top-btn'),
    profileTopPhoto: document.getElementById('profile-top-photo'),
    profileName: document.getElementById('profile-name'),
    profileImageSelect: document.getElementById('profile-image-select'),
    profileTitleSelect: document.getElementById('profile-title-select'),
    profileTitleCustom: document.getElementById('profile-title-custom'),
    profileFab: document.getElementById('profile-fab'),
    profileDrawer: document.getElementById('profile-drawer'),
    closeProfileBtn: document.getElementById('close-profile-btn'),
    saveProfileBtn: document.getElementById('save-profile-btn'),
    downloadProfileBtn: document.getElementById('download-profile-btn'),
    profilePreviewPhoto: document.getElementById('profile-preview-photo'),
    profilePreviewName: document.getElementById('profile-preview-name'),
    profilePreviewTitle: document.getElementById('profile-preview-title'),
    profilePreviewTitleImage: document.getElementById('profile-preview-title-image')
};

function setNetworkStatus(message = '', type = '') {
    if (!domElements.networkStatus) return;

    domElements.networkStatus.textContent = message;
    domElements.networkStatus.className = `network-status ${type}`.trim();
}


function getSongIdFromHash() {
    const hash = window.location.hash || '';
    const match = hash.match(/^#song=(.+)$/);
    return match ? decodeURIComponent(match[1]) : null;
}

function syncHashWithCurrentSong() {
    const song = musicas[currentSongIndex];
    if (!song) return;
    const targetHash = `#song=${encodeURIComponent(song.id)}`;
    if (window.location.hash !== targetHash) {
        history.replaceState(null, '', `${window.location.pathname}${targetHash}`);
    }
}

function applySongFromHash({ autoplay = false } = {}) {
    const hashSongId = getSongIdFromHash();
    if (!hashSongId) return false;

    const index = musicas.findIndex(song => song.id === hashSongId);
    if (index === -1 || isUpcoming(hashSongId)) return false;

    currentSongIndex = index;
    loadSong(currentSongIndex);
    if (autoplay) playSong();
    return true;
}

function applyThemeFromLogo() {
    const img = domElements.brandLogo;
    if (!img) return;

    const work = () => {
        try {
            const canvas = document.createElement('canvas');
            const size = 32;
            canvas.width = size;
            canvas.height = size;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, size, size);
            const data = ctx.getImageData(0, 0, size, size).data;

            let bestSat = { s: -1, r: 255, g: 77, b: 95 };
            let bestBright = { v: -1, r: 255, g: 216, b: 78 };

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                if (a < 120) continue;
                const max = Math.max(r, g, b);
                const min = Math.min(r, g, b);
                const sat = max === 0 ? 0 : (max - min) / max;
                const val = max / 255;
                if (sat > bestSat.s) bestSat = { s: sat, r, g, b };
                if (val > bestBright.v) bestBright = { v: val, r, g, b };
            }

            const root = document.documentElement;
            const primary = `rgb(${bestSat.r}, ${bestSat.g}, ${bestSat.b})`;
            const accent = `rgb(${bestBright.r}, ${bestBright.g}, ${bestBright.b})`;
            root.style.setProperty('--red', primary);
            root.style.setProperty('--primary-color', primary);
            root.style.setProperty('--yellow', accent);
            root.style.setProperty('--accent-color', accent);
        } catch (error) {
            console.warn('Não foi possível aplicar paleta pela logo:', error);
        }
    };

    if (img.complete) work();
    else img.addEventListener('load', work, { once: true });
}

function getProfileStorage() {
    try {
        return JSON.parse(localStorage.getItem('bsProfile') || '{}');
    } catch {
        return {};
    }
}

function populateProfilePresetOptions() {
    if (domElements.profileImageSelect) {
        domElements.profileImageSelect.innerHTML = PROFILE_IMAGE_PRESETS
            .map(item => `<option value="${item.url}">${item.label}</option>`)
            .join('');
    }

    if (domElements.profileTitleSelect) {
        domElements.profileTitleSelect.innerHTML = PROFILE_TITLE_PRESETS
            .map(item => `<option value="${item.type}|${item.title}|${item.image}">${item.type} • ${item.title}</option>`)
            .join('');
    }
}

function renderProfilePreview(profile) {
    const typeLabels = {
        normal: 'Normal do Brawler',
        prestigio: 'Prestígio',
        brawlpass: 'Brawl Pass'
    };

    const name = profile.name || 'Seu nome';
    const titleType = profile.titleType || 'normal';
    const titleText = profile.title || 'Mortis, o Magnífico';
    const titleImage = profile.titleImage || 'https://files.catbox.moe/strc5w.png';
    const photo = profile.photo || 'https://files.catbox.moe/ye5x4f.png';

    if (domElements.profilePreviewPhoto) domElements.profilePreviewPhoto.src = photo;
    if (domElements.profileTopPhoto) domElements.profileTopPhoto.src = photo;
    if (domElements.profilePreviewName) domElements.profilePreviewName.textContent = name;
    if (domElements.profilePreviewTitleImage) domElements.profilePreviewTitleImage.src = titleImage;
    if (domElements.profilePreviewTitle) domElements.profilePreviewTitle.textContent = `${typeLabels[titleType] || typeLabels.normal} • ${titleText}`;
}

function saveProfileToStorage(profile) {
    localStorage.setItem('bsProfile', JSON.stringify(profile));
}

function setupProfileSystem() {
    if (!domElements.profileName) return;

    populateProfilePresetOptions();

    const stored = getProfileStorage();

    if (domElements.profileName) domElements.profileName.value = stored.name || '';
    if (domElements.profileImageSelect) domElements.profileImageSelect.value = stored.photo || domElements.profileImageSelect.value;

    const defaultTitleValue = PROFILE_TITLE_PRESETS.length
        ? `${PROFILE_TITLE_PRESETS[0].type}|${PROFILE_TITLE_PRESETS[0].title}|${PROFILE_TITLE_PRESETS[0].image}`
        : 'normal|Mortis, o Magnífico|https://files.catbox.moe/strc5w.png';

    const storedTitleValue = stored.titleType && stored.title ? `${stored.titleType}|${stored.title}|${stored.titleImage || 'https://files.catbox.moe/strc5w.png'}` : null;
    if (domElements.profileTitleSelect) {
        domElements.profileTitleSelect.value = storedTitleValue || defaultTitleValue;
    }

    if (domElements.profileTitleCustom) domElements.profileTitleCustom.value = stored.customTitle || '';

    const profileFromInputs = () => {
        const [presetType, presetTitle, presetTitleImage] = (domElements.profileTitleSelect?.value || defaultTitleValue).split('|');
        const customTitle = domElements.profileTitleCustom?.value?.trim() || '';

        return {
            name: domElements.profileName?.value?.trim() || '',
            photo: domElements.profileImageSelect?.value || '',
            titleType: presetType || 'normal',
            title: customTitle || presetTitle || 'Mortis, o Magnífico',
            titleImage: presetTitleImage || 'https://files.catbox.moe/strc5w.png',
            customTitle
        };
    };

    const syncPreview = () => renderProfilePreview(profileFromInputs());
    syncPreview();

    domElements.profileName?.addEventListener('input', syncPreview);
    domElements.profileImageSelect?.addEventListener('change', syncPreview);
    domElements.profileTitleSelect?.addEventListener('change', syncPreview);
    domElements.profileTitleCustom?.addEventListener('input', syncPreview);

    domElements.saveProfileBtn?.addEventListener('click', () => {
        const profile = profileFromInputs();
        saveProfileToStorage(profile);
        setNetworkStatus('Perfil salvo no navegador.', 'warning');
        setTimeout(() => setNetworkStatus(''), 1500);
    });

    domElements.downloadProfileBtn?.addEventListener('click', () => {
        const profile = profileFromInputs();
        const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `brawl-profile-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    });
}

function setupProfileDrawer() {
    const open = () => {
        domElements.profileDrawer?.classList.add('open');
        domElements.profileDrawer?.setAttribute('aria-hidden', 'false');
    };
    const close = () => {
        domElements.profileDrawer?.classList.remove('open');
        domElements.profileDrawer?.setAttribute('aria-hidden', 'true');
    };

    const toggle = () => {
        if (domElements.profileDrawer?.classList.contains('open')) close();
        else open();
    };

    domElements.profileFab?.addEventListener('click', toggle);
    domElements.profileTopBtn?.addEventListener('click', toggle);
    domElements.closeProfileBtn?.addEventListener('click', close);
}

function setupClickFeedback() {
    document.addEventListener('click', (event) => {
        const target = event.target.closest('.ctrl, .ghost, .playlist-card, .song-card, .upcoming-item, .unlock-btn');
        if (!target) return;
        target.classList.add('clicked');
        setTimeout(() => target.classList.remove('clicked'), 180);
    });
}

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function withRetryParam(url, attempt) {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}retry=${Date.now()}-${attempt}`;
}

async function fetchJsonWithRetry(url, attempts, delayMs) {
    let lastError = null;

    for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
            setNetworkStatus(attempt > 1 ? `Tentando reconectar dados... (${attempt}/${attempts})` : '', attempt > 1 ? 'warning' : '');
            const response = await fetch(withRetryParam(url, attempt), { cache: 'no-store' });
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            setNetworkStatus('');
            return await response.json();
        } catch (error) {
            lastError = error;
            if (attempt < attempts) {
                await wait(delayMs * attempt);
            }
        }
    }

    setNetworkStatus('Falha ao carregar dados. Tente atualizar a página.', 'error');
    throw lastError;
}

function loadImageWithRetry(img, url, fallback = null) {
    if (!img || !url) return;

    let attempt = 1;

    const onError = () => {
        if (attempt < RETRY_CONFIG.image.attempts) {
            setNetworkStatus(`Recarregando capa... (${attempt}/${RETRY_CONFIG.image.attempts})`, 'warning');
            attempt += 1;
            setTimeout(() => {
                img.src = withRetryParam(url, attempt);
            }, RETRY_CONFIG.image.delayMs * attempt);
            return;
        }

        setNetworkStatus('Não foi possível carregar algumas capas.', 'error');

        if (fallback && img.src !== fallback) {
            img.onerror = null;
            img.src = fallback;
        }
    };

    img.onerror = onError;
    img.src = url;
}

function setAudioSourceWithRetry(url) {
    if (!url) return;

    setNetworkStatus('');

    currentAudioRetry = {
        url,
        attempt: 1
    };

    domElements.audioPlayer.src = url;
    domElements.audioPlayer.load();
}

function retryCurrentAudio() {
    if (!currentAudioRetry) return;

    if (currentAudioRetry.attempt >= RETRY_CONFIG.audio.attempts) {
        setNetworkStatus('Falha para carregar áudio. Clique em próxima ou tente novamente.', 'error');
        return;
    }

    currentAudioRetry.attempt += 1;
    setNetworkStatus(`Recarregando áudio... (${currentAudioRetry.attempt}/${RETRY_CONFIG.audio.attempts})`, 'warning');
    const retryAttempt = currentAudioRetry.attempt;
    const retryUrl = withRetryParam(currentAudioRetry.url, retryAttempt);

    setTimeout(() => {
        domElements.audioPlayer.src = retryUrl;
        domElements.audioPlayer.load();

        if (isPlaying) {
            domElements.audioPlayer.play().catch(() => {});
        }

        setNetworkStatus('');
    }, RETRY_CONFIG.audio.delayMs * retryAttempt);
}

// Sistema de carregamento de imagens com Intersection Observer
function initImageLoading() {
    if ('IntersectionObserver' in window) {
        imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadImageWithRetry(img, img.dataset.src);
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
        loadImageWithRetry(img, img.dataset.src);
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
        const data = await fetchJsonWithRetry('musicas.json', RETRY_CONFIG.fetch.attempts, RETRY_CONFIG.fetch.delayMs);
        
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
            applySongFromHash();
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
        songCard.dataset.songId = song.id;
        
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
        domElements.upcomingContainer.innerHTML = '<p class="section-helper">Sem lançamentos no momento.</p>';
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
        upcomingItem.dataset.songId = song.id;
        
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
    const songId = element.querySelector('.unlock-btn')?.dataset.id || element.dataset.songId || '';

    const countdown = setInterval(() => {
        const now = new Date().getTime();
        const distance = releaseDate - now;
        
        if (distance < 0) {
            clearInterval(countdown);
            element.querySelector('.countdown-timer').outerHTML = `
                <div class="upcoming-available">DISPONÍVEL AGORA</div>
                <button class="unlock-btn" data-id="${songId}">DESBLOQUEAR MÚSICA</button>
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
    currentFilterPlaylistId = playlistId;
    applyFilters();
}

// Carregar música
function loadSong(index) {
    const song = musicas[index];
    if (!song) return;
    
    domElements.currentSongTitle.textContent = song.titulo;
    domElements.currentSongArtist.textContent = song.artista;
    
    // Carregar imagem do player imediatamente (sem lazy loading)
    loadImageWithRetry(
        domElements.currentSongCover,
        song.capa,
        'https://cdn-assets-eu.frontify.com/s3/frontify-enterprise-files-eu/eyJwYXRoIjoic3VwZXJjZWxsXC9maWxlXC9ucnU0UVNQVlVkVEhvVERxMVpxdS5wbmcifQ:supercell:KyOaqu_1gL2vFJpzEd0AABww3GAZzF688azTXXapoEs?width=2400'
    );

    setAudioSourceWithRetry(song.audio);
    domElements.duration.textContent = formatTime(song.duracao);
    
    // Atualizar barra de progresso quando os metadados estiverem carregados
    if (domElements.audioPlayer.readyState >= 1) {
        domElements.duration.textContent = formatTime(domElements.audioPlayer.duration || song.duracao);
    }
    
    // Atualizar metadados globais sem alterar o título fixo do site
    document.title = 'Brawl Stars Slowed';
    setupMediaSession(song);
    syncHashWithCurrentSong();

    // Adicionar efeito de spray
    addSprayEffect();
    
    // Adicionar ao histórico de shuffle se estiver ativo
    if (isShuffleOn && !shuffleHistory.includes(index)) {
        shuffleHistory.push(index);
    }
}

// Tocar música
function playSong() {
    if (!domElements.audioPlayer.src) return;
    domElements.audioPlayer.play();
    isPlaying = true;
    domElements.playBtn.textContent = '⏸';
    domElements.playBtn.classList.add('pulse');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
}

// Pausar música
function pauseSong() {
    domElements.audioPlayer.pause();
    isPlaying = false;
    domElements.playBtn.textContent = '▶';
    domElements.playBtn.classList.remove('pulse');
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
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
    const progressPercent = duration ? (currentTime / duration) * 100 : 0;
    domElements.progressBar.value = progressPercent;
    domElements.progressBar.style.background = `linear-gradient(to right, var(--primary-color) ${progressPercent}%, var(--secondary-color) ${progressPercent}%)`;
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
    currentSearchTerm = domElements.searchInput.value.trim().toLowerCase();
    applyFilters();
}

function applyFilters() {
    let filteredSongs = [...musicas];

    if (currentFilterPlaylistId !== 'all') {
        const playlist = playlists.find(p => p.id === currentFilterPlaylistId);
        filteredSongs = playlist
            ? filteredSongs.filter(song => playlist.musicas.includes(song.id))
            : [];
    }

    if (currentSearchTerm) {
        filteredSongs = filteredSongs.filter(song =>
            song.titulo.toLowerCase().includes(currentSearchTerm) ||
            song.artista.toLowerCase().includes(currentSearchTerm)
        );
    }

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


function playRandomSong() {
    const availableSongs = musicas
        .map((song, index) => ({ song, index }))
        .filter(({ song }) => !isUpcoming(song.id));

    if (!availableSongs.length) return;

    const randomPick = availableSongs[Math.floor(Math.random() * availableSongs.length)];
    currentSongIndex = randomPick.index;
    loadSong(currentSongIndex);
    playSong();
}

function copyCurrentSongLink() {
    const song = musicas[currentSongIndex];
    if (!song) return;

    const songUrl = `${window.location.origin}${window.location.pathname}#song=${encodeURIComponent(song.id)}`;

    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(songUrl);
        setNetworkStatus('Link da música copiado.', 'warning');
        setTimeout(() => setNetworkStatus(''), 1200);
    } else {
        prompt('Copie o link da música:', songUrl);
    }
}

function scrollToCurrentSongCard() {
    const song = musicas[currentSongIndex];
    if (!song) return;

    const card = domElements.songsContainer.querySelector(`[data-song-id="${song.id}"]`);
    if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.classList.add('is-current-highlight');
        setTimeout(() => card.classList.remove('is-current-highlight'), 1400);
    }
}

function setupMediaSession(song) {
    if (!('mediaSession' in navigator) || !song) return;

    navigator.mediaSession.metadata = new MediaMetadata({
        title: song.titulo,
        artist: song.artista,
        album: 'Brawl Stars Slowed',
        artwork: [
            { src: song.capa, sizes: '512x512', type: 'image/png' },
            { src: song.capa, sizes: '256x256', type: 'image/png' },
            { src: song.capa, sizes: '128x128', type: 'image/png' }
        ]
    });

    navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';
}

function registerMediaSessionActions() {
    if (!('mediaSession' in navigator)) return;

    navigator.mediaSession.setActionHandler('play', playSong);
    navigator.mediaSession.setActionHandler('pause', pauseSong);
    navigator.mediaSession.setActionHandler('previoustrack', prevSong);
    navigator.mediaSession.setActionHandler('nexttrack', nextSong);
    navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (typeof details.seekTime === 'number') {
            domElements.audioPlayer.currentTime = details.seekTime;
            updateProgressBar();
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
    domElements.surpriseBtn?.addEventListener('click', playRandomSong);
    
    // Shuffle e Repeat
    domElements.shuffleBtn.addEventListener('click', toggleShuffle);
    domElements.repeatBtn.addEventListener('click', toggleRepeat);
    
    // Barra de progresso
    domElements.audioPlayer.addEventListener('timeupdate', updateProgressBar);
    
    domElements.progressBar.addEventListener('input', () => {
        const seekTime = (domElements.progressBar.value / 100) * domElements.audioPlayer.duration;
        domElements.audioPlayer.currentTime = seekTime;
        updateProgressBar();
    });
    
    // Volume
    domElements.volumeControl.addEventListener('input', () => {
        domElements.audioPlayer.volume = domElements.volumeControl.value;
        updateVolumeUI();
    });
    
    domElements.volumeBtn.addEventListener('click', () => {
        if (domElements.audioPlayer.volume > 0) {
            domElements.audioPlayer.volume = 0;
            domElements.volumeControl.value = 0;
        } else {
            domElements.audioPlayer.volume = 0.7;
            domElements.volumeControl.value = 0.7;
        }
        updateVolumeUI();
    });
    
    // Quando a música termina
    domElements.audioPlayer.addEventListener('ended', nextSong);
    domElements.audioPlayer.addEventListener('loadedmetadata', () => {
        domElements.duration.textContent = formatTime(domElements.audioPlayer.duration);
    });

    domElements.audioPlayer.addEventListener('error', retryCurrentAudio);
    domElements.audioPlayer.addEventListener('stalled', retryCurrentAudio);
    
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

    domElements.copySongBtn?.addEventListener('click', copyCurrentSongLink);
    domElements.scrollCurrentBtn?.addEventListener('click', scrollToCurrentSongCard);
    
    // Carregar imagens visíveis durante o scroll
    window.addEventListener('scroll', forceLoadVisibleImages);
    window.addEventListener('resize', forceLoadVisibleImages);
    window.addEventListener('hashchange', () => applySongFromHash({ autoplay: false }));
}

function updateVolumeUI() {
    const volume = Number(domElements.audioPlayer.volume);
    domElements.volumeBtn.textContent = volume === 0 ? '🔇' : volume <= 0.4 ? '🔉' : '🔊';
    domElements.volumeControl.style.background = `linear-gradient(to right, var(--accent-color) 0%, var(--accent-color) ${volume * 100}%, var(--secondary-color) ${volume * 100}%)`;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    loadData();
    setupEventListeners();
    domElements.audioPlayer.volume = Number(domElements.volumeControl.value);
    updateVolumeUI();
    updateProgressBar();
    registerMediaSessionActions();
    applyThemeFromLogo();
    setupClickFeedback();
    loadProfilePresets().finally(() => {
        setupProfileSystem();
        setupProfileDrawer();
    });
});
