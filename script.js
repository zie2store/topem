document.addEventListener('DOMContentLoaded', () => {
  const scheduleContainer = document.getElementById('schedule-container');
  const errorMessageDiv = document.getElementById('error-message');
  const loadingSpinner = document.getElementById('loading-spinner');
  const sportFilter = document.getElementById('sport-filter');
  const tournamentFilter = document.getElementById('tournament-filter');
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const apiUrl = 'https://topembed.pw/api.php?format=json';

  let allMatchesData = [];

  function renderMatches(matches) {
    scheduleContainer.innerHTML = '';

    if (!matches.length) {
      scheduleContainer.innerHTML = `
        <p class="text-center text-gray-600 dark:text-gray-400">
          No matches found for the selected filters.
        </p>`;
      return;
    }

    matches.forEach(match => {
      const matchCard = document.createElement('div');
      matchCard.className = 'card';

      const embedUrl = match.link ? `embed.html?channel=${encodeURIComponent(match.link)}` : null;

      matchCard.innerHTML = `
        <div class="flex flex-col sm:flex-row items-center justify-between mb-4">
          <div class="text-center sm:text-left mb-2 sm:mb-0">
            <p class="text-lg team-name">${match.team1} <span class="text-gray-500 dark:text-gray-400">vs</span> ${match.team2}</p>
            <p class="match-info">${match.league}</p>
          </div>
          <div class="text-center sm:text-right">
            <p class="match-info">${match.date}</p>
            <p class="match-info">${match.time}</p>
          </div>
        </div>
        <div class="text-center sm:text-left">
          ${embedUrl
            ? `<a href="${embedUrl}" target="_blank" class="live-link">Watch Live</a>`
            : '<p class="text-gray-500 text-sm dark:text-gray-400">No live link available</p>'}
        </div>
      `;

      scheduleContainer.appendChild(matchCard);
    });
  }

  function applyFilters() {
    const selectedSport = sportFilter.value;
    const selectedTournament = tournamentFilter.value;

    const filteredMatches = allMatchesData.filter(match =>
      (selectedSport === 'all' || match.sport === selectedSport) &&
      (selectedTournament === 'all' || match.league === selectedTournament)
    );

    renderMatches(filteredMatches);
  }

  function populateFilters(matches) {
    const sports = [...new Set(matches.map(m => m.sport))].sort();
    const tournaments = [...new Set(matches.map(m => m.league))].sort();

    sportFilter.innerHTML = '<option value="all">All Sports</option>';
    tournamentFilter.innerHTML = '<option value="all">All Tournaments</option>';

    sports.forEach(sport => {
      sportFilter.insertAdjacentHTML('beforeend', `<option value="${sport}">${sport}</option>`);
    });

    tournaments.forEach(tournament => {
      tournamentFilter.insertAdjacentHTML('beforeend', `<option value="${tournament}">${tournament}</option>`);
    });
  }

  async function fetchAndDisplaySchedule() {
    loadingSpinner.classList.remove('hidden');
    errorMessageDiv.classList.add('hidden');
    scheduleContainer.innerHTML = '';

    try {
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error(`HTTP error ${response.status}`);

      const data = await response.json();
      const matches = [];

      if (data?.events && typeof data.events === 'object') {
        for (const dateKey in data.events) {
          const dailyMatches = data.events[dateKey];
          if (Array.isArray(dailyMatches)) {
            dailyMatches.forEach(match => {
              const [team1 = 'N/A', team2 = 'N/A'] = match.match.split(' - ');

              const dateObj = new Date(match.unix_timestamp * 1000);
              const date = dateObj.toLocaleDateString('en-US', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
              });
              const time = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit', minute: '2-digit'
              });

              matches.push({
                sport: match.sport,
                team1,
                team2,
                league: match.tournament,
                date,
                time,
                link: match.channels?.[0] || null
              });
            });
          }
        }

        allMatchesData = matches;
        populateFilters(matches);
        applyFilters();
      } else {
        scheduleContainer.innerHTML = `
          <p class="text-center text-gray-600 dark:text-gray-400">
            No events data found in the API response.
          </p>`;
      }
    } catch (error) {
      console.error('Fetch error:', error);
      errorMessageDiv.classList.remove('hidden');
    } finally {
      loadingSpinner.classList.add('hidden');
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    themeIcon.textContent = isDark ? '🌙' : '☀️';
  }

  // Load saved theme preference
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'dark') {
    document.body.classList.add('dark');
    themeIcon.textContent = '🌙';
  }

  themeToggle.addEventListener('click', toggleTheme);
  sportFilter.addEventListener('change', applyFilters);
  tournamentFilter.addEventListener('change', applyFilters);

  fetchAndDisplaySchedule();
});
