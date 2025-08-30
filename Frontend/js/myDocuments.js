document.addEventListener('DOMContentLoaded', () => {
    const tbody = document.getElementById('files-table-body');
    const searchInput = document.getElementById('search');
    let storedFiles = [];

    async function fetchFiles() {
        try {
            const loggedInEmail = localStorage.getItem('userEmail') || "user@example.com";
            const loggedInUsername = localStorage.getItem('userName') || "defaultUser";

            const response = await fetch(`http://localhost:5237/api/upload/userfiles?email=${loggedInEmail}&username=${loggedInUsername}`);
            if (!response.ok) throw new Error(`Error ${response.status} while fetching files.`);
            
            storedFiles = await response.json();
            updateTable(storedFiles);
        } catch (error) {
            console.error(error.message);
        }
    }

    function updateTable(files) {
        tbody.innerHTML = "";
        if (!files || files.length === 0) {
            tbody.innerHTML = "<tr><td colspan='5'>No documents found.</td></tr>";
            return;
        }
        
        files.forEach(file => {
            if (!file.fileName) return;
            
            const fileName = file.fileName.split('/').pop();
            const formattedDate = file.lastModified ? formatDate(file.lastModified) : 'N/A';
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td><img src="${getFileIcon(fileName)}" alt="Icon"> ${fileName}</td>
                <td>${file.subject || 'N/A'}</td>
                <td>${formattedDate}</td>
                <td>${file.size || 'N/A'}</td>
                <td class="actions">
                    <i class="fa fa-pencil edit" onclick="chatWithFile('${file.fileName}')"></i>
                    <i class="fa fa-trash delete" onclick="deleteRow('${file.fileName}')"></i>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    function searchFiles() {
        const query = searchInput.value.toLowerCase();
        const filteredFiles = storedFiles.filter(file => file.fileName.toLowerCase().includes(query));
        updateTable(filteredFiles);
    }

    function sortTable(columnIndex, ascending) {
        storedFiles.sort((a, b) => {
            let valA = Object.values(a)[columnIndex] || '';
            let valB = Object.values(b)[columnIndex] || '';

            let isNumeric = !isNaN(valA) && !isNaN(valB);
            if (isNumeric) {
                valA = parseFloat(valA);
                valB = parseFloat(valB);
            }
            return ascending ? valA.localeCompare(valB, undefined, { numeric: isNumeric }) : valB.localeCompare(valA, undefined, { numeric: isNumeric });
        });
        updateTable(storedFiles);
    }

    searchInput.addEventListener('input', searchFiles);

    setTimeout(() => {
        const table_headings = document.querySelectorAll('th');
        table_headings.forEach((head, columnIndex) => {
            let ascending = true;
            head.addEventListener('click', () => {
                sortTable(columnIndex, ascending);
                ascending = !ascending;
            });
        });
    }, 500);

    fetchFiles();
});

function getFileIcon(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    switch (extension) {
        case 'pdf': return "../assets/img/pdf.png";
        case 'doc':
        case 'docx': return "../assets/img/docx.png";
        case 'ppt':
        case 'pptx': return "../assets/img/pptx.png";
        default: return "../assets/img/default.png";
    }
}

function formatDate(isoDate) {
    const date = new Date(isoDate);
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(',', '');
}

async function deleteFile(fileName) {
    if (!confirm(`Are you sure you want to delete ${fileName}?`)) return;

    const loggedInEmail = localStorage.getItem('userEmail') || "user@example.com";
    const loggedInUsername = localStorage.getItem('userName') || "defaultUser";
    const actualFileName = fileName.split('/').pop();

    const apiUrl = `http://localhost:5237/api/upload/deletefile?email=${loggedInEmail}&username=${loggedInUsername}&fileName=${encodeURIComponent(actualFileName)}`;

    try {
        const response = await fetch(apiUrl, { method: 'DELETE' });
        if (!response.ok) throw new Error(`Failed to delete ${actualFileName}`);

        alert(`${actualFileName} deleted successfully.`);
        window.location.reload();
    } catch (error) {
        alert(error.message);
    }
}

function deleteRow(fileName) {
    deleteFile(fileName);
}

function chatWithFile(fileName) {
    const actualFileName = fileName.split('/').pop();
    console.log(`Opening chat with file: ${actualFileName}`);
    
    // Clear any existing kaarAI chat state before navigating
    localStorage.removeItem('kaarAI_chatState');
    
    // Navigate to chat page with filename parameter
    window.location.href = `kaarAI.html?filename=${encodeURIComponent(actualFileName)}`;
}
