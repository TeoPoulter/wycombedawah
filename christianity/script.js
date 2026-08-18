(() => {
  const input = document.querySelector('#document-search');
  const clear = document.querySelector('#clear-search');
  const grid = document.querySelector('#index-grid');
  const results = document.querySelector('#search-results');
  const searchable = [...document.querySelectorAll('[data-search]')];

  function reset() {
    input.value = '';
    clear.hidden = true;
    grid.hidden = false;
    results.hidden = true;
    results.replaceChildren();
    input.focus();
  }

  input.addEventListener('input', () => {
    const query = input.value.trim().toLowerCase();
    clear.hidden = !query;
    if (!query) return reset();
    const matches = searchable.filter(node => node.dataset.search.includes(query)).slice(0, 80);
    grid.hidden = true;
    results.hidden = false;
    results.replaceChildren();
    const count = document.createElement('p');
    count.textContent = `${matches.length} ${matches.length === 1 ? 'result' : 'results'}`;
    results.append(count);
    matches.forEach(node => {
      const chapter = node.closest('.chapter');
      const link = document.createElement('a');
      link.href = `#${chapter.id}`;
      const small = document.createElement('small');
      small.textContent = chapter.dataset.section;
      const text = document.createElement('span');
      text.textContent = node.textContent.trim();
      link.append(small, text);
      results.append(link);
    });
  });
  clear.addEventListener('click', reset);
})();
