// =================================================================================================
// Global Utility Functions
// These functions are shared across all pages (index.html, embed.html, live.html)
// =================================================================================================

/**
 * Toggles the light/dark theme of the webpage.
 * Stores the selected theme in local storage.
 */
function toggleTheme() {
    document.body.classList.toggle('dark');
    const isDarkMode = document.body.classList.contains('dark');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    // Update the theme icon in the header
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = isDarkMode ? '🌙' : '☀️';
    }
}

/**
 * Applies the saved theme from local storage when the page loads.
 */
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.getElementById('theme-icon'); // Get icon here as it's part of header

    if (savedTheme === 'dark') {
        document.body.classList.add('dark');
        if (themeIcon) themeIcon.textContent = '🌙';
    } else {
        if (themeIcon) themeIcon.textContent = '☀️';
    }
}

// =================================================================================================
// Page-Specific Initialization Functions
// Each function contains the logic unique to a particular HTML page.
// =================================================================================================

/**
 * Initializes the logic for the index.html (Sports Schedule) page.
 */
function initIndexPage() {
    // DOM element references specific to index.html
    const scheduleContainer = document.getElementById('schedule-container');
    const errorMessageDiv = document.getElementById('error-message');
    const loadingSpinner = document.getElementById('loading-spinner');
    const sportFilter = document.getElementById('sport-filter');
    const tournamentFilter = document.getElementById('tournament-filter');
    const sortByDropdown = document.getElementById('sort-by');
    const searchInput = document.getElementById('search-input');
    const secondaryNavbar = document.getElementById('secondary-navbar');

    let allMatchesData = []; // Stores all fetched matches for filtering and sorting

    /**
     * Determines the status label for a match based on current time.
     * @param {object} match - The match object with unix_timestamp.
     * @returns {string|null} - The status string ('Live Now', 'Upcoming', 'Finished') or null if no label.
     */
    function getMatchStatus(match) {
        const matchStartTime = match.unix_timestamp * 1000; // Convert to milliseconds
        const currentTime = new Date().getTime();

        const thirtyMinutesBefore = matchStartTime - (30 * 60 * 1000);
        const twoAndHalfHoursAfter = matchStartTime + (2.5 * 60 * 60 * 1000);

        if (currentTime >= matchStartTime && currentTime < twoAndHalfHoursAfter) {
            return 'Live Now';
        } else if (currentTime >= thirtyMinutesBefore && currentTime < matchStartTime) {
            return 'Upcoming';
        } else if (currentTime >= twoAndHalfHoursAfter) {
            return 'Finished';
        }
        return null; // No specific label applies
    }

    /**
     * Returns a numerical priority for a match status for sorting purposes.
     * Lower number means higher priority (e.g., Live Now comes before Upcoming).
     * @param {string|null} status - The status string ('Live Now', 'Upcoming', 'Finished') or null.
     * @returns {number} - Numerical priority.
     */
    function getStatusPriority(status) {
        switch (status) {
            case 'Live Now': return 1;
            case 'Upcoming': return 2;
            case 'Finished': return 3;
            default: return 4; // For matches with no immediate status (further in future)
        }
    }

    /**
     * Determines if a match should be dismissed (hidden) from the display.
     * A match is dismissed if the current time is 3 hours past its scheduled start time.
     * @param {object} match - The match object containing unix_timestamp.
     * @returns {boolean} - True if the match should be dismissed, false otherwise.
     */
    function shouldDismissMatch(match) {
        const matchStartTime = new Date(match.unix_timestamp * 1000); // Convert to milliseconds
        const dismissTime = new Date(matchStartTime.getTime() + (3 * 60 * 60 * 1000)); // Add 3 hours
        const currentTime = new Date();
        return currentTime.getTime() > dismissTime.getTime();
    }

    /**
     * Creates and returns a single match card DOM element.
     * @param {object} match - The match data.
     * @returns {HTMLElement} - The created div element for the match card.
     */
    function createMatchCardElement(match) {
        const matchCard = document.createElement('div');
        matchCard.classList.add('card');

        // Determine the status label (Live Now, Upcoming, Finished)
        const status = getMatchStatus(match);
        let statusLabelHtml = '';
        if (status) {
            let labelClass = '';
            if (status === 'Live Now') {
                labelClass = 'live-now';
            } else if (status === 'Upcoming') {
                labelClass = 'upcoming';
            } else if (status === 'Finished') {
                labelClass = 'finished';
            }
            statusLabelHtml = `<span class="status-label ${labelClass}">${status}</span>`;
        }

        // Determine the displayed date/time (Today, Tomorrow, or formatted date)
        const matchDateTime = new Date(match.unix_timestamp * 1000);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Normalize to start of local day
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);

        let displayDate = match.date; // Default to formatted date (e.g., "Wed, July 23")
        if (matchDateTime.setHours(0,0,0,0) === today.getTime()) {
            displayDate = 'Today';
        } else if (matchDateTime.setHours(0,0,0,0) === tomorrow.getTime()) {
            displayDate = 'Tomorrow';
        }
        const combinedDateTime = `${displayDate} | ${match.time}`;


        // Construct the URL for the embed player
        const embedUrl = match.link ? `embed.html?channel=${encodeURIComponent(match.link)}` : null;

        // Conditional rendering of the "Watch Live" button or alternative text based on status
        let watchLiveButtonHtml = '';
        if (embedUrl && (status === 'Live Now' || status === 'Upcoming')) {
            watchLiveButtonHtml = `<a href="${embedUrl}" target="_blank" class="live-link">Watch Live</a>`;
        } else if (status === 'Finished') {
            watchLiveButtonHtml = '<p class="text-gray-500 text-sm dark:text-gray-400">Game is completed.</p>';
        } else { // No label or other status (i.e., far in the future or no link)
            watchLiveButtonHtml = '<p class="text-gray-500 text-sm dark:text-gray-400">Live available 30\' prior to the game.</p>';
        }

        // Determine how to display the teams/match name (handle cases without ' - ' separator)
        let matchTeamsDisplay = '';
        if (match.match.includes(' - ')) {
            const teams = match.match.split(' - ');
            const team1 = teams[0].trim() || 'N/A';
            const team2 = teams[1].trim() || 'N/A';
            matchTeamsDisplay = `${team1} <span class="text-gray-500 dark:text-gray-400">vs</span> ${team2}`;
        } else {
            matchTeamsDisplay = match.match; // Display the full match string if no ' - '
        }

        matchCard.innerHTML = `
            ${statusLabelHtml}
            <div class="flex flex-col flex-grow">
                <div class="flex flex-col sm:flex-row items-center justify-between mb-4">
                    <div class="text-center sm:text-left mb-2 sm:mb-0">
                        <p class="text-lg team-name">${matchTeamsDisplay}</p>
                        <p class="match-info text-gray-600 dark:text-gray-400">${match.league}</p>
                        <p class="match-info text-gray-500 dark:text-gray-400">${combinedDateTime}</p>
                    </div>
                    <div></div>
                </div>
                <div class="text-center sm:text-right mt-auto">
                    ${watchLiveButtonHtml}
                </div>
            </div>
        `;
        return matchCard;
    }

    /**
     * Renders the match cards based on the provided matches array.
     * Groups matches by date and displays them under appropriate headings if sorted by default.
     * Otherwise, renders a flat list.
     * @param {Array} matchesToDisplay - The array of matches to render.
     */
    function renderMatches(matchesToDisplay) {
        scheduleContainer.innerHTML = ''; // Clear previous content

        // Filter out dismissed matches before grouping and rendering
        const nonDismissedMatches = matchesToDisplay.filter(match => !shouldDismissMatch(match));

        if (nonDismissedMatches.length === 0) {
            scheduleContainer.innerHTML = '<p class="text-center text-gray-600 dark:text-gray-400">No upcoming matches found for the selected filters.</p>';
            return;
        }

        const selectedSortBy = sortByDropdown.value;

        if (selectedSortBy === 'default') {
            // Group matches by their raw date (YYYY-MM-DD) for default sorting
            const groupedMatches = new Map();
            nonDismissedMatches.forEach(match => {
                const dateKey = match.rawDate;
                if (!groupedMatches.has(dateKey)) {
                    groupedMatches.set(dateKey, []);
                }
                groupedMatches.get(dateKey).push(match);
            });

            const today = new Date();
            today.setHours(0, 0, 0, 0); // Normalize to start of local day
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);

            // Sort dates to ensure chronological order
            const sortedDates = Array.from(groupedMatches.keys()).sort();

            sortedDates.forEach(dateKey => {
                const matchesForDate = groupedMatches.get(dateKey);
                const matchDate = new Date(dateKey); // This will be local midnight for dateKey
                matchDate.setHours(0, 0, 0, 0); // Ensure it's truly normalized to local midnight for comparison

                let dateHeadingText = '';
                if (matchDate.getTime() === today.getTime()) {
                    dateHeadingText = 'Today';
                } else if (matchDate.getTime() === tomorrow.getTime()) {
                    dateHeadingText = 'Tomorrow';
                } else {
                    // Format for other dates: "Wed, July 23"
                    const options = { weekday: 'short', month: 'long', day: 'numeric' };
                    dateHeadingText = matchDate.toLocaleDateString('en-US', options);
                }

                const dateHeading = document.createElement('h2');
                dateHeading.classList.add('text-xl', 'sm:text-2xl', 'font-bold', 'text-gray-800', 'dark:text-gray-200', 'mt-8', 'mb-4', 'col-span-full', 'text-center');
                dateHeading.textContent = dateHeadingText;
                scheduleContainer.appendChild(dateHeading);

                // Create a sub-grid for the cards of this date
                const dateCardsContainer = document.createElement('div');
                dateCardsContainer.classList.add('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6', 'col-span-full');

                matchesForDate.forEach(match => {
                    dateCardsContainer.appendChild(createMatchCardElement(match));
                });
                scheduleContainer.appendChild(dateCardsContainer);
            });
        } else {
            // For 'status' sort, render a flat list without date headings
            nonDismissedMatches.forEach(match => {
                scheduleContainer.appendChild(createMatchCardElement(match));
            });
        }
    }

    /**
     * Applies filters and sorting to the match data and re-renders the cards.
     */
    function applyFilters() {
        const selectedSport = sportFilter.value;
        const selectedTournament = tournamentFilter.value;
        const selectedSortBy = sortByDropdown.value;
        const searchTerm = searchInput.value.toLowerCase(); // Get search term

        let filteredMatches = allMatchesData.filter(match => {
            const sportMatch = selectedSport === 'all' || match.sport === selectedSport;
            const tournamentMatch = selectedTournament === 'all' || match.league === selectedTournament;

            // Search logic: includes original match string, teams, league, sport, date, time
            const matchText = `${match.team1} ${match.team2} ${match.league} ${match.sport} ${match.date} ${match.time} ${match.match}`.toLowerCase();
            const searchMatch = matchText.includes(searchTerm);

            return sportMatch && tournamentMatch && searchMatch;
        });

        // Apply sorting based on the selected option
        if (selectedSortBy === 'status') {
            filteredMatches.sort((a, b) => {
                const priorityA = getStatusPriority(getMatchStatus(a));
                const priorityB = getStatusPriority(getMatchStatus(b));
                if (priorityA !== priorityB) {
                    return priorityA - priorityB;
                }
                return a.unix_timestamp - b.unix_timestamp; // Secondary sort by time
            });
        } else { // 'default' - sort by unix_timestamp
            filteredMatches.sort((a, b) => a.unix_timestamp - b.unix_timestamp);
        }

        renderMatches(filteredMatches);
    }

    /**
     * Populates the sport and tournament filter dropdowns with unique values from the fetched data.
     * @param {Array} matches - The array of all fetched matches.
     */
    function populateFilters(matches) {
        const uniqueSports = new Set();
        const uniqueTournaments = new Set();

        matches.forEach(match => {
            uniqueSports.add(match.sport);
            uniqueTournaments.add(match.league);
        });

        // Clear existing options (except "All")
        sportFilter.innerHTML = '<option value="all">All Sports</option>';
        tournamentFilter.innerHTML = '<option value="all">All Tournaments</option>';

        // Add unique sports
        Array.from(uniqueSports).sort().forEach(sport => {
            const option = document.createElement('option');
            option.value = sport;
            option.textContent = sport;
            sportFilter.appendChild(option);
        });

        // Add unique tournaments
        Array.from(uniqueTournaments).sort().forEach(tournament => {
            const option = document.createElement('option');
            option.value = tournament;
            option.textContent = tournament;
            tournamentFilter.appendChild(option);
        });
    }

    /**
     * Fetches sports schedule data from the API and initiates rendering.
     */
    async function fetchAndDisplaySchedule() {
        loadingSpinner.classList.remove('hidden'); // Show loading spinner
        errorMessageDiv.classList.add('hidden'); // Hide any previous error messages
        scheduleContainer.innerHTML = ''; // Clear previous content

        const apiUrl = 'https://topembed.pw/api.php?format=json';

        try {
            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const apiData = await response.json();

            if (apiData && apiData.events && typeof apiData.events === 'object') {
                const tempAllMatches = [];

                for (const dateKey in apiData.events) {
                    if (Object.hasOwnProperty.call(apiData.events, dateKey)) {
                        const dailyMatches = apiData.events[dateKey];

                        if (Array.isArray(dailyMatches)) {
                            dailyMatches.forEach(match => {
                                // Store the original match string for display and search
                                const originalMatchString = match.match;

                                const teams = originalMatchString.split(' - ');
                                const team1 = teams[0].trim() || 'N/A';
                                const team2 = teams[1] ? teams[1].trim() : 'N/A'; // Only set team2 if it exists

                                const matchDateTime = new Date(match.unix_timestamp * 1000);
                                // Explicitly get local year, month, day for rawDate
                                const year = matchDateTime.getFullYear();
                                const month = String(matchDateTime.getMonth() + 1).padStart(2, '0');
                                const day = String(matchDateTime.getDate()).padStart(2, '0');
                                const rawDate = `${year}-${month}-${day}`;

                                // Updated date options for shorter format (e.g., "Wed, July 23")
                                const dateOptions = { weekday: 'short', month: 'long', day: 'numeric' };
                                const timeOptions = { hour: '2-digit', minute: '2-digit' };
                                const formattedDate = matchDateTime.toLocaleDateString('en-US', dateOptions);
                                const formattedTime = matchDateTime.toLocaleTimeString('en-US', timeOptions);

                                tempAllMatches.push({
                                    sport: match.sport, // Added sport for filtering
                                    match: originalMatchString, // Store original match string
                                    team1: team1, // Keep for search/filter consistency
                                    team2: team2, // Keep for search/filter consistency
                                    league: match.tournament,
                                    date: formattedDate,
                                    time: formattedTime,
                                    link: match.channels && match.channels.length > 0 ? match.channels[0] : null,
                                    unix_timestamp: match.unix_timestamp, // Keep original timestamp
                                    rawDate: rawDate // Use the locally derived YYYY-MM-DD
                                });
                            });
                        }
                    }
                }
                allMatchesData = tempAllMatches; // Store the fetched data

                populateFilters(allMatchesData); // Populate filters after data is fetched
                applyFilters(); // Display all matches initially
            } catch (error) {
                console.error('Error fetching data:', error);
                errorMessageDiv.classList.remove('hidden');
                scheduleContainer.innerHTML = '';
            } finally {
                loadingSpinner.classList.add('hidden');
            }
    }

    // Event listeners for main filter/sort/search controls
    sportFilter.addEventListener('change', () => {
        // When main sport filter changes, update secondary navbar active state
        secondaryNavbar.querySelectorAll('a').forEach(link => {
            if (link.dataset.sportFilter === sportFilter.value) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
        applyFilters();
    });
    tournamentFilter.addEventListener('change', applyFilters);
    sortByDropdown.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters); // Listen for input on search field

    // Event listener for secondary navbar links
    secondaryNavbar.addEventListener('click', (event) => {
        if (event.target.tagName === 'A') {
            event.preventDefault(); // Prevent default link behavior
            const sportFilterValue = event.target.dataset.sportFilter;

            // Update the main sport filter dropdown
            sportFilter.value = sportFilterValue;

            // Remove active class from all secondary navbar links
            secondaryNavbar.querySelectorAll('a').forEach(link => {
                link.classList.remove('active');
            });
            // Add active class to the clicked link
            event.target.classList.add('active');

            applyFilters(); // Re-apply filters
        }
    });

    // Initial fetch when the page loads
    fetchAndDisplaySchedule();
}

/**
 * Initializes the logic for the embed.html (Live Stream Player) page.
 */
function initEmbedPage() {
    // DOM element references specific to embed.html
    const playerContainer = document.getElementById('player-container');
    const urlParams = new URLSearchParams(window.location.search);
    const channelUrl = urlParams.get('channel'); // Get the 'channel' query parameter

    if (channelUrl) {
        const videoResponsiveWrapper = document.createElement('div');
        videoResponsiveWrapper.classList.add('video-responsive');

        const iframe = document.createElement('iframe');
        iframe.setAttribute('allow', 'encrypted-media; fullscreen');
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.src = channelUrl;

        videoResponsiveWrapper.appendChild(iframe);
        playerContainer.appendChild(videoResponsiveWrapper);
    } else {
        // Display a message if no channel URL is provided
        const messageBox = document.createElement('div');
        messageBox.classList.add('message-box');
        messageBox.textContent = 'No channel URL provided. Please ensure the URL is in the format: embed.html?channel=[YourChannelURL]';
        playerContainer.appendChild(messageBox);
    }
}

/**
 * Initializes the logic for the live.html (Live TV Channels) page.
 */
function initLivePage() {
    // DOM element references specific to live.html
    const cardContainer = document.getElementById('cardContainer');
    const searchInput = document.getElementById('searchInput');
    const countryFilter = document.getElementById('countryFilter');
    const sortBy = document.getElementById('sortBy');

    let data = []; // Stores all fetched channel data

    /**
     * Creates an HTML string for a single channel card.
     * @param {object} channel - The channel data.
     * @returns {string} - HTML string for the card.
     */
    function createCard(channel) {
        const link = `embed.html?channel=${encodeURIComponent(channel.URL)}`; // Link to embed.html

        return `
            <div class="card">
                <a href="${link}" target="_blank">
                    <div class="channel-name">${channel.ChannelName}</div>
                    <div class="country">${channel.Country}</div>
                </a>
            </div>
        `;
    }

    /**
     * Renders channel cards based on current filters and sort order.
     */
    function renderCards() {
        const query = searchInput.value.toLowerCase();
        const country = countryFilter.value;
        const sortKey = sortBy.value;

        let filtered = data.filter(ch =>
            ch.ChannelName.toLowerCase().includes(query) &&
            (country === '' || ch.Country === country)
        );

        if (sortKey) {
            filtered = filtered.sort((a, b) => a[sortKey].localeCompare(b[sortKey]));
        }

        cardContainer.innerHTML = filtered.map(createCard).join('');
    }

    /**
     * Populates the country filter dropdown with unique countries from the data.
     */
    function populateFilter() {
        const countries = [...new Set(data.map(ch => ch.Country))].sort();
        countries.forEach(c => {
            const option = document.createElement('option');
            option.value = c;
            option.textContent = c;
            countryFilter.appendChild(option);
        });
    }

    // Parse the CSV data using PapaParse (external library)
    Papa.parse('https://github.com/zie2store/topem/raw/refs/heads/main/channels.csv', {
        download: true,
        header: true,
        complete: function(results) {
            // Filter out rows that might be empty or missing critical data
            data = results.data.filter(row => row.ChannelName && row.URL);
            populateFilter();
            renderCards();
        }
    });

    // Event listeners for search, filter, and sort controls
    searchInput.addEventListener('input', renderCards);
    countryFilter.addEventListener('change', renderCards);
    sortBy.addEventListener('change', renderCards);
}


// =================================================================================================
// Main Application Entry Point
// This runs when the DOM is fully loaded and routes to the correct page-specific initialization.
// =================================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Apply the saved theme preference across all pages as soon as DOM is ready
    applySavedTheme();

    // Get the current page's filename to determine which initialization function to call
    const path = window.location.pathname;
    const filename = path.substring(path.lastIndexOf('/') + 1);

    // Route to the appropriate page initialization function
    if (filename === 'index.html' || filename === '') { // '' handles cases where index.html is the root
        initIndexPage();
    } else if (filename === 'embed.html') {
        initEmbedPage();
    } else if (filename === 'live.html') {
        initLivePage();
    }
    // Add more else if blocks here for other pages if you create them
});
