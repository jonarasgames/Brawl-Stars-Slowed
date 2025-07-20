fetch('data/musicas.json')
  .then(response => response.json())
  .then(musicas => {
    const lista = document.getElementById('music-list');
    const audio = document.getElementById('audio');
    const title = document.getElementById('title');
    const cover = document.getElementById('cover');

    musicas.forEach(musica => {
      const item = document.createElement('li');
      item.textContent = musica.titulo;
      item.addEventListener('click', () => {
        audio.src = musica.arquivo;
        cover.src = musica.capa;
        title.textContent = musica.titulo;
        audio.play();
      });
      lista.appendChild(item);
    });
  });
