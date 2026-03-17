document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('searchInput');
    const searchButton = document.getElementById('searchButton');
    const loadingState = document.getElementById('loadingState');
    const resultsContainer = document.getElementById('resultsContainer');

    searchButton.addEventListener('click', performSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) return;

        // UI state update
        searchInput.disabled = true;
        searchButton.disabled = true;
        loadingState.style.display = 'flex';
        resultsContainer.innerHTML = '';

        try {
            const response = await fetch('/api/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ query, k: 3 })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to fetch search results');
            }

            renderResults(data.results);
        } catch (err) {
            resultsContainer.innerHTML = `
                <div class="result-card error-msg">
                    <h3 class="result-title">Error</h3>
                    <p class="result-desc">${err.message}</p>
                </div>
            `;
        } finally {
            searchInput.disabled = false;
            searchButton.disabled = false;
            loadingState.style.display = 'none';
            searchInput.focus();
        }
    }

    function renderResults(results) {
        if (!results || results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="result-card" style="text-align: center;">
                    <p class="result-desc">No semantics matches found. Try rewording your query.</p>
                </div>
            `;
            return;
        }

        const html = results.map((result, index) => {
            const meta = result.meta || {};
            const title = meta.title || result.id || 'Unknown';
            const desc = meta.description || 'No description available';
            // result.similarity or result.distance can be formatted depending on Endee API structure
            const similarityScore = result.similarity !== undefined ? (result.similarity * 100).toFixed(1) : ((1 - result.distance) * 100).toFixed(1);

            return `
                <div class="result-card" style="animation-delay: ${index * 0.15 + 0.1}s">
                    <div class="result-header">
                        <h3 class="result-title">${title}</h3>
                        ${!isNaN(similarityScore) ? `<span class="similarity-badge">${similarityScore}% Match</span>` : ''}
                    </div>
                    <p class="result-desc">${desc}</p>
                </div>
            `;
        }).join('');

        resultsContainer.innerHTML = html;
    }
});
