//LIVE TV FUNCTIONS START HERE
const cardContainer = document.getElementById('cardContainer');
        const searchInput = document.getElementById('searchInput');
        const countryFilter = document.getElementById('countryFilter');
        const sortBy = document.getElementById('sortBy');
        const secondaryNavbar = document.getElementById('secondary-navbar');
        let data = [];
            const baseURL = window.location.origin;

        function createCard(channel) {
            const link = `${baseURL}/embed.html?channel=${encodeURIComponent(channel.URL)}`;

            return `
                <div class="card">
                    <a href="${link}" target="_blank">
                        <div class="channel-name">${channel.ChannelName}</div>
                        <div class="country">${channel.Country}</div>
                    </a>
                </div>
            `;
        }

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

        function populateFilter() {
            const countries = [...new Set(data.map(ch => ch.Country))].sort();
            countries.forEach(c => {
                const option = document.createElement('option');
                option.value = c;
                option.textContent = c;
                countryFilter.appendChild(option);
            });
        }

        Papa.parse('channels.csv', {
            download: true,
            header: true,
            complete: function(results) {
                data = results.data.filter(row => row.ChannelName && row.URL);
                populateFilter();
                renderCards();
            }
        });

        searchInput.addEventListener('input', renderCards);
        countryFilter.addEventListener('change', renderCards);
        sortBy.addEventListener('change', renderCards);

        // Event listener for secondary navbar links
            secondaryNavbar.addEventListener('click', (event) => {
                if (event.target.tagName === 'A') {
                    event.preventDefault(); // Prevent default link behavior
                    const countryFilterValue = event.target.dataset.countryFilter;

                    // Update the main country filter dropdown
                    countryFilter.value = countryFilterValue;

                    // Remove active class from all secondary navbar links
                    secondaryNavbar.querySelectorAll('a').forEach(link => {
                        link.classList.remove('active');
                    });
                    // Add active class to the clicked link
                    event.target.classList.add('active');

                    // Trigger renderCards (assuming it's available globally or via initLivePage)
                    if (typeof renderCards === 'function') {
                        renderCards();
                    }
                }
            });

            // When main country filter changes, update secondary navbar active state
            countryFilter.addEventListener('change', () => {
                secondaryNavbar.querySelectorAll('a').forEach(link => {
                    if (link.dataset.countryFilter === countryFilter.value) {
                        link.classList.add('active');
                    } else {
                        link.classList.remove('active');
                    }
                });
            });

