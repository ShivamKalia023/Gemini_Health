async function makeRequest(endpoint) {
    const output = document.getElementById('customOutput') || document.createElement('div');
    try {
        output.innerHTML = '<span class="loader"></span> Loading...';
        const response = await fetch(endpoint);
        const data = await response.json();
        return { success: true, data, status: response.status };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function checkDatabaseStatus() {
    const result = await makeRequest('/api/diagnostic/stats');
    const output = document.getElementById('dbStatus');

    if (result.success) {
        const status = result.data;
        output.className = 'output info';
        output.innerHTML = `✓ Database Status: ${status.status}\n` +
            `Total Athletes: ${status.athletesCount}\n` +
            `Total Activities: ${status.activitiesCount}`;
    } else {
        output.className = 'output error';
        output.innerHTML = `✗ Error: ${result.error}`;
    }
}

async function checkAthletes() {
    const result = await makeRequest('/api/athletes');
    const output = document.getElementById('dbStatus');

    if (result.success) {
        const athletes = result.data || [];
        output.className = 'output success';
        let html = `✓ Found ${athletes.length} athlete(s)\n\n`;
        athletes.forEach((a, i) => {
            html += `${i + 1}. ID: ${a.id}, Name: ${a.name}, Sport: ${a.primarySport}\n`;
        });
        output.innerHTML = html;
    } else {
        output.className = 'output error';
        output.innerHTML = `✗ Error: ${result.error}`;
    }
}

async function checkActivities() {
    const result = await makeRequest('/api/diagnostic/stats');
    const output = document.getElementById('dbStatus');

    if (result.success) {
        const count = result.data.activitiesCount;
        output.className = count > 0 ? 'output success' : 'output info';
        output.innerHTML = `Total Activities in Database: ${count}\n\n` +
            (count === 0 ? 'No activities found. Try uploading a CSV or GPX file.' : '✓ Activities exist in database');
    } else {
        output.className = 'output error';
        output.innerHTML = `✗ Error: ${result.error}`;
    }
}

async function checkAthleteActivities() {
    const athleteId = document.getElementById('athleteId').value;
    if (!athleteId) {
        alert('Please enter an athlete ID');
        return;
    }

    const result = await makeRequest(`/api/diagnostic/athlete/${athleteId}/activities/count`);
    const output = document.getElementById('athleteStatus');

    if (result.success && result.data && result.data.success) {
        const data = result.data;
        output.className = data.activitiesCount > 0 ? 'output success' : 'output info';

        let html = `Athlete ID: ${data.athleteId}\nActivities: ${data.activitiesCount}\n`;
        if (data.activitiesCount > 0 && data.activities) {
            html += '\nActivities:\n';
            data.activities.forEach((a, i) => {
                html += `${i + 1}. ${a.name} (${a.type}) - ${a.distance}km on ${a.startDate}\n`;
            });
        }
        output.innerHTML = html;
    } else {
        output.className = 'output error';
        output.innerHTML = `✗ Error: ${result.data?.error || result.error}`;
    }
}

async function checkPerformance() {
    const athleteId = document.getElementById('athleteIdPerfom').value;
    if (!athleteId) {
        alert('Please enter an athlete ID');
        return;
    }

    const result = await makeRequest(`/api/athletes/${athleteId}/performance`);
    const output = document.getElementById('performanceStatus');

    if (result.success) {
        const data = result.data || [];
        output.className = data.length > 0 ? 'output success' : 'output info';

        if (data.length === 0) {
            output.innerHTML = 'No performance data available. This should populate after activities are imported.';
        } else {
            const latest = data[data.length - 1];
            output.innerHTML = `Latest Performance Data:\n` +
                `Date: ${latest.date}\n` +
                `Fitness (CTL): ${latest.fitness}\n` +
                `Fatigue (ATL): ${latest.fatigue}\n` +
                `Form (TSB): ${latest.form}\n` +
                `Status: ${latest.status}\n\n` +
                `Total data points: ${data.length}`;
        }
    } else {
        output.className = 'output error';
        output.innerHTML = `✗ Error: ${result.error}`;
    }
}

async function customRequest() {
    const endpoint = document.getElementById('endpoint').value;
    if (!endpoint) {
        alert('Please enter an endpoint');
        return;
    }

    const result = await makeRequest(endpoint);
    const output = document.getElementById('customOutput');

    if (result.success) {
        output.className = 'output success';
        output.innerHTML = JSON.stringify(result.data, null, 2);
    } else {
        output.className = 'output error';
        output.innerHTML = `✗ Error: ${result.error}\nStatus: ${result.status}`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('btn-check-db').addEventListener('click', checkDatabaseStatus);
    document.getElementById('btn-check-athletes').addEventListener('click', checkAthletes);
    document.getElementById('btn-check-activities').addEventListener('click', checkActivities);
    document.getElementById('btn-check-athlete-activities').addEventListener('click', checkAthleteActivities);
    document.getElementById('btn-check-performance').addEventListener('click', checkPerformance);
    document.getElementById('btn-custom-request').addEventListener('click', customRequest);

    // Run initial diagnostics on page load
    checkDatabaseStatus();
});
