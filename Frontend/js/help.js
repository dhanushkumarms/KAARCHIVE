document.addEventListener('DOMContentLoaded', () => {
    // Get all FAQ items
    const faqItems = document.querySelectorAll('.faq-item');
    const searchInput = document.getElementById('faq-search');
    
    // Initialize FAQ accordion functionality
    initAccordion();
    
    // Initialize search functionality
    initSearch();
    
    // Apply dark mode if it's enabled
    applyDarkModeIfEnabled();
    
    /**
     * Initialize the accordion functionality for FAQ items
     */
    function initAccordion() {
        faqItems.forEach(item => {
            const question = item.querySelector('.faq-question');
            
            question.addEventListener('click', () => {
                // Toggle active class on the clicked item
                const isActive = item.classList.contains('active');
                
                // Close all other items
                document.querySelectorAll('.faq-item.active').forEach(activeItem => {
                    if (activeItem !== item) {
                        activeItem.classList.remove('active');
                        activeItem.querySelector('.faq-answer').style.maxHeight = '0';
                    }
                });
                
                // Toggle the clicked item
                item.classList.toggle('active');
                
                // Add animation effect for smooth transition
                const answer = item.querySelector('.faq-answer');
                answer.style.maxHeight = isActive ? '0' : `${answer.scrollHeight}px`;
            });
        });
        
        // Open the first item by default
        if (faqItems.length > 0 && !window.location.hash) {
            const firstItem = faqItems[0];
            firstItem.classList.add('active');
            const firstAnswer = firstItem.querySelector('.faq-answer');
            firstAnswer.style.maxHeight = `${firstAnswer.scrollHeight}px`;
        }
    }
    
    /**
     * Initialize the search functionality for FAQ items
     */
    function initSearch() {
        if (!searchInput) return;
        
        searchInput.addEventListener('input', debounce(function() {
            const searchTerm = this.value.toLowerCase();
            
            if (!searchTerm.trim()) {
                // Reset visibility of all items if search is empty
                faqItems.forEach(item => {
                    item.style.display = '';
                });
                
                // Reset section visibility
                document.querySelectorAll('.faq-section').forEach(section => {
                    section.style.display = '';
                });
                
                return;
            }
            
            // Track which sections have visible items
            const sectionsWithVisibleItems = new Set();
            
            faqItems.forEach(item => {
                const question = item.querySelector('.faq-question').textContent.toLowerCase();
                const answer = item.querySelector('.faq-answer').textContent.toLowerCase();
                const section = item.closest('.faq-section');
                const sectionId = section.id || Array.from(section.parentNode.children).indexOf(section);
                
                // Check if the search term exists in the question or answer
                if (question.includes(searchTerm) || answer.includes(searchTerm)) {
                    item.style.display = '';
                    item.classList.add('active'); // Expand matching items
                    item.querySelector('.faq-answer').style.maxHeight = 
                        item.querySelector('.faq-answer').scrollHeight + 'px';
                    sectionsWithVisibleItems.add(sectionId);
                } else {
                    item.style.display = 'none';
                    item.classList.remove('active');
                    item.querySelector('.faq-answer').style.maxHeight = '0px';
                }
            });
            
            // Hide sections with no visible items
            document.querySelectorAll('.faq-section').forEach(section => {
                const sectionId = section.id || Array.from(section.parentNode.children).indexOf(section);
                section.style.display = sectionsWithVisibleItems.has(sectionId) ? '' : 'none';
            });
        }, 300)); // Debounce delay in ms
    }
    
    /**
     * Apply dark mode if it's enabled in localStorage
     */
    function applyDarkModeIfEnabled() {
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        if (isDarkMode) {
            document.body.classList.add('dark-mode');
        }
    }
    
    /**
     * Debounce function to limit how often a function is called
     * @param {Function} func - The function to debounce
     * @param {number} delay - The delay in milliseconds
     * @returns {Function} - The debounced function
     */
    function debounce(func, delay) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), delay);
        };
    }
});
